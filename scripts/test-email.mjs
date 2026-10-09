import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const help = `Send one test email using RESEND_API_KEY and RESEND_FROM from .env.local.

Usage:
  pnpm test:email arpeggio.gns@gmail.com
  pnpm test:email someone@example.com --dry-run
  pnpm test:email someone@example.com --normal-priority

Options:
  --dry-run          Preview the email without sending; no API key required.
  --normal-priority  Omit the app's high-priority headers for a comparison test.
  --help, -h         Show this help.

Requires Node.js 22+. Each live run sends one email, with no automatic retries.
Resend acceptance does not confirm Inbox placement or SPF/DKIM/DMARC results.
Check the new message in your recipient's mailbox and use Show original.
`;

export async function main(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      "dry-run": { type: "boolean" },
      "normal-priority": { type: "boolean" },
    },
  });
  if (values.help) return console.log(help);
  const recipient = positionals[0]?.trim();
  if (
    positionals.length !== 1 ||
    !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient ?? "")
  )
    throw new Error("Provide one recipient: pnpm test:email someone@example.com");

  const from = process.env.RESEND_FROM?.trim();
  if (!from) throw new Error("Set RESEND_FROM in .env.local first.");
  const when = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const payload = {
    from,
    to: [recipient],
    subject: `Uji email Piket Opsi · ${when} WIB`,
    text: `Halo,\n\nIni adalah email pengujian dari Piket Opsi. Pesan ini bukan penugasan piket.\n\nDikirim: ${when} WIB\n\nPiket Opsi · Ruang Opsi`,
    ...(!values["normal-priority"] && {
      headers: { "X-Priority": "1", Importance: "high" },
    }),
  };
  if (values["dry-run"])
    return console.log(JSON.stringify({ dryRun: true, ...payload }, null, 2));

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("Set RESEND_API_KEY in .env.local first.");
  const idempotencyKey = `email-test/${randomUUID()}`;
  let response, data;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    data = await response.json().catch(() => null);
  } catch {
    throw new Error(
      `Delivery result unknown (network error or timeout). Check Resend's dashboard before rerunning. Request key: ${idempotencyKey}`,
    );
  }
  if (!response.ok) {
    if (response.status >= 500)
      throw new Error(
        `Delivery result unknown (Resend HTTP ${response.status}). Check Resend's dashboard before rerunning. Request key: ${idempotencyKey}`,
      );
    const detail =
      typeof data?.message === "string"
        ? data.message.replaceAll(apiKey, "[REDACTED]")
        : "Check the API key, verified sender, recipient, and sending quota.";
    throw new Error(`Resend rejected the email (HTTP ${response.status}): ${detail}`);
  }
  if (typeof data?.id !== "string" || !data.id)
    throw new Error(
      "Delivery result unknown: Resend returned no email ID. Check its dashboard before rerunning.",
    );
  console.log(
    JSON.stringify({
      accepted: true,
      from,
      to: recipient,
      subject: payload.subject,
      providerId: data.id,
    }, null, 2),
  );
  console.log(
    "Check Inbox/Spam and Show original for SPF, DKIM, and DMARC. Acceptance alone does not confirm inbox delivery.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    for (const name of [".env.local", ".env"]) {
      const file = fileURLToPath(new URL(`../${name}`, import.meta.url));
      if (existsSync(file)) process.loadEnvFile(file);
    }
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
