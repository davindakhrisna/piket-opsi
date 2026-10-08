"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { id as indonesian } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-controls";
import {
  dateFromKey,
  dateKey,
  formatDate,
  jakartaToday,
  organizations,
  SCHEDULE_TITLE,
  SCHEDULE_LOCATION,
  type Organization,
  type Member,
  type Schedule,
} from "@/lib/domain";

function PasswordInput({
  label = "kata sandi",
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        className={`pr-10 ${className ?? ""}`}
        type={visible ? "text" : "password"}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0"
        aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${label}`}
        aria-controls={props.id}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

export function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      setError((await onLogin(email.trim().toLowerCase(), password)) ?? "");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="relative grid min-h-svh lg:grid-cols-2">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <section className="hidden flex-col justify-between border-r bg-muted/40 p-12 lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <CalendarDays className="size-7" />
          Piket Opsi
        </div>
        <div className="max-w-lg space-y-7">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
            Jadwal jelas.
            <br />
            Tanggung jawab terjaga.
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
            Satu tempat untuk melihat jadwal piket, mengetahui siapa yang
            bertugas, dan menandai pekerjaan yang selesai.
          </p>
          <div className="space-y-4 border-t pt-6 text-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-4 text-muted-foreground" />
              Jadwal pribadi dan kalender bersama
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Status tugas untuk setiap anggota
            </div>
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              Email penugasan dan pengingat sehari sebelumnya
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Piket Opsi · Asia/Jakarta (WIB)
        </p>
      </section>
      <main className="flex min-w-0 flex-col items-center justify-center gap-6 px-5 py-12">
        <div className="flex items-center gap-2 text-lg font-semibold lg:hidden">
          <CalendarDays className="size-6" />
          Piket Opsi
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Masuk ke Piket Opsi</CardTitle>
            <CardDescription>
              Gunakan akun yang dibuat oleh admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email atau admin</Label>
                <Input
                  id="email"
                  name="email"
                  autoComplete="username"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  required
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  required
                  aria-invalid={Boolean(error)}
                />
              </div>
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full" type="submit" disabled={pending}>
                {pending ? "Sedang masuk…" : "Masuk"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t text-xs leading-relaxed text-muted-foreground">
            Pertama kali masuk sebagai anggota? Gunakan email Anda sebagai kata
            sandi awal.
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export function PasswordForm({
  requiredChange = false,
  firstChange = false,
  onSave,
}: {
  requiredChange?: boolean;
  firstChange?: boolean;
  onSave: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<string | null>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSuccess(false);
    if (next.length < 12) {
      setError("Gunakan setidaknya 12 karakter untuk kata sandi baru.");
      return;
    }
    if (next !== confirmation) {
      setError("Konfirmasi kata sandi belum cocok.");
      return;
    }
    if (next === current) {
      setError("Kata sandi baru harus berbeda dari kata sandi saat ini.");
      return;
    }
    setPending(true);
    let result: string | null;
    try {
      result = await onSave(current, next);
    } finally {
      setPending(false);
    }
    if (result) {
      setError(result);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirmation("");
    setError("");
    setSuccess(true);
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {!firstChange && (
        <div className="space-y-2">
          <Label htmlFor="current-password">Kata sandi saat ini</Label>
          <PasswordInput
            id="current-password"
            label="kata sandi saat ini"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="new-password">Kata sandi baru</Label>
        <PasswordInput
          id="new-password"
          label="kata sandi baru"
          minLength={12}
          maxLength={128}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Minimal 12 karakter. Gunakan kata sandi unik yang berbeda dari email
          Anda.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Konfirmasi kata sandi baru</Label>
        <PasswordInput
          id="confirm-password"
          label="konfirmasi kata sandi baru"
          minLength={12}
          maxLength={128}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert role="status">
          <ShieldCheck />
          <AlertDescription>
            Kata sandi berhasil diperbarui. Sesi lain telah dikeluarkan.
          </AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        disabled={pending}
        className={requiredChange ? "w-full" : ""}
      >
        {pending
          ? "Menyimpan…"
          : requiredChange
            ? "Simpan dan lanjutkan"
            : "Simpan kata sandi"}
      </Button>
    </form>
  );
}

export function RequiredPasswordScreen({
  onSave,
  onLogout,
}: {
  onSave: (current: string, next: string) => Promise<string | null>;
  onLogout: () => void;
}) {
  return (
    <main className="relative flex min-h-svh items-center justify-center p-5">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <KeyRound className="mb-2 size-6" />
          <CardTitle className="text-xl">Ganti kata sandi admin</CardTitle>
          <CardDescription>
            Ubah kata sandi awal sebelum mengelola jadwal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTitle>Langkah wajib untuk admin</AlertTitle>
            <AlertDescription>
              Pilih kata sandi baru untuk melindungi akun. Kata sandi awal tidak
              perlu dimasukkan lagi.
            </AlertDescription>
          </Alert>
          <PasswordForm requiredChange firstChange onSave={onSave} />
        </CardContent>
        <CardFooter className="justify-center border-t">
          <Button variant="ghost" onClick={onLogout}>
            Keluar
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export function MemberDialog({
  open,
  onOpenChange,
  members,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onSave: (
    member: Omit<Member, "id"> & { requestId: string },
  ) => Promise<string | null>;
}) {
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [pending, setPending] = useState(false);
  const requestId = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!name) {
      setError("Nama anggota tidak boleh kosong.");
      return;
    }
    if (members.some((member) => member.email === email)) {
      setError("Email ini sudah terdaftar. Gunakan email lain.");
      return;
    }
    if (!organization) {
      setError("Pilih organisasi anggota.");
      return;
    }
    requestId.current ??= crypto.randomUUID();
    setPending(true);
    let result: string | null;
    try {
      result = await onSave({
        name,
        email,
        organization,
        requestId: requestId.current,
      });
    } finally {
      setPending(false);
    }
    if (result) {
      setError(result);
      return;
    }
    requestId.current = null;
    setOrganization(null);
    setError("");
    onOpenChange(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setError("");
        if (pending) return;
        if (!value) {
          setOrganization(null);
          requestId.current = null;
        }
        onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah anggota</DialogTitle>
          <DialogDescription>
            Isi nama, email, dan organisasi untuk membuat akun anggota.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="member-name">Nama lengkap</Label>
            <Input
              id="member-name"
              name="name"
              placeholder="Nama anggota"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              maxLength={254}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-organization">Organisasi</Label>
            <Select
              items={organizations.map((value) => ({ value, label: value }))}
              value={organization}
              onValueChange={(value) =>
                setOrganization(value as Organization | null)
              }
            >
              <SelectTrigger
                id="member-organization"
                className="w-full"
                aria-invalid={Boolean(error && !organization)}
              >
                <SelectValue placeholder="Pilih organisasi" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Alert>
            <KeyRound />
            <AlertDescription>
              Email menjadi kata sandi awal. Anggota dapat mengubahnya setelah
              masuk.
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Tambah anggota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleDialog({
  open,
  onOpenChange,
  members,
  schedule,
  initialDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  schedule?: Schedule;
  initialDate?: string;
  onSave: (
    value: Omit<Schedule, "id"> & { requestId: string },
  ) => Promise<string | null>;
}) {
  const [date, setDate] = useState(
    schedule?.date ?? initialDate ?? jakartaToday(),
  );
  const [selected, setSelected] = useState<string[]>(
    schedule?.assignments.map((assignment) => assignment.memberId) ?? [],
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const organizationOptions = [
    { value: "all", label: "Semua organisasi" },
    ...organizations.map((value) => ({ value, label: value })),
  ];
  const visibleMembers = members.filter(
    (member) =>
      organizationFilter === "all" ||
      member.organization === organizationFilter,
  );
  const hiddenSelected = selected.filter(
    (memberId) => !visibleMembers.some((member) => member.id === memberId),
  ).length;
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestId = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    if (selected.length === 0) {
      setError("Pilih setidaknya satu anggota untuk jadwal ini.");
      return;
    }
    requestId.current ??= crypto.randomUUID();
    setPending(true);
    let result: string | null;
    try {
      result = await onSave({
        requestId: requestId.current,
        version: schedule?.version,
        title: SCHEDULE_TITLE,
        date,
        location: SCHEDULE_LOCATION,
        notes: String(form.get("notes") ?? "").trim(),
        assignments: selected.map((memberId) => ({
          memberId,
          status:
            schedule?.assignments.find(
              (assignment) => assignment.memberId === memberId,
            )?.status ?? "scheduled",
        })),
      });
    } finally {
      setPending(false);
    }
    if (result) {
      setError(result);
      return;
    }
    onOpenChange(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit jadwal" : "Buat jadwal"}</DialogTitle>
          <DialogDescription>
            Piket di Ruang Opsi. Tentukan tanggal dan anggota yang bertugas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Pilih tanggal jadwal"
                    className="w-full justify-start font-normal"
                  />
                }
              >
                <CalendarDays />
                {formatDate(date, true)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={indonesian}
                  weekStartsOn={1}
                  selected={dateFromKey(date)}
                  defaultMonth={dateFromKey(date)}
                  onSelect={(value) => {
                    if (value) {
                      setDate(dateKey(value));
                      setCalendarOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">
              Anggota yang bertugas{" "}
              <span className="font-normal text-muted-foreground">
                ({selected.length} dipilih)
              </span>
            </legend>
            <Select
              items={organizationOptions}
              value={organizationFilter}
              onValueChange={(value) => setOrganizationFilter(String(value))}
            >
              <SelectTrigger
                aria-label="Filter organisasi penugasan"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizationOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hiddenSelected > 0 && (
              <p className="text-xs text-muted-foreground">
                {hiddenSelected} anggota dari organisasi lain juga dipilih.
                Pilihan tetap tersimpan.
              </p>
            )}
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
              {visibleMembers.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  {members.length === 0
                    ? "Tambahkan anggota terlebih dahulu."
                    : "Belum ada anggota dari organisasi ini."}
                </p>
              ) : (
                visibleMembers.map((member) => (
                  <Label
                    key={member.id}
                    htmlFor={`assign-${member.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <Checkbox
                      id={`assign-${member.id}`}
                      checked={selected.includes(member.id)}
                      onCheckedChange={(checked) =>
                        setSelected((previous) =>
                          checked
                            ? [...previous, member.id]
                            : previous.filter((value) => value !== member.id),
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {member.name}
                      </span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {member.organization} · {member.email}
                      </span>
                    </span>
                  </Label>
                ))
              )}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="schedule-notes">
              Catatan{" "}
              <span className="font-normal text-muted-foreground">
                (opsional)
              </span>
            </Label>
            <Textarea
              id="schedule-notes"
              name="notes"
              placeholder="Apa yang perlu disiapkan?"
              defaultValue={schedule?.notes}
              maxLength={2000}
              rows={3}
            />
          </div>
          <Alert>
            <Mail />
            <AlertDescription>
              Email penugasan dikirim setelah jadwal disimpan pada hari ini.
              Pengingat tambahan dikirim sehari sebelum jadwal, menggunakan
              waktu WIB.
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Menyimpan…"
                : schedule
                  ? "Simpan perubahan"
                  : "Buat jadwal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
