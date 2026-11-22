# Konteks Proyek PinjemDulu untuk Agent

Terakhir diperbarui: 2026-11-21

Dokumen ini menjadi ringkasan konteks teknis agar agent yang melanjutkan pekerjaan
dapat memahami aplikasi, batasan penting, dan perubahan UI terbaru. Dokumen ini
bukan pengganti kontrak API, panduan database, atau README masing-masing bagian.
Jika ada perbedaan antara dokumentasi lama dan implementasi, periksa kode aktif
serta konfigurasi runtime sebelum mengambil keputusan.

## 1. Gambaran Aplikasi

PinjemDulu adalah aplikasi peminjaman inventaris antar Organisasi Kemahasiswaan
(OKI) Polinema. Peminjam mencari inventaris, mengajukan peminjaman, dan mengelola
pengajuan/pengembalian miliknya. Penanggung Jawab Inventaris (PJ) mengelola
inventaris dan kategori OKI-nya, memproses peminjaman/pengembalian, pengajuan PJ,
pengguna, serta laporan.

Peran utama:

- `Peminjam`: katalog inventaris, dashboard peminjam, pengajuan peminjaman,
  pengembalian, pengajuan menjadi PJ, profil, dan tata tertib.
- `Penanggung Jawab`: dashboard PJ dan fitur peminjaman, pengembalian,
  inventaris, kategori, pengajuan PJ, pengguna, laporan, profil, serta tata
  tertib. Data pengelolaan dibatasi ke OKI PJ tersebut.

## 2. Struktur Repository

- `FE/`: frontend SPA berbasis HTML, Vanilla JavaScript ES Modules, dan Tailwind
  CSS.
- `BE/`: backend API PHP native, PostgreSQL (umumnya Supabase), autentikasi,
  upload berkas, dan handler API.
- `docs/`: dokumentasi proyek, panduan database, dan prompt/perubahan UI.
- `.trae-html-share-packages/`: paket HTML share/preview yang dihasilkan tooling.
  Arsip di sini bukan sumber utama dan bukan salinan lengkap aplikasi.
- `scratch/`: area kerja sementara; jangan menganggap isinya sebagai sumber
  aplikasi tanpa memeriksa pemakaiannya.

### Sumber dokumentasi

- Frontend: `FE/README.md`
- Backend dan setup lokal: `BE/README.md`
- Kontrak endpoint: `BE/docs/API.md`
- Skema database: `BE/database/01_skema_final.sql`
- Data/pengujian database: `BE/database/02_pengujian.sql`
- Panduan database lainnya: `docs/database-sql-guide.md`,
  `docs/DOKUMENTASI_DATABASE_OBJECTS.md`, dan
  `docs/DOKUMENTASI_QUERY_SQL_PINJEMDULU.md`
- Arahan perbaikan UI: `docs/prompt-ui-fix.md`

Catatan: `README.md` di root masih menyebut BE belum disiapkan. Itu sudah
kedaluwarsa; folder `BE/` saat ini berisi implementasi API PHP dan skema SQL.
`FE/README.md` juga menjelaskan arsitektur mock sebagai pola awal. Untuk status
mode runtime saat ini, periksa `FE/env.js`.

## 3. Frontend

### Arsitektur

- Entry HTML: `FE/index.html`
- Entry JavaScript, shell, sesi, sidebar, navbar, dan listener global:
  `FE/js/main.js`
- Router hash dan pemanggilan `render()`/`mount()` halaman:
  `FE/js/router.js`
- Penjaga autentikasi/peran/rute: `FE/js/lib/route-guard.js`
- Navigasi, label, dan menu per peran: `FE/js/lib/navigation.js`
- API client: `FE/js/services/client.js`
- Halaman: `FE/js/pages/`
- Komponen dan utilitas UI: `FE/js/ui/`
- Logika bisnis murni: `FE/js/lib/`
- Konfigurasi runtime lokal: `FE/env.js`

Rute memakai hash (`#/...`). Setiap halaman umumnya mengekspor:

- `render(ctx)`: menghasilkan string HTML.
- `mount(root, ctx)`: memasang event dan memuat data; bersihkan listener/timer
  melalui mekanisme unmount bila halaman memilikinya.

Data halaman sebaiknya selalu melalui `js/services/`; hindari membaca data mock
atau storage langsung dari halaman. Logika yang bisa murni sebaiknya diletakkan
di `js/lib/` dan diuji tanpa DOM.

### API dan mode data

`FE/env.js` saat ini mengatur:

- `API_BASE_URL`: `http://localhost:8000`
- `ENABLE_MOCK`: `false`, jadi frontend menggunakan API nyata secara default.

Jangan mengubah konfigurasi ini atau mengaktifkan mock tanpa alasan dan
persetujuan yang sesuai. Mode mock hanya untuk simulasi/pengembangan tertentu.
API client menambahkan token sesi sebagai `Authorization: Bearer ...`, mengubah
body objek menjadi JSON, dan mengeluarkan event `pd:loading-state` untuk request
aktif.

