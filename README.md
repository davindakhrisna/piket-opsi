# Piket Opsi

Aplikasi jadwal piket Ruang Opsi menggunakan Next.js, TypeScript, shadcn/ui, PostgreSQL di Neon, dan email Resend. Antarmuka menggunakan Bahasa Indonesia; semua jadwal menggunakan Asia/Jakarta (WIB). Tema default shadcn tetap digunakan, dengan pilihan Terang/Gelap/Sistem.

## Jalankan secara lokal

```bash
direnv allow
pnpm install
```

Isi `.env.local` berdasarkan [.env.local.example](.env.local.example). Semua `.env*` selain contoh diabaikan Git. Siapkan `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL=http://localhost:3000`, dan `CRON_SECRET` acak minimal 32 karakter. Gunakan alamat pengirim pada domain yang sudah diverifikasi di Resend. Jangan masukkan secret ke variabel `NEXT_PUBLIC_*`.

```bash
pnpm db:migrate
pnpm dev
```

Buka [localhost:3000](http://localhost:3000). Jika direnv belum aktif, gunakan `nix develop`. `pnpm-workspace.yaml` memakai `pmOnFail: ignore` agar pnpm dari Nix tidak diganti executable mandiri yang tidak kompatibel dengan NixOS.

Migrasi dijalankan dalam transaksi, dikunci, dan dicatat dengan checksum. Menjalankannya kembali mempertahankan akun dan kata sandi yang sudah ada. Tambahkan migrasi baru; jangan mengubah migrasi yang sudah diterapkan.

## Akun dan penggunaan

- Migrasi pertama membuat akun admin: nama pengguna `admin`, kata sandi `admin`. Admin wajib menetapkan kata sandi baru sebelum mengelola aplikasi.
- Admin membuat anggota dengan nama, email, dan organisasi BEM/BPM/LPM. Kata sandi awal anggota adalah email yang tersimpan dalam huruf kecil.
- Anggota mendapat notifikasi dan pengingat untuk mengganti kata sandi setelah masuk. Perubahan bersifat opsional. Pengaturan pertama hanya meminta kata sandi baru dan konfirmasi; perubahan berikutnya meminta kata sandi saat ini. Kata sandi baru sepanjang 12–128 karakter.
- Kata sandi awal dapat ditebak. Tanpa verifikasi awal, orang yang mengetahui email dapat masuk sampai kata sandi diganti; ini adalah pilihan produk yang diminta pengguna.
- Admin membuka Kalender; anggota membuka Detail. Status awal Terjadwal. Filter anggota hanya Semua anggota/Jadwal saya; rentang 3/7/14/30 hari menghitung hari ini sebagai hari pertama di Jakarta.
- Semua piket berada di Ruang Opsi. Pilihan penugasan dapat difilter berdasarkan organisasi. Waktu yang bertumpuk untuk anggota yang sama ditolak server.
- Anggota hanya mengubah status sendiri; admin dapat mengubah status siapa pun. Semua anggota dapat melihat jadwal anggota lain; email pribadi anggota lain tidak dikirim kepada akun anggota.
- Tautan `/?jadwal=<id>` membuka jadwal setelah masuk. Kalender ponsel memakai titik; filter berada di panel bawah.

## Pengiriman email

Email penugasan disimpan dalam transaksi yang sama dengan jadwal dan diproses segera sesudah penyimpanan, pada hari penugasan. Jadwal yang diperbarui mengantrekan pemberitahuan baru kepada anggota yang masih berstatus Terjadwal. Jadwal yang sudah lewat tidak mengirim email.

`vercel.json` menjalankan `/api/cron/reminders` sekali sehari pada `0 0 * * *` UTC: pukul **07.00–07.59 WIB**. Job memilih jadwal besok berdasarkan jam database di Jakarta. Jika jadwal besok dibuat sesudah cron, pengingat juga diantrekan langsung. H−1 berarti hari kalender sebelumnya, bukan tepat 24 jam sebelum mulai. [Vercel Hobby membatasi cron ke sekali sehari dan ketepatan per jam](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Antrean menggunakan lease database, payload tetap, dan kunci idempotensi Resend. Pengiriman yang gagal tetap tercatat. Batas konservatif aplikasi adalah 100 percobaan per hari UTC dan 3.000 per bulan, sesuai [kuota gratis Resend](https://resend.com/pricing). Percobaan gagal juga menggunakan anggaran aplikasi untuk menghindari pengiriman berlebih setelah hasil jaringan yang tidak pasti. Akun Resend yang dipakai aplikasi lain dapat mencapai kuota lebih awal.

Halaman Pengingat menampilkan status antrean. “Terkirim ke Resend” berarti provider menerima email; penerimaan di kotak masuk tidak dijamin. Admin dapat mencoba antrean kembali. Setelah hasil tidak pasti melewati 23 jam, job memerlukan pemeriksaan riwayat Resend dan tidak dikirim ulang otomatis, karena [kunci idempotensi hanya berlaku 24 jam](https://resend.com/docs/dashboard/emails/idempotency-keys). Gangguan provider atau kuota habis dapat menunda email melewati hari penugasan; periksa antrean dan kapasitas sebelum penggunaan nyata.

Mengubah jadwal membatalkan job lama yang belum terkirim. Menghapus jadwal menghapus antreannya; email yang sudah diterima provider tidak dapat ditarik kembali. Perubahan status dan penghapusan dicatat dalam `audit_events`, termasuk isi jadwal sebelum penghapusan.

## Pemeriksaan otomatis

```bash
pnpm lint
pnpm test
pnpm build
```

Unit test memakai Node.js 22.13+ untuk validasi tanggal, batas rentang hari, filter, hash kata sandi, dan token sesi.

Playwright memakai PostgreSQL lokal yang terpisah dan server penangkap email lokal; tidak memakai kredensial Neon atau mengirim email sungguhan:

```bash
docker run -d --rm --name piket-opsi-e2e \
  -e POSTGRES_PASSWORD=piket-test-only -e POSTGRES_DB=piket_test \
  -p 127.0.0.1:55439:5432 postgres:17
pnpm exec playwright install chromium
pnpm test:e2e
docker stop piket-opsi-e2e
```

Pada NixOS, gunakan Chromium dari Nix dan set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ke executable-nya. Tes menolak database di luar localhost atau nama selain `piket_test*`. `E2E_DATABASE_URL` dapat mengganti port lokal. Port 3100 untuk aplikasi uji, 3419 untuk penangkap email; laporan berada di `playwright-report/` dan `test-results/`.

Cakupan desktop dan ponsel meliputi onboarding, organisasi, penugasan, notifikasi, persistensi, izin server, CSRF, perubahan/expiry sesi, edit bersamaan, pengiriman langsung, H−1, duplikasi, retry, kuota, tema, kalender, dan formulir saat koneksi putus. Penerima uji adalah `arpeggio.gns@gmail.com`.

`pnpm test:live` adalah pemeriksaan **opt-in** memakai kredensial nyata dan mengirim dua email uji ke alamat tersebut. Gunakan branch Neon terpisah; jalankan migrasi dahulu. Skrip membuat lalu menghapus akun dan jadwal miliknya, mempertahankan admin awal. Skrip menolak jika penerima sudah terdaftar agar tidak mengubah akun asli.

Untuk akun Resend milik `arpeggio.gns@gmail.com`, jalankan `RESEND_FROM=onboarding@resend.dev pnpm test:live`. Pengirim uji ini hanya dapat mengirim ke email pemilik akun Resend; gunakan domain terverifikasi untuk anggota lain. [Batasan pengirim Resend](https://resend.com/docs/api-reference/errors).

## Vercel Hobby

Konfigurasikan lima variabel environment yang sama pada Production. `APP_URL` harus URL HTTPS publik persis seperti yang dibuka pengguna. Jalankan migrasi terhadap branch database yang sesuai sebelum deployment; build tidak menjalankan migrasi otomatis. Deploy dengan build command `pnpm build` dan aktifkan cron. Verifikasi pengiriman ke satu penerima sebelum menambahkan seluruh anggota. Job cron memerlukan `Authorization: Bearer <CRON_SECRET>`; Vercel menambahkannya otomatis ketika secret tersedia.

Konfigurasi mengaktifkan Fluid Compute dengan durasi API maksimal 300 detik, sesuai [batas Vercel Hobby](https://vercel.com/docs/functions/configuring-functions/duration). Worker memproses antrean hingga 220 detik dan meninggalkan job yang tersisa di database untuk pemrosesan berikutnya. Lease berlaku 330 detik agar worker pengganti tidak mengambil alih sebelum fungsi sebelumnya berhenti.

Sesi menggunakan cookie HttpOnly, SameSite Strict, dan Secure pada HTTPS; database hanya menyimpan hash token. Kata sandi memakai scrypt dengan salt, sesuai [parameter OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Perubahan kata sandi merotasi sesi dan mencabut sesi lain. Permintaan perubahan memeriksa Origin, peran, input, dan versi jadwal; SQL menggunakan parameter. Cadangkan database dan periksa kemampuan pemulihan branch Neon sebelum memasukkan data penting.

## Struktur

`app/api/[...path]/route.ts` menangani API; `lib/server/` berisi autentikasi, penyimpanan, dan email; `lib/domain.ts` berisi tipe serta operasi tanggal/filter bersama. `db/` berisi migrasi. Komponen aplikasi dan shadcn berada di `components/`; `lib/demo-data.ts` hanya menyediakan fixture untuk tes.

Komponen ditemukan melalui MCP resmi shadcn menggunakan koneksi stdio. `pnpm dlx shadcn@latest mcp init --client codex` sudah dijalankan; lihat [panduan shadcn MCP](https://ui.shadcn.com/docs/mcp) untuk sesi berikutnya.
