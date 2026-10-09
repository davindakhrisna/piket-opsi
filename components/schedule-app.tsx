"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Copy,
  KeyRound,
  List,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme-controls";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
  DeleteMemberDialog,
  OrganizationDialog,
  NotificationControls,
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
  dateFromKey,
  filterSchedules,
  formatDate,
  initials,
  jakartaToday,
  shiftDate,
  statusLabels,
  type DayRange,
  type AssignmentStatus,
  type Member,
  type Schedule,
  type AppSnapshot,
  notificationWindowLabel,
  type SessionUser,
} from "@/lib/domain";

type AppUser = Omit<Member, "organization"> & {
  organization?: Member["organization"];
};

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
  user: AppUser;
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
    <Sidebar
      collapsible="icon"
      className="group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:mx-auto"
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
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
                  tooltip="Tentang Piket Opsi"
                  onClick={() =>
                    toast.info("Piket Opsi", {
                      description:
                        "Jadwal Ruang Opsi menggunakan WIB. Penugasan dikirim sesuai waktu admin atau manual, dengan pengingat sehari sebelum jadwal.",
                    })
                  }
                >
                  <CircleHelp />
                  <span>Tentang Piket Opsi</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
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

const emptyAppData: Omit<AppSnapshot, "user"> = {
  organizations: [],
  members: [],
  schedules: [],
  emails: [],
  notificationSettings: { dailyHour: null, version: 0 },
};

