import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { notificationWindowLabel } from "../lib/domain.ts";

test("notification choices state the accepted WIB hour window and manual mode", () => {
  assert.equal(notificationWindowLabel(null), "Manual saja");
  assert.equal(notificationWindowLabel(0), "00.00–00.59 WIB");
  assert.equal(notificationWindowLabel(7), "07.00–07.59 WIB");
  assert.equal(notificationWindowLabel(23), "23.00–23.59 WIB");
});

test("Vercel cron configuration covers every WIB hour with daily jobs within Hobby limits", () => {
  const { crons } = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.ok(crons.length <= 100);
  assert.equal(crons.filter(job => job.path === "/api/cron/reminders").length, 1);
  const slots = crons.filter(job => job.path.startsWith("/api/cron/notifications/"));
  assert.equal(slots.length, 24);
  const hours = new Set();
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hourCycle: "h23" });
  for (const job of slots) {
    assert.match(job.schedule, /^0 (?:[01]?\d|2[0-3]) \* \* \*$/);
    const hour = Number(job.path.split("/").at(-1));
    assert.ok(hour >= 0 && hour < 24);
    hours.add(hour);
    const utcHour = Number(job.schedule.split(" ")[1]);
    assert.equal(Number(formatter.format(new Date(Date.UTC(2026, 9, 9, utcHour)))), hour);
  }
  assert.equal(hours.size, 24);
});