Untuk koneksi lokal, pastikan origin frontend yang benar (termasuk port) masuk
ke `CORS_ALLOW_ORIGIN` di `BE/.env`. Contoh nilai `localhost:5173` di
`BE/.env.example` tidak otomatis cocok dengan Live Server yang berjalan di port
berbeda.

### Rute utama

- Login dan reset password: `#/login`, `#/reset-password`
- Dashboard: `#/dashboard-peminjam`, `#/dashboard-pj`
- Katalog dan detail: `#/inventaris`, `#/inventaris/:id`
- Ajukan peminjaman: `#/inventaris/:id/ajukan`
- Pengajuan milik pengguna: `#/pengajuan-saya/peminjaman`,
  `#/pengajuan-saya/pengembalian`
- Pengajuan PJ dan konten umum: `#/pengajuan-pj`, `#/tata-tertib`, `#/profil`
- Area pengelolaan PJ: `#/kelola/inventaris`, `#/kelola/kategori`,
  `#/kelola/peminjaman`, `#/kelola/pengembalian`,
  `#/kelola/pengajuan-pj`, `#/kelola/pengguna`

Rute aktual ditentukan bersama oleh `router.js` dan `lib/route-guard.js`.
Perubahan rute sebaiknya mencakup halaman, route guard, navigasi, judul/menu,
serta test terkait.

## 4. Backend dan Database

BE menggunakan PHP native (PHP 8.1+ menurut README; Dockerfile berbasis PHP
8.2/Apache) dengan PostgreSQL. Supabase dipakai sebagai target database/storage
yang umum. `BE/public/index.php` adalah entry point/router tunggal; rute
didefinisikan di `BE/src/routes.php`, lalu handler berada di
`BE/src/handlers/`.

Pembagian tanggung jawab:

- `src/bootstrap.php`: muat `.env`, file backend, dan validasi konfigurasi
  wajib.
- `src/db.php`: koneksi PDO serta helper query dan transaksi.
- `src/auth.php`: token HS256, autentikasi, dan pemeriksaan peran.
- `src/helpers.php`: respons JSON, validasi umum, paginasi, dan pemetaan error.
- `src/storage.php`: penyimpanan lokal atau Supabase Storage.
- `src/handlers/`: endpoint per area fitur.
- `database/`: skema dan skrip pengujian; aturan bisnis penting juga berada di
  PostgreSQL (view/fungsi).

Hal penting untuk integrasi:

- Kontrak endpoint, format respons/error, akses, dan upload ada di
  `BE/docs/API.md`; baca sebelum mengubah request/response frontend.
- Backend membutuhkan `.env` lokal, koneksi database, dan `TOKEN_SECRET`
  minimal 32 karakter.
- `CAPTCHA_MODE=off` hanya diperbolehkan bila `APP_ENV=local`.
- Jika memakai Supabase Storage, buat bucket sesuai konfigurasi. Jangan pernah
  mengirim `SUPABASE_SERVICE_KEY`, kredensial database, atau token rahasia ke FE
  maupun dokumen.
- Lampiran privat diakses melalui URL bertanda tangan; perhatikan
  kedaluwarsanya.
- Sebagian test integrasi nyata membutuhkan backend dan database yang aktif.
  Bedakan kegagalan koneksi/infrastruktur dari regresi test unit.

Jangan mengubah SQL atau kontrak endpoint hanya untuk menyesuaikan satu halaman
sebelum memastikan aturan bisnis dan pemakai endpoint lainnya.

## 5. Menjalankan dan Menguji

Perintah berikut ditujukan untuk PowerShell Windows.

Frontend:

```powershell
cd FE
npm.cmd ci
npm.cmd run build:css
npm.cmd test
```

Jalankan frontend lewat Live Server atau server HTTP, bukan `file://`, karena
aplikasi menggunakan ES Modules. API base lokal bawaan frontend adalah
`http://localhost:8000`.

Backend:

```powershell
cd BE
# Isi .env lokal dari .env.example terlebih dahulu.
php -S localhost:8000 -t public public/index.php
```

Database baru perlu skema `BE/database/01_skema_final.sql`. Skrip
`02_pengujian.sql` bersifat opsional untuk data/pengujian. Jangan jalankan SQL
reset atau skrip destruktif pada database yang berisi data penting tanpa izin
eksplisit.

Setelah mengubah kelas Tailwind, jalankan `npm.cmd run build:css` dari `FE/`.
`FE/css/app.css` adalah hasil build, bukan tempat perubahan manual.

## 6. Aturan Implementasi yang Perlu Dijaga

- Semua warna tema berasal dari token di `FE/css/tokens.css`; jangan menulis
  hex/hsl/oklch di JS atau CSS lain.
- Jangan membentuk kelas Tailwind dengan interpolasi dinamis. Tulis nama kelas
  utuh agar terdeteksi build dan lolos `tailwind-guard.test.js`.
- Hormati `prefers-reduced-motion` untuk animasi.
- Gunakan prefix `.pd-` untuk animasi/kelas kustom proyek yang sesuai.
- Escape teks/data dinamis dengan helper `FE/js/ui/html.js` sebelum memasukkan
  ke HTML; jangan menyisipkan data pengguna mentah.
