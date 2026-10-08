export type AssignmentStatus = "scheduled" | "done" | "skipped";
export type Member = { id: string; name: string; email: string };
export type Assignment = { memberId: string; status: AssignmentStatus };
export type Schedule = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
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

export function createDemoData() {
  const today = jakartaToday();
  const members: Member[] = [
    { id: "member-1", name: "Nadia Putri", email: "nadia@example.com" },
    { id: "member-2", name: "Raka Pratama", email: "raka@example.com" },
    { id: "member-3", name: "Alya Ramadhani", email: "alya@example.com" },
    { id: "member-4", name: "Dimas Saputra", email: "dimas@example.com" },
    { id: "member-5", name: "Sinta Maharani", email: "sinta@example.com" },
  ];
  const specs = [
    {
      id: "schedule-1",
      title: "Piket ruang kerja",
      offset: 0,
      startTime: "08:00",
      endTime: "09:00",
      location: "Ruang kerja utama",
      notes:
        "Rapikan meja, periksa perlengkapan, dan siapkan ruang sebelum kegiatan dimulai.",
      ids: ["member-1", "member-2"],
    },
    {
      id: "schedule-2",
      title: "Persiapan kegiatan",
      offset: 1,
      startTime: "09:00",
      endTime: "10:30",
      location: "Aula",
      notes: "Siapkan kursi dan perlengkapan untuk kegiatan bersama.",
      ids: ["member-3", "member-4", "member-1"],
    },
    {
      id: "schedule-3",
      title: "Piket perpustakaan",
      offset: 3,
      startTime: "13:00",
      endTime: "14:00",
      location: "Perpustakaan",
      notes: "Kembalikan buku ke rak dan rapikan area baca.",
      ids: ["member-2", "member-5"],
    },
    {
      id: "schedule-4",
      title: "Piket ruang kerja",
      offset: 5,
      startTime: "08:00",
      endTime: "09:00",
      location: "Ruang kerja utama",
      notes: "Periksa kebersihan dan isi ulang perlengkapan yang habis.",
      ids: ["member-3", "member-5"],
    },
    {
      id: "schedule-5",
      title: "Penutupan kegiatan",
      offset: 7,
      startTime: "16:00",
      endTime: "17:00",
      location: "Aula",
      notes: "Rapikan perlengkapan dan pastikan semua ruangan terkunci.",
      ids: ["member-1", "member-4"],
    },
    {
      id: "schedule-6",
      title: "Piket perpustakaan",
      offset: -2,
      startTime: "13:00",
      endTime: "14:00",
      location: "Perpustakaan",
      notes: "Rapikan buku dan bersihkan area baca.",
      ids: ["member-2", "member-3"],
    },
    {
      id: "schedule-7",
      title: "Piket ruang kerja",
      offset: -5,
      startTime: "08:00",
      endTime: "09:00",
      location: "Ruang kerja utama",
      notes: "Persiapan ruang kerja untuk kegiatan pagi.",
      ids: ["member-1", "member-5"],
    },
  ];
  const schedules: Schedule[] = specs.map(({ offset, ids, ...schedule }) => ({
    ...schedule,
    date: shiftDate(today, offset),
    assignments: ids.map((memberId, index) => ({
      memberId,
      status:
        offset < 0
          ? offset === -5 && index === 1
            ? "skipped"
            : "done"
          : "scheduled",
    })),
  }));
  return { members, schedules };
}

export function filterSchedules(
  schedules: Schedule[],
  memberId: string,
  status: string,
  search: string,
) {
  const query = search.trim().toLocaleLowerCase("id-ID");
  return schedules
    .filter((schedule) => {
      const assignments =
        memberId === "all"
          ? schedule.assignments
          : schedule.assignments.filter(
              (assignment) => assignment.memberId === memberId,
            );
      return (
        assignments.length > 0 &&
        (status === "all" ||
          assignments.some((assignment) => assignment.status === status)) &&
        (!query ||
          `${schedule.title} ${schedule.location} ${schedule.notes}`
            .toLocaleLowerCase("id-ID")
            .includes(query))
      );
    })
    .sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );
}
