import type { PoolClient } from "pg";
import { database, transaction } from "./db";
import {
  AppError,
  digest,
  hashPassword,
  newSession,
  requireDate,
  requireId,
  requirePassword,
  requireVersion,
  verifyPassword,
} from "./security";
import {
  organizations,
  SCHEDULE_LOCATION,
  SCHEDULE_TITLE,
  type AppSnapshot,
  type Member,
  type SessionUser,
} from "@/lib/domain";
import { queueEmails } from "./mail";

type UserRow = {
  id: string;
  name: string;
  email: string;
  organization: Member["organization"];
  role: "admin" | "member";
  initial_password: boolean;
  password_hash: string;
};
export type Auth = { user: SessionUser; tokenHash: string };
function publicUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    organization: row.organization ?? undefined,
    role: row.role,
    initialPassword: row.initial_password,
  };
}

export async function authenticate(token?: string): Promise<Auth> {
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError(401, "Sesi berakhir. Silakan masuk kembali.");
  const tokenHash = digest(token);
  const result = await database().query<UserRow>(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()",
    [tokenHash],
  );
  if (!result.rowCount)
    throw new AppError(401, "Sesi berakhir. Silakan masuk kembali.");
  return { user: publicUser(result.rows[0]), tokenHash };
}

export function requireAccess(auth: Auth, admin = false) {
  if (
    (admin && auth.user.role !== "admin") ||
    (auth.user.role === "admin" && auth.user.initialPassword)
  )
    throw new AppError(
      403,
      auth.user.initialPassword && auth.user.role === "admin"
        ? "Ubah kata sandi awal admin terlebih dahulu."
        : "Hanya admin yang dapat melakukan tindakan ini.",
    );
}

async function audit(
  client: PoolClient,
  auth: Auth,
  action: string,
  target: string,
  details: object = {},
) {
  await client.query(
    "INSERT INTO audit_events(actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)",
    [auth.user.id, action, target, JSON.stringify(details)],
  );
}

export async function login(email: unknown, password: unknown, ip: string) {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 1024
  )
    throw new AppError(400, "Email atau kata sandi tidak valid.");
  email = email.trim().toLowerCase();
  const allowed = await transaction(async (client) => {
    let allowed = true;
    for (const [key, maximum] of [
      [`account:${email}`, 8],
      [`ip:${ip}`, 40],
    ] as const) {
      const result = await client.query(
        "INSERT INTO login_limits(key, attempts, resets_at) VALUES ($1, 1, now() + interval '15 minutes') ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN login_limits.resets_at <= now() THEN 1 ELSE login_limits.attempts + 1 END, resets_at = CASE WHEN login_limits.resets_at <= now() THEN now() + interval '15 minutes' ELSE login_limits.resets_at END RETURNING attempts",
        [digest(key)],
      );
      if (result.rows[0].attempts > maximum) allowed = false;
    }
    return allowed;
  });
  if (!allowed)
    throw new AppError(
      429,
      "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.",
    );
  const result = await database().query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  const row = result.rows[0];
  // Same expensive operation for unknown accounts; no account-enumeration response.
  const hash =
    row?.password_hash ?? `scrypt-v2:${"0".repeat(32)}:${"0".repeat(128)}`;
  if (!(await verifyPassword(password, hash)) || !row)
    throw new AppError(
      401,
      "Email atau kata sandi tidak cocok. Periksa kembali akun Anda.",
    );
  const session = newSession();
  await database().query(
    "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')",
    [session.hash, row.id],
  );
  return { token: session.token, user: publicUser(row) };
}

export async function logout(auth: Auth) {
  await database().query("DELETE FROM sessions WHERE token_hash = $1", [
    auth.tokenHash,
  ]);
}

