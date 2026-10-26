# Backend PinjemDulu

PHP native + PostgreSQL (Supabase). Tanpa framework.

## Menjalankan

1. Salin `.env.example` menjadi `.env`, isi kredensial database.
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
| GET | /api/organisasi | daftar organisasi |

Belum ada autentikasi; endpoint tulis jangan dibuka ke publik dulu.