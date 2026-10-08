"use client";

import { useEffect, useRef } from "react";
import type { DayButton } from "react-day-picker";
import { id as indonesian } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  ListFilter,
  MapPin,
  Minus,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  dateFromKey,
  dateKey,
  formatDate,
  initials,
  jakartaToday,
  statusLabels,
  type AssignmentStatus,
  type Member,
  type Schedule,
} from "@/lib/demo-data";

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const Icon =
    status === "done" ? Check : status === "skipped" ? Minus : Circle;
  return (
    <Badge
      variant={
        status === "done"
          ? "default"
          : status === "skipped"
            ? "outline"
            : "secondary"
      }
      className="gap-1"
    >
      <Icon className="size-3" />
      {statusLabels[status]}
    </Badge>
  );
}

export function MemberAvatars({ members }: { members: Member[] }) {
  return (
    <AvatarGroup>
      {members.slice(0, 4).map((member) => (
        <Tooltip key={member.id}>
          <TooltipTrigger render={<Avatar size="sm" />}>
            <AvatarFallback>{initials(member.name)}</AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>{member.name}</TooltipContent>
        </Tooltip>
      ))}
      {members.length > 4 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs ring-2 ring-background">
          +{members.length - 4}
        </span>
      )}
    </AvatarGroup>
  );
}

export function NoSchedules({
  filtered = false,
  onReset,
  onCreate,
}: {
  filtered?: boolean;
  onReset?: () => void;
  onCreate?: () => void;
}) {
  return (
    <Empty className="min-h-64 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListFilter />
        </EmptyMedia>
        <EmptyTitle>
          {filtered ? "Tidak ada jadwal yang cocok" : "Belum ada jadwal"}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "Coba ubah pencarian atau filter untuk menemukan jadwal."
            : "Jadwal yang dibuat admin akan muncul di sini."}
        </EmptyDescription>
      </EmptyHeader>
      {filtered && onReset && (
        <Button variant="outline" onClick={onReset}>
          Hapus filter
        </Button>
      )}
      {!filtered && onCreate && (
        <Button onClick={onCreate}>Buat jadwal pertama</Button>
      )}
    </Empty>
  );
}

