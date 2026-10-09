import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { database } from "./db";
import { AppError } from "./security";

export function appOrigin() {
  const url = new URL(process.env.APP_URL ?? "http://localhost:3000");
  if (process.env.VERCEL && (!process.env.APP_URL || url.protocol !== "https:"))
    throw new AppError(503, "Konfigurasi APP_URL HTTPS belum tersedia.");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new AppError(503, "Konfigurasi APP_URL tidak valid.");
  return url.origin;
}

export async function queueEmails(
  client: PoolClient,
  scheduleId: string,
  kind: "assignment" | "reminder",
) {
  const result = await client.query(
    "SELECT s.id, s.date::text, s.notes, s.mail_version, u.id AS member_id, u.name, u.email, u.version FROM schedules s JOIN assignments a ON a.schedule_id = s.id JOIN users u ON u.id = a.member_id WHERE s.id = $1 AND u.deleted_at IS NULL AND a.status = 'scheduled' AND s.date >= (now() AT TIME ZONE 'Asia/Jakarta')::date AND ($2 = 'assignment' OR s.date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1) AND ($2 <> 'assignment' OR NOT EXISTS (SELECT 1 FROM email_jobs e WHERE e.schedule_id = s.id AND e.member_id = a.member_id AND e.kind = 'assignment' AND (e.state = 'sent' OR (e.uncertain_since IS NOT NULL AND e.job_key <> 'assignment/' || s.id || '/' || s.mail_version || '/' || u.id || CASE WHEN u.version > 1 THEN '/member/' || u.version ELSE '' END))))",
    [scheduleId, kind],
  );
  if (!result.rowCount) return;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)
    throw new AppError(
      503,
      "Konfigurasi pengiriman email belum tersedia. Jadwal belum disimpan.",
    );
  const origin = appOrigin();
  for (const row of result.rows) {
    const link = `${origin}/?jadwal=${row.id}`;
    const text = `Halo ${row.name},\n\n${kind === "assignment" ? "Anda telah ditugaskan untuk piket di Ruang Opsi." : "Pengingat: besok Anda bertugas piket di Ruang Opsi."}\n\nTanggal: ${row.date}\nLokasi: Ruang Opsi\n${row.notes ? `Catatan: ${row.notes}\n` : ""}\nBuka jadwal: ${link}\n\nSetelah bertugas, tandai tugas Anda sebagai selesai di aplikasi.\nJika masih menggunakan kata sandi awal, ubah melalui Pengaturan.\n\nPiket Opsi · Asia/Jakarta`;
    const payload = {
      from: process.env.RESEND_FROM,
      to: [row.email],
      subject: `${kind === "assignment" ? "Penugasan piket" : "Pengingat piket besok"} · ${row.date} · Ruang Opsi`,
      text,
      // Priority hints for supporting mail clients; Gmail importance is recipient-controlled.
      headers: { "X-Priority": "1", Importance: "high" },
    };
    await client.query(
      "INSERT INTO email_jobs(id, job_key, schedule_id, member_id, mail_version, kind, payload, state) VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $6 = 'assignment' THEN 'waiting' ELSE 'pending' END) ON CONFLICT (job_key) DO UPDATE SET state = CASE WHEN EXCLUDED.kind = 'assignment' THEN 'waiting' ELSE 'pending' END, next_attempt_at = now(), error_code = NULL WHERE email_jobs.state = 'cancelled' AND email_jobs.error_code = 'assignment_inactive' AND (email_jobs.uncertain_since IS NULL OR email_jobs.uncertain_since > now() - interval '23 hours') AND email_jobs.provider_id IS NULL",
      [
        randomUUID(),
        `${kind}/${row.id}/${row.mail_version}/${row.member_id}${row.version > 1 ? `/member/${row.version}` : ""}`,
        row.id,
        row.member_id,
        row.mail_version,
        kind,
        JSON.stringify(payload),
      ],
    );
  }
}