export async function changePassword(
  auth: Auth,
  current: unknown,
  next: unknown,
) {
  requirePassword(next);
  const session = newSession();
  return transaction(async (client) => {
    const result = await client.query<UserRow>(
      "SELECT * FROM users WHERE id = $1 FOR UPDATE",
      [auth.user.id],
    );
    const row = result.rows[0];
    const validSession = await client.query(
      "SELECT 1 FROM sessions WHERE token_hash = $1 AND user_id = $2 AND expires_at > now()",
      [auth.tokenHash, row.id],
    );
    if (!validSession.rowCount)
      throw new AppError(401, "Sesi berakhir. Silakan masuk kembali.");
    if (
      !row.initial_password &&
      (typeof current !== "string" ||
        current.length > 1024 ||
        !(await verifyPassword(current, row.password_hash)))
    )
      throw new AppError(400, "Kata sandi saat ini tidak cocok.");
    if (
      next.toLowerCase() === row.email ||
      next.toLowerCase() === "admin" ||
      (await verifyPassword(next, row.password_hash))
    )
      throw new AppError(
        400,
        "Pilih kata sandi baru yang berbeda dari email dan kata sandi sebelumnya.",
      );
    await client.query(
      "UPDATE users SET password_hash = $1, initial_password = false WHERE id = $2",
      [await hashPassword(next), row.id],
    );
    await client.query("DELETE FROM sessions WHERE user_id = $1", [row.id]);
    await client.query(
      "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')",
      [session.hash, row.id],
    );
    await audit(client, auth, "password.changed", row.id);
    return {
      token: session.token,
      user: publicUser({ ...row, initial_password: false }),
    };
  });
}

export async function snapshot(auth: Auth): Promise<AppSnapshot> {
  if (auth.user.role === "admin" && auth.user.initialPassword)
    return { user: auth.user, members: [], schedules: [], emails: [] };
  // One repeatable-read transaction keeps schedules and their assignments consistent.
  return transaction(async (client) => {
    await client.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const members = await client.query(
      "SELECT id, name, CASE WHEN $1 OR id = $2 THEN email ELSE '' END AS email, organization FROM users WHERE role = 'member' ORDER BY name, id",
      [auth.user.role === "admin", auth.user.id],
    );
    const schedules = await client.query(
      "SELECT s.id, s.date::text, s.version, s.notes, jsonb_agg(jsonb_build_object('memberId', a.member_id, 'status', a.status) ORDER BY a.member_id) AS assignments FROM schedules s JOIN assignments a ON a.schedule_id = s.id GROUP BY s.id ORDER BY s.date, s.id",
    );
    const emails = await client.query(
      'SELECT id, schedule_id AS "scheduleId", member_id AS "memberId", kind, state, error_code AS "errorCode", sent_at AS "sentAt" FROM email_jobs WHERE ($1 OR member_id = $2) ORDER BY created_at DESC LIMIT 200',
      [auth.user.role === "admin", auth.user.id],
    );
    return {
      user: auth.user,
      members: members.rows,
      schedules: schedules.rows.map((row) => ({
        ...row,
        title: SCHEDULE_TITLE,
        location: SCHEDULE_LOCATION,
      })),
      emails: emails.rows,
    };
  });
}

export async function addMember(auth: Auth, input: Record<string, unknown>) {
  requireAccess(auth, true);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (
    !name ||
    name.length > 100 ||
    /[\u0000-\u001f]/.test(name) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !organizations.includes(input.organization as Member["organization"])
  )
    throw new AppError(400, "Periksa nama, email, dan organisasi anggota.");
  requireId(input.requestId);
  const id = input.requestId;
  const hash = await hashPassword(email);
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);
    const previous = await client.query(
      "SELECT name, email, organization FROM users WHERE id = $1",
      [id],
    );
    if (previous.rowCount) {
      const row = previous.rows[0];
      if (
        row.name === name &&
        row.email === email &&
        row.organization === input.organization
      )
        return { id };
      throw new AppError(
        409,
        "Permintaan sudah digunakan. Tutup formulir dan buka kembali.",
      );
    }
    const result = await client.query(
      "INSERT INTO users(id, name, email, organization, role, password_hash) VALUES ($1, $2, $3, $4, 'member', $5) ON CONFLICT (email) DO NOTHING RETURNING id",
      [id, name, email, input.organization, hash],
    );
    if (!result.rowCount)
      throw new AppError(409, "Email ini sudah terdaftar. Gunakan email lain.");
    await audit(client, auth, "member.created", id, {
      name,
      organization: input.organization,
    });
    return { id };
  });
}

