"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  KeyRound,
  List,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LoginScreen,
  MemberDialog,
  PasswordForm,
  RequiredPasswordScreen,
  ScheduleDialog,
} from "@/components/schedule-forms";
import {
  DetailedSchedules,
  NoSchedules,
  ScheduleCalendar,
  StatusBadge,
} from "@/components/schedule-views";
import {
  createDemoData,
  dateFromKey,
  filterSchedules,
  formatDate,
  initials,
  jakartaToday,
  shiftDate,
  statusLabels,
  type AssignmentStatus,
  type Member,
  type Schedule,
} from "@/lib/demo-data";

type Section = "schedules" | "members" | "reminders" | "settings";
const sectionLabels: Record<Section, string> = {
  schedules: "Jadwal",
  members: "Anggota",
  reminders: "Pengingat",
  settings: "Pengaturan",
};
const nav = [
  { key: "schedules" as const, label: "Jadwal", icon: CalendarDays },
  { key: "members" as const, label: "Anggota", icon: Users },
  { key: "reminders" as const, label: "Pengingat", icon: Bell },
];

function AppSidebar({
  section,
  onNavigate,
  user,
  isAdmin,
  memberCount,
  onLogout,
}: {
  section: Section;
  onNavigate: (section: Section) => void;
  user: Member;
  isAdmin: boolean;
  memberCount: number;
  onLogout: () => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  function navigate(value: Section) {
    onNavigate(value);
    if (isMobile) setOpenMobile(false);
  }
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("schedules")}
              tooltip="Piket Opsi"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="size-4" />
              </div>
              <div className="grid text-left leading-tight">
                <span className="text-sm font-semibold">Piket Opsi</span>
                <span className="text-xs text-muted-foreground">
                  Manajemen jadwal
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ruang kerja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav
                .filter((item) => isAdmin || item.key !== "members")
                .map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={section === item.key}
                      tooltip={item.label}
                      onClick={() => navigate(item.key)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.key === "members" && (
                      <SidebarMenuBadge>{memberCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={section === "settings"}
                  tooltip="Pengaturan"
                  onClick={() => navigate("settings")}
                >
                  <Settings />
                  <span>Pengaturan</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Tentang pratinjau"
                  onClick={() =>
                    toast.info("Pratinjau frontend", {
                      description:
                        "Data contoh disimpan dalam memori halaman. Akun dan email asli akan terhubung pada tahap backend.",
                    })
                  }
                >
                  <CircleHelp />
                  <span>Tentang pratinjau</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <Avatar>
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left">
                  <span className="truncate text-sm font-medium">
                    {user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin ? "Administrator" : "Anggota"}
                  </span>
                </div>
                <ChevronDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start">
                <DropdownMenuItem onClick={() => navigate("settings")}>
                  <KeyRound />
                  Ubah kata sandi
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function ScheduleApp() {
  const [data, setData] = useState(createDemoData);
  const [passwords, setPasswords] = useState<Record<string, string>>({
    admin: "admin",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [adminMustChange, setAdminMustChange] = useState(true);
  const [section, setSection] = useState<Section>("schedules");
  const [view, setView] = useState("detail");
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [month, setMonth] = useState(() => dateFromKey(jakartaToday()));
  const [selectedDate, setSelectedDate] = useState(jakartaToday);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [scheduleEditor, setScheduleEditor] = useState<{
    schedule?: Schedule;
    date?: string;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null);
  const [emailKind, setEmailKind] = useState("assignment");
  const isAdmin = userId === "admin";
  const user: Member | undefined = isAdmin
    ? { id: "admin", name: "Admin", email: "admin" }
    : data.members.find((member) => member.id === userId);
  const selectedSchedule = data.schedules.find(
    (schedule) => schedule.id === selectedId,
  );
  const emailSchedule = data.schedules.find(
    (schedule) => schedule.id === emailPreviewId,
  );
  const today = jakartaToday();

  useEffect(() => {
    const sync = () =>
      setSelectedId(new URLSearchParams(window.location.search).get("jadwal"));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function login(email: string, password: string) {
    const account =
      email === "admin"
        ? { id: "admin", email: "admin" }
        : data.members.find((member) => member.email === email);
    if (!account || password !== (passwords[account.id] ?? account.email))
      return "Email atau kata sandi tidak cocok. Periksa kembali akun Anda.";
    setUserId(account.id);
    setView("detail");
    setMemberFilter(account.id === "admin" ? "all" : account.id);
    setSection("schedules");
    setStatusFilter("all");
    setSearch("");
    const id = new URLSearchParams(window.location.search).get("jadwal");
    setSelectedId(id);
    if (id && !data.schedules.some((schedule) => schedule.id === id))
      toast.error("Jadwal tidak ditemukan", {
        description:
          "Jadwal mungkin sudah dihapus atau tautan tidak tersedia pada data contoh ini.",
      });
    return null;
  }
  function logout() {
    setUserId(null);
    setSelectedId(null);
    setEmailPreviewId(null);
    setScheduleEditor(null);
    setDeleteId(null);
    setMemberDialogOpen(false);
  }
  function changePassword(current: string, next: string) {
    if (!user) return "Masuk kembali untuk mengubah kata sandi.";
    if (current !== (passwords[user.id] ?? user.email))
      return "Kata sandi saat ini tidak cocok.";
    setPasswords((previous) => ({ ...previous, [user.id]: next }));
    if (isAdmin) setAdminMustChange(false);
    return null;
  }
  function openSchedule(schedule: Schedule) {
    setSelectedId(schedule.id);
    const url = new URL(window.location.href);
    url.searchParams.set("jadwal", schedule.id);
    window.history.pushState({}, "", url);
  }
  function closeSchedule() {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("jadwal");
    window.history.pushState({}, "", url);
  }
  function addMember(value: Omit<Member, "id">) {
    if (!isAdmin) return;
    setData((previous) => ({
      ...previous,
      members: [...previous.members, { ...value, id: crypto.randomUUID() }],
    }));
    toast.success("Anggota ditambahkan", {
      description: `${value.name} dapat masuk dengan email sebagai kata sandi awal dalam pratinjau ini.`,
    });
  }
  function saveSchedule(value: Omit<Schedule, "id">) {
    if (!isAdmin) return;
    const existingId = scheduleEditor?.schedule?.id;
    setData((previous) => ({
      ...previous,
      schedules: existingId
        ? previous.schedules.map((schedule) =>
            schedule.id === existingId
              ? { ...value, id: existingId }
              : schedule,
          )
        : [...previous.schedules, { ...value, id: crypto.randomUUID() }],
    }));
    setSelectedDate(value.date);
    setMonth(dateFromKey(value.date));
    toast.success(existingId ? "Jadwal diperbarui" : "Jadwal dibuat", {
      description: "Tersimpan pada data contoh. Email belum dikirim.",
    });
  }
  function updateStatus(
    scheduleId: string,
    memberId: string,
    status: AssignmentStatus,
  ) {
    if ((!isAdmin && memberId !== userId) || !userId) return;
    setData((previous) => ({
      ...previous,
      schedules: previous.schedules.map((schedule) =>
        schedule.id === scheduleId
          ? {
              ...schedule,
              assignments: schedule.assignments.map((assignment) =>
                assignment.memberId === memberId
                  ? { ...assignment, status }
                  : assignment,
              ),
            }
          : schedule,
      ),
    }));
    toast.success(
      `Status diubah menjadi ${statusLabels[status].toLowerCase()}`,
    );
  }
  async function copyScheduleLink(schedule: Schedule) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("jadwal", schedule.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Tautan jadwal disalin");
    } catch {
      toast.error("Tautan belum disalin", {
        description:
          "Izinkan akses papan klip atau salin tautan dari bilah alamat setelah membuka jadwal.",
      });
    }
  }
  function resetFilters() {
    setSearch("");
    setMemberFilter(isAdmin ? "all" : (userId ?? "all"));
    setStatusFilter("all");
  }

  if (!user) return <LoginScreen onLogin={login} />;
  if (isAdmin && adminMustChange)
    return <RequiredPasswordScreen onSave={changePassword} onLogout={logout} />;

  const filtered = filterSchedules(
    data.schedules,
    memberFilter,
    statusFilter,
    search,
  );
  const upcoming = filtered.filter((schedule) => schedule.date >= today);
  const completed = filtered.reduce(
    (count, schedule) =>
      count +
      schedule.assignments.filter(
        (assignment) =>
          assignment.status === "done" &&
          (memberFilter === "all" || assignment.memberId === memberFilter),
      ).length,
    0,
  );
  const hasFilters =
    search !== "" ||
    statusFilter !== "all" ||
    memberFilter !== (isAdmin ? "all" : user.id);
  const visibleMembers = data.members.filter((member) =>
    `${member.name} ${member.email}`
      .toLocaleLowerCase("id-ID")
      .includes(memberSearch.trim().toLocaleLowerCase("id-ID")),
  );
  const reminderSchedules = data.schedules
    .filter(
      (schedule) =>
        isAdmin ||
        schedule.assignments.some(
          (assignment) => assignment.memberId === userId,
        ),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const reminderCount = reminderSchedules.filter(
    (schedule) => schedule.date === shiftDate(today, 1),
  ).length;
  const memberOptions = [
    { value: "all", label: "Semua anggota" },
    ...data.members.map((member) => ({
      value: member.id,
      label: member.id === user.id ? "Jadwal saya" : member.name,
    })),
  ];
  const statusOptions = [
    { value: "all", label: "Semua status" },
    ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
  ];

  return (
    <SidebarProvider>
      <AppSidebar
        section={section}
        onNavigate={setSection}
        user={user}
        isAdmin={isAdmin}
        memberCount={data.members.length}
        onLogout={logout}
      />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger aria-label="Buka atau tutup menu" />
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  Ruang kerja
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{sectionLabels[section]}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">Data contoh</Badge>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Lihat pengingat"
                    onClick={() => setSection("reminders")}
                  />
                }
              >
                <Bell />
              </TooltipTrigger>
              <TooltipContent>Lihat pengingat</TooltipContent>
            </Tooltip>
            <Avatar size="sm" className="hidden sm:flex">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1440px] space-y-7 p-4 pb-10 sm:p-6 lg:p-8">
          {section === "schedules" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Jadwal piket
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isAdmin
                      ? "Atur jadwal dan pantau tugas seluruh anggota."
                      : `Halo, ${user.name.split(" ")[0]}. Lihat jadwal dan kelola tugas Anda.`}
                  </p>
                </div>
                {isAdmin && (
                  <Button onClick={() => setScheduleEditor({})}>
                    <Plus />
                    Buat jadwal
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-y py-3 text-sm">
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span className="font-medium tabular-nums">
                    {upcoming.length}
                  </span>
                  <span className="text-muted-foreground">
                    jadwal mendatang
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <CheckCheck className="size-4 text-muted-foreground" />
                  <span className="font-medium tabular-nums">{completed}</span>
                  <span className="text-muted-foreground">tugas selesai</span>
                </span>
                <span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                  <Clock3 className="size-3.5" />
                  Asia/Jakarta (WIB)
                </span>
              </div>
              <Tabs
                value={view}
                onValueChange={(value) => setView(String(value))}
                className="gap-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList aria-label="Tampilan jadwal">
                    <TabsTrigger value="detail">
                      <List />
                      Detail
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                      <CalendarDays />
                      Kalender
                    </TabsTrigger>
                  </TabsList>
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} jadwal ditampilkan
                  </p>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
                    <Input
                      aria-label="Cari jadwal"
                      placeholder="Cari judul atau lokasi jadwal..."
                      className="pl-9"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      items={memberOptions}
                      value={memberFilter}
                      onValueChange={(value) => setMemberFilter(String(value))}
                    >
                      <SelectTrigger
                        aria-label="Filter anggota"
                        className="min-w-44"
                      >
                        <Users />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {memberOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      items={statusOptions}
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(String(value))}
                    >
                      <SelectTrigger
                        aria-label="Filter status"
                        className="min-w-36"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasFilters && (
                      <Button variant="ghost" onClick={resetFilters}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
                <TabsContent value="detail">
                  {filtered.length ? (
                    <DetailedSchedules
                      schedules={filtered}
                      members={data.members}
                      memberFilter={memberFilter}
                      onOpen={openSchedule}
                    />
                  ) : (
                    <NoSchedules
                      filtered={hasFilters}
                      onReset={resetFilters}
                      onCreate={
                        isAdmin ? () => setScheduleEditor({}) : undefined
                      }
                    />
                  )}
                </TabsContent>
                <TabsContent value="calendar">
                  <ScheduleCalendar
                    schedules={filtered}
                    members={data.members}
                    month={month}
                    onMonthChange={setMonth}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    onOpen={openSchedule}
                    onCreate={
                      isAdmin
                        ? (date) => setScheduleEditor({ date })
                        : undefined
                    }
                  />
                </TabsContent>
              </Tabs>
            </>
          )}

          {section === "members" && isAdmin && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Anggota
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Kelola anggota yang dapat menerima penugasan jadwal.
                  </p>
                </div>
                <Button onClick={() => setMemberDialogOpen(true)}>
                  <Plus />
                  Tambah anggota
                </Button>
              </div>
              <Alert>
                <KeyRound />
                <AlertDescription>
                  Anggota baru masuk menggunakan email sebagai kata sandi awal.
                  Mereka dapat mengubahnya melalui pengaturan.
                </AlertDescription>
              </Alert>
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  aria-label="Cari anggota"
                  placeholder="Cari nama atau email..."
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />
              </div>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Anggota</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Email
                      </TableHead>
                      <TableHead className="text-right">
                        Tugas mendatang
                      </TableHead>
                      <TableHead className="pr-4 text-right">Jadwal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {initials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium">{member.name}</p>
                              <p className="max-w-40 truncate text-xs text-muted-foreground sm:hidden">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {member.email}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {
                            data.schedules.filter(
                              (schedule) =>
                                schedule.date >= today &&
                                schedule.assignments.some(
                                  (assignment) =>
                                    assignment.memberId === member.id &&
                                    assignment.status === "scheduled",
                                ),
                            ).length
                          }
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberFilter(member.id);
                              setStatusFilter("all");
                              setSearch("");
                              setSection("schedules");
                            }}
                          >
                            Lihat jadwal
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {visibleMembers.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Tidak ada anggota yang cocok. Coba nama atau email
                          lain.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.members.length} anggota terdaftar dalam data contoh.
              </p>
            </>
          )}

          {section === "reminders" && (
            <>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Pengingat email
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tinjau penerima dan isi pengingat untuk setiap jadwal.
                </p>
              </div>
              <Alert>
                <Mail />
                <AlertDescription>
                  Ini adalah pratinjau. Email belum dikirim. Pada aplikasi
                  lengkap, anggota menerima email saat ditugaskan dan pengingat
                  lagi sehari sebelum jadwal.
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-x-6 gap-y-3 border-y py-4 text-sm">
                <span>
                  <span className="font-medium">{reminderCount}</span>{" "}
                  <span className="text-muted-foreground">jadwal besok</span>
                </span>
                <span className="text-muted-foreground">
                  Tautan jadwal disertakan di setiap email
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Waktu lokal WIB
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Jadwal</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Penerima
                      </TableHead>
                      <TableHead>Pengingat H−1</TableHead>
                      <TableHead className="pr-4 text-right">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminderSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="pl-4">
                          <Button
                            variant="link"
                            className="h-auto p-0 text-left whitespace-normal"
                            onClick={() => openSchedule(schedule)}
                          >
                            {schedule.title}
                          </Button>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(schedule.date, true)} ·{" "}
                            {schedule.startTime} WIB
                          </p>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {isAdmin
                            ? `${schedule.assignments.length} anggota`
                            : user.email}
                        </TableCell>
                        <TableCell>
                          <span className="block text-sm">
                            {formatDate(shiftDate(schedule.date, -1), true)}
                          </span>
                          <Badge variant="outline" className="mt-1">
                            {schedule.date < today
                              ? "Tanggal berlalu"
                              : "Direncanakan"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEmailPreviewId(schedule.id);
                              setEmailKind("assignment");
                            }}
                          >
                            Pratinjau
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reminderSchedules.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Pengingat akan muncul setelah ada jadwal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {section === "settings" && (
            <>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Pengaturan akun
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Periksa profil dan ubah kata sandi Anda.
                </p>
              </div>
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,28rem)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Profil</CardTitle>
                    <CardDescription>
                      Informasi akun yang dikelola admin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <Badge variant="secondary" className="mt-1">
                          {isAdmin ? "Administrator" : "Anggota"}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <dl className="space-y-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">
                          {isAdmin ? "Nama pengguna" : "Email"}
                        </dt>
                        <dd className="mt-1 break-all">{user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Zona waktu jadwal
                        </dt>
                        <dd className="mt-1">Asia/Jakarta (WIB)</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Ubah kata sandi</CardTitle>
                    <CardDescription>
                      {isAdmin
                        ? "Kata sandi awal admin sudah diperbarui."
                        : "Opsional. Pilih kata sandi baru untuk mengganti kata sandi awal."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PasswordForm onSave={changePassword} />
                  </CardContent>
                </Card>
              </div>
              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                Perubahan akun pada pratinjau ini hanya berlaku selama halaman
                terbuka. Memuat ulang halaman akan mengembalikan semua data dan
                kata sandi contoh.
              </p>
            </>
          )}
        </div>
      </SidebarInset>

      <MemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        members={data.members}
        onSave={addMember}
      />
      {scheduleEditor && (
        <ScheduleDialog
          key={scheduleEditor.schedule?.id ?? scheduleEditor.date ?? "new"}
          open
          onOpenChange={(open) => {
            if (!open) setScheduleEditor(null);
          }}
          members={data.members}
          schedule={scheduleEditor.schedule}
          initialDate={scheduleEditor.date}
          onSave={saveSchedule}
        />
      )}

      <Sheet
        open={Boolean(selectedSchedule)}
        onOpenChange={(open) => {
          if (!open) closeSchedule();
        }}
      >
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b p-6 pr-12">
            <SheetTitle className="text-xl leading-tight">
              {selectedSchedule?.title}
            </SheetTitle>
            <SheetDescription>
              Detail jadwal dan status setiap anggota.
            </SheetDescription>
          </SheetHeader>
          {selectedSchedule && (
            <div className="space-y-6 px-6 pb-6">
              <dl className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Tanggal</dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(selectedSchedule.date)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Waktu</dt>
                    <dd className="mt-1">
                      {selectedSchedule.startTime}–{selectedSchedule.endTime}{" "}
                      WIB
                    </dd>
                  </div>
                </div>
                {selectedSchedule.location && (
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Lokasi</dt>
                      <dd className="mt-1 break-words">
                        {selectedSchedule.location}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium">Catatan</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {selectedSchedule.notes || "Tidak ada catatan tambahan."}
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Anggota yang bertugas</h3>
                  <Badge variant="secondary">
                    {selectedSchedule.assignments.length} anggota
                  </Badge>
                </div>
                {isAdmin && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Anda dapat memperbarui status anggota jika mereka lupa
                    menandai tugasnya.
                  </p>
                )}
                {selectedSchedule.assignments.map((assignment) => {
                  const member = data.members.find(
                    (item) => item.id === assignment.memberId,
                  );
                  if (!member) return null;
                  const canChange = isAdmin || assignment.memberId === user.id;
                  return (
                    <div
                      key={member.id}
                      className="space-y-3 rounded-xl border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {member.name}
                            {member.id === user.id ? " (Anda)" : ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                        {!canChange && (
                          <StatusBadge status={assignment.status} />
                        )}
                      </div>
                      {canChange && (
                        <div className="flex items-center justify-between gap-2">
                          <Label
                            htmlFor={`status-${member.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Status tugas
                          </Label>
                          <Select
                            items={Object.entries(statusLabels).map(
                              ([value, label]) => ({ value, label }),
                            )}
                            value={assignment.status}
                            onValueChange={(value) => {
                              if (value)
                                updateStatus(
                                  selectedSchedule.id,
                                  member.id,
                                  value as AssignmentStatus,
                                );
                            }}
                          >
                            <SelectTrigger
                              id={`status-${member.id}`}
                              aria-label={`Status ${member.name}`}
                              className="min-w-36"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Alert>
                <Bell />
                <AlertDescription>
                  Email penugasan dan pengingat H−1 akan menyertakan tautan
                  jadwal ini. Pengiriman belum aktif pada pratinjau.
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyScheduleLink(selectedSchedule)}
                >
                  <Copy />
                  Salin tautan
                </Button>
                {(isAdmin ||
                  selectedSchedule.assignments.some(
                    (assignment) => assignment.memberId === user.id,
                  )) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailPreviewId(selectedSchedule.id);
                      setEmailKind("assignment");
                    }}
                  >
                    <Mail />
                    Pratinjau email
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setScheduleEditor({ schedule: selectedSchedule })
                      }
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteId(selectedSchedule.id)}
                    >
                      <Trash2 />
                      Hapus
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(emailSchedule)}
        onOpenChange={(open) => {
          if (!open) setEmailPreviewId(null);
        }}
      >
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b p-6 pr-12">
            <SheetTitle>Pratinjau email</SheetTitle>
            <SheetDescription>
              Contoh pesan yang akan diterima anggota.
            </SheetDescription>
          </SheetHeader>
          {emailSchedule && (
            <div className="space-y-5 px-6 pb-6">
              <Tabs
                value={emailKind}
                onValueChange={(value) => setEmailKind(String(value))}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="assignment">Penugasan</TabsTrigger>
                  <TabsTrigger value="reminder">Pengingat H−1</TabsTrigger>
                </TabsList>
              </Tabs>
              <dl className="space-y-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Kepada</dt>
                  <dd className="mt-1 break-all leading-relaxed">
                    {data.members
                      .filter(
                        (member) =>
                          emailSchedule.assignments.some(
                            (assignment) => assignment.memberId === member.id,
                          ) &&
                          (isAdmin || member.id === user.id),
                      )
                      .map((member) => member.email)
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Subjek</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {emailKind === "reminder"
                      ? "Pengingat: jadwal piket Anda besok"
                      : "Anda mendapat jadwal piket baru"}
                  </dd>
                </div>
              </dl>
              <Separator />
              <div className="space-y-5 rounded-xl border p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="size-4" />
                  Piket Opsi
                </div>
                <h3 className="text-lg font-semibold">
                  {emailKind === "reminder"
                    ? "Jangan lupa jadwal Anda besok."
                    : "Jadwal baru untuk Anda."}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {emailKind === "reminder"
                    ? "Anda dijadwalkan bertugas besok. Berikut detailnya:"
                    : "Admin telah menugaskan Anda pada jadwal berikut:"}
                </p>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Kegiatan</dt>
                    <dd className="mt-1 font-medium">{emailSchedule.title}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Tanggal dan waktu
                    </dt>
                    <dd className="mt-1">
                      {formatDate(emailSchedule.date)}
                      <br />
                      {emailSchedule.startTime}–{emailSchedule.endTime} WIB
                    </dd>
                  </div>
                  {emailSchedule.location && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Lokasi</dt>
                      <dd className="mt-1">{emailSchedule.location}</dd>
                    </div>
                  )}
                </dl>
                <Button
                  onClick={() => {
                    setEmailPreviewId(null);
                    openSchedule(emailSchedule);
                  }}
                >
                  Buka jadwal
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Setelah bertugas, buka jadwal dan ubah status Anda menjadi
                  selesai.
                </p>
              </div>
              <Alert>
                <ShieldCheck />
                <AlertDescription>
                  Pratinjau ini tidak mengirim email. Tautan akan membuka jadwal
                  di aplikasi.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jadwal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal dan seluruh status penugasannya akan dihapus dari data
              contoh. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!isAdmin || !deleteId) return;
                setData((previous) => ({
                  ...previous,
                  schedules: previous.schedules.filter(
                    (schedule) => schedule.id !== deleteId,
                  ),
                }));
                if (selectedId === deleteId) closeSchedule();
                if (emailPreviewId === deleteId) setEmailPreviewId(null);
                setDeleteId(null);
                toast.success("Jadwal dihapus");
              }}
            >
              Hapus jadwal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