- Pertahankan label aksesibel, fokus terlihat, navigasi keyboard, dan ukuran
  target sentuh yang memadai.
- Uji layar sempit (sekitar 360px) selain desktop.
- Untuk perubahan state yang memerlukan transisi, hindari mengganti seluruh DOM
  bila itu menghilangkan nilai awal transisi.
- Modal harus berada di atas shell (overlay memakai z-index modal proyek) dan
  menangani viewport mobile/konten panjang. Lihat implementasi modal yang sudah
  ada sebelum membuat pola baru.
- Periksa `git status` sebelum mengedit. Jangan membuang atau menimpa perubahan
  yang sudah ada dan bukan bagian dari tugas.

### CSS dan desain

`FE/css/tokens.css` memuat variabel tema; `FE/tailwind.config.mjs` memetakannya
ke utility Tailwind. Sumber CSS adalah `FE/css/tailwind.input.css` dan hasil
build ada di `FE/css/app.css`.

Jika menambah kelas yang hanya muncul dari markup dinamis, pastikan Tailwind
dapat memindainya atau tambahkan pola safelist yang tepat. Kemudian jalankan
build dan `tailwind-guard.test.js`.

### Loading

- Lottie lokal: `FE/assets/animations/loading-rocket.json`
- Player lokal: `FE/vendor/lottie.min.js`, dimuat oleh `FE/index.html`
- Helper: `FE/js/ui/loading-state.js`
- `main.js` memasang Lottie untuk elemen `[data-pd-lottie]` yang muncul secara
  dinamis dan menghancurkan instance ketika elemen dilepas.
- Lottie harus tetap memiliki fallback spinner CSS jika aset gagal atau
  `prefers-reduced-motion` aktif.
- Katalog inventaris berbentuk grid menggunakan skeleton card karena bentuknya
  menjaga konteks konten dan stabilitas layout.
- Loading tabel/area dashboard menggunakan Lottie. Hindari membuat lebih dari
  satu instance untuk area yang sama saat tampilan card dan tabel berganti.

## 7. Pembaruan UI Terbaru

Ringkasan perubahan terbaru yang relevan saat melanjutkan pekerjaan:

1. **Sidebar desktop collapse/expand**
   - Keadaan expanded/collapsed menggunakan markup sidebar yang sama.
   - `data-collapsed` menjadi state CSS; handler di `main.js` mengubah atribut
     dan lebar tanpa memanggil ulang `renderShell()`.
   - Padding item nav tetap sehingga ikon tidak berpindah saat lebar berubah.
   - Tombol toggle muncul saat hover ketika collapsed; ketika expanded tombol
     diberi jarak tambahan sekitar 8px dari logo.
   - Transisi lebar container dan elemen pendukung berada di
     `FE/css/tailwind.input.css`.
   - Navigasi sidebar membatasi overflow horizontal agar tidak memunculkan
     scrollbar di posisi collapsed.

2. **Drawer sidebar mobile**
   - Drawer sudah memakai slide transform 200ms dan backdrop fade.
   - Pola tersebut dinilai cukup; jangan menambah animasi bertingkat pada tiap
     item menu tanpa kebutuhan UX yang jelas.

3. **Tabel dashboard di layar mobile**
   - Dashboard peminjam dan dashboard PJ mempertahankan tabel pada desktop.
   - Untuk layar mobile, data utama ditampilkan sebagai card agar tidak
     mengharuskan pengguna menggeser tabel yang lebar.
   - Pada area pengelolaan PJ, pertahankan status dan aksi yang memang
     diperlukan di mobile.

4. **Loading dashboard**
   - Loading dashboard menggunakan helper Lottie yang sama untuk tampilan
     mobile dan desktop; jangan menginisialisasi Lottie terpisah untuk dua
     representasi tampilan.
   - Skeleton katalog inventaris tetap dipertahankan; keputusan UI terakhir
     adalah skeleton lebih sesuai untuk grid katalog.

5. **Paket share HTML**
   - `.trae-html-share-packages/FE/index.html.zip` adalah artefak paket
     share/preview, bukan sumber kebenaran untuk kode FE dan bukan bundle
     lengkap aplikasi. Edit sumber di `FE/`, bukan di dalam ZIP.

## 8. Cara Melanjutkan Pekerjaan

Sebelum melakukan perubahan:

1. Baca file sumber dan test yang berkaitan dengan permintaan.
2. Periksa `git status` dan pertahankan perubahan yang sudah ada.
3. Untuk integrasi API, baca endpoint terkait di `BE/docs/API.md` serta
   implementasi handler dan service FE.
4. Buat perubahan sekecil mungkin pada lapisan yang tepat.
5. Tambahkan/perbarui test untuk perilaku yang berubah.
6. Jalankan test relevan; build CSS jika kelas/style Tailwind berubah.
7. Bila UI berubah, cek desktop dan mobile serta status loading, kosong, dan
   error.
8. Laporkan hasil verifikasi dengan jelas, termasuk test yang tidak bisa
   dijalankan karena backend/database tidak tersedia.

