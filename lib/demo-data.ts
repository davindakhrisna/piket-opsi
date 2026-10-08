export * from "./domain.ts";
import {
  jakartaToday,
  shiftDate,
  SCHEDULE_TITLE,
  SCHEDULE_LOCATION,
  type Member,
  type Schedule,
} from "./domain.ts";

export function createDemoData() {
  const today = jakartaToday();
  const members: Member[] = [
    {
      id: "member-1",
      name: "Nadia Putri",
      email: "nadia@example.com",
      organization: "BEM",
    },
    {
      id: "member-2",
      name: "Raka Pratama",
      email: "raka@example.com",
      organization: "BPM",
    },
    {
      id: "member-3",
      name: "Alya Ramadhani",
      email: "alya@example.com",
      organization: "LPM",
    },
    {
      id: "member-4",
      name: "Dimas Saputra",
      email: "dimas@example.com",
      organization: "BEM",
    },
    {
      id: "member-5",
      name: "Sinta Maharani",
      email: "sinta@example.com",
      organization: "BPM",
    },
  ];
  const specs = [
    {
      id: "schedule-1",
      offset: 0,
      startTime: "08:00",
      endTime: "09:00",
      notes:
        "Rapikan meja, periksa perlengkapan, dan siapkan ruang sebelum kegiatan dimulai.",
      ids: ["member-1", "member-2"],
    },
    {
      id: "schedule-2",
      offset: 1,
      startTime: "09:00",
      endTime: "10:30",
      notes: "Rapikan kursi dan perlengkapan di Ruang Opsi.",
      ids: ["member-3", "member-4", "member-1"],
    },
    {
      id: "schedule-3",
      offset: 3,
      startTime: "13:00",
      endTime: "14:00",
      notes: "Bersihkan meja dan rapikan perlengkapan di Ruang Opsi.",
      ids: ["member-2", "member-5"],
    },
    {
      id: "schedule-4",
      offset: 5,
      startTime: "08:00",
      endTime: "09:00",
      notes: "Periksa kebersihan dan isi ulang perlengkapan yang habis.",
      ids: ["member-3", "member-5"],
    },
    {
      id: "schedule-5",
      offset: 7,
      startTime: "16:00",
      endTime: "17:00",
      notes:
        "Rapikan perlengkapan dan pastikan Ruang Opsi terkunci setelah piket.",
      ids: ["member-1", "member-4"],
    },
    {
      id: "schedule-6",
      offset: -2,
      startTime: "13:00",
      endTime: "14:00",
      notes: "Rapikan perlengkapan dan bersihkan Ruang Opsi.",
      ids: ["member-2", "member-3"],
    },
    {
      id: "schedule-7",
      offset: -5,
      startTime: "08:00",
      endTime: "09:00",
      notes: "Siapkan Ruang Opsi sebelum kegiatan pagi.",
      ids: ["member-1", "member-5"],
    },
  ];
  const schedules: Schedule[] = specs.map(({ offset, ids, ...schedule }) => ({
    ...schedule,
    title: SCHEDULE_TITLE,
    location: SCHEDULE_LOCATION,
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