export async function releaseAssignmentEmails(slot?: number, actorId?: string, scheduleId?: string) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const settings = (
      await client.query(
        "SELECT daily_hour, extract(hour FROM now() AT TIME ZONE 'Asia/Jakarta')::int AS hour FROM notification_settings FOR UPDATE",
      )
    ).rows[0];
    let released = 0;
    if (
      slot === undefined ||
      (settings.daily_hour === slot && settings.hour === slot)
    ) {
      const result = await client.query(
        "UPDATE email_jobs e SET state = 'pending', next_attempt_at = now() WHERE e.kind = 'assignment' AND e.state = 'waiting' AND ($1::uuid IS NULL OR e.schedule_id = $1) AND EXISTS (SELECT 1 FROM schedules s JOIN assignments a ON a.schedule_id = s.id AND a.member_id = e.member_id JOIN users u ON u.id = a.member_id WHERE s.id = e.schedule_id AND u.deleted_at IS NULL AND s.mail_version = e.mail_version AND a.status = 'scheduled' AND s.date >= (now() AT TIME ZONE 'Asia/Jakarta')::date) AND NOT EXISTS (SELECT 1 FROM email_jobs sent WHERE sent.schedule_id = e.schedule_id AND sent.member_id = e.member_id AND sent.kind = 'assignment' AND sent.state = 'sent')",
        [scheduleId ?? null],
      );
      released = result.rowCount ?? 0;
      if (actorId)
        await client.query(
          "INSERT INTO audit_events(actor_id, action, target_id, details) VALUES ($1, 'notifications.send_requested', 'queue', $2)",
          [actorId, JSON.stringify({ released })],
        );
    }
    await client.query("COMMIT");
    return { released, hour: settings.hour as number };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function queueTomorrowReminders() {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const schedules = await client.query(
      "SELECT id FROM schedules WHERE date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1 ORDER BY id FOR UPDATE",
    );
    for (const row of schedules.rows)
      await queueEmails(client, row.id, "reminder");
    await client.query("DELETE FROM sessions WHERE expires_at < now()");
    await client.query(
      "DELETE FROM login_limits WHERE resets_at < now() - interval '1 day'",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processEmailJobs() {
  if (!process.env.RESEND_API_KEY)
    throw new AppError(503, "RESEND_API_KEY belum tersedia.");
  let client: PoolClient | undefined;
  let locked = false;
  const owner = randomUUID();
  let inTransaction = false;
  const stats = { sent: 0, cancelled: 0, pending: 0, review: 0 };
  const started = Date.now();
  try {
    // Leave time for cleanup within Vercel Hobby's 300-second Fluid Compute limit.
    while (!locked && Date.now() - started < 220000) {
      const acquired = await database().query(
        "INSERT INTO worker_leases(name, owner, expires_at) VALUES ('email', $1, now() + interval '330 seconds') ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, expires_at = EXCLUDED.expires_at WHERE worker_leases.expires_at <= now() RETURNING owner",
        [owner],
      );
      locked = Boolean(acquired.rowCount);
      if (!locked) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!locked) return { ...stats, busy: true };
    client = await database().connect();
    while (Date.now() - started < 220000) {
      await client.query("BEGIN");
      inTransaction = true;
      const result = await client.query(
        "SELECT * FROM email_jobs WHERE state IN ('pending', 'sending') AND next_attempt_at <= now() ORDER BY CASE WHEN kind = 'assignment' THEN 0 ELSE 1 END, created_at, id LIMIT 1",
      );
      let job = result.rows[0];
      if (!job) {
        await client.query("COMMIT");
        inTransaction = false;
        break;
      }
      const schedule = await client.query(
        "SELECT s.mail_version, a.status, u.deleted_at IS NULL AS member_active, s.date >= (now() AT TIME ZONE 'Asia/Jakarta')::date AS not_past, s.date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1 AS tomorrow, EXISTS (SELECT 1 FROM email_jobs e WHERE e.schedule_id = s.id AND e.member_id = a.member_id AND e.kind = 'assignment' AND e.state = 'sent') AS notified FROM schedules s JOIN assignments a ON a.schedule_id = s.id AND a.member_id = $2 JOIN users u ON u.id = a.member_id WHERE s.id = $1 FOR UPDATE OF s",
        [job.schedule_id, job.member_id],
      );
      const row = schedule.rows[0];
      const current = await client.query(
        "SELECT * FROM email_jobs WHERE id = $1 FOR UPDATE",
        [job.id],
      );
      if (!["pending", "sending"].includes(current.rows[0]?.state)) {
        await client.query("COMMIT");
        inTransaction = false;
        continue;
      }
      job = current.rows[0];
      if (
        !row ||
        !row.member_active ||
        row.mail_version !== job.mail_version ||
        row.status !== "scheduled" ||
        !row.not_past ||
        (job.kind === "reminder" && !row.tomorrow)
      ) {
        await client.query(
          "UPDATE email_jobs SET state = 'cancelled', error_code = 'assignment_inactive_or_expired' WHERE id = $1",
          [job.id],
        );
        await client.query("COMMIT");
        inTransaction = false;
        stats.cancelled++;
        continue;
      }
      if (job.kind === "assignment" && row.notified) {
        await client.query(
          "UPDATE email_jobs SET state = 'cancelled', error_code = 'assignment_already_notified' WHERE id = $1",
          [job.id],
        );
        await client.query("COMMIT");
        inTransaction = false;
        stats.cancelled++;
        continue;
      }
      // Resend idempotency lasts 24h. Ambiguous sends are never automatically retried outside that window.
      if (
        job.uncertain_since &&
        Date.now() - new Date(job.uncertain_since).getTime() >= 23 * 3600000
      ) {
        await client.query(
          "UPDATE email_jobs SET state = 'review', error_code = 'delivery_requires_review' WHERE id = $1",
          [job.id],
        );
        await client.query("COMMIT");
        inTransaction = false;
        stats.review++;
        continue;
      }
      const periods = (
        await client.query(
          "SELECT 'day:' || (now() AT TIME ZONE 'UTC')::date AS day, 'month:' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM') AS month",
        )
      ).rows[0];
      let quota = true;
      for (const [period, limit] of [
        [periods.day, 100],
        [periods.month, 3000],
      ] as const) {
        await client.query(
          "INSERT INTO email_budget(period) VALUES ($1) ON CONFLICT DO NOTHING",
          [period],
        );
        const budget = await client.query(
          "SELECT used FROM email_budget WHERE period = $1 FOR UPDATE",
          [period],
        );
        if (budget.rows[0].used >= limit) quota = false;
      }
      if (!quota) {
        await client.query(
          "UPDATE email_jobs SET error_code = 'free_plan_quota', next_attempt_at = now() + interval '1 hour' WHERE id = $1",
          [job.id],
        );
        await client.query("COMMIT");
        inTransaction = false;
        stats.pending++;
        break;
      }
      for (const period of [periods.day, periods.month])
        await client.query(
          "UPDATE email_budget SET used = used + 1 WHERE period = $1",
          [period],
        );
      await client.query(
        "UPDATE email_jobs SET state = 'sending', attempts = attempts + 1, uncertain_since = COALESCE(uncertain_since, now()), next_attempt_at = now() + interval '2 minutes' WHERE id = $1",
        [job.id],
      );
      await client.query("COMMIT");
      inTransaction = false;

      await client.query("BEGIN");
      inTransaction = true;
      // Keep the schedule locked through delivery: edits/deletes cannot send stale assignments.
      await client.query("SELECT id FROM schedules WHERE id = $1 FOR UPDATE", [
        job.schedule_id,
      ]);
      const active = await client.query(
        "SELECT state FROM email_jobs WHERE id = $1 FOR UPDATE",
        [job.id],
      );
      if (active.rows[0]?.state !== "sending") {
        await client.query("COMMIT");
        inTransaction = false;
        continue;
      }
      let state = "pending",
        code: string | null = "network_error",
        providerId: string | null = null,
        definiteRejection = false;
      try {
        const endpoint =
          process.env.NODE_ENV !== "production" && process.env.MAIL_TEST_URL
            ? process.env.MAIL_TEST_URL
            : "https://api.resend.com/emails";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": job.job_key,
          },
          body: JSON.stringify(job.payload),
          signal: AbortSignal.timeout(8000),
        });
        const data = await response.json();
        if (response.ok && typeof data.id === "string") {
          state = "sent";
          providerId = data.id;
          code = null;
          stats.sent++;
        } else {
          code =
            typeof data.name === "string" && /^[a-z_]{1,80}$/.test(data.name)
              ? data.name
              : `provider_${response.status}`;
          definiteRejection =
            response.status >= 400 &&
            response.status < 500 &&
            code !== "concurrent_idempotent_requests";
          if (definiteRejection && response.status !== 429) state = "review";
        }
      } catch {
        /* Durable job remains eligible for retry with the identical payload and key. */
      }
      await client.query(
        "UPDATE email_jobs SET state = $1, provider_id = $2, error_code = $3, sent_at = CASE WHEN $1 = 'sent' THEN now() ELSE NULL END, uncertain_since = CASE WHEN $4 THEN NULL ELSE uncertain_since END, next_attempt_at = now() + interval '2 minutes' WHERE id = $5",
        [state, providerId, code, definiteRejection, job.id],
      );
      await client.query("COMMIT");
      inTransaction = false;
      // Space every provider attempt, including rejected/ambiguous requests.
      await new Promise((resolve) => setTimeout(resolve, 550));
      if (state === "pending") {
        stats.pending++;
        break;
      }
      if (state === "review") stats.review++;
    }
    return stats;
  } finally {
    if (inTransaction && client) await client.query("ROLLBACK").catch(() => {});
    client?.release();
    if (locked)
      await database()
        .query(
          "DELETE FROM worker_leases WHERE name = 'email' AND owner = $1",
          [owner],
        )
        .catch(() => {});
  }
}
