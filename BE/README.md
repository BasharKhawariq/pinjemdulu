# Backend PinjemDulu

PHP native + PostgreSQL (Supabase). Tanpa framework.

## Menjalankan

1. Salin `.env.example` menjadi `.env`, isi kredensial database. Untuk PostgreSQL lokal pakai `DB_SSLMODE=disable`.
2. Dari folder `BE/`:

   ```bash
   php -S localhost:8000 -t public public/index.php
   ```

Butuh PHP 8.1+ dengan ekstensi `pdo_pgsql` dan `mbstring`.

## Struktur

- `public/`    satu-satunya folder yang diakses browser (`index.php` = router)
- `src/`       bootstrap, koneksi DB, helper, dan handler per resource
- `database/`  skema SQL (`schema.sql`)

## Format respons

- Kunci JSON memakai camelCase (`idInventaris`, `namaBarang`).
- Galat berbentuk `{ "message": "...", "code": "...", "errors": { "field": "..." } }`.
- Aturan bisnis (stok, alur status) ditegakkan oleh trigger database; pesannya
  diteruskan apa adanya dengan kode `ATURAN_BISNIS` (HTTP 422).

## Endpoint

| Method | URL | Keterangan |
|---|---|---|
| GET | /api/inventaris[?id=] | daftar / detail (termasuk `jumlahTersedia`) |
| POST | /api/inventaris | tambah |
| PUT | /api/inventaris?id= | ubah |
| DELETE | /api/inventaris?id= | hapus |
| GET | /api/kategori | daftar kategori + jumlah barang |
| GET | /api/organisasi | daftar organisasi (termasuk `iconUrl`) |
| GET | /api/inventaris/thumbnail?id= | gambar barang (biner, ETag) |
| GET | /api/organisasi/icon?id= | gambar icon organisasi (biner, ETag) |

Upload foto barang: `POST /api/inventaris` multipart (`thumbnail` JPG/PNG maks 2 MB). Untuk ubah dengan foto, kirim `POST /api/inventaris?id=N&_method=PUT`.

### Area PJ (Pengelola) — wajib login

Semua endpoint `/api/*` hanya untuk akun berperan **Pengelola** yang aktif, dan selalu dibatasi ke
organisasi milik PJ yang login (data organisasi lain dianggap tidak ada: 404).
Daftar berhalaman memakai `?page=` dan `?limit=` (1-100) dan mengembalikan `{ data: [...], meta: { total, page, limit, totalHalaman } }`.

| Halaman | Method | URL | Keterangan |
|---|---|---|---|
| Dashboard PJ | GET | /api/dashboard-pj | ringkasan peminjaman, inventaris, pengajuan PJ; daftar yang perlu diputuskan / ditagih |
| Kelola Peminjaman | GET | /api/kelola-peminjaman[?status=&q=&dari=&sampai=&page=&limit=] | daftar (default Diajukan, Disetujui, Ditolak, Dipinjam) |
| | GET | /api/kelola-peminjaman?id= | detail |
| | PUT | /api/kelola-peminjaman?id= | body `{"aksi":"setujui"\|"tolak"\|"serahkan","alasanPenolakan":"..."}` |
| Kelola Pengembalian | GET | /api/kelola-pengembalian[?status=&q=&dari=&sampai=&page=&limit=] | default Dipinjam + Terlambat; `status=Dikembalikan` untuk riwayat |
| | GET | /api/kelola-pengembalian?id= | detail |
| | PUT | /api/kelola-pengembalian?id= | body `{"tanggalPengembalian":"YYYY-MM-DD","kondisiSesudah":"Baik"\|"Rusak","sanksi":"..."}`; bila sudah dikembalikan hanya `sanksi` yang bisa diubah |
| List Pengajuan PJ | GET | /api/kelola-pengajuan-pj[?status=&q=&page=&limit=] | permintaan menjadi PJ organisasi ini |
| | GET | /api/kelola-pengajuan-pj?id= | detail |
| | GET | /api/kelola-pengajuan-pj/lampiran?id= | berkas lampiran (PDF/gambar) |
| | PUT | /api/kelola-pengajuan-pj?id= | body `{"aksi":"setujui"\|"tolak","alasanPenolakan":"..."}`; setuju = pengaju otomatis jadi PJ |
| Kelola Pengguna | GET | /api/kelola-pengguna[?q=&role=&statusAkun=aktif\|nonaktif&page=&limit=] | anggota organisasi + peminjam barang organisasi |
| | GET | /api/kelola-pengguna?nim= | detail + 10 peminjaman terakhir |
| | PUT | /api/kelola-pengguna?nim= | body `{"aksi":"nonaktifkan"\|"aktifkan"\|"cabutPj"}` |

Kode galat: 400 `VALIDASI_GAGAL`/`ID_WAJIB`, 401 `TIDAK_TERAUTENTIKASI`, 403 `BUKAN_PJ`/`AKUN_NONAKTIF`/`AKSI_DITOLAK`,
404 `NOT_FOUND`, 405 `METHOD_NOT_ALLOWED`, 409 `STATUS_TIDAK_SESUAI`, 422 `VALIDASI_GAGAL`/`ATURAN_BISNIS`.

### Autentikasi (`AUTH_MODE` di `.env`)

- `dev`: header `X-Dev-Nim: <nim>` dipercaya. Hanya jalan bila `APP_ENV=local`. Untuk uji lokal.
- `supabase`: header `Authorization: Bearer <access_token>` divalidasi ke Supabase Auth. Isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`. Mode untuk produksi.

PHP terhubung ke database sebagai pemilik, sehingga RLS tidak berlaku di sini; pembatasan organisasi dilakukan di kode PHP.
Endpoint `/api/inventaris`, `/api/kategori`, `/api/organisasi` (dan gambarnya) untuk GET belum memakai autentikasi (publik); tulis inventaris (POST/PUT/DELETE) sudah wajib login PJ.

## Perubahan penyelarasan dengan FE
- `GET /api/me`: profil pemanggil (role, isPj, organisasi). Dipanggil FE setelah login untuk menentukan menu.
- `POST/PUT/DELETE /api/inventaris` kini wajib login sebagai PJ. Organisasi barang diambil dari akun PJ
  (field `idOrganisasi` dari klien diabaikan) dan PJ hanya bisa mengubah/menghapus barang organisasinya (404 untuk organisasi lain).
- `database/schema.sql`: `tanggal_mulai`/`tanggal_selesai` kini generated column, sama seperti di Supabase.
