import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { hashPassword } from "../../lib/server/security";
import { jakartaToday, shiftDate } from "../../lib/domain";

const origin = "http://localhost:3100";
const recipient = "arpeggio.gns@gmail.com";
const adminPassword = "Admin-piket-strong-2026!";
const memberPassword = "Member-piket-strong-2026!";
const db = new pg.Pool({
  connectionString:
    process.env.E2E_DATABASE_URL ??
    "postgresql://postgres:piket-test-only@localhost:55439/piket_test",
});
async function send(
  request: APIRequestContext,
  path: string,
  method = "POST",
  data: unknown = {},
) {
  return request.fetch(`/api/${path}`, {
    method,
    data,
    headers: { Origin: origin },
  });
}
async function admin(request: APIRequestContext) {
  expect(
    (
      await send(request, "auth/login", "POST", {
        email: "admin",
        password: "admin",
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await send(request, "auth/password", "POST", {
        newPassword: adminPassword,
      })
    ).status(),
  ).toBe(200);
}
async function member(
  request: APIRequestContext,
  email = recipient,
  name = "Arpeggio",
  organization = "BEM",
) {
  const result = await send(request, "members", "POST", {
    requestId: randomUUID(),
    name,
    email,
    organization,
  });
  expect(result.status()).toBe(201);
  return (await result.json()).id as string;
}
async function schedules(request: APIRequestContext) {
  return (await (await request.get("/api/snapshot")).json()).schedules;
}
function schedule(memberId: string, offset = 5) {
  return {
    requestId: randomUUID(),
    date: shiftDate(jakartaToday(), offset),
    startTime: "08:00",
    endTime: "09:00",
    notes: "Rapikan Ruang Opsi.",
    assignments: [{ memberId, status: "scheduled" }],
  };
}
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Email atau admin", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}
async function navigate(page: Page, label: string) {
  const button = page.getByRole("button", { name: label, exact: true });
  if (!(await button.isVisible()))
    await page.getByRole("button", { name: "Buka atau tutup menu" }).click();
  await button.click();
}
async function captures(request: APIRequestContext) {
  return (await (
    await request.get("http://127.0.0.1:3419/messages")
  ).json()) as {
    key: string;
    payload: { to: string[]; text: string; subject: string };
    receivedAt: string;
  }[];
}

test.beforeEach(async ({ request }) => {
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT count(*)::int AS count FROM worker_leases WHERE expires_at > now()",
          )
        ).rows[0].count,
      { timeout: 15000 },
    )
    .toBe(0);
  const client = await db.connect();
  try {
    await client.query(
      "TRUNCATE audit_events, email_jobs, email_budget, worker_leases, assignments, schedules, sessions, login_limits, users RESTART IDENTITY CASCADE",
    );
    await client.query(
      "INSERT INTO users(id, name, email, role, password_hash) VALUES ('admin', 'Admin', 'admin', 'admin', $1)",
      [await hashPassword("admin")],
    );
    await request.post("http://127.0.0.1:3419/reset");
  } finally {
    client.release();
  }
});
test.afterAll(async () => {
  await db.end();
});