export async function saveSchedule(
  auth: Auth,
  input: Record<string, unknown>,
  existingId?: string,
) {
  requireAccess(auth, true);
  if (existingId) {
    requireId(existingId);
    requireVersion(input.version);
  }
  requireDate(input.date);
  if (
    typeof input.notes !== "string" ||
    input.notes.length > 2000 ||
    input.notes.includes("\0")
  )
    throw new AppError(400, "Catatan maksimal 2.000 karakter.");
  const notes = input.notes.trim();
  if (
    !Array.isArray(input.assignments) ||
    input.assignments.length < 1 ||
    input.assignments.length > 100
  )
    throw new AppError(400, "Pilih 1–100 anggota untuk jadwal ini.");
  const ids = input.assignments.map((value) =>
    value && typeof value === "object" ? value.memberId : null,
  );
  ids.forEach(requireId);
  if (new Set(ids).size !== ids.length)
    throw new AppError(400, "Anggota yang sama tidak boleh dipilih dua kali.");
  if (!existingId) requireId(input.requestId);
  const id = existingId ?? (input.requestId as string);
  return transaction(async (client) => {
    // ponytail: serialize schedule edits for this small team to prevent double booking.
    await client.query("SELECT pg_advisory_xact_lock(713422)");
    const found = await client.query(
      "SELECT *, date::text AS date FROM schedules WHERE id = $1 FOR UPDATE",
      [id],
    );
    const previous = existingId ? found : null;
    if (!existingId && found.rowCount) {
      const row = found.rows[0];
      const assigned = await client.query(
        "SELECT member_id FROM assignments WHERE schedule_id = $1 ORDER BY member_id",
        [id],
      );
      if (
        row.date === input.date &&
        row.notes === notes &&
        assigned.rows
          .map((value) => value.member_id)
          .sort()
          .join() === ids.slice().sort().join()
      )
        return { id };
      throw new AppError(
        409,
        "Permintaan sudah digunakan. Tutup formulir dan buka kembali.",
      );
    }
    if (previous && !previous.rowCount)
      throw new AppError(404, "Jadwal sudah dihapus.");
    if (previous && previous.rows[0].version !== input.version)
      throw new AppError(
        409,
        "Jadwal berubah sejak dibuka. Muat ulang sebelum menyimpan.",
      );
    const members = await client.query(
      "SELECT id FROM users WHERE id = ANY($1::text[]) AND role = 'member'",
      [ids],
    );
    if (members.rowCount !== ids.length)
      throw new AppError(400, "Salah satu anggota tidak tersedia.");
    const conflict = await client.query(
      "SELECT s.id FROM schedules s JOIN assignments a ON a.schedule_id = s.id WHERE a.member_id = ANY($1::text[]) AND s.date = $2::date AND s.id <> $3 LIMIT 1",
      [ids, input.date, id],
    );
    if (conflict.rowCount)
      throw new AppError(
        409,
        "Anggota sudah bertugas pada tanggal ini. Pilih tanggal atau anggota lain.",
      );
    if (previous) {
      await client.query(
        "UPDATE schedules SET date = $1, notes = $2, version = version + 1, mail_version = mail_version + 1, updated_at = now() WHERE id = $3",
        [input.date, notes, id],
      );
      await client.query(
        "DELETE FROM assignments WHERE schedule_id = $1 AND NOT (member_id = ANY($2::text[]))",
        [id, ids],
      );
      await client.query(
        "UPDATE email_jobs SET state = 'cancelled', error_code = 'schedule_changed' WHERE schedule_id = $1 AND state IN ('pending', 'sending', 'review')",
        [id],
      );
    } else
      await client.query(
        "INSERT INTO schedules(id, date, notes) VALUES ($1, $2, $3)",
        [id, input.date, notes],
      );
    for (const memberId of ids)
      await client.query(
        "INSERT INTO assignments(schedule_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, memberId],
      );
    await queueEmails(client, id, "assignment");
    // If tomorrow's daily cron has already run, queue H−1 immediately too.
    await queueEmails(client, id, "reminder");
    await audit(
      client,
      auth,
      previous ? "schedule.updated" : "schedule.created",
      id,
      {
        date: input.date,
        memberIds: ids,
      },
    );
    return { id };
  });
}

