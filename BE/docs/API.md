# Kontrak API PinjemDulu

## Konvensi

- Semua respons JSON, kunci camelCase. Tanggal `YYYY-MM-DD`.
- Autentikasi: `Authorization: Bearer <token>` (kecuali endpoint publik).
- Galat selalu `{ "message": "...", "code": "...", "errors": { "namaField": "pesan" } }` (`errors` opsional).
- Daftar: `{ "data": [...], "meta": { "total", "page", "limit", "totalHalaman" } }` dengan query `page` (bawaan 1) dan `limit` (bawaan 10, maks 100).
- Filter status boleh lebih dari satu, dipisah koma: `?status=Diajukan,Disetujui`. Pencarian: `?q=`. Rentang tanggal: `?dari=&sampai=`.
- Endpoint unggah memakai `multipart/form-data`. PHP tidak mem-parse multipart pada PUT, jadi ubah inventaris dengan berkas memakai `POST` (alias).
- Berkas dikembalikan sebagai URL siap pakai (`fotoUrl`, `logoUrl`, ...). URL berkas privat berlaku 1 jam.

| HTTP | code | Arti |
|---|---|---|
| 401 | `TIDAK_TERAUTENTIKASI`, `KREDENSIAL_SALAH` | token tidak valid / login gagal |
| 403 | `BUKAN_PJ`, `HANYA_PEMINJAM`, `AKUN_NONAKTIF` | role tidak sesuai / akun nonaktif |
| 404 | `NOT_FOUND` | tidak ada, atau milik OKI lain |
| 409 | `DATA_SUDAH_ADA`, `KATEGORI_SUDAH_ADA`, `KATEGORI_DIPAKAI`, `RELASI_TERPAKAI` | konflik data |
| 422 | `VALIDASI_GAGAL` (ada `errors`), `ATURAN_BISNIS` (pesan dari database) | input / aturan bisnis |
| 429 | `TERLALU_BANYAK_PERCOBAAN` | dibatasi |

Akses: **publik**, **user** (semua role), **peminjam** (hanya Peminjam), **pj** (hanya Penanggung Jawab).

## Publik

| Endpoint | Body / query | Respons |
|---|---|---|
| `GET /api/health` | | `{status, waktu}` |
| `POST /api/login` | `nim`, `password`, `captchaToken` | `{token, expiresAt, user}` |
| `POST /api/lupa-password` | `nim`, `noWhatsapp`, `captchaToken` | 201 `{message}` |
| `POST /api/reset-password` | `token`, `passwordBaru`, `konfirmasiPassword` | `{message}` |

`user` = `{nim, namaPengguna, role, isPj, idOrganisasi, organisasi:{nama, singkatan, logoUrl}}`.

## Akun dan referensi (user)

| Endpoint | Keterangan |
|---|---|
| `GET /api/me` | profil saat ini |
| `POST /api/ubah-password` | `passwordLama`, `passwordBaru`, `konfirmasiPassword`; respons memuat token baru (token lama gugur) |
| `GET /api/organisasi`, `GET /api/kategori` | referensi untuk filter dan form |
| `GET /api/badge` | angka sidebar: `pengajuanSaya` dan, untuk PJ, `pj` |

## Katalog dan peminjaman (user)

| Endpoint | Keterangan |
|---|---|
| `GET /api/inventaris` | katalog barang OKI lain (kondisi Baik). Filter: `kategori=1,2`, `organisasi=1,2`, `ketersediaan=Tersedia\|Dipinjam`, `q` |
| `GET /api/inventaris/{id}` | detail + `jadwal[]` peminjaman aktif |
| `GET /api/inventaris/{id}/kalender?dari=&sampai=` | data kalender per hari (bawaan hari ini + 120 hari): `tanggal,totalUnit,unitDipinjam,unitPersiapan,terpakai,sisaUnit,penanda`; `meta.tanggalMulaiPalingCepat` |
| `GET /api/inventaris/{id}/cek?mulai=&selesai=` | `{maksUnitTersedia, jadwalBerdekatan}` untuk batas field Jumlah Unit dan dialog peringatan |
| `POST /api/peminjaman` | `idInventaris`, `jumlahPinjam`, `tglMulai`, `tglSelesai`, `keperluan` -> 201 `{idPeminjaman}` |
| `GET /api/dashboard` | kartu ringkasan peminjam |

## Pengajuan Saya (user)

