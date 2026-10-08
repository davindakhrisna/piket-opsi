"use client";

import { useState, type FormEvent } from "react";
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
  dateFromKey,
  dateKey,
  formatDate,
  jakartaToday,
  type Member,
  type Schedule,
} from "@/lib/demo-data";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string) => string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onLogin(email.trim().toLowerCase(), password) ?? "");
  }
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
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
              Pengingat email pada tahap backend
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
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    className="pr-10"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    required
                    aria-invalid={Boolean(error)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full" type="submit">
                Masuk
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t text-xs leading-relaxed text-muted-foreground">
            Pertama kali masuk sebagai anggota? Gunakan email Anda sebagai kata
            sandi awal.
          </CardFooter>
        </Card>
        <div className="w-full max-w-sm space-y-3 rounded-xl border border-dashed p-4 text-sm">
          <p className="font-medium">Pratinjau frontend</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Data contoh hanya berlaku selama halaman ini terbuka. Tidak ada
            email yang dikirim. Gunakan kata sandi contoh saja.
          </p>
          <div className="grid gap-2 text-xs">
            <div>
              <span className="font-medium">Admin:</span> admin / admin
            </div>
            <div className="break-all">
              <span className="font-medium">Anggota:</span> nadia@example.com /
              nadia@example.com
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setEmail("nadia@example.com");
              setPassword("nadia@example.com");
              setError("");
            }}
          >
            Isi akun contoh anggota
          </Button>
        </div>
      </main>
    </div>
  );
}

export function PasswordForm({
  requiredChange = false,
  onSave,
}: {
  requiredChange?: boolean;
  onSave: (currentPassword: string, newPassword: string) => string | null;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    if (next.length < 8) {
      setError("Gunakan setidaknya 8 karakter untuk kata sandi baru.");
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
    const result = onSave(current, next);
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
      <div className="space-y-2">
        <Label htmlFor="current-password">Kata sandi saat ini</Label>
        <Input
          id="current-password"
          type="password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">Kata sandi baru</Label>
        <Input
          id="new-password"
          type="password"
          minLength={8}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Minimal 8 karakter. Gunakan kata sandi contoh untuk pratinjau ini.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Konfirmasi kata sandi baru</Label>
        <Input
          id="confirm-password"
          type="password"
          minLength={8}
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
            Kata sandi contoh berhasil diperbarui untuk sesi ini.
          </AlertDescription>
        </Alert>
      )}
      <Button type="submit" className={requiredChange ? "w-full" : ""}>
        {requiredChange ? "Simpan dan lanjutkan" : "Simpan kata sandi"}
      </Button>
    </form>
  );
}

export function RequiredPasswordScreen({
  onSave,
  onLogout,
}: {
  onSave: (current: string, next: string) => string | null;
  onLogout: () => void;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center p-5">
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
              Kata sandi awal Anda adalah admin. Pilih kata sandi contoh baru
              untuk melanjutkan pratinjau.
            </AlertDescription>
          </Alert>
          <PasswordForm requiredChange onSave={onSave} />
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
  onSave: (member: Omit<Member, "id">) => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    onSave({ name, email });
    setError("");
    onOpenChange(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setError("");
        onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah anggota</DialogTitle>
          <DialogDescription>
            Cukup nama dan email untuk membuat akun anggota.
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
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit">Tambah anggota</Button>
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
  onSave: (value: Omit<Schedule, "id">) => void;
}) {
  const [date, setDate] = useState(
    schedule?.date ?? initialDate ?? jakartaToday(),
  );
  const [selected, setSelected] = useState<string[]>(
    schedule?.assignments.map((assignment) => assignment.memberId) ?? [],
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const startTime = String(form.get("startTime") ?? "");
    const endTime = String(form.get("endTime") ?? "");
    if (!title) {
      setError("Judul jadwal tidak boleh kosong.");
      return;
    }
    if (endTime <= startTime) {
      setError("Waktu selesai harus setelah waktu mulai pada hari yang sama.");
      return;
    }
    if (selected.length === 0) {
      setError("Pilih setidaknya satu anggota untuk jadwal ini.");
      return;
    }
    onSave({
      title,
      date,
      startTime,
      endTime,
      location: String(form.get("location") ?? "").trim(),
      notes: String(form.get("notes") ?? "").trim(),
      assignments: selected.map((memberId) => ({
        memberId,
        status:
          schedule?.assignments.find(
            (assignment) => assignment.memberId === memberId,
          )?.status ?? "scheduled",
      })),
    });
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit jadwal" : "Buat jadwal"}</DialogTitle>
          <DialogDescription>
            Tentukan waktu dan anggota yang bertugas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="schedule-title">Judul jadwal</Label>
            <Input
              id="schedule-title"
              name="title"
              placeholder="Contoh: Piket ruang kerja"
              defaultValue={schedule?.title}
              maxLength={120}
              required
            />
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Mulai (WIB)</Label>
              <Input
                id="start-time"
                name="startTime"
                type="time"
                defaultValue={schedule?.startTime ?? "08:00"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Selesai (WIB)</Label>
              <Input
                id="end-time"
                name="endTime"
                type="time"
                defaultValue={schedule?.endTime ?? "09:00"}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-location">
              Lokasi{" "}
              <span className="font-normal text-muted-foreground">
                (opsional)
              </span>
            </Label>
            <Input
              id="schedule-location"
              name="location"
              placeholder="Ruang atau tempat kegiatan"
              defaultValue={schedule?.location}
              maxLength={160}
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">
              Anggota yang bertugas{" "}
              <span className="font-normal text-muted-foreground">
                ({selected.length} dipilih)
              </span>
            </legend>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
              {members.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  Tambahkan anggota terlebih dahulu.
                </p>
              ) : (
                members.map((member) => (
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
                        {member.email}
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
              Pada aplikasi lengkap, email berisi tautan jadwal dikirim saat
              penugasan dan sehari sebelum jadwal. Pratinjau ini tidak mengirim
              email.
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
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              {schedule ? "Simpan perubahan" : "Buat jadwal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
