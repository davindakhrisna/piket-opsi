import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoData,
  dateFromKey,
  dateKey,
  filterSchedules,
  shiftDate,
} from "../lib/demo-data.ts";

test("calendar dates and H−1 reminders cross month, leap-day, and year boundaries", () => {
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(dateKey(dateFromKey("2026-10-08")), "2026-10-08");
});

test("member and status filters apply to the same assignment", () => {
  const schedule = {
    id: "one",
    title: "Piket",
    date: "2026-10-08",
    startTime: "08:00",
    location: "Aula",
    notes: "",
    assignments: [
      { memberId: "a", status: "done" },
      { memberId: "b", status: "scheduled" },
    ],
  };
  assert.deepEqual(filterSchedules([schedule], "a", "scheduled", ""), []);
  assert.equal(filterSchedules([schedule], "a", "done", "").length, 1);
  assert.equal(filterSchedules([schedule], "all", "scheduled", "").length, 1);
  assert.deepEqual(filterSchedules([schedule], "unknown", "all", ""), []);
});

test("search matches locations without case sensitivity and orders by date and time", () => {
  const base = {
    title: "Piket",
    location: "Ruang Aula",
    notes: "",
    assignments: [{ memberId: "a", status: "scheduled" }],
  };
  const schedules = [
    { ...base, id: "late", date: "2026-10-08", startTime: "16:00" },
    { ...base, id: "tomorrow", date: "2026-10-09", startTime: "08:00" },
    { ...base, id: "early", date: "2026-10-08", startTime: "08:00" },
  ];
  assert.deepEqual(
    filterSchedules(schedules, "all", "all", " AULA ").map(
      (schedule) => schedule.id,
    ),
    ["early", "late", "tomorrow"],
  );
  assert.deepEqual(
    filterSchedules(schedules, "all", "all", "perpustakaan"),
    [],
  );
});

test("sample assignments reference existing members and expose all three states", () => {
  const { members, schedules } = createDemoData();
  const ids = new Set(members.map((member) => member.id));
  const statuses = new Set();
  for (const schedule of schedules) {
    assert.ok(schedule.startTime < schedule.endTime);
    for (const assignment of schedule.assignments) {
      assert.ok(ids.has(assignment.memberId));
      statuses.add(assignment.status);
    }
  }
  assert.deepEqual([...statuses].sort(), ["done", "scheduled", "skipped"]);
});