export default function ScheduleApp() {
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [data, setData] = useState<Omit<AppSnapshot, "user">>(emptyAppData);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState(false);
  const statusPending = useRef(false);
  const [notificationSending, setNotificationSending] = useState(false);
  const notificationPending = useRef(false);
  const [section, setSection] = useState<Section>("schedules");
  const [view, setView] = useState("detail");
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("scheduled");
  const [dayRange, setDayRange] = useState<DayRange>("all");
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [month, setMonth] = useState(() => dateFromKey(jakartaToday()));
  const [selectedDate, setSelectedDate] = useState(jakartaToday);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [scheduleEditor, setScheduleEditor] = useState<{
    schedule?: Schedule;
    date?: string;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null);
  const [emailKind, setEmailKind] = useState("assignment");
  const userId = user?.id ?? null;
  const isAdmin = user?.role === "admin";
  const selectedSchedule = data.schedules.find(
    (schedule) => schedule.id === selectedId,
  );
  const emailSchedule = data.schedules.find(
    (schedule) => schedule.id === emailPreviewId,
  );
  const today = jakartaToday();
  const activeMembers = data.members.filter((member) => !member.deleted);
  const notificationCount = data.schedules
    .filter((schedule) => schedule.date >= today)
    .flatMap((schedule) => schedule.assignments)
    .filter(
      (assignment) =>
        assignment.status === "scheduled" &&
        assignment.notificationStatus !== "notified" &&
        activeMembers.some((member) => member.id === assignment.memberId),
    ).length;

  const applySnapshot = useCallback(
    (value: AppSnapshot, initialize = false) => {
      setUser(value.user);
      setData({
        organizations: value.organizations,
        members: value.members,
        schedules: value.schedules,
        emails: value.emails,
        notificationSettings: value.notificationSettings,
      });
      setLoadError("");
      if (initialize) {
        setView(value.user.role === "admin" ? "calendar" : "detail");
        setMemberFilter(value.user.role === "admin" ? "all" : value.user.id);
        setSection("schedules");
        setStatusFilter("scheduled");
        setDayRange("all");
        setSearch("");
        const id = new URLSearchParams(window.location.search).get("jadwal");
        setSelectedId(id);
        if (
          id &&
          !value.user.initialPassword &&
          !value.schedules.some((schedule) => schedule.id === id)
        )
          toast.error("Jadwal tidak ditemukan", {
            description: "Jadwal sudah dihapus atau tautannya tidak valid.",
          });
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      applySnapshot(await api<AppSnapshot>("snapshot"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        toast.dismiss();
        setUser(null);
        setData(emptyAppData);
      }
      throw error;
    }
  }, [applySnapshot]);

  useEffect(() => {
    const controller = new AbortController();
    api<AppSnapshot>("snapshot", "GET", undefined, controller.signal)
      .then((value) => {
        applySnapshot(value, true);
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (!(error instanceof ApiError && error.status === 401))
          setLoadError(error.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [applySnapshot]);

  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      if (document.visibilityState === "visible")
        void refresh().catch((error) => toast.error(error.message));
    };
    const interval = window.setInterval(sync, 60000);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", sync);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (user?.role === "member" && user.initialPassword)
      toast.info("Lindungi akun Anda", {
        id: "initial-password",
        description:
          "Anda masih menggunakan email sebagai kata sandi. Atur kata sandi baru melalui Pengaturan.",
        duration: 10000,
        classNames: {
          toast: "grid! grid-cols-[auto_minmax(0,1fr)]! items-start! gap-x-3! gap-y-3!",
          icon: "mt-0.5! self-start!",
          content: "min-w-0",
          actionButton: "col-start-2! m-0! h-11! justify-self-end! px-4! sm:h-8!",
        },
        action: {
          label: "Atur sekarang",
          onClick: () => setSection("settings"),
        },
      });
  }, [user?.id, user?.role, user?.initialPassword]);

  useEffect(() => {
    const sync = () =>
      setSelectedId(new URLSearchParams(window.location.search).get("jadwal"));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  async function login(email: string, password: string) {
    try {
      await api("auth/login", "POST", { email, password });
      applySnapshot(await api<AppSnapshot>("snapshot"), true);
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  }
  async function logout() {
    try {
      await api("auth/logout", "POST", {});
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        toast.error((error as Error).message);
        return;
      }
    }
    toast.dismiss();
    setFilterSheetOpen(false);
    setUser(null);
    setData(emptyAppData);
    setSelectedId(null);
    setEmailPreviewId(null);
    setScheduleEditor(null);
    setDeleteId(null);
    setMemberDialogOpen(false);
    setEditingMember(undefined);
    setDeletingMember(null);
    setOrganizationDialogOpen(false);
  }
  async function changePassword(next: string) {
    try {
      const result = await api<{ user: SessionUser }>("auth/password", "POST", {
        newPassword: next,
      });
      setUser(result.user);
      toast.dismiss("initial-password");
      await refresh().catch((error) =>
        toast.error(
          "Kata sandi telah diubah. Muat ulang untuk melihat data terbaru.",
          {
            description: error.message,
          },
        ),
      );
      return null;
    } catch (error) {
      return (error as Error).message;
    }
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
  async function mutation(path: string, method: string, value: unknown) {
    try {
      await api(path, method, value);
      await refresh().catch((error) =>
        toast.error(
          "Perubahan tersimpan. Muat ulang untuk melihat data terbaru.",
          { description: error.message },
        ),
      );
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409)
        await refresh().catch(() => {});
      return (error as Error).message;
    }
  }
  async function addMember(value: Omit<Member, "id"> & { requestId: string }) {
    const error = await mutation("members", "POST", value);
    if (!error)
      toast.success("Anggota ditambahkan", {
        description:
          value.name +
          " dapat masuk menggunakan email sebagai kata sandi awal.",
      });
    return error;
  }
  async function addOrganization(name: string) {
    const error = await mutation("organizations", "POST", { name });
    if (!error) toast.success("Organisasi tersimpan");
    return error;
  }
  async function saveMember(value: Omit<Member, "id"> & { requestId: string }) {
    if (!editingMember) return addMember(value);
    const error = await mutation(`members/${editingMember.id}`, "PUT", value);
    if (!error) toast.success("Anggota diperbarui");
    return error;
  }
  async function removeMember() {
    if (!deletingMember) return "Anggota tidak ditemukan.";
    const error = await mutation(`members/${deletingMember.id}`, "DELETE", {
      version: deletingMember.version,
    });
    if (!error) {
      if (memberFilter === deletingMember.id) setMemberFilter("all");
      toast.success("Anggota dihapus", {
        description: "Riwayat jadwal tetap tersimpan.",
      });
    }
    return error;
  }
  async function saveNotificationSettings(
    dailyHour: number | null,
    version: number,
  ) {
    const error = await mutation("notification-settings", "PUT", {
      dailyHour,
      version,
    });
    if (error) toast.error(error);
    else toast.success("Waktu pengiriman tersimpan");
    return error;
  }
  async function sendNotifications(scheduleId?: string) {
    if (notificationPending.current) return;
    notificationPending.current = true;
    setNotificationSending(true);
    try {
      const result = await api<{
        sent: number;
        pending: number;
        review: number;
        busy?: boolean;
      }>("notifications/send", "POST", scheduleId ? { scheduleId } : {});
      await refresh();
      if (result.busy)
        toast.info(
          "Pengiriman sedang diproses. Muat ulang untuk melihat status terbaru.",
        );
      else
        toast.success(`${result.sent} email dikirim ke Sistem`, {
          description:
            result.pending || result.review
              ? "Periksa status pengiriman untuk email yang masih tertunda."
              : "Anggota yang sudah diberi tahu dilewati.",
        });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      notificationPending.current = false;
      setNotificationSending(false);
    }
  }
  async function updateOrganization(name: string, newName: string) {
    const error = await mutation("organizations", "PUT", { name, newName });
    if (!error) toast.success("Organisasi diperbarui");
    return error;
  }
  async function deleteOrganization(name: string) {
    const error = await mutation("organizations", "DELETE", { name });
    if (!error) toast.success("Organisasi dihapus");
    return error;
  }
  async function saveSchedule(
    value: Omit<Schedule, "id"> & { requestId: string },
  ) {
    const id = scheduleEditor?.schedule?.id;
    const error = await mutation(
      id ? "schedules/" + id : "schedules",
      id ? "PUT" : "POST",
      value,
    );
    if (!error) {
      setSelectedDate(value.date);
      setMonth(dateFromKey(value.date));
      toast.success(id ? "Jadwal diperbarui" : "Jadwal dibuat", {
        description: id
          ? "Notifikasi penugasan menunggu pengiriman otomatis atau Kirim semua."
          : "Kirim notifikasi kepada anggota yang baru ditugaskan?",
        ...(!id && {
          duration: Infinity,
          classNames: {
            actionButton: "h-11! shrink-0 md:h-8!",
            cancelButton: "h-11! shrink-0 md:h-8!",
          },
          action: {
            label: "Kirim sekarang",
            onClick: () => {
              void sendNotifications(value.requestId);
            },
          },
          cancel: { label: "Nanti", onClick: () => {} },
        }),
      });
    }
    return error;
  }
  async function updateStatus(
    scheduleId: string,
    memberId: string,
    status: AssignmentStatus,
  ) {
    if (statusPending.current) return;
    statusPending.current = true;
    setPending(true);
    try {
      const error = await mutation(
        "schedules/" + scheduleId + "/status",
        "PATCH",
        {
          memberId,
          status,
          version: data.schedules.find((schedule) => schedule.id === scheduleId)
            ?.version,
        },
      );
      if (error) toast.error(error);
      else
        toast.success(
          "Status diubah menjadi " + statusLabels[status].toLowerCase(),
        );
    } finally {
      statusPending.current = false;
      setPending(false);
    }
  }
  async function removeSchedule() {
    if (!deleteId || pending) return;
    setPending(true);
    try {
      const error = await mutation("schedules/" + deleteId, "DELETE", {
        version: data.schedules.find((schedule) => schedule.id === deleteId)
          ?.version,
      });
      if (error) {
        toast.error(error);
        return;
      }
      if (selectedId === deleteId) closeSchedule();
      if (emailPreviewId === deleteId) setEmailPreviewId(null);
      setDeleteId(null);
      toast.success("Jadwal dihapus");
    } finally {
      setPending(false);
    }
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
    setStatusFilter("scheduled");
    setDayRange("all");
  }

  if (loading)
    return (
      <main
        aria-busy="true"
        className="flex min-h-svh items-center justify-center p-5"
      >
        <Spinner className="size-8" aria-label="Memuat aplikasi" />
      </main>
    );
  if (loadError)
    return (
      <main className="flex min-h-svh items-center justify-center p-5">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Koneksi belum tersedia</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Coba lagi</Button>
          </CardContent>
        </Card>
      </main>
    );
  if (!user) return <LoginScreen onLogin={login} />;
  if (isAdmin && user.initialPassword)
    return <RequiredPasswordScreen onSave={changePassword} onLogout={logout} />;

  const filtered = filterSchedules(
    data.schedules,
    memberFilter,
    statusFilter,
    search,
    dayRange,
    today,
  );
  const hasFilters =
    search !== "" ||
    statusFilter !== "scheduled" ||
    dayRange !== "all" ||
    memberFilter !== (isAdmin ? "all" : user.id);
  const visibleMembers = activeMembers.filter((member) =>
    `${member.name} ${member.email} ${member.organization}`
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
    { value: user.id, label: "Jadwal saya" },
  ];
  const dayOptions = [
    { value: "all", label: "Semua tanggal" },
    ...["3", "7", "14", "30"].map((value) => ({
      value,
      label: `${value} hari ke depan`,
    })),
  ];
  const statusOptions = [
    { value: "all", label: "Semua status" },
    ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
  ];
  const scopeLabel =
    memberFilter === "all"
      ? "Semua anggota"
      : memberFilter === user.id
        ? "Jadwal saya"
        : data.members.find((member) => member.id === memberFilter)?.name;
  const filterCount = [
    search !== "",
    memberFilter !== (isAdmin ? "all" : user.id),
    statusFilter !== "scheduled",
    dayRange !== "all",
  ].filter(Boolean).length;
  const filterControls = (
    <div className="grid gap-5 md:flex md:flex-wrap md:items-center md:gap-2">
      {!isAdmin && (
        <div className="space-y-2 md:space-y-0">
          <Label htmlFor="schedule-member-filter" className="md:hidden">
            Anggota
          </Label>
          <Select
            items={memberOptions}
            value={memberFilter}
            onValueChange={(value) => setMemberFilter(String(value))}
          >
            <SelectTrigger
              id="schedule-member-filter"
              aria-label="Filter anggota"
              className="h-11! w-full min-w-0 md:h-8! md:w-fit md:min-w-44"
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
        </div>
      )}
      <div className="space-y-2 md:space-y-0">
        <Label htmlFor="schedule-status-filter" className="md:hidden">
          Status
        </Label>
        <Select
          items={statusOptions}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(String(value))}
        >
          <SelectTrigger
            id="schedule-status-filter"
            aria-label="Filter status"
            className="h-11! w-full min-w-0 md:h-8! md:w-fit md:min-w-36"
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
      </div>
      <div className="space-y-2 md:space-y-0">
        <Label htmlFor="schedule-day-filter" className="md:hidden">
          Rentang hari
        </Label>
        <Select
          items={dayOptions}
          value={dayRange}
          onValueChange={(value) => setDayRange(value as DayRange)}
        >
          <SelectTrigger
            id="schedule-day-filter"
            aria-label="Filter rentang hari"
            className="h-11! w-full min-w-0 md:h-8! md:w-fit md:min-w-40"
          >
            <CalendarDays />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dayOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isAdmin && memberFilter !== "all" && (
        <Button
          variant="outline"
          className="h-11 md:h-8"
          onClick={() => setMemberFilter("all")}
          aria-label="Hapus filter anggota"
        >
          {scopeLabel}
          <X />
        </Button>
      )}
      {hasFilters && (
        <Button variant="ghost" className="h-11 md:h-8" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );

  return (
    <SidebarProvider
      style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties}
    >
      <AppSidebar
        section={section}
        onNavigate={setSection}
        user={user}
        isAdmin={isAdmin}
        memberCount={activeMembers.length}
        onLogout={logout}
      />
      <SidebarInset className="min-w-0">
        <header className="flex h-18.5 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
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
            <Button
              variant="ghost"
              size="icon"
              aria-label="Muat ulang jadwal"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void refresh()
                  .catch((error) => toast.error(error.message))
                  .finally(() => setPending(false));
              }}
            >
              <RefreshCw className={pending ? "animate-spin" : ""} />
            </Button>
            <ThemeToggle />
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
          {!isAdmin && user.initialPassword && (
            <Alert>
              <KeyRound />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Email Anda masih menjadi kata sandi awal. Atur kata sandi baru
                  untuk melindungi akun.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSection("settings")}
                >
                  Atur kata sandi
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {section === "schedules" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Jadwal piket
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isAdmin
                      ? "Ruang Opsi · WIB. Atur piket dan pantau tugas seluruh anggota."
                      : "Ruang Opsi · WIB. Lihat siapa yang bertugas dan kelola status piket Anda."}
                  </p>
                </div>
                {isAdmin && (
                  <Button onClick={() => setScheduleEditor({})}>
                    <Plus />
                    Buat jadwal
                  </Button>
                )}
              </div>
              <Tabs
                value={view}
                onValueChange={(value) => setView(String(value))}
                className="gap-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList
                    aria-label="Tampilan jadwal"
                    className="group-data-horizontal/tabs:h-13 md:group-data-horizontal/tabs:h-8"
                  >
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
                <div className="flex gap-2 md:flex-col md:gap-3 xl:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-3.5 left-2.5 size-4 text-muted-foreground md:top-2" />
                    <Input
                      aria-label="Cari jadwal"
                      placeholder="Cari catatan jadwal..."
                      className="h-11 pl-9 text-base md:h-8 md:text-sm"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  {isMobile ? (
                    <Sheet
                      open={filterSheetOpen}
                      onOpenChange={setFilterSheetOpen}
                    >
                      <SheetTrigger
                        render={
                          <Button
                            variant="outline"
                            className="h-11 shrink-0"
                            aria-label="Buka filter jadwal"
                          />
                        }
                      >
                        <SlidersHorizontal />
                        Filter
                        {filterCount > 0 && (
                          <Badge variant="secondary">{filterCount}</Badge>
                        )}
                      </SheetTrigger>
                      <SheetContent
                        side="bottom"
                        className="max-h-[85svh] gap-0 overflow-y-auto rounded-t-xl [&_[data-slot=sheet-close]]:size-11"
                      >
                        <SheetHeader className="border-b p-5 pr-12">
                          <SheetTitle>Filter jadwal</SheetTitle>
                          <SheetDescription>
                            Atur anggota, status, dan rentang hari.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="p-5">{filterControls}</div>
                        <SheetFooter className="border-t px-5 py-4">
                          <Button
                            className="h-11 w-full"
                            onClick={() => setFilterSheetOpen(false)}
                          >
                            Lihat {filtered.length} jadwal
                          </Button>
                        </SheetFooter>
                      </SheetContent>
                    </Sheet>
                  ) : (
                    filterControls
                  )}
                </div>
                {isMobile && (
                  <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
                    {scopeLabel} ·{" "}
                    {
                      statusOptions.find((item) => item.value === statusFilter)
                        ?.label
                    }{" "}
                    ·{" "}
                    {dayOptions.find((item) => item.value === dayRange)?.label}
                  </p>
                )}
                <TabsContent value="detail">
                  {filtered.length ? (
                    <DetailedSchedules
                      key={`${memberFilter}/${statusFilter}/${dayRange}/${search}`}
                      schedules={filtered}
                      members={data.members}
                      memberFilter={memberFilter}
                      onOpen={openSchedule}
                    />
                  ) : (
                    <NoSchedules
                      filtered={hasFilters || data.schedules.length > 0}
                      onReset={() => {
                        resetFilters();
                        setMemberFilter("all");
                        setStatusFilter("all");
                      }}
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOrganizationDialogOpen(true)}
                  >
                    <Building2 />
                    Organisasi
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingMember(undefined);
                      setMemberDialogOpen(true);
                    }}
                  >
                    <Plus />
                    Tambah anggota
                  </Button>
                </div>
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
                  placeholder="Cari nama, email, atau organisasi..."
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
                      <TableHead className="pr-4 text-right">Aksi</TableHead>
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
                              <p className="max-w-48 break-words text-xs text-muted-foreground">
                                {member.organization}
                              </p>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-11 sm:size-8"
                                  aria-label={`Aksi ${member.name}`}
                                />
                              }
                            >
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setMemberFilter(member.id);
                                  setStatusFilter("scheduled");
                                  setDayRange("all");
                                  setView("calendar");
                                  setSearch("");
                                  setSection("schedules");
                                }}
                              >
                                <CalendarDays /> Lihat jadwal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMember(member);
                                  setMemberDialogOpen(true);
                                }}
                              >
                                <Pencil /> Edit anggota
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeletingMember(member)}
                              >
                                <Trash2 /> Hapus anggota
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {visibleMembers.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Tidak ada anggota yang cocok. Coba nama, email, atau
                          organisasi lain.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeMembers.length} anggota terdaftar.
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
                  {data.notificationSettings.dailyHour === null
                    ? "Notifikasi penugasan dikirim manual oleh admin. "
                    : `Notifikasi penugasan diproses setiap hari pukul ${notificationWindowLabel(data.notificationSettings.dailyHour)}. `}
                  Pengingat H−1 tetap otomatis mulai pukul 07.00 WIB. Periksa
                  status di bawah jika pengiriman tertunda.
                </AlertDescription>
              </Alert>
              {isAdmin && (
                <NotificationControls
                  key={data.notificationSettings.version}
                  settings={data.notificationSettings}
                  count={notificationCount}
                  sending={notificationSending}
                  onSave={saveNotificationSettings}
                  onSend={sendNotifications}
                />
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-3 border-y py-4 text-sm">
                <span>
                  <span className="font-medium">{reminderCount}</span>{" "}
                  <span className="text-muted-foreground">jadwal besok</span>
                </span>
                <span className="text-muted-foreground">
                  Tautan jadwal disertakan di setiap email
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Tanggal mengikuti WIB
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
                            {formatDate(schedule.date, true)}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            {
                              schedule.assignments.filter(
                                (assignment) =>
                                  assignment.notificationStatus === "notified",
                              ).length
                            }
                            /{schedule.assignments.length} diberi tahu
                          </Badge>
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
              <section
                className="space-y-4"
                aria-label="Status pengiriman email"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Status pengiriman</h2>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={async () => {
                        setPending(true);
                        try {
                          await api("emails/process", "POST", {});
                          await refresh();
                          toast.success("Antrean diperiksa");
                        } catch (error) {
                          toast.error((error as Error).message);
                        } finally {
                          setPending(false);
                        }
                      }}
                    >
                      {pending ? "Memproses…" : "Coba kirim antrean"}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Terkirim berarti email diterima sistem untuk diteruskan ke
                  penerima. Batas paket gratis dapat menunda pengiriman. Email
                  yang memerlukan pemeriksaan tidak dikirim ulang otomatis.
                </p>
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Anggota</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.emails.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            {job.kind === "assignment"
                              ? "Penugasan"
                              : "Pengingat H−1"}
                          </TableCell>
                          <TableCell>
                            {data.members.find(
                              (member) => member.id === job.memberId,
                            )?.name ?? "Anggota"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {
                                {
                                  waiting: "Menunggu pengiriman",
                                  pending: "Mengantre",
                                  sending: "Mengirim",
                                  sent: "Terkirim",
                                  cancelled: "Dibatalkan",
                                  review: "Perlu pemeriksaan",
                                }[job.state]
                              }
                            </Badge>
                            {job.errorCode && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {job.errorCode === "free_plan_quota"
                                  ? "Batas pengiriman gratis tercapai"
                                  : job.errorCode === "delivery_requires_review"
                                    ? "Periksa riwayat email sebelum mengirim ulang"
                                    : job.errorCode.replaceAll("_", " ")}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.emails.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Belum ada email penugasan atau pengingat.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
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
                      {user.organization && (
                        <div>
                          <dt className="text-muted-foreground">Organisasi</dt>
                          <dd className="mt-1">{user.organization}</dd>
                        </div>
                      )}
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
                    <PasswordForm
                      key={String(user.initialPassword)}
                      onSave={changePassword}
                    />
                  </CardContent>
                </Card>
              </div>
              <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                Kata sandi disimpan sebagai hash. Mengubah kata sandi mengakhiri
                sesi lain yang menggunakan akun Anda.
              </p>
            </>
          )}
        </div>
      </SidebarInset>

      {isAdmin && (
        <OrganizationDialog
          open={organizationDialogOpen}
          onOpenChange={setOrganizationDialogOpen}
          organizations={data.organizations}
          members={data.members}
          onSave={addOrganization}
          onUpdate={updateOrganization}
          onDelete={deleteOrganization}
        />
      )}
      {isAdmin && (
        <MemberDialog
          key={editingMember?.id ?? "new-member"}
          open={memberDialogOpen}
          onOpenChange={(open) => {
            setMemberDialogOpen(open);
            if (!open) setEditingMember(undefined);
          }}
          members={data.members}
          organizations={data.organizations}
          member={editingMember}
          onSave={saveMember}
        />
      )}
      {isAdmin && deletingMember && (
        <DeleteMemberDialog
          member={deletingMember}
          onOpenChange={(open) => {
            if (!open) setDeletingMember(null);
          }}
          onDelete={removeMember}
        />
      )}
      {scheduleEditor && (
        <ScheduleDialog
          key={scheduleEditor.schedule?.id ?? scheduleEditor.date ?? "new"}
          open
          onOpenChange={(open) => {
            if (!open) setScheduleEditor(null);
          }}
          members={data.members}
          organizations={data.organizations}
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
                          {member.deleted && (
                            <Badge variant="outline" className="mt-1">
                              Anggota dihapus
                            </Badge>
                          )}
                          <p className="truncate text-xs text-muted-foreground">
                            {member.organization}
                            {member.email ? ` · ${member.email}` : ""}
                          </p>
                          <Badge
                            variant={
                              assignment.notificationStatus === "notified"
                                ? "secondary"
                                : "outline"
                            }
                            className="mt-1"
                          >
                            {assignment.notificationStatus === "notified"
                              ? "Diberi tahu"
                              : "Belum diberi tahu"}
                          </Badge>
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
                            disabled={pending}
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
                  jadwal ini. Penugasan dikirim sesuai waktu admin atau melalui
                  Kirim semua; anggota yang sudah diberi tahu dilewati.
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
                    <dt className="text-xs text-muted-foreground">Tanggal</dt>
                    <dd className="mt-1">{formatDate(emailSchedule.date)}</dd>
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
                  Ini adalah pratinjau isi email. Status pengiriman tersedia
                  pada halaman Pengingat. Tautan membuka jadwal setelah anggota
                  masuk.
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
              Jadwal, status penugasan, dan email yang masih mengantre akan
              dihapus. Email yang sudah dikirim tidak dapat ditarik kembali.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void removeSchedule();
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
