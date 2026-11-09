# PinjemDulu: Backend (PHP native)

BE tipis di atas database PostgreSQL (Supabase). Aturan bisnis ada di database; BE hanya
memeriksa siapa yang meminta, memvalidasi input, memanggil view/fungsi, dan menerjemahkan hasil ke JSON.

Kontrak endpoint lengkap: [`docs/API.md`](docs/API.md).

## Struktur

```
public/index.php          router tunggal + penanganan galat + CORS
src/bootstrap.php         .env, pemuatan file, cek konfigurasi wajib
src/db.php                koneksi PDO + helper db_one/db_all/db_val/db_exec/db_tx
src/auth.php              token HS256, me(), require_*(), captcha Turnstile
src/helpers.php           respons JSON, validasi input, paginasi, pemetaan galat PG
src/storage.php           unggah berkas (local / Supabase Storage)
src/routes.php            daftar rute: [METHOD, pola, handler, akses]
src/handlers/*.php        handler per area
database/                 skema final + pengujian (jalankan di Supabase)
```

## Menjalankan

Syarat: PHP 8.1+ dengan ekstensi `pdo_pgsql`, `curl`, `fileinfo`, `mbstring`.

1. Jalankan `database/01_skema_final.sql` di Supabase SQL Editor (database kosong). Opsional: `02_pengujian.sql`.
2. Buat bucket Storage: `pinjemdulu-publik` (publik) dan `pinjemdulu-privat` (privat) bila memakai `STORAGE_DRIVER=supabase`.
3. `cp .env.example .env`, lalu isi minimal `DB_*` dan `TOKEN_SECRET` (`php -r "echo bin2hex(random_bytes(32));"`).
4. Jalankan: `php -S localhost:8000 -t public public/index.php`
5. Uji: `curl localhost:8000/api/health`

Login data uji (password awal = NIM): PJ HMTI `2441720001`, Peminjam BEM `2441720013`.

```bash
curl -s localhost:8000/api/login -H 'Content-Type: application/json' \
  -d '{"nim":"2441720013","password":"2441720013"}'
```

Untuk unggah berkas, pastikan `upload_max_filesize` dan `post_max_size` di `php.ini` minimal 3M.

## Keamanan yang sudah ditangani

- Query selalu prepared statement; nilai tidak pernah disambung ke SQL.
- Role, OKI, dan status akun dibaca ulang dari database di setiap request. Token hanya berisi NIM, waktu terbit, dan kedaluwarsa. Token yang terbit sebelum akun berubah (password, role, status) otomatis tidak berlaku.
- Semua data PJ difilter ke OKI-nya; data OKI lain dijawab 404.
- Pembatasan percobaan login/reset/ubah password (per NIM dan per IP) memakai berkas sementara. Cukup untuk satu server; pindahkan ke Redis/tabel bila BE dijalankan di beberapa instance.
- Berkas privat (foto pengambilan/kondisi, surat PJ) hanya diakses lewat URL bertanda tangan berumur 1 jam.
- Token reset password tidak pernah disimpan; bila tertulis di pesan konfirmasi, disamarkan sebelum disimpan.
- `CAPTCHA_MODE=off` ditolak jika `APP_ENV` bukan `local`.

## Catatan

- Koneksi database: pakai koneksi langsung atau Session pooler (port 5432).
- Lampiran surat PJ menerima JPG/PNG/PDF; foto barang dan foto kondisi hanya JPG/PNG. Ubah `MIME_LAMPIRAN` di `src/storage.php` bila ingin membatasi.
- Segarkan laporan otomatis dengan pg_cron (perintahnya ada di komentar `01_skema_final.sql`) atau manual lewat `POST /api/laporan/refresh`.
