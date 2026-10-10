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
async function settleAnimations(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await Promise.all(document.getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})));
  });
}
async function captures(request: APIRequestContext) {
  return (await (
    await request.get("http://127.0.0.1:3419/messages")
  ).json()) as {
    key: string;
    payload: {
      to: string[];
      text: string;
      subject: string;
      headers: Record<string, string>;
    };
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
      "TRUNCATE audit_events, email_jobs, email_budget, worker_leases, assignments, schedules, sessions, login_limits, users, organizations, notification_settings RESTART IDENTITY CASCADE",
    );
    await client.query("INSERT INTO organizations(name) VALUES ('BEM'), ('BPM'), ('LPM')");
    await client.query("INSERT INTO notification_settings(daily_hour) VALUES (7)");
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

test("admin adds organizations that persist in member forms and assignment filters", async ({ page, request }) => {
  expect((await send(request, "organizations", "POST", { name: "HIMATI" })).status()).toBe(401);
  await send(request, "auth/login", "POST", { email: "admin", password: "admin" });
  expect((await send(request, "organizations", "POST", { name: "HIMATI" })).status()).toBe(403);
  await admin(page.context().request);
  await page.goto("/");
  await navigate(page, "Anggota");
  await page.getByRole("button", { name: "Organisasi", exact: true }).click();
  const organizations = page.getByRole("dialog", { name: "Organisasi", exact: true });
  for (const name of ["BEM", "BPM", "LPM"])
    await expect(organizations.getByText(name, { exact: true })).toBeVisible();
  await organizations.getByLabel("Nama organisasi", { exact: true }).fill(" HIMATI ");
  await organizations.getByRole("button", { name: "Tambah organisasi", exact: true }).click();
  await expect(organizations.getByText("HIMATI", { exact: true })).toBeVisible();
  await organizations.getByLabel("Nama organisasi", { exact: true }).fill("himati");
  await organizations.getByRole("button", { name: "Tambah organisasi", exact: true }).click();
  await expect(organizations.getByRole("alert")).toContainText("sudah terdaftar");
  await organizations.getByLabel("Nama organisasi", { exact: true }).fill("");
  await page.screenshot({ path: `.impeccable/review/organizations-${test.info().project.name}.png`, fullPage: true });
  await organizations.getByRole("button", { name: "Tutup", exact: true }).click();

  const duplicate = await send(page.context().request, "organizations", "POST", { name: "hiMAti" });
  expect(duplicate.status()).toBe(200);
  expect(await duplicate.json()).toEqual({ name: "HIMATI", created: false });
  const concurrent = await Promise.all(["UKM", "ukm"].map((name) =>
    send(page.context().request, "organizations", "POST", { name })));
  expect(concurrent.map((response) => response.status()).sort()).toEqual([200, 201]);
  for (const name of [" ", "X".repeat(81), "BAD\nORG"])
    expect((await send(page.context().request, "organizations", "POST", { name })).status()).toBe(400);
  expect((await db.query("SELECT count(*)::int AS count FROM organizations WHERE lower(name) = 'himati'")).rows[0].count).toBe(1);
  expect((await db.query("SELECT count(*)::int AS count FROM audit_events WHERE action = 'organization.created' AND target_id = 'HIMATI'")).rows[0].count).toBe(1);
  expect((await send(page.context().request, "members", "POST", {
    requestId: randomUUID(), name: "Invalid", email: "invalid@example.com", organization: "Missing organization",
  })).status()).toBe(400);

  await page.getByRole("button", { name: "Tambah anggota", exact: true }).click();
  const memberDialog = page.getByRole("dialog", { name: "Tambah anggota", exact: true });
  await memberDialog.getByLabel("Nama lengkap", { exact: true }).fill("Arpeggio");
  await memberDialog.getByLabel("Email", { exact: true }).fill(recipient);
  await memberDialog.getByRole("combobox", { name: "Organisasi", exact: true }).click();
  await page.getByRole("option", { name: "HIMATI", exact: true }).click();
  await memberDialog.getByRole("button", { name: "Tambah anggota", exact: true }).click();
  await expect(memberDialog).toHaveCount(0);
  await member(page.context().request, "bem@example.com", "Anggota BEM");
  expect((await send(page.context().request, "organizations", "POST", { name: "all" })).status()).toBe(201);
  await member(page.context().request, "all@example.com", "Anggota all", "all");
  await page.reload();
  await navigate(page, "Jadwal");
  await page.getByRole("button", { name: "Buat jadwal", exact: true }).first().click();
  const editor = page.getByRole("dialog", { name: "Buat jadwal", exact: true });
  const filter = editor.getByRole("combobox", { name: "Filter organisasi penugasan" });
  await filter.click();
  await page.getByRole("option", { name: "HIMATI", exact: true }).click();
  await expect(editor.getByRole("checkbox")).toHaveCount(1);
  await editor.getByRole("checkbox").check();
  await filter.click();
  await page.getByRole("option", { name: "all", exact: true }).click();
  await expect(editor.getByRole("checkbox")).toHaveCount(1);
  await expect(editor.getByText(/Pilihan tetap tersimpan/)).toBeVisible();
  await editor.getByRole("checkbox").check();
  await filter.click();
  await page.getByRole("option", { name: "Semua organisasi", exact: true }).click();
  await expect(editor.getByRole("checkbox")).toHaveCount(3);
  await expect(editor.getByRole("checkbox", { checked: true })).toHaveCount(2);
  await page.screenshot({ path: `.impeccable/review/organization-assignment-${test.info().project.name}.png`, fullPage: true });
  await editor.getByRole("button", { name: "Buat jadwal", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect((await schedules(page.context().request))[0].assignments).toHaveLength(2);
  await page.reload();
  await navigate(page, "Anggota");
  await expect(page.getByRole("cell", { name: /Arpeggio HIMATI/ }).first()).toBeVisible();
  const snapshot = await (await page.context().request.get("/api/snapshot")).json();
  expect(snapshot.organizations).toEqual(expect.arrayContaining(["BEM", "BPM", "LPM", "HIMATI", "all"]));

  await send(page.context().request, "auth/logout");
  await signIn(page, recipient, recipient);
  await expect(page.getByRole("heading", { name: "Jadwal piket", exact: true })).toBeVisible();
  expect((await send(page.context().request, "organizations", "POST", { name: "Forbidden" })).status()).toBe(403);
  await expect(page.getByRole("button", { name: "Organisasi", exact: true })).toHaveCount(0);
});

test("organization update and delete preserve members and protect provisioned defaults", async ({ page, request }) => {
  for (const method of ["PUT", "DELETE"])
    expect((await send(request, "organizations", method, { name: "BEM", newName: "Changed" })).status()).toBe(401);
  await send(request, "auth/login", "POST", { email: "admin", password: "admin" });
  for (const method of ["PUT", "DELETE"])
    expect((await send(request, "organizations", method, { name: "BEM", newName: "Changed" })).status()).toBe(403);
  const api = page.context().request;
  await admin(api);
  for (const name of ["BEM", "BPM", "LPM"])
    for (const method of ["PUT", "DELETE"])
      expect((await send(api, "organizations", method, { name, newName: "Changed" })).status()).toBe(403);
  expect((await send(api, "organizations", "POST", { name: "HIMATI" })).status()).toBe(201);
  expect((await send(api, "organizations", "POST", { name: "Sementara" })).status()).toBe(201);
  const id = await member(api, recipient, "Arpeggio", "HIMATI");
  expect((await send(api, "schedules", "POST", schedule(id))).status()).toBe(201);
  const before = (await db.query("SELECT id, name, email, organization, password_hash FROM users WHERE id = $1", [id])).rows[0];
  const beforeSchedules = await schedules(api);

  await page.goto("/");
  await navigate(page, "Anggota");
  await page.getByRole("button", { name: "Organisasi", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Organisasi", exact: true });
  await expect(dialog.getByText("Bawaan", { exact: true })).toHaveCount(3);
  for (const name of ["BEM", "BPM", "LPM"]) {
    await expect(dialog.getByRole("button", { name: `Ubah ${name}`, exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: `Hapus ${name}`, exact: true })).toHaveCount(0);
  }
  await dialog.getByRole("button", { name: "Ubah HIMATI", exact: true }).click();
  await dialog.getByLabel("Nama organisasi", { exact: true }).fill("BEM");
  await dialog.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("sudah terdaftar");
  await dialog.getByLabel("Nama organisasi", { exact: true }).fill(" Himpunan Teknologi ");
  await dialog.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
  await expect(dialog.getByText("Himpunan Teknologi", { exact: true })).toBeVisible();
  await expect(dialog.getByText("HIMATI", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Hapus Himpunan Teknologi", exact: true })).toBeDisabled();
  const after = (await db.query("SELECT id, name, email, organization, password_hash FROM users WHERE id = $1", [id])).rows[0];
  expect(after).toEqual({ ...before, organization: "Himpunan Teknologi" });
  expect(await schedules(api)).toEqual(beforeSchedules);
  expect((await send(api, "organizations", "DELETE", { name: "Himpunan Teknologi" })).status()).toBe(409);
  expect((await send(api, "organizations", "PUT", { name: "Himpunan Teknologi", newName: "bem" })).status()).toBe(409);
  for (const newName of [" ", "X".repeat(81), "BAD\nORG"])
    expect((await send(api, "organizations", "PUT", { name: "Himpunan Teknologi", newName })).status()).toBe(400);
  for (const method of ["PUT", "DELETE"])
    expect((await send(api, "organizations", method, { name: "Missing", newName: "New" })).status()).toBe(409);

  await dialog.getByRole("button", { name: "Ubah Sementara", exact: true }).click();
  await dialog.getByLabel("Nama organisasi", { exact: true }).fill("Batal disimpan");
  await dialog.getByRole("button", { name: "Batal ubah", exact: true }).click();
  await expect(dialog.getByText("Sementara", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Hapus Sementara", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Hapus organisasi?" });
  await confirmation.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(dialog.getByText("Sementara", { exact: true })).toBeVisible();
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/organization-crud-${test.info().project.name}.png`, fullPage: true });
  await dialog.getByRole("button", { name: "Hapus Sementara", exact: true }).click();
  await settleAnimations(page);
  await expect(confirmation).toHaveCSS("opacity", "1");
  await page.screenshot({ path: `.impeccable/review/organization-delete-${test.info().project.name}.png`, fullPage: true });
  await confirmation.getByRole("button", { name: "Hapus organisasi", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(dialog.getByText("Sementara", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.reload();
  await navigate(page, "Anggota");
  await expect(page.getByRole("cell", { name: /Arpeggio Himpunan Teknologi/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Tambah anggota", exact: true }).click();
  await page.getByRole("dialog", { name: "Tambah anggota", exact: true }).getByRole("combobox", { name: "Organisasi", exact: true }).click();
  await expect(page.getByRole("option", { name: "Himpunan Teknologi", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "HIMATI", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Sementara", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await send(api, "organizations", "POST", { name: "RACE" });
  const renamed = await Promise.all(["RACE A", "RACE B"].map((newName) => send(api, "organizations", "PUT", { name: "RACE", newName })));
  expect(renamed.map((response) => response.status()).sort()).toEqual([200, 409]);
  await send(api, "organizations", "POST", { name: "Empty" });
  const contested = await Promise.all([
    send(api, "organizations", "DELETE", { name: "Empty" }),
    send(api, "members", "POST", { requestId: randomUUID(), name: "Race member", email: "race@example.com", organization: "Empty" }),
  ]);
  expect([[200, 400], [409, 201]]).toContainEqual(contested.map((response) => response.status()));
  expect((await db.query("SELECT count(*)::int AS count FROM users u LEFT JOIN organizations o ON o.name = u.organization WHERE u.role = 'member' AND o.name IS NULL")).rows[0].count).toBe(0);
  expect((await db.query("SELECT action FROM audit_events WHERE action IN ('organization.updated', 'organization.deleted') ORDER BY action")).rows.map((row) => row.action)).toEqual(expect.arrayContaining(["organization.updated", "organization.deleted"]));
  await send(api, "auth/logout");
  await signIn(page, recipient, recipient);
  await expect(page.getByRole("heading", { name: "Jadwal piket", exact: true })).toBeVisible();
  for (const method of ["PUT", "DELETE"])
    expect((await send(api, "organizations", method, { name: "Himpunan Teknologi", newName: "Forbidden" })).status()).toBe(403);
});

test("admin configures daily notification time and manually notifies each assignment once", async ({ page, request }) => {
  expect((await send(request, "notifications/send")).status()).toBe(401);
  await send(request, "auth/login", "POST", { email: "admin", password: "admin" });
  expect((await send(request, "notifications/send")).status()).toBe(403);
  expect((await send(request, "notification-settings", "PUT", { dailyHour: 8, version: 1 })).status()).toBe(403);
  const api = page.context().request;
  await admin(api);
  const firstId = await member(api);
  const value = schedule(firstId, 5);
  expect((await send(api, "schedules", "POST", value)).status()).toBe(201);
  expect(await captures(request)).toHaveLength(0);
  expect((await schedules(api))[0].assignments[0].notificationStatus).toBe("assigned");
  expect((await send(api, "emails/process")).status()).toBe(200);
  expect(await captures(request)).toHaveLength(0);
  await page.goto("/");
  await navigate(page, "Pengingat");
  const controls = page.locator('[data-slot="card"]').filter({ has: page.getByText("Notifikasi penugasan", { exact: true }) });
  const selector = controls.getByRole("combobox", { name: "Pengiriman otomatis (WIB)" });
  await expect(selector).toContainText("07.00–07.59 WIB");
  await selector.click();
  await page.getByRole("option", { name: "Manual saja", exact: true }).click();
  await controls.getByRole("button", { name: "Simpan waktu", exact: true }).click();
  await expect(page.getByText("Waktu pengiriman tersimpan", { exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, "Pengingat");
  await expect(selector).toContainText("Manual saja");
  await expect(controls.getByText("1 penugasan belum diberi tahu", { exact: true })).toBeVisible();
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/notifications-assigned-${test.info().project.name}.png`, fullPage: true });
  await controls.getByRole("button", { name: "Kirim semua", exact: true }).click();
  await expect(controls.getByText("0 penugasan belum diberi tahu", { exact: true })).toBeVisible();
  expect(await captures(request)).toHaveLength(1);
  const notified = (await schedules(api))[0];
  expect(notified.assignments[0]).toMatchObject({ memberId: firstId, status: "scheduled", notificationStatus: "notified" });
  expect((await send(api, "notifications/send")).status()).toBe(200);
  expect(await captures(request)).toHaveLength(1);
  const secondId = await member(api, "second@example.com", "Second", "BPM");
  expect((await send(api, `schedules/${value.requestId}`, "PUT", {
    date: notified.date, notes: "Updated assignment", version: notified.version,
    assignments: [{ memberId: firstId }, { memberId: secondId }],
  })).status()).toBe(200);
  const workers = await Promise.all([send(api, "notifications/send"), send(api, "notifications/send")]);
  expect(workers.every((response) => response.status() === 200)).toBe(true);
  expect((await captures(request)).map((capture) => capture.payload.to[0]).sort()).toEqual([recipient, "second@example.com"].sort());
  await page.reload();
  await navigate(page, "Pengingat");
  await page.getByRole("button", { name: /^(?:JADWAL-\d+|Piket Ruang Opsi)$/ }).first().click();
  const details = page.getByRole("dialog", { name: "Piket Ruang Opsi", exact: true });
  await expect(details.getByText("Diberi tahu", { exact: true })).toHaveCount(2);
  await expect(details.getByRole("combobox", { name: "Status Arpeggio" })).toContainText("Terjadwal");
  await settleAnimations(page);
  await details.screenshot({ path: `.impeccable/review/notifications-notified-${test.info().project.name}.png` });
  await page.keyboard.press("Escape");
  await selector.click();
  await page.getByRole("option", { name: "23.00–23.59 WIB", exact: true }).click();
  await controls.getByRole("button", { name: "Simpan waktu", exact: true }).click();
  await expect(page.getByText("Waktu pengiriman tersimpan", { exact: true }).last()).toBeVisible();
  const snapshot = await (await api.get("/api/snapshot")).json();
  expect(snapshot.notificationSettings.dailyHour).toBe(23);
  for (const dailyHour of [-1, 24, "7", 1.5])
    expect((await send(api, "notification-settings", "PUT", { dailyHour, version: snapshot.notificationSettings.version })).status()).toBe(400);
  expect((await send(api, "notification-settings", "PUT", { dailyHour: 3, version: 1 })).status()).toBe(409);
  expect((await send(api, "notification-settings", "PUT", { dailyHour: 3, version: snapshot.notificationSettings.version })).status()).toBe(200);
  await send(api, "auth/logout");
  await signIn(page, recipient, recipient);
  await expect(page.getByRole("heading", { name: "Jadwal piket", exact: true })).toBeVisible();
  expect((await send(api, "notifications/send")).status()).toBe(403);
  expect((await send(api, "notification-settings", "PUT", { dailyHour: 4, version: snapshot.notificationSettings.version + 1 })).status()).toBe(403);
  await navigate(page, "Pengingat");
  await expect(page.getByRole("button", { name: "Kirim semua", exact: true })).toHaveCount(0);
});

test("WIB cron releases only the chosen window and retries failures without releasing new waiting assignments", async ({ request }) => {
  await admin(request);
  const hour = Number((await db.query("SELECT extract(hour FROM now() AT TIME ZONE 'Asia/Jakarta')::int AS hour")).rows[0].hour);
  const otherHour = (hour + 1) % 24;
  const headers = { Authorization: "Bearer e2e-private-cron-secret-32-characters" };
  const path = (slot: number) => `/api/cron/notifications/${String(slot).padStart(2, "0")}`;
  expect((await request.get(path(hour))).status()).toBe(401);
  let settings = (await (await request.get("/api/snapshot")).json()).notificationSettings;
  expect((await send(request, "notification-settings", "PUT", { dailyHour: otherHour, version: settings.version })).status()).toBe(200);
  const id = await member(request);
  const value = schedule(id, 5);
  await send(request, "schedules", "POST", value);
  expect((await request.get(path(hour), { headers })).status()).toBe(200);
  expect((await request.get(path(otherHour), { headers })).status()).toBe(200);
  expect(await captures(request)).toHaveLength(0);
  settings = (await (await request.get("/api/snapshot")).json()).notificationSettings;
  expect((await send(request, "notification-settings", "PUT", { dailyHour: hour, version: settings.version })).status()).toBe(200);
  await request.post("http://127.0.0.1:3419/mode/rate-limit");
  expect((await request.get(path(hour), { headers })).status()).toBe(200);
  expect((await schedules(request))[0].assignments[0].notificationStatus).toBe("assigned");
  expect((await db.query("SELECT state, error_code FROM email_jobs WHERE schedule_id = $1", [value.requestId])).rows[0]).toEqual({ state: "pending", error_code: "rate_limit_exceeded" });
  await request.post("http://127.0.0.1:3419/mode/ok");
  settings = (await (await request.get("/api/snapshot")).json()).notificationSettings;
  await send(request, "notification-settings", "PUT", { dailyHour: null, version: settings.version });
  const next = schedule(id, 8);
  await send(request, "schedules", "POST", next);
  await expect.poll(async () => (await db.query("SELECT count(*)::int AS count FROM worker_leases")).rows[0].count).toBe(0);
  await db.query("UPDATE email_jobs SET next_attempt_at = now() WHERE schedule_id = $1", [value.requestId]);
  const retry = await request.get(path(hour), { headers });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).sent).toBe(1);
  expect(await captures(request)).toHaveLength(1);
  const snapshots = await schedules(request);
  expect(snapshots.find((item: { id: string }) => item.id === value.requestId).assignments[0].notificationStatus).toBe("notified");
  expect(snapshots.find((item: { id: string }) => item.id === next.requestId).assignments[0].notificationStatus).toBe("assigned");
  await send(request, "notifications/send");
  expect(await captures(request)).toHaveLength(2);
  await request.get(path(hour), { headers });
  await send(request, "notifications/send");
  expect(await captures(request)).toHaveLength(2);
});

test("shadcn spinner covers initial loading and connection failures keep retry available", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/snapshot", async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  try {
    await expect(page.getByRole("status", { name: "Memuat aplikasi", exact: true })).toBeVisible();
    await expect(page.getByText("Memuat Piket Opsi…", { exact: true })).toHaveCount(0);
    await expect(page.locator("main")).toHaveAttribute("aria-busy", "true");
    await page.screenshot({ path: `.impeccable/review/loading-${test.info().project.name}.png`, fullPage: true });
  } finally {
    release();
  }
  await expect(page.getByLabel("Email atau admin", { exact: true })).toBeVisible();
  await page.unroute("**/api/snapshot");
  await page.route("**/api/snapshot", (route) => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ error: "Koneksi uji tidak tersedia." }),
  }));
  await page.reload();
  await expect(page.getByText("Koneksi belum tersedia", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi", exact: true })).toBeVisible();
  await page.unroute("**/api/snapshot");
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.getByLabel("Email atau admin", { exact: true })).toBeVisible();
});