export function DetailedSchedules({
  schedules,
  members,
  memberFilter,
  onOpen,
}: {
  schedules: Schedule[];
  members: Member[];
  memberFilter: string;
  onOpen: (schedule: Schedule) => void;
}) {
  const groups = Map.groupBy(schedules, (schedule) => schedule.date);
  return (
    <div className="space-y-7">
      {Array.from(groups.entries()).map(([date, items]) => (
        <section key={date} aria-label={formatDate(date)}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            {formatDate(date)}
            {date === jakartaToday() && (
              <Badge variant="outline">Hari ini</Badge>
            )}
          </h3>
          <div className="divide-y rounded-xl border">
            {items.map((schedule) => {
              const assigned = members.filter((member) =>
                schedule.assignments.some(
                  (assignment) => assignment.memberId === member.id,
                ),
              );
              const done = schedule.assignments.filter(
                (assignment) => assignment.status === "done",
              ).length;
              const personalAssignment = schedule.assignments.find(
                (assignment) => assignment.memberId === memberFilter,
              );
              return (
                <div
                  key={schedule.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
                >
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground sm:w-32 sm:flex-col sm:items-start">
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {schedule.startTime}–{schedule.endTime}
                    </span>
                    <span>WIB</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Button
                      variant="link"
                      onClick={() => onOpen(schedule)}
                      className="h-auto max-w-full justify-start p-0 text-left text-base whitespace-normal"
                    >
                      {schedule.title}
                    </Button>
                    {schedule.location && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {schedule.location}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm text-muted-foreground">
                      {schedule.notes || "Tidak ada catatan tambahan."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:min-w-40 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      <MemberAvatars members={assigned} />
                      <span className="text-xs text-muted-foreground">
                        {assigned.length} anggota
                      </span>
                    </div>
                    {personalAssignment ? (
                      <StatusBadge status={personalAssignment.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {done}/{assigned.length} selesai
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 self-start sm:self-auto"
                    onClick={() => onOpen(schedule)}
                  >
                    Lihat detail
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ScheduleDay({
  day,
  modifiers,
  schedules,
  className,
  ...props
}: React.ComponentProps<typeof DayButton> & { schedules: Schedule[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  const events = schedules.filter(
    (schedule) => schedule.date === dateKey(day.date),
  );
  return (
    <Button
      {...props}
      ref={ref}
      variant="ghost"
      className={cn(
        "flex h-20 w-full flex-col items-start justify-start gap-1 overflow-hidden rounded-none px-1 py-2 font-normal sm:h-28 sm:px-2 lg:h-32",
        modifiers.selected && "bg-muted",
        modifiers.outside && "opacity-40",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-xs tabular-nums",
          modifiers.today && "bg-primary font-medium text-primary-foreground",
        )}
      >
        {day.date.getDate()}
      </span>
      <span className="hidden w-full space-y-1 sm:block">
        {events.slice(0, 2).map((schedule) => (
          <span
            key={schedule.id}
            className="block truncate rounded bg-muted px-1.5 py-1 text-left text-[11px] text-foreground"
          >
            <span className="mr-1 tabular-nums text-muted-foreground">
              {schedule.startTime}
            </span>
            {schedule.title}
          </span>
        ))}
        {events.length > 2 && (
          <span className="block text-left text-[10px] text-muted-foreground">
            +{events.length - 2} jadwal
          </span>
        )}
      </span>
      {events.length > 0 && (
        <span className="text-[10px] text-muted-foreground sm:hidden">
          {events.length} jadwal
        </span>
      )}
    </Button>
  );
}

export function ScheduleCalendar({
  schedules,
  members,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
  onOpen,
  onCreate,
}: {
  schedules: Schedule[];
  members: Member[];
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onOpen: (schedule: Schedule) => void;
  onCreate?: (date: string) => void;
}) {
  const selectedSchedules = schedules.filter(
    (schedule) => schedule.date === selectedDate,
  );
  function moveMonth(offset: number) {
    onMonthChange(
      new Date(month.getFullYear(), month.getMonth() + offset, 1, 12),
    );
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <section
        className="min-w-0 overflow-hidden rounded-xl border"
        aria-label="Kalender jadwal bulanan"
      >
        <div className="flex items-center justify-between gap-2 border-b p-3 sm:p-4">
          <h3 className="text-base font-medium capitalize">
            {month.toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              onClick={() => {
                const today = jakartaToday();
                onMonthChange(dateFromKey(today));
                onDateSelect(today);
              }}
            >
              Hari ini
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Bulan sebelumnya"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Bulan berikutnya"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <Calendar
          mode="single"
          locale={indonesian}
          weekStartsOn={1}
          month={month}
          onMonthChange={onMonthChange}
          selected={dateFromKey(selectedDate)}
          onSelect={(date) => {
            if (date) onDateSelect(dateKey(date));
          }}
          className="w-full p-0"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full gap-0",
            nav: "hidden",
            month_caption: "hidden",
            month_grid: "w-full table-fixed",
            weekdays: "grid grid-cols-7 border-b",
            weekday:
              "py-3 text-center text-xs font-normal text-muted-foreground",
            week: "mt-0 grid grid-cols-7",
            day: "group/day relative min-w-0 rounded-none border-r border-b p-0 last:border-r-0",
            today: "bg-transparent",
            outside: "text-muted-foreground",
          }}
          components={{
            DayButton: (props) => (
              <ScheduleDay {...props} schedules={schedules} />
            ),
          }}
        />
        <div className="flex items-center gap-2 bg-muted/30 p-3 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          Pilih tanggal untuk melihat jadwal. Semua waktu dalam WIB.
        </div>
      </section>
      <aside className="space-y-4" aria-label="Jadwal pada tanggal terpilih">
        <div>
          <h3 className="text-sm font-medium">{formatDate(selectedDate)}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedSchedules.length} jadwal pada tanggal ini
          </p>
        </div>
        {selectedSchedules.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5">
            <p className="mb-3 text-sm text-muted-foreground">
              Tidak ada jadwal pada tanggal ini.
            </p>
            {onCreate && (
              <Button variant="outline" onClick={() => onCreate(selectedDate)}>
                Buat jadwal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="space-y-3 rounded-xl border p-4"
              >
                <Button
                  variant="link"
                  onClick={() => onOpen(schedule)}
                  className="h-auto justify-start p-0 text-left whitespace-normal"
                >
                  {schedule.title}
                </Button>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {schedule.startTime}–{schedule.endTime} WIB
                </p>
                {schedule.location && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {schedule.location}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <MemberAvatars
                    members={members.filter((member) =>
                      schedule.assignments.some(
                        (assignment) => assignment.memberId === member.id,
                      ),
                    )}
                  />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {schedule.assignments.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onOpen(schedule)}
                >
                  Lihat detail
                </Button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
