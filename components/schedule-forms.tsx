"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { id as indonesian } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
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
import { Spinner } from "@/components/ui/spinner";
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
  initialOrganizations,
  notificationWindowLabel,
  jakartaToday,
  SCHEDULE_TITLE,
  SCHEDULE_LOCATION,
  type Organization,
  type NotificationSettings,
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
        </div>
        <p className="text-sm text-muted-foreground">Asia/Jakarta (WIB)</p>
      </section>
      <main className="flex min-w-0 flex-col items-center justify-center gap-6 px-5 py-12">
        <div className="flex items-center gap-2 text-lg font-semibold lg:hidden">
          <CalendarDays className="size-6" />
          Piket Opsi
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>
              Gunakan akun yang dibuat oleh admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
  onSave,
}: {
  requiredChange?: boolean;
  onSave: (newPassword: string) => Promise<string | null>;
}) {
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
    setPending(true);
    let result: string | null;
    try {
      result = await onSave(next);
    } finally {
      setPending(false);
    }
    if (result) {
      setError(result);
      return;
    }
    setNext("");
    setConfirmation("");
    setError("");
    setSuccess(true);
  }
  return (
    <form onSubmit={submit} className="space-y-5">
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
          Minimal panjang sandi adalah 12 karakter.{" "}
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
  onSave: (next: string) => Promise<string | null>;
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

export function NotificationControls({
  settings,
  count,
  sending,
  onSave,
  onSend,
}: {
  settings: NotificationSettings;
  count: number;
  sending: boolean;
  onSave: (dailyHour: number | null, version: number) => Promise<string | null>;
  onSend: () => Promise<void>;
}) {
  const initial =
    settings.dailyHour === null ? "manual" : String(settings.dailyHour);
  const [hour, setHour] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const items = [
    { value: "manual", label: "Manual saja" },
    ...Array.from({ length: 24 }, (_, value) => ({
      value: String(value),
      label: notificationWindowLabel(value),
    })),
  ];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await onSave(
        hour === "manual" ? null : Number(hour),
        settings.version,
      );
      if (result) setError(result);
    } catch {
      setError("Pengaturan belum tersimpan. Periksa koneksi dan coba lagi.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Card>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="notification-hour">Pengiriman otomatis (WIB)</Label>
          <p
            id="notification-window-hint"
            className="text-xs text-muted-foreground"
          >
            Waktu berlaku setiap hari. Pengiriman otomatis berlangsung dalam
            rentang satu jam yang dipilih.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              items={items}
              value={hour}
              disabled={pending || sending}
              onValueChange={(value) => {
                if (value) {
                  setHour(value);
                  setError("");
                }
              }}
            >
              <SelectTrigger
                id="notification-hour"
                className="h-11! w-full md:h-8!"
                aria-invalid={Boolean(error)}
                aria-describedby="notification-window-hint"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[min(15rem,var(--available-height))]">
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              variant="outline"
              disabled={pending || sending || hour === initial}
            >
              {pending && <Spinner aria-label="Menyimpan waktu pengiriman" />}
              Simpan waktu
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-medium">{count}</span> penugasan belum diberi
            tahu
          </p>
          <Button
            type="button"
            disabled={pending || sending || count === 0}
            onClick={() => void onSend()}
          >
            {sending ? (
              <Spinner aria-label="Mengirim notifikasi penugasan" />
            ) : (
              <Mail />
            )}
            {sending ? "Mengirim…" : "Kirim semua"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Anggota yang sudah diberi tahu dilewati. Pengingat dikirim terpisah.
          Mengubah jadwal tidak mengirim ulang penugasan kepada anggota yang
          sudah diberi tahu.
        </p>
      </CardContent>
    </Card>
  );
}

export function OrganizationDialog({
  open,
  onOpenChange,
  organizations,
  members,
  onSave,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
  members: Member[];
  onSave: (name: string) => Promise<string | null>;
  onUpdate: (name: string, newName: string) => Promise<string | null>;
  onDelete: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  function resetForm() {
    setName("");
    setEditing(null);
    setError("");
  }
  async function saveChange(action: () => Promise<string | null>) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await action();
      if (result) setError(result);
      return !result;
    } catch {
      setError(
        "Perubahan organisasi belum tersimpan. Periksa koneksi dan coba lagi.",
      );
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const value = name.trim().replace(/ {2,}/g, " ");
    if (!value || value.length > 80 || /[\u0000-\u001f\u007f]/.test(value)) {
      setError("Isi nama organisasi sepanjang 1–80 karakter.");
      return;
    }
    if (
      organizations.some(
        (item) =>
          item !== editing &&
          item.toLocaleLowerCase("id-ID") === value.toLocaleLowerCase("id-ID"),
      )
    ) {
      setError("Organisasi ini sudah terdaftar. Gunakan nama lain.");
      return;
    }
    if (
      await saveChange(() =>
        editing ? onUpdate(editing, value) : onSave(value),
      )
    )
      resetForm();
  }
  async function remove() {
    if (deleting && (await saveChange(() => onDelete(deleting))))
      setDeleting(null);
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (busy.current) return;
          resetForm();
          setDeleting(null);
          onOpenChange(value);
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organisasi</DialogTitle>
            <DialogDescription>
              Organisasi asal anggota dapat dipilih saat menambah anggota dan
              menyusun jadwal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p id="organization-list-label" className="text-sm font-medium">
              Organisasi terdaftar ({organizations.length})
            </p>
            <ul
              aria-labelledby="organization-list-label"
              className="max-h-48 divide-y overflow-y-auto rounded-lg border"
            >
              {organizations.map((organization) => {
                const provisioned = initialOrganizations.includes(organization);
                const count = members.filter(
                  (member) => member.organization === organization,
                ).length;
                return (
                  <li
                    key={organization}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words">{organization}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} anggota
                      </p>
                    </div>
                    {provisioned ? (
                      <Badge variant="secondary">Bawaan</Badge>
                    ) : (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 sm:size-8"
                          aria-label={`Ubah ${organization}`}
                          disabled={pending}
                          onClick={() => {
                            setEditing(organization);
                            setName(organization);
                            setError("");
                            document
                              .getElementById("organization-name")
                              ?.focus();
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="size-11 sm:size-8"
                          aria-label={`Hapus ${organization}`}
                          disabled={pending || count > 0}
                          onClick={() => {
                            setDeleting(organization);
                            setError("");
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              Organisasi bawaan tidak dapat diubah atau dihapus. Organisasi
              dengan anggota tidak dapat dihapus.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {editing && (
              <p className="break-words text-sm">Mengubah {editing}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="organization-name">Nama organisasi</Label>
              <Input
                id="organization-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="Contoh: Himpunan Mahasiswa"
                maxLength={80}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "organization-error" : undefined}
                disabled={pending}
                required
              />
            </div>
            {error && !deleting && (
              <Alert variant="destructive" role="alert" id="organization-error">
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
                Tutup
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={resetForm}
                >
                  Batal ubah
                </Button>
              )}
              <Button type="submit" disabled={pending}>
                {pending && <Spinner aria-label="Menyimpan organisasi" />}
                {pending
                  ? "Menyimpan…"
                  : editing
                    ? "Simpan perubahan"
                    : "Tambah organisasi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value && !busy.current) {
            setDeleting(null);
            setError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus organisasi?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              Organisasi {deleting} akan dihapus dari pilihan anggota dan
              penugasan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={remove}
            >
              {pending && <Spinner aria-label="Menghapus organisasi" />}
              {pending ? "Menghapus…" : "Hapus organisasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MemberDialog({
  open,
  onOpenChange,
  members,
  organizations,
  member,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  organizations: Organization[];
  member?: Member;
  onSave: (
    member: Omit<Member, "id"> & { requestId: string },
  ) => Promise<string | null>;
}) {
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState<Organization | null>(
    member?.organization ?? null,
  );
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
    if (
      members.some(
        (value) =>
          !value.deleted && value.id !== member?.id && value.email === email,
      )
    ) {
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
        version: member?.version,
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
          <DialogTitle>
            {member ? "Edit anggota" : "Tambah anggota"}
          </DialogTitle>
          <DialogDescription>
            {member
              ? "Perbarui nama, email, dan organisasi anggota."
              : "Isi nama, email, dan organisasi untuk membuat akun anggota."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="member-name">Nama lengkap</Label>
            <Input
              id="member-name"
              className="h-11 md:h-8"
              name="name"
              defaultValue={member?.name}
              placeholder="Nama anggota"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              className="h-11 md:h-8"
              name="email"
              defaultValue={member?.email}
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
                className="h-11! w-full md:h-8!"
                aria-invalid={Boolean(error && !organization)}
              >
                <SelectValue
                  className="min-w-0 truncate"
                  placeholder="Pilih organisasi"
                />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((value) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="[&>span]:min-w-0 [&>span]:shrink [&>span]:break-words [&>span]:whitespace-normal"
                  >
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Alert>
            <KeyRound />
            <AlertDescription>
              {member
                ? "Perubahan email mengakhiri sesi anggota. Kata sandi yang sudah diubah tetap berlaku; kata sandi awal mengikuti email baru."
                : "Email menjadi kata sandi awal. Anggota dapat mengubahnya setelah masuk."}
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
              className="h-11 md:h-8"
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending} className="h-11 md:h-8">
              {pending
                ? "Menyimpan…"
                : member
                  ? "Simpan perubahan"
                  : "Tambah anggota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteMemberDialog({
  member,
  onOpenChange,
  onDelete,
}: {
  member: Member;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<string | null>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function remove(event: React.MouseEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const result = await onDelete();
      if (result) setError(result);
      else onOpenChange(false);
    } catch {
      setError("Anggota belum dihapus. Periksa koneksi dan coba lagi.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!pending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus anggota?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium break-words text-foreground">
              {member.name}
            </span>{" "}
            akan dihapus dari daftar anggota. Login dan pengiriman email
            dihentikan. Jadwal, status tugas, dan riwayatnya tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className="h-11 md:h-8">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={remove}
            className="h-11 md:h-8"
          >
            {pending && <Spinner aria-label="Menghapus anggota" />} Hapus
            anggota
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ScheduleDialog({
  open,
  onOpenChange,
  members,
  organizations,
  schedule,
  initialDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  organizations: Organization[];
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
    ...organizations.map((value) => ({
      value: `organization:${value}`,
      label: value,
    })),
  ];
  const visibleMembers = members.filter(
    (member) =>
      (!member.deleted || selected.includes(member.id)) &&
      (organizationFilter === "all" ||
        `organization:${member.organization}` === organizationFilter),
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
                <SelectValue className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                {organizationOptions.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="[&>span]:min-w-0 [&>span]:shrink [&>span]:break-words [&>span]:whitespace-normal"
                  >
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
                      disabled={member.deleted}
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
                        {member.deleted ? " (dihapus · riwayat tersimpan)" : ""}
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
              Setelah jadwal baru disimpan, pilih Kirim sekarang pada
              pemberitahuan atau tunggu waktu pengiriman otomatis. Pengingat
              tambahan dikirim sehari sebelum jadwal, menggunakan waktu WIB.
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