export async function updateStatus(
  auth: Auth,
  id: string,
  input: Record<string, unknown>,
) {
  requireAccess(auth);
  requireId(id);
  requireId(input.memberId);
  requireVersion(input.version);
  if (!["scheduled", "done", "skipped"].includes(input.status as string))
    throw new AppError(400, "Status tugas tidak valid.");
  if (auth.user.role !== "admin" && input.memberId !== auth.user.id)
    throw new AppError(403, "Anda hanya dapat mengubah status tugas sendiri.");
  return transaction(async (client) => {
    const schedule = await client.query(
      "SELECT version FROM schedules WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!schedule.rowCount) throw new AppError(404, "Jadwal sudah dihapus.");
    if (schedule.rows[0].version !== input.version)
      throw new AppError(
        409,
        "Jadwal berubah. Muat ulang sebelum mengubah status.",
      );
    const result = await client.query(
      "UPDATE assignments SET status = $1 WHERE schedule_id = $2 AND member_id = $3 RETURNING member_id",
      [input.status, id, input.memberId],
    );
    if (!result.rowCount)
      throw new AppError(404, "Anggota tidak ditugaskan pada jadwal ini.");
    await client.query(
      "UPDATE schedules SET version = version + 1, updated_at = now() WHERE id = $1",
      [id],
    );
    if (input.status !== "scheduled")
      await client.query(
        "UPDATE email_jobs SET state = 'cancelled', error_code = 'assignment_inactive' WHERE schedule_id = $1 AND member_id = $2 AND state IN ('pending', 'sending', 'review')",
        [id, input.memberId],
      );
    else {
      await queueEmails(client, id, "assignment");
      await queueEmails(client, id, "reminder");
    }
    await audit(client, auth, "assignment.status_changed", id, {
      memberId: input.memberId,
      status: input.status,
    });
  });
}

export async function deleteSchedule(auth: Auth, id: string, version: unknown) {
  requireAccess(auth, true);
  requireId(id);
  requireVersion(version);
  await transaction(async (client) => {
    const previous = await client.query(
      "SELECT s.id, s.date::text, s.start_minute, s.end_minute, s.notes, s.version, (SELECT jsonb_agg(jsonb_build_object('memberId', a.member_id, 'status', a.status)) FROM assignments a WHERE a.schedule_id = s.id) AS assignments FROM schedules s WHERE s.id = $1 FOR UPDATE",
      [id],
    );
    const result = await client.query(
      "DELETE FROM schedules WHERE id = $1 AND version = $2 RETURNING id",
      [id, version],
    );
    if (!result.rowCount)
      throw new AppError(
        409,
        "Jadwal berubah atau sudah dihapus. Muat ulang daftar.",
      );
    await audit(client, auth, "schedule.deleted", id, previous.rows[0]);
  });
}

export async function retryDefiniteFailures(auth: Auth) {
  requireAccess(auth, true);
  await transaction(async (client) => {
    const result = await client.query(
      "UPDATE email_jobs SET state = 'pending', next_attempt_at = now() WHERE state IN ('pending', 'review') AND uncertain_since IS NULL RETURNING id",
    );
    await audit(client, auth, "email.retry_requested", "queue", {
      count: result.rowCount,
    });
  });
}