test("admin onboarding, organization-based assignment, manual email, and persistence", async ({
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
  // A future date also proves manual assignment mail can be sent on the assignment day.
  const plannedDate = shiftDate(jakartaToday(), 2);
  const [year, month, day] = plannedDate.split("-").map(Number);
  await dialog.getByRole("button", { name: "Pilih tanggal jadwal" }).click();
  const dayButton = page.locator(
    `[data-slot="calendar"] [data-day="${day}/${month}/${year}"]`,
  );
  if ((await dayButton.count()) === 0)
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
  await dayButton.click();
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
  await expect(dialog.locator('input[type="time"]')).toHaveCount(0);
  await page.getByRole("dialog", { name: "Buat jadwal", exact: true }).screenshot({
    path: `/tmp/piket-date-after-${test.info().project.name}.png`,
  });
  await dialog
    .getByRole("button", { name: "Buat jadwal", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect((await send(page.context().request, "notifications/send")).status()).toBe(200);
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  const emails = await captures(request);
  expect(emails[0].payload.to).toEqual([recipient]);
  expect(emails[0].payload.headers).toEqual({ "X-Priority": "1", Importance: "high" });
  expect(emails[0].payload.text).not.toContain("Waktu:");
  expect(emails[0].payload.text).toContain(
    "Buka jadwal: http://localhost:3100/?jadwal=",
  );
  const value = (await schedules(page.context().request))[0];
  expect(value.location).toBe("Ruang Opsi");
  expect(value.assignments).toHaveLength(1);
  expect(value.date).toBe(plannedDate);
  expect(value).not.toHaveProperty("startTime");
  expect(value).not.toHaveProperty("endTime");
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
  if (test.info().project.name === "mobile")
    await page.setViewportSize({ width: 388, height: 839 });
  await signIn(page, recipient, recipient);
  await expect(
    page.getByRole("tab", { name: "Detail", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("Email Anda masih menjadi kata sandi awal.", {
      exact: false,
    }),
  ).toBeVisible();
  const reminder = page.locator('[data-sonner-toast]').filter({ hasText: "Lindungi akun Anda" });
  const action = reminder.getByRole("button", { name: "Atur sekarang", exact: true });
  async function checkReminder() {
    await expect(reminder).toBeVisible();
    await settleAnimations(page);
    const panel = (await reminder.boundingBox())!;
    const copy = (await reminder.locator('[data-content]').boundingBox())!;
    const button = (await action.boundingBox())!;
    expect(button.y).toBeGreaterThanOrEqual(copy.y + copy.height + 8);
    expect(copy.width).toBeGreaterThan(button.width);
    expect(button.x + button.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(panel.y + panel.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(await reminder.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (test.info().project.name === "mobile") expect(button.height).toBeGreaterThanOrEqual(44);
  }
  await checkReminder();
  await page.screenshot({ path: `.impeccable/review/password-reminder-light-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Pilih tema", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Gelap", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await checkReminder();
  await page.screenshot({ path: `.impeccable/review/password-reminder-dark-${test.info().project.name}.png`, fullPage: true });
  if (test.info().project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 839 });
    await checkReminder();
    await page.screenshot({ path: ".impeccable/review/password-reminder-320.png", fullPage: true });
    await page.setViewportSize({ width: 388, height: 839 });
  }
  await action.focus();
  await page.keyboard.press("Enter");
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
  ).toHaveCount(0);
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
  ).toBe(200);
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

test("date-only schedules preserve legacy data, allow today's email, and reject duplicate daily assignments", async ({
  request,
}) => {
  await admin(request);
  const id = await member(request);
  const legacyId = randomUUID();
  const today = (await db.query(
    "SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS date",
  )).rows[0].date;
  await db.query(
    "INSERT INTO schedules(id, date, start_minute, end_minute, notes) VALUES ($1, $2, 0, 1, 'Legacy schedule')",
    [legacyId, today],
  );
  await db.query("INSERT INTO assignments(schedule_id, member_id) VALUES ($1, $2)", [legacyId, id]);
  const legacy = (await schedules(request)).find((value: { id: string }) => value.id === legacyId);
  expect(legacy).not.toHaveProperty("startTime");
  expect(legacy).not.toHaveProperty("endTime");
  expect((await send(request, `schedules/${legacyId}`, "PUT", {
    date: today,
    version: legacy.version,
    notes: "Updated date-only schedule",
    assignments: [{ memberId: id }],
  })).status()).toBe(200);
  expect((await send(request, "notifications/send")).status()).toBe(200);
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  const email = (await captures(request))[0];
  expect(email.payload.text).toContain(`Tanggal: ${today}`);
  expect(email.payload.text).not.toContain("Waktu:");
  expect(email.payload.headers.Importance).toBe("high");
  expect((await db.query("SELECT start_minute, end_minute FROM schedules WHERE id = $1", [legacyId])).rows[0]).toEqual({ start_minute: 0, end_minute: 1 });
  expect((await send(request, "schedules", "POST", { ...schedule(id), date: today })).status()).toBe(409);
  const next = schedule(id, 2);
  expect((await send(request, "schedules", "POST", next)).status()).toBe(201);
  expect((await db.query("SELECT start_minute, end_minute FROM schedules WHERE id = $1", [next.requestId])).rows[0]).toEqual({ start_minute: null, end_minute: null });
  const otherId = await member(request, "other@example.com", "Other", "BPM");
  expect((await send(request, "schedules", "POST", { ...schedule(otherId), date: today })).status()).toBe(201);
  const past = schedule(id, -1);
  expect((await send(request, "schedules", "POST", past)).status()).toBe(201);
  expect((await db.query("SELECT count(*)::int AS count FROM email_jobs WHERE schedule_id = $1", [past.requestId])).rows[0].count).toBe(0);
});

test("manual assignment email is immediate, H−1 cron is protected and repeated runs deduplicate", async ({
  request,
}) => {
  await admin(request);
  const id = await member(request);
  const first = schedule(id, 2);
  expect((await send(request, "schedules", "POST", first)).status()).toBe(201);
  expect((await send(request, "notifications/send")).status()).toBe(200);
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
  expect(reminder?.payload.text).not.toContain("Waktu:");
  expect(reminder?.payload.headers.Importance).toBe("high");
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
  expect((await send(request, "notifications/send")).status()).toBe(200);
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
  expect((await send(request, "notifications/send")).status()).toBe(200);
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
  expect((await send(request, "notifications/send")).status()).toBe(200);
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

test("member CRUD keeps history, cancels reminders and removes archived members from assignment forms", async ({ page, request, playwright }) => {
  const api = page.context().request;
  await admin(api);
  const id = await member(api);
  const value = schedule(id, 5);
  expect((await send(api, "schedules", "POST", value)).status()).toBe(201);
  await send(api, "notifications/send");
  expect((await send(api, `schedules/${value.requestId}/status`, "PATCH", { memberId: id, status: "done", version: 1 })).status()).toBe(200);
  await request.post("http://127.0.0.1:3419/mode/rate-limit");
  const later = schedule(id, 1);
  await send(api, "schedules", "POST", later);
  await expect.poll(async () => (await db.query("SELECT count(*)::int AS count FROM worker_leases")).rows[0].count).toBe(0);
  const memberSession = await playwright.request.newContext({ baseURL: origin });
  await send(memberSession, "auth/login", "POST", { email: recipient, password: recipient });
  await page.goto("/");
  await navigate(page, "Anggota");
  await page.getByRole("button", { name: "Aksi Arpeggio", exact: true }).click();
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/member-actions-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("menuitem", { name: "Edit anggota", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit anggota", exact: true });
  await expect(editor.getByLabel("Nama lengkap")).toHaveValue("Arpeggio");
  await expect(editor.getByLabel("Email", { exact: true })).toHaveValue(recipient);
  await editor.getByLabel("Nama lengkap").fill("Arpeggio Baru");
  await editor.getByRole("combobox", { name: "Organisasi", exact: true }).click();
  await page.getByRole("option", { name: "BPM", exact: true }).click();
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/member-edit-${test.info().project.name}.png`, fullPage: true });
  await editor.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Arpeggio Baru" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Aksi Arpeggio Baru", exact: true }).click();
  await page.getByRole("menuitem", { name: "Hapus anggota", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Hapus anggota?", exact: true });
  await expect(confirmation).toContainText("riwayatnya tetap tersimpan");
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/member-delete-${test.info().project.name}.png`, fullPage: true });
  await confirmation.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Arpeggio Baru" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Aksi Arpeggio Baru", exact: true }).click();
  await page.getByRole("menuitem", { name: "Hapus anggota", exact: true }).click();
  await confirmation.getByRole("button", { name: "Hapus anggota", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aksi Arpeggio Baru", exact: true })).toHaveCount(0);
  expect((await memberSession.get("/api/snapshot")).status()).toBe(401);
  expect((await send(memberSession, "auth/login", "POST", { email: recipient, password: recipient })).status()).toBe(401);
  const snapshot = await (await api.get("/api/snapshot")).json();
  expect(snapshot.members.find((m: { id: string }) => m.id === id)).toMatchObject({ deleted: true, version: 3, name: "Arpeggio Baru", organization: "BPM" });
  expect(snapshot.schedules).toHaveLength(2);
  expect(snapshot.schedules.find((s: { id: string }) => s.id === value.requestId).assignments[0]).toMatchObject({ memberId: id, status: "done", notificationStatus: "notified" });
  expect((await send(api, "schedules", "POST", schedule(id, 10))).status()).toBe(400);
  const saved = snapshot.schedules.find((s: { id: string }) => s.id === later.requestId);
  await request.post("http://127.0.0.1:3419/mode/ok");
  expect((await send(api, `schedules/${saved.id}`, "PUT", { ...later, notes: "Riwayat tetap ada", version: saved.version })).status()).toBe(200);
  await send(api, "notifications/send");
  await api.get("/api/cron/reminders", { headers: { Authorization: "Bearer e2e-private-cron-secret-32-characters" } });
  expect(await captures(request)).toHaveLength(1);
  expect((await db.query("SELECT state FROM email_jobs WHERE member_id = $1 AND state NOT IN ('sent', 'cancelled')", [id])).rows).toHaveLength(0);
  await navigate(page, "Jadwal");
  await page.getByRole("button", { name: "Buat jadwal", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Buat jadwal", exact: true }).getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page.goto(`/?jadwal=${value.requestId}`);
  await expect(page.getByRole("dialog", { name: "Piket Ruang Opsi", exact: true }).getByText("Anggota dihapus", { exact: true })).toBeVisible();
  expect((await db.query("SELECT count(*)::int AS count FROM audit_events WHERE target_id = $1 AND action = 'member.deleted'", [id])).rows[0].count).toBe(1);
  await memberSession.dispose();
});

test("member email edits rotate initial credentials, preserve chosen passwords and retarget unsent mail safely", async ({ request, playwright }) => {
  await admin(request);
  const id = await member(request);
  const value = schedule(id, 4);
  await send(request, "schedules", "POST", value);
  const memberSession = await playwright.request.newContext({ baseURL: origin });
  await send(memberSession, "auth/login", "POST", { email: recipient, password: recipient });
  const changedEmail = "changed@example.com";
  expect((await send(request, `members/${id}`, "PUT", { name: "Changed", email: changedEmail, organization: "LPM", version: 1 })).status()).toBe(200);
  expect((await memberSession.get("/api/snapshot")).status()).toBe(401);
  expect((await send(memberSession, "auth/login", "POST", { email: recipient, password: recipient })).status()).toBe(401);
  expect((await send(memberSession, "auth/login", "POST", { email: changedEmail, password: recipient })).status()).toBe(401);
  expect((await send(memberSession, "auth/login", "POST", { email: changedEmail, password: changedEmail })).status()).toBe(200);
  await send(memberSession, "auth/password", "POST", { newPassword: memberPassword });
  await request.post("http://127.0.0.1:3419/mode/rate-limit");
  await send(request, "notifications/send");
  expect(await captures(request)).toHaveLength(0);
  expect((await send(request, `members/${id}`, "PUT", { name: "Final", email: "final@example.com", organization: "BEM", version: 2 })).status()).toBe(200);
  expect((await memberSession.get("/api/snapshot")).status()).toBe(401);
  expect((await send(memberSession, "auth/login", "POST", { email: "final@example.com", password: memberPassword })).status()).toBe(200);
  await request.post("http://127.0.0.1:3419/mode/ok");
  await send(request, "emails/process");
  const emails = await captures(request);
  expect(emails).toHaveLength(1);
  expect(emails[0].payload.to).toEqual(["final@example.com"]);
  expect(emails[0].payload.text).toContain("Halo Final,");
  expect(emails[0].key).toContain("/member/3");
  expect((await send(request, `members/${id}`, "PUT", { name: "Final Again", email: "again@example.com", organization: "BEM", version: 3 })).status()).toBe(200);
  await send(request, "notifications/send");
  expect(await captures(request)).toHaveLength(1);
  expect((await schedules(request))[0].assignments[0].notificationStatus).toBe("notified");
  await memberSession.dispose();
});

test("member mutations enforce permissions, optimistic concurrency and ambiguous mail safety", async ({ request, playwright }) => {
  const id = randomUUID();
  expect((await send(request, `members/${id}`, "PUT")).status()).toBe(401);
  expect((await send(request, `members/${id}`, "DELETE")).status()).toBe(401);
  await send(request, "auth/login", "POST", { email: "admin", password: "admin" });
  expect((await send(request, `members/${id}`, "DELETE", { version: 1 })).status()).toBe(403);
  await admin(request);
  const first = await member(request), second = await member(request, "other@example.com", "Other");
  const memberSession = await playwright.request.newContext({ baseURL: origin });
  await send(memberSession, "auth/login", "POST", { email: recipient, password: recipient });
  expect((await send(memberSession, `members/${first}`, "PUT", { name: "Bad", email: recipient, organization: "BEM", version: 1 })).status()).toBe(403);
  expect((await send(memberSession, `members/${first}`, "DELETE", { version: 1 })).status()).toBe(403);
  const changes = { name: "Changed", email: recipient, organization: "BPM", version: 1 };
  for (const invalid of [{ email: "bad" }, { name: "" }, { organization: "Unknown" }, { version: "1" }])
    expect((await send(request, `members/${first}`, "PUT", { ...changes, ...invalid })).status()).toBe(400);
  expect((await send(request, `members/${first}`, "PUT", { ...changes, email: "other@example.com" })).status()).toBe(409);
  const concurrent = await Promise.all([send(request, `members/${first}`, "PUT", changes), send(request, `members/${first}`, "PUT", { ...changes, name: "Other update" })]);
  expect(concurrent.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect((await send(request, `members/${first}`, "DELETE", { version: 1 })).status()).toBe(409);
  const value = schedule(first, 6);
  await send(request, "schedules", "POST", value);
  await request.post("http://127.0.0.1:3419/mode/ambiguous");
  await send(request, "notifications/send");
  expect((await send(request, `members/${first}`, "PUT", { ...changes, email: "new@example.com", version: 2 })).status()).toBe(409);
  expect((await db.query("SELECT email FROM users WHERE id = $1", [first])).rows[0].email).toBe(recipient);
  expect((await send(request, `members/${first}`, "DELETE", { version: 2 })).status()).toBe(200);
  expect((await send(request, `members/${first}`, "DELETE", { version: 2 })).status()).toBe(200);
  await request.post("http://127.0.0.1:3419/mode/ok");
  await db.query("UPDATE email_jobs SET next_attempt_at = now() WHERE member_id = $1", [first]);
  await send(request, "emails/process");
  expect(await captures(request)).toHaveLength(1);
  expect((await send(request, `members/${first}`, "PUT", { ...changes, version: 3 })).status()).toBe(404);
  expect((await send(request, "members", "POST", { requestId: first, name: "Recreate", email: recipient, organization: "BEM" })).status()).toBe(409);
  expect((await send(request, "members", "POST", { requestId: randomUUID(), name: "Recreate", email: recipient, organization: "BEM" })).status()).toBe(409);
  expect((await send(request, "members/admin", "DELETE", { version: 1 })).status()).toBe(400);
  expect((await send(request, `members/${second}`, "DELETE", { version: 1 })).status()).toBe(200);
  await memberSession.dispose();
});

test("compact notification picker scrolls, and new schedule prompts send only its assignments", async ({ page, request }) => {
  const api = page.context().request;
  await admin(api);
  const id = await member(api);
  const waiting = schedule(id, 9);
  await send(api, "schedules", "POST", waiting);
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await navigate(page, "Pengingat");
  const selector = page.getByRole("combobox", { name: "Pengiriman otomatis (WIB)" });
  await selector.click();
  const popup = page.locator('[data-slot="select-content"]');
  await expect(page.getByRole("option")).toHaveCount(25);
  await settleAnimations(page);
  const box = await popup.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(241);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(await popup.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.screenshot({ path: `.impeccable/review/notification-time-picker-${test.info().project.name}.png`, fullPage: true });
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(selector).toContainText("23.00–23.59 WIB");
  await page.getByRole("button", { name: "Simpan waktu", exact: true }).click();
  await expect(page.getByText("Waktu pengiriman tersimpan", { exact: true })).toBeVisible();
  await navigate(page, "Jadwal");
  await page.getByRole("button", { name: "Buat jadwal", exact: true }).first().click();
  const editor = page.getByRole("dialog", { name: "Buat jadwal", exact: true });
  await editor.getByRole("checkbox").first().check();
  await editor.getByRole("button", { name: "Pilih tanggal jadwal", exact: true }).click();
  const [year, month, day] = shiftDate(jakartaToday(), 3).split("-").map(Number);
  const dayButton = page.locator(`[data-slot="calendar"] [data-day="${day}/${month}/${year}"]`);
  if ((await dayButton.count()) === 0) await page.getByRole("button", { name: "Go to the Next Month" }).click();
  await dayButton.click();
  await editor.getByRole("button", { name: "Buat jadwal", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const prompt = page.locator('[data-sonner-toast]').filter({ hasText: "Kirim notifikasi kepada anggota yang baru ditugaskan?" });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole("button", { name: "Nanti", exact: true })).toBeVisible();
  expect(await captures(request)).toHaveLength(0);
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/schedule-notification-prompt-${test.info().project.name}.png`, fullPage: true });
  await prompt.getByRole("button", { name: "Kirim sekarang", exact: true }).click();
  await expect.poll(async () => (await captures(request)).length).toBe(1);
  const values = await schedules(api);
  const added = values.find((s: { id: string }) => s.id !== waiting.requestId);
  expect((await captures(request))[0].key).toContain(added.id);
  expect(added.assignments[0].notificationStatus).toBe("notified");
  expect(values.find((s: { id: string }) => s.id === waiting.requestId).assignments[0].notificationStatus).toBe("assigned");
  await send(api, "notifications/send", "POST", { scheduleId: added.id });
  expect(await captures(request)).toHaveLength(1);
  expect((await send(api, "notifications/send", "POST", { scheduleId: "bad" })).status()).toBe(400);
});

test("later admin password changes omit the old password and revoke other sessions", async ({ page, playwright }) => {
  const api = page.context().request;
  await admin(api);
  const otherSession = await playwright.request.newContext({ baseURL: origin });
  await send(otherSession, "auth/login", "POST", { email: "admin", password: adminPassword });
  await page.goto("/");
  await navigate(page, "Pengaturan");
  await expect(page.getByLabel("Kata sandi saat ini", { exact: true })).toHaveCount(0);
  await page.getByLabel("Kata sandi baru", { exact: true }).fill("Another-admin-password-2026!");
  await page.getByLabel("Konfirmasi kata sandi baru", { exact: true }).fill("Another-admin-password-2026!");
  await settleAnimations(page);
  await page.screenshot({ path: `.impeccable/review/password-change-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Simpan kata sandi", exact: true }).click();
  await expect(page.getByText("Kata sandi berhasil diperbarui. Sesi lain telah dikeluarkan.", { exact: true })).toBeVisible();
  expect((await otherSession.get("/api/snapshot")).status()).toBe(401);
  expect((await api.get("/api/snapshot")).status()).toBe(200);
  expect((await send(api, "auth/password", "POST", { newPassword: "Another-admin-password-2026!" })).status()).toBe(400);
  expect((await send(api, "auth/password", "POST", { newPassword: "short" })).status()).toBe(400);
  await otherSession.dispose();
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
  expect((await send(request, "notifications/send")).status()).toBe(200);
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
    send(request, "notifications/send"),
    send(request, "notifications/send"),
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
