export type AssignmentStatus = "scheduled" | "done" | "skipped";
export const organizations = ["BEM", "BPM", "LPM"] as const;
export type Organization = (typeof organizations)[number];
export type Member = {
  id: string;
  name: string;
  email: string;
  organization: Organization;
};
export type DayRange = "all" | "3" | "7" | "14" | "30";
export type SessionUser = Omit<Member, "organization"> & {
  organization?: Organization;
  role: "admin" | "member";
  initialPassword: boolean;
};
export type EmailJob = {
  id: string;
  scheduleId: string;
  memberId: string;
  kind: "assignment" | "reminder";
  state: "pending" | "sending" | "sent" | "cancelled" | "review";
  errorCode: string | null;
  sentAt: string | null;
};
export type AppSnapshot = {
  user: SessionUser;
  members: Member[];
  schedules: Schedule[];
  emails: EmailJob[];
};
export const SCHEDULE_TITLE = "Piket Ruang Opsi";
export const SCHEDULE_LOCATION = "Ruang Opsi";
export type Assignment = { memberId: string; status: AssignmentStatus };
export type Schedule = {
  id: string;
  version?: number;
  title: string;
  date: string;
  location: string;
  notes: string;
  assignments: Assignment[];
};

export const statusLabels: Record<AssignmentStatus, string> = {
  scheduled: "Terjadwal",
  done: "Selesai",
  skipped: "Dilewati",
};

export function jakartaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftDate(key: string, days: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function formatDate(key: string, short = false) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: short ? undefined : "long",
    day: "numeric",
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
  }).format(dateFromKey(key));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function filterSchedules(
  schedules: Schedule[],
  memberId: string,
  status: string,
  search: string,
  dayRange: DayRange = "all",
  today = jakartaToday(),
) {
  const query = search.trim().toLocaleLowerCase("id-ID");
  // Finite ranges include today as day one, using Jakarta's calendar date.
  const lastDate =
    dayRange === "all" ? null : shiftDate(today, Number(dayRange) - 1);
  return schedules
    .filter((schedule) => {
      const assignments =
        memberId === "all"
          ? schedule.assignments
          : schedule.assignments.filter(
              (assignment) => assignment.memberId === memberId,
            );
      return (
        (!lastDate || (schedule.date >= today && schedule.date <= lastDate)) &&
        assignments.length > 0 &&
        (status === "all" ||
          assignments.some((assignment) => assignment.status === status)) &&
        (!query ||
          `${schedule.title} ${schedule.location} ${schedule.notes}`
            .toLocaleLowerCase("id-ID")
            .includes(query))
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