test("admin onboarding, organization-based assignment, immediate email, and persistence", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, "admin", "admin");
  await expect(
    page.getByText("Ganti kata sandi admin", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Kata sandi saat ini", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Kata sandi baru", { exact: true }).fill(adminPassword);
  await page
    .getByRole("button", { name: "Tampilkan kata sandi baru", exact: true })
    .click();
  await expect(
    page.getByLabel("Kata sandi baru", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page
    .getByLabel("Konfirmasi kata sandi baru", { exact: true })
    .fill(adminPassword);
  await page.getByRole("button", { name: "Simpan dan lanjutkan" }).click();
  await expect(
    page.getByRole("tab", { name: "Kalender", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await navigate(page, "Anggota");
  await page
    .getByRole("button", { name: "Tambah anggota", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama lengkap", { exact: true }).fill("Arpeggio");
  await dialog.getByLabel("Email", { exact: true }).fill(recipient);
  await dialog
    .getByRole("combobox", { name: "Organisasi", exact: true })
    .click();
  await page.getByRole("option", { name: "BEM", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Tambah anggota", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "Arpeggio" }).first(),
  ).toBeVisible();
  await member(page.context().request, "other@example.com", "Other", "BPM");
  await page.getByRole("button", { name: "Muat ulang jadwal" }).click();
  await expect(page.getByRole("cell", { name: "Other" }).first()).toBeVisible();
  await navigate(page, "Jadwal");
  await page
    .getByRole("button", { name: "Buat jadwal", exact: true })
    .first()
    .click();
  await expect(dialog.getByRole("checkbox")).toHaveCount(2);
  await dialog
    .getByRole("combobox", { name: "Filter organisasi penugasan" })
    .click();
  await page.getByRole("option", { name: "BEM", exact: true }).click();
  await expect(dialog.getByRole("checkbox")).toHaveCount(1);
  await dialog.getByRole("checkbox").first().check();
  // Always use a future date, including when this test runs after 23:00 WIB.
  const plannedDate = shiftDate(jakartaToday(), 2);
  const [year, month, day] = plannedDate.split("-").map(Number);
  await dialog.getByRole("button", { name: "Pilih tanggal jadwal" }).click();
  const dayButton = page.locator(
    `[data-slot="calendar"] [data-day="${day}/${month}/${year}"]`,
  );
  if ((await dayButton.count()) === 0)
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
  await dayButton.click();
  await dialog.getByLabel("Mulai (WIB)").fill("23:00");
  await dialog.getByLabel("Selesai (WIB)").fill("23:30");
  await dialog
    .getByRole("button", { name: "Buat jadwal", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  const emails = await captures(request);
  expect(emails[0].payload.to).toEqual([recipient]);
  expect(emails[0].payload.text).toContain(
    "Buka jadwal: http://localhost:3100/?jadwal=",
  );
  const value = (await schedules(page.context().request))[0];
  expect(value.location).toBe("Ruang Opsi");
  expect(value.assignments).toHaveLength(1);
  expect(value.date).toBe(plannedDate);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Jadwal piket" }),
  ).toBeVisible();
  expect((await schedules(page.context().request))[0].id).toBe(value.id);
  expect(errors).toEqual([]);
});

test("member receives password notification and first setup omits current password", async ({
  page,
  request,
}) => {
  await admin(request);
  const id = await member(request);
  const created = await send(request, "schedules", "POST", schedule(id, 3));
  expect(created.status()).toBe(201);
  const scheduleId = (await created.json()).id;
  await signIn(page, recipient, recipient);
  await expect(
    page.getByRole("tab", { name: "Detail", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("Email Anda masih menjadi kata sandi awal.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Atur kata sandi", exact: true })
    .click();
  await expect(
    page.getByLabel("Kata sandi saat ini", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Kata sandi baru", { exact: true })
    .fill(memberPassword);
  await page
    .getByLabel("Konfirmasi kata sandi baru", { exact: true })
    .fill(memberPassword);
  // A failed follow-up read must not report that a saved password failed.
  await page.route("**/api/snapshot", (route) => route.abort("failed"));
  await page
    .getByRole("button", { name: "Simpan kata sandi", exact: true })
    .click();
  await expect(
    page.getByText("Kata sandi telah diubah. Muat ulang untuk melihat data terbaru.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.unroute("**/api/snapshot");
  await expect(
    page.getByText("Email Anda masih menjadi kata sandi awal.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Kata sandi saat ini", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Jadwal piket" }),
  ).toBeVisible();
  const current = page.context().request;
  const state = await (await current.get("/api/snapshot")).json();
  expect(state.user.initialPassword).toBe(false);
  expect(
    (
      await send(current, "auth/password", "POST", {
        newPassword: "Another-unique-passphrase!",
      })
    ).status(),
  ).toBe(400);
  await page.goto(`/?jadwal=${scheduleId}`);
  await expect(
    page
      .getByRole("dialog")
      .getByText("Detail jadwal dan status setiap anggota."),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Status Arpeggio" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Status Arpeggio" }).click();
  await page.getByRole("option", { name: "Selesai", exact: true }).click();
  await expect
    .poll(async () => (await schedules(current))[0].assignments[0].status)
    .toBe("done");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Status Arpeggio" }),
  ).toContainText("Selesai");
});

test("server permissions, CSRF, first-admin gate, session rotation and expiry", async ({
  request,
  playwright,
}) => {
  expect((await request.get("/api/snapshot")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        data: { email: "admin", password: "admin" },
        headers: { Origin: "https://attacker.example" },
      })
    ).status(),
  ).toBe(403);
  const initial = await send(request, "auth/login", "POST", {
    email: "admin",
    password: "admin",
  });
  expect(initial.status()).toBe(200);
  expect(initial.headers()["set-cookie"]).toContain("HttpOnly");
  expect(initial.headers()["set-cookie"]).toContain("SameSite=strict");
  expect(
    (
      await send(request, "members", "POST", {
        requestId: randomUUID(),
        name: "Hidden",
        email: "hidden@example.com",
        organization: "BEM",
      })
    ).status(),
  ).toBe(403);
  const otherSession = await playwright.request.newContext({
    baseURL: origin,
    storageState: await request.storageState(),
  });
  expect(
    (
      await send(request, "auth/password", "POST", {
        newPassword: adminPassword,
      })
    ).status(),
  ).toBe(200);
  expect((await otherSession.get("/api/snapshot")).status()).toBe(401);
  await otherSession.dispose();
  const a = await member(request),
    b = await member(request, "other@example.com", "Other", "BPM");
  const value = schedule(a);
  value.assignments.push({ memberId: b, status: "scheduled" });
  const created = await send(request, "schedules", "POST", value);
  const scheduleId = (await created.json()).id;
  const memberClient = await playwright.request.newContext({ baseURL: origin });
  expect(
    (
      await send(memberClient, "auth/login", "POST", {
        email: recipient,
        password: recipient,
      })
    ).status(),
  ).toBe(200);
  const data = await (await memberClient.get("/api/snapshot")).json();
  expect(data.members.find((m: { id: string }) => m.id === b).email).toBe("");
  expect(JSON.stringify(data)).not.toContain("password_hash");
  expect((await send(memberClient, "members", "POST", {})).status()).toBe(403);
  expect(
    (
      await send(memberClient, `schedules/${scheduleId}/status`, "PATCH", {
        memberId: b,
        status: "done",
        version: 1,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await send(memberClient, `schedules/${scheduleId}`, "DELETE", {
        version: 1,
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  expect(
    (
      await request.get("/api/cron/reminders", {
        headers: {
          Authorization: "é".repeat(
            "Bearer e2e-private-cron-secret-32-characters".length,
          ),
        },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await send(memberClient, `schedules/${scheduleId}/status`, "PATCH", {
        memberId: a,
        status: "done",
        version: 1,
      })
    ).status(),
  ).toBe(200);
  await db.query(
    "UPDATE sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1",
    [a],
  );
  expect((await memberClient.get("/api/snapshot")).status()).toBe(401);
  await memberClient.dispose();
});

test("concurrent saves, duplicate retries, status preservation and input validation", async ({
  request,
}) => {
  await admin(request);
  const id = await member(request);
  const first = schedule(id);
  const duplicates = await Promise.all([
    send(request, "schedules", "POST", first),
    send(request, "schedules", "POST", first),
  ]);
  expect(duplicates.map((value) => value.status())).toEqual([201, 201]);
  expect(await schedules(request)).toHaveLength(1);
  const second = schedule(id, 6),
    third = { ...second, requestId: randomUUID() };
  const conflicts = await Promise.all([
    send(request, "schedules", "POST", second),
    send(request, "schedules", "POST", third),
  ]);
  expect(conflicts.map((value) => value.status()).sort()).toEqual([201, 409]);
  const saved = (await schedules(request)).find(
    (s: { id: string }) => s.id === first.requestId,
  );
  const status = await send(request, `schedules/${saved.id}/status`, "PATCH", {
    memberId: id,
    status: "done",
    version: saved.version,
  });
  expect(status.status()).toBe(200);
  expect(
    (
      await send(request, `schedules/${saved.id}`, "PUT", {
        ...first,
        notes: "Stale",
        version: saved.version,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await send(request, `schedules/${saved.id}`, "PUT", {
        ...first,
        notes: "Updated",
        version: saved.version + 1,
      })
    ).status(),
  ).toBe(200);
  const updated = (await schedules(request)).find(
    (s: { id: string }) => s.id === saved.id,
  );
  expect(updated.assignments[0].status).toBe("done");
  for (const bad of [
    { date: "2026-02-30" },
    { endTime: "07:00" },
    { startTime: "24:00" },
    { assignments: [] },
    { assignments: [{ memberId: "admin" }] },
    { notes: "x".repeat(2001) },
  ])
    expect(
      (
        await send(request, "schedules", "POST", { ...schedule(id, 9), ...bad })
      ).status(),
    ).toBe(400);
  expect(
    (
      await request.post("/api/members", {
        headers: { Origin: origin, "Content-Type": "application/json" },
        data: "x".repeat(17000),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await send(request, `schedules/${saved.id}`, "DELETE", {
        version: updated.version,
      })
    ).status(),
  ).toBe(200);
  expect(
    (await schedules(request)).some((s: { id: string }) => s.id === saved.id),
  ).toBe(false);
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM email_jobs WHERE schedule_id = $1",
        [saved.id],
      )
    ).rows[0].count,
  ).toBe(0);
});

test("assignment email is immediate, H−1 cron is protected and repeated runs deduplicate", async ({
  request,
}) => {
  await admin(request);
  const id = await member(request);
  const first = schedule(id, 2);
  expect((await send(request, "schedules", "POST", first)).status()).toBe(201);
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  const assignment = (await captures(request))[0];
  expect(assignment.key).toContain("assignment/");
  expect(assignment.payload.to).toEqual([recipient]);
  expect(Date.now() - new Date(assignment.receivedAt).getTime()).toBeLessThan(
    30000,
  );
  await db.query(
    "UPDATE schedules SET date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1 WHERE id = $1",
    [first.requestId],
  );
  const headers = {
    Authorization: "Bearer e2e-private-cron-secret-32-characters",
  };
  expect((await request.get("/api/cron/reminders", { headers })).status()).toBe(
    200,
  );
  expect((await request.get("/api/cron/reminders", { headers })).status()).toBe(
    200,
  );
  await expect.poll(async () => (await captures(request)).length).toBe(2);
  const reminder = (await captures(request)).find((value) =>
    value.key.startsWith("reminder/"),
  );
  expect(reminder?.payload.text).toContain("besok Anda bertugas");
  expect(reminder?.payload.text).toContain(shiftDate(jakartaToday(), 1));
  const counts = await db.query(
    "SELECT kind, count(*)::int AS count FROM email_jobs GROUP BY kind",
  );
  expect(counts.rows.every((row) => row.count === 1)).toBe(true);
});

test("mail failures persist, retries are idempotent, expired uncertainty needs review, quota is enforced", async ({
  request,
}) => {
  await admin(request);
  const id = await member(request);
  await request.post("http://127.0.0.1:3419/mode/ambiguous");
  const first = schedule(id, 8);
  expect((await send(request, "schedules", "POST", first)).status()).toBe(201);
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT state FROM email_jobs WHERE schedule_id = $1",
            [first.requestId],
          )
        ).rows[0]?.state,
    )
    .toBe("pending");
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  await request.post("http://127.0.0.1:3419/mode/ok");
  await db.query(
    "UPDATE email_jobs SET next_attempt_at = now() WHERE schedule_id = $1",
    [first.requestId],
  );
  expect((await send(request, "emails/process")).status()).toBe(200);
  expect(await captures(request)).toHaveLength(1);
  expect(
    (
      await db.query("SELECT state FROM email_jobs WHERE schedule_id = $1", [
        first.requestId,
      ])
    ).rows[0].state,
  ).toBe("sent");

  await request.post("http://127.0.0.1:3419/mode/ambiguous");
  const uncertain = schedule(id, 10);
  expect((await send(request, "schedules", "POST", uncertain)).status()).toBe(
    201,
  );
  await expect.poll(async () => (await captures(request)).length).toBe(2);
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT state FROM email_jobs WHERE schedule_id = $1",
            [uncertain.requestId],
          )
        ).rows[0]?.state,
    )
    .toBe("pending");
  await db.query(
    "UPDATE email_jobs SET uncertain_since = now() - interval '25 hours', next_attempt_at = now() WHERE schedule_id = $1",
    [uncertain.requestId],
  );
  expect((await send(request, "emails/process")).status()).toBe(200);
  expect(
    (
      await db.query("SELECT state FROM email_jobs WHERE schedule_id = $1", [
        uncertain.requestId,
      ])
    ).rows[0].state,
  ).toBe("review");
  expect(await captures(request)).toHaveLength(2);

  await request.post("http://127.0.0.1:3419/mode/ok");
  await db.query(
    "INSERT INTO email_budget(period, used) VALUES ('day:' || (now() AT TIME ZONE 'UTC')::date, 100) ON CONFLICT (period) DO UPDATE SET used = 100",
  );
  const queued = schedule(id, 12);
  expect((await send(request, "schedules", "POST", queued)).status()).toBe(201);
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT error_code FROM email_jobs WHERE schedule_id = $1",
            [queued.requestId],
          )
        ).rows[0]?.error_code,
    )
    .toBe("free_plan_quota");
  expect(await captures(request)).toHaveLength(2);
});

test("mobile calendar uses dots and distinct today, filters work, themes persist, offline form keeps input", async ({
  page,
  request,
}, info) => {
  await admin(request);
  const id = await member(request);
  expect(
    (await send(request, "schedules", "POST", schedule(id, 3))).status(),
  ).toBe(201);
  await signIn(page, recipient, recipient);
  await page.getByRole("tab", { name: "Kalender", exact: true }).click();
  await expect(
    page.locator(`button[data-day="${jakartaToday()}"]`),
  ).toHaveAttribute("aria-current", "date");
  if (info.project.name === "mobile") {
    await expect(
      page.locator('[data-slot="calendar-event-dot"]').first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Buka filter jadwal" }).click();
    const filters = page.getByRole("dialog");
    await filters
      .getByRole("combobox", { name: "Filter rentang hari" })
      .click();
    await page
      .getByRole("option", { name: "3 hari ke depan", exact: true })
      .click();
    await filters.getByRole("button", { name: /Lihat .* jadwal/ }).click();
    await expect(
      page.getByText("0 jadwal ditampilkan", { exact: true }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
  }
  await page.getByRole("button", { name: /tema/i }).click();
  await page.getByRole("menuitemradio", { name: "Gelap", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page
    .getByRole("button", { name: "Atur kata sandi", exact: true })
    .click();
  await page
    .getByLabel("Kata sandi baru", { exact: true })
    .fill(memberPassword);
  await page
    .getByLabel("Konfirmasi kata sandi baru", { exact: true })
    .fill(memberPassword);
  await page.route("**/api/auth/password", (route) =>
    route.abort("internetdisconnected"),
  );
  await page
    .getByRole("button", { name: "Simpan kata sandi", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Koneksi terputus" }),
  ).toBeVisible();
  await expect(page.getByLabel("Kata sandi baru", { exact: true })).toHaveValue(
    memberPassword,
  );
  await page.screenshot({
    path: `test-results/${info.project.name}-password-offline.png`,
    fullPage: true,
  });
});

test("login rate limit is persisted in PostgreSQL", async ({ request }) => {
  for (let attempt = 0; attempt < 8; attempt++)
    expect(
      (
        await send(request, "auth/login", "POST", {
          email: "unknown@example.com",
          password: "wrong",
        })
      ).status(),
    ).toBe(401);
  expect(
    (
      await send(request, "auth/login", "POST", {
        email: "unknown@example.com",
        password: "wrong",
      })
    ).status(),
  ).toBe(429);
});

test("status changes cancel queued mail and concurrent workers deliver a restored assignment once", async ({
  request,
}) => {
  await admin(request);
  const id = await member(request);
  await request.post("http://127.0.0.1:3419/mode/rate-limit");
  const value = schedule(id, 4);
  expect((await send(request, "schedules", "POST", value)).status()).toBe(201);
  await expect
    .poll(
      async () =>
        (
          await db.query(
            "SELECT error_code FROM email_jobs WHERE schedule_id = $1",
            [value.requestId],
          )
        ).rows[0]?.error_code,
    )
    .toBe("rate_limit_exceeded");
  expect(
    (
      await send(request, `schedules/${value.requestId}/status`, "PATCH", {
        memberId: id,
        status: "skipped",
        version: 1,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await db.query("SELECT state FROM email_jobs WHERE schedule_id = $1", [
        value.requestId,
      ])
    ).rows[0].state,
  ).toBe("cancelled");
  await request.post("http://127.0.0.1:3419/mode/ok");
  expect(
    (
      await send(request, `schedules/${value.requestId}/status`, "PATCH", {
        memberId: id,
        status: "scheduled",
        version: 2,
      })
    ).status(),
  ).toBe(200);
  const workers = await Promise.all([
    send(request, "emails/process"),
    send(request, "emails/process"),
  ]);
  expect(workers.every((result) => result.status() === 200)).toBe(true);
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  expect(
    (
      await db.query("SELECT state FROM email_jobs WHERE schedule_id = $1", [
        value.requestId,
      ])
    ).rows[0].state,
  ).toBe("sent");
});
