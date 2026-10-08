import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
import { request } from "@playwright/test";
import { connectionString } from "../lib/server/db.ts";
import { digest, hashPassword } from "../lib/server/security.ts";

// Explicit opt-in: sends exactly two test emails to the user-approved recipient.
for (const name of [".env.local", ".env"])
  if (existsSync(name)) process.loadEnvFile(name);
const recipient = "arpeggio.gns@gmail.com";
if (
  !process.env.DATABASE_URL ||
  !process.env.RESEND_API_KEY ||
  !process.env.RESEND_FROM
)
  throw new Error("Configure database and mail credentials first.");
const db = new pg.Client({
  connectionString: connectionString(),
  connectionTimeoutMillis: 15000,
});
const adminId = randomUUID(),
  adminEmail = `piket-test-${adminId}@example.invalid`,
  password = randomBytes(24).toString("hex");
const memberId = randomUUID(),
  scheduleId = randomUUID();
let createdMember = false,
  seeded = false,
  server,
  api;
const origin = "http://localhost:3101";
try {
  await db.connect();
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [
    recipient,
  ]);
  if (existing.rowCount)
    throw new Error(
      "Test recipient already exists. Use an isolated Neon branch for this live smoke test.",
    );
  await db.query(
    "INSERT INTO users(id, name, email, role, password_hash, initial_password) VALUES ($1, 'Live integration test', $2, 'admin', $3, false)",
    [adminId, adminEmail, await hashPassword(password)],
  );
  seeded = true;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--port", "3101"],
    {
      env: {
        ...process.env,
        APP_URL: origin,
        DATABASE_URL: connectionString(),
        NEXT_DIST_DIR: ".next-live-test",
        MAIL_TEST_URL: "",
      },
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  api = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
    timeout: 60000,
  });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await api.get("/")).ok()) {
        ready = true;
        break;
      }
    } catch {
      /* Starting server. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Local live-test server did not start.");
  const login = await api.post("/api/auth/login", {
    data: { email: adminEmail, password },
  });
  if (!login.ok()) throw new Error("Live login failed.");
  const member = await api.post("/api/members", {
    data: {
      requestId: memberId,
      name: "Arpeggio (uji integrasi)",
      email: recipient,
      organization: "BEM",
    },
  });
  if (!member.ok()) throw new Error("Live member creation failed.");
  createdMember = true;
  const tomorrow = (
    await db.query(
      "SELECT ((now() AT TIME ZONE 'Asia/Jakarta')::date + 1)::text AS date",
    )
  ).rows[0].date;
  const assignment = await api.post("/api/schedules", {
    data: {
      requestId: scheduleId,
      date: tomorrow,
      notes:
        "UJI INTEGRASI OTOMATIS — ini bukan tugas piket sebenarnya. Data uji akan dihapus setelah pemeriksaan.",
      assignments: [{ memberId }],
    },
  });
  if (!assignment.ok()) throw new Error("Live schedule creation failed.");
  let jobs = [];
  for (let attempt = 0; attempt < 60; attempt++) {
    jobs = (
      await db.query(
        "SELECT kind, state, provider_id, error_code FROM email_jobs WHERE schedule_id = $1 ORDER BY kind",
        [scheduleId],
      )
    ).rows;
    if (jobs.length === 2 && jobs.every((job) => job.state === "sent")) break;
    if (jobs.some((job) => job.state === "review"))
      throw new Error(
        `Resend rejected the test email (${jobs.find((job) => job.state === "review").error_code}).`,
      );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (jobs.length !== 2 || jobs.some((job) => job.state !== "sent"))
    throw new Error(
      "Live email queue did not complete. Check sender verification and Resend quota.",
    );
  const states = [];
  for (const job of jobs) {
    let event = "accepted";
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await fetch(
        `https://api.resend.com/emails/${job.provider_id}`,
        {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!result.ok) break; // Sending-only keys cannot read delivery events.
      const data = await result.json();
      event = data.last_event ?? "accepted";
      if (["delivered", "bounced", "failed"].includes(event)) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    states.push({ kind: job.kind, providerEvent: event });
  }
  console.log(
    JSON.stringify({
      neon: "passed",
      assignmentEmail: "accepted",
      reminderEmail: "accepted",
      delivery: states,
    }),
  );
} catch (error) {
  // Only our fixed diagnostic messages are printed, never database/provider responses.
  const message =
    typeof error.message === "string" &&
    /^(Live|Local|Test recipient|Resend rejected)/.test(error.message)
      ? error.message
      : "Live test failed. Check service connectivity and configuration.";
  console.error(message);
  process.exitCode = 1;
} finally {
  if (api) await api.dispose();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 5000);
      server.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  if (seeded) {
    await db.query("BEGIN");
    await db.query("DELETE FROM schedules WHERE id = $1", [scheduleId]);
    await db.query("DELETE FROM audit_events WHERE actor_id = $1", [adminId]);
    if (createdMember)
      await db.query("DELETE FROM users WHERE id = $1", [memberId]);
    await db.query("DELETE FROM users WHERE id = $1", [adminId]);
    await db.query("DELETE FROM login_limits WHERE key = $1", [
      digest(`account:${adminEmail}`),
    ]);
    await db.query("COMMIT");
    console.log(
      "Live test accounts and schedules removed; existing application accounts preserved.",
    );
  }
  await db.end();
}
