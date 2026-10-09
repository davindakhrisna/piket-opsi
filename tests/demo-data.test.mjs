import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoData,
  dateFromKey,
  dateKey,
  filterSchedules,
  initialOrganizations,
  SCHEDULE_LOCATION,
  SCHEDULE_TITLE,
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
    location: SCHEDULE_LOCATION,
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

test("search matches locations without case sensitivity and orders by date with stable ties", () => {
  const base = {
    title: "Piket",
    location: SCHEDULE_LOCATION,
    notes: "",
    assignments: [{ memberId: "a", status: "scheduled" }],
  };
  const schedules = [
    { ...base, id: "late", date: "2026-10-08" },
    { ...base, id: "tomorrow", date: "2026-10-09" },
    { ...base, id: "early", date: "2026-10-08" },
  ];
  assert.deepEqual(
    filterSchedules(schedules, "all", "all", " OPSI ").map(
      (schedule) => schedule.id,
    ),
    ["early", "late", "tomorrow"],
  );
  assert.deepEqual(
    filterSchedules(schedules, "all", "all", "catatan yang tidak ada"),
    [],
  );
});

test("sample assignments reference existing members and expose all three states", () => {
  const { members, schedules } = createDemoData();
  const ids = new Set(members.map((member) => member.id));
  const statuses = new Set();
  assert.deepEqual(
    [...new Set(members.map((member) => member.organization))].sort(),
    [...initialOrganizations].sort(),
  );
  for (const schedule of schedules) {
    assert.equal(schedule.title, SCHEDULE_TITLE);
    assert.equal(schedule.location, SCHEDULE_LOCATION);
    assert.ok(!("startTime" in schedule));
    assert.ok(!("endTime" in schedule));
    for (const assignment of schedule.assignments) {
      assert.ok(ids.has(assignment.memberId));
      statuses.add(assignment.status);
    }
  }
  assert.deepEqual([...statuses].sort(), ["done", "scheduled", "skipped"]);
});

test("day ranges include today and their last day, exclude past and later dates, and combine with assignment filters", () => {
  const today = "2026-12-30";
  const base = {
    title: SCHEDULE_TITLE,
    location: SCHEDULE_LOCATION,
    notes: "Rapikan meja",
    assignments: [
      { memberId: "a", status: "scheduled" },
      { memberId: "b", status: "done" },
    ],
  };
  const schedules = [
    -1,
    ...Array.from({ length: 31 }, (_, index) => index),
  ].map((offset) => ({
    ...base,
    id: String(offset),
    date: shiftDate(today, offset),
  }));
  for (const days of [3, 7, 14, 30]) {
    const result = filterSchedules(
      schedules,
      "a",
      "scheduled",
      "meja",
      String(days),
      today,
    );
    assert.equal(result.length, days);
    assert.equal(result[0].date, today);
    assert.equal(result.at(-1).date, shiftDate(today, days - 1));
    assert.deepEqual(
      filterSchedules(schedules, "b", "scheduled", "", String(days), today),
      [],
    );
    assert.deepEqual(
      filterSchedules(
        schedules,
        "a",
        "scheduled",
        "tidak cocok",
        String(days),
        today,
      ),
      [],
    );
  }
  assert.equal(
    filterSchedules(schedules, "all", "all", "", "all", today).length,
    32,
  );
});