| Endpoint | Keterangan |
|---|---|
| `GET /api/pengajuan-saya/peminjaman` | status: `Diajukan,Disetujui,Dipinjam,Ditolak,Pengembalian,Selesai`; tiap baris ada `bisaAjukanPengembalian` |
| `GET /api/pengajuan-saya/peminjaman/{id}` | detail + `fotoPengambilanUrl` + `pengembalian` |
| `POST /api/pengajuan-saya/peminjaman/{id}/pengembalian` | Ajukan Pengembalian (juga untuk baris Terlambat) -> 201 |
| `GET /api/pengajuan-saya/pengembalian` | status: `Menunggu,Dikembalikan,Ditolak,Terlambat`. Baris Terlambat tidak punya `idPengembalian`; pakai `idPeminjaman` |
| `GET /api/pengajuan-saya/pengembalian/{id}` | detail |
| `POST /api/pengajuan-saya/pengembalian/{id}/ajukan-ulang` | Ajukan Kembali setelah ditolak -> 201 |

## Pengajuan PJ (peminjam)

| Endpoint | Keterangan |
|---|---|
| `GET /api/pengajuan-pj`, `GET /api/pengajuan-pj/{id}` | riwayat pengajuan sendiri (detail memuat `lampiranUrl`) |
| `POST /api/pengajuan-pj` | multipart: `lampiran` (JPG/PNG/PDF, maks 2 MB) -> 201 |

## Area PJ

| Endpoint | Keterangan |
|---|---|
| `GET /api/dashboard-pj` | kartu dashboard OKI |
| `GET /api/kelola-inventaris` | filter `kategori`, `kondisi=Baik\|Rusak`, `ketersediaan`, `q` |
| `POST /api/kelola-inventaris` | multipart: `namaBarang`, `idKategori`, `totalUnit` (1-999), `kondisi?`, `deskripsi?`, `foto?` |
| `GET /api/kelola-inventaris/{id}` | detail + jadwal peminjam |
| `PUT` atau `POST /api/kelola-inventaris/{id}` | kirim hanya field yang berubah; `hapusFoto=true` untuk menghapus foto |
| `DELETE /api/kelola-inventaris/{id}` | hapus lunak; ditolak bila ada peminjaman aktif/terjadwal |
| `GET /api/kelola-kategori` | `idKategori, namaKategori, jumlahBarang, bisaDihapus` |
| `POST /api/kelola-kategori`, `PUT /api/kelola-kategori/{id}` | `namaKategori` (maks 30, unik tanpa beda huruf) |
| `DELETE /api/kelola-kategori/{id}` | 409 `KATEGORI_DIPAKAI` bila masih dipakai (untuk dialog "Kategori Tidak Bisa Dihapus") |
| `GET /api/kelola-peminjaman`, `.../{id}` | pengajuan untuk barang OKI sendiri; `q` mencari barang/peminjam/NIM |
| `POST /api/kelola-peminjaman/{id}/setujui` | |
| `POST /api/kelola-peminjaman/{id}/tolak` | `alasan` wajib |
| `POST /api/kelola-peminjaman/{id}/pengambilan` | multipart: `tanggal`, `foto` (wajib) |
| `GET /api/kelola-pengembalian`, `.../{id}` | status `Menunggu,Dikembalikan,Ditolak,Terlambat` |
| `POST /api/kelola-pengembalian/{id}/setujui` | multipart: `jumlah`, `tanggal`, `kondisi` (Baik/Rusak), `foto` (wajib), `sanksi?` |
| `POST /api/kelola-pengembalian/{id}/tolak` | `alasan` wajib |
| `GET /api/kelola-pengajuan-pj`, `.../{id}` | pemohon dari OKI sendiri; detail memuat `lampiranUrl` |
| `POST /api/kelola-pengajuan-pj/{id}/setujui` / `/tolak` | tolak butuh `alasan` |
| `GET /api/kelola-pengguna` | filter `role`, `status=aktif\|nonaktif`, `q` |
| `POST /api/kelola-pengguna` | `nim`, `namaPengguna`, `role?`; password awal = NIM |
| `GET /api/kelola-pengguna/{nim}`, `PUT /api/kelola-pengguna/{nim}` | ubah `nim?`, `namaPengguna?`, `role?` |
| `PUT /api/kelola-pengguna/{nim}/status` | `statusAkun: true\|false` |
| `GET /api/kelola-pengguna/request-password`, `.../{id}` | filter `status=Menunggu,Dikonfirmasi` |
| `POST /api/kelola-pengguna/request-password/{id}/proses` | buat token 24 jam; respons `{tautanReset, pesan, waUrl, berlakuSampai}` (token hanya muncul sekali) |
| `POST /api/kelola-pengguna/request-password/{id}/konfirmasi` | `pesan` (teks yang dikirim ke peminjam) |
| `GET /api/laporan/rekap?tahun=` | rekap bulanan OKI |
| `GET /api/laporan/barang-populer?limit=` | barang terpopuler OKI |
| `POST /api/laporan/refresh` | segarkan laporan (maks 3x / 10 menit) |
