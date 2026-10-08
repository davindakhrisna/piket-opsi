# Piket Opsi

Frontend pratinjau aplikasi manajemen jadwal piket, menggunakan Next.js App Router, TypeScript, dan shadcn/ui. Bahasa antarmuka Indonesia; jadwal menggunakan Asia/Jakarta (WIB).

## Jalankan secara lokal

Dengan lingkungan Nix yang sudah dibuat:

```bash
direnv allow
pnpm install
pnpm dev
```

Jika shell belum memuat direnv, jalankan `nix develop`, lalu perintah pnpm di atas. Alternatif satu perintah: `nix develop --command pnpm dev`.

Buka [localhost:3000](http://localhost:3000).

`pnpm-workspace.yaml` mengatur `pmOnFail: ignore` agar pnpm menggunakan versi dari Nix. Tanpa pengaturan ini, pin `packageManager` dapat memicu unduhan executable pnpm yang tidak dapat dijalankan langsung di NixOS. `flake.lock` mengunci lingkungan Nix; pin pnpm dalam `package.json` tersedia untuk lingkungan lain.

## Akun contoh

| Peran | Email / nama pengguna | Kata sandi awal |
| --- | --- | --- |
| Admin | `admin` | `admin` |
| Anggota | `nadia@example.com` | `nadia@example.com` |

Admin wajib mengganti kata sandi awal sebelum masuk ke aplikasi. Anggota dapat menggantinya melalui Pengaturan. Gunakan kata sandi contoh: data dan kata sandi hanya disimpan dalam memori halaman dan kembali ke awal saat halaman dimuat ulang.

## Fitur frontend

- Admin menambahkan anggota dengan nama dan email.
- Admin membuat, mengedit, menghapus, dan menetapkan jadwal kepada beberapa anggota.
- Tampilan detail dan kalender dengan pencarian serta filter anggota dan status.
- Status per anggota: terjadwal, selesai, atau dilewati. Admin dapat mengubah status siapa pun; anggota hanya mengubah status sendiri.
- Anggota melihat jadwal sendiri dan anggota lain.
- Tautan detail jadwal menggunakan `/?jadwal=<id>` dan terbuka setelah login.
- Pratinjau email penugasan dan pengingat sehari sebelum jadwal.
- Komponen shadcn/ui menggunakan preset default `base-nova` dan tema default neutral. Skema warna tidak dikustomisasi.

## Pemeriksaan

```bash
pnpm lint
pnpm test
pnpm build
pnpm start
```

`pnpm test` menjalankan Node.js test runner untuk perhitungan tanggal/H−1, filter penugasan, pencarian, dan integritas data contoh. Dibutuhkan Node.js 22.13+ untuk menjalankan tes TypeScript langsung. `pnpm start` membutuhkan build terlebih dahulu.

## Tahap backend

Pratinjau ini belum memiliki autentikasi server, penyimpanan database, atau pengiriman email. Integrasi berikutnya menggunakan Neon free tier, Resend, dan Vercel Hobby.

Pengiriman penugasan terjadi saat jadwal dibuat atau anggota ditugaskan. Pengingat H−1 dapat diproses oleh job harian yang memilih jadwal besok berdasarkan Asia/Jakarta, dengan pencatatan pengiriman untuk mencegah duplikasi. Vercel Hobby membatasi cron ke sekali per hari dengan ketepatan per jam; waktu pengiriman tepat 24 jam sebelum kegiatan memerlukan pendekatan lain. Lihat [batas cron Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing). Kunci API, domain pengirim, batas volume email, dan autentikasi produksi ditangani pada tahap backend.

Komponen ditemukan dan perintah instalasinya diperoleh dari MCP resmi shadcn melalui koneksi stdio langsung dalam sesi pengerjaan. `pnpm dlx shadcn@latest mcp init --client codex` telah dijalankan. Untuk menampilkan tools MCP di sesi Codex berikutnya, tambahkan konfigurasi yang dicetak CLI ke konfigurasi Codex dan restart klien sesuai [panduan resmi shadcn](https://ui.shadcn.com/docs/mcp).
