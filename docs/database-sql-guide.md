# Panduan Query Database PinjemDulu

Dokumen ini menjelaskan isi [01_skema_final.sql](../BE/database/01_skema_final.sql), tujuan setiap query, kapan query tersebut digunakan, dan mekanisme kerjanya. File SQL ini ditujukan untuk PostgreSQL/Supabase dan dijalankan berurutan pada database kosong.

## 1. Cara Menjalankan

Jalankan seluruh file satu kali dari atas ke bawah melalui Supabase SQL Editor atau koneksi PostgreSQL dengan hak akses administrator.

Urutan eksekusinya penting:

1. Ekstensi dan enum dibuat lebih dahulu.
2. Fungsi pembantu tersedia sebelum tabel memakainya sebagai default atau validasi.
3. Tabel dibuat sebelum indeks, trigger, view, dan fungsi proses bisnis.
4. Materialized view dibuat setelah view sumbernya tersedia.
5. Hak akses dan RLS dipasang setelah seluruh objek database selesai dibuat.
6. Data uji dijalankan paling akhir dalam satu transaksi.

Script tidak ditujukan untuk dijalankan berulang kali pada database yang sudah berisi objek dengan nama sama. Untuk development, gunakan database kosong baru atau hapus objek secara manual setelah memastikan tidak ada data penting.

## 2. Ekstensi dan Enum

### `CREATE EXTENSION pgcrypto`

**Kegunaan:** menyediakan `crypt`, `gen_salt`, `gen_random_bytes`, dan `digest`.

**Dipakai saat:**

- Membuat hash password bcrypt.
- Membandingkan password saat login.
- Membuat token reset password acak.
- Menyimpan hash token SHA-256, bukan token asli.

**Mekanisme:** `IF NOT EXISTS` membuat query aman dijalankan ketika ekstensi sudah tersedia. Ekstensi ditempatkan pada schema `extensions`, sehingga fungsi autentikasi menetapkan `search_path` ke `public, extensions`.

### Enum status dan kondisi

Enum berikut membatasi nilai yang dapat disimpan:

- `role_pengguna`: `Peminjam`, `Penanggung Jawab`.
- `kondisi_barang`: `Baik`, `Rusak`.
- `status_peminjaman`: alur pengajuan dari `Diajukan` sampai `Selesai`.
- `status_pengembalian`: `Menunggu`, `Dikembalikan`, `Ditolak`.
- `status_request_pj`: status pengajuan menjadi PJ.
- `status_request_password`: status permintaan reset password.

Enum digunakan saat insert/update agar status ilegal langsung ditolak PostgreSQL, bukan hanya divalidasi di frontend.

## 3. Fungsi Pembantu

### `fn_hari_ini()`

Menghasilkan tanggal hari ini berdasarkan zona waktu Asia/Jakarta. Fungsi ini dipakai oleh default tanggal, validasi H+2, kalender ketersediaan, dan proses pengajuan.

Mekanismenya adalah mengambil `now()` dalam UTC, mengubahnya ke WIB, lalu mengambil bagian tanggal. Dengan begitu tanggal bisnis tidak bergeser ketika timezone server Supabase berbeda.

### `trg_set_updated_at()`

Fungsi trigger yang mengisi `NEW.updated_at` dengan waktu sekarang sebelum record di-update. Trigger ini dipasang pada tabel pengguna, inventaris, peminjaman, dan pengembalian.

## 4. Tabel dan Constraint

### `organisasi`

Menyimpan master organisasi/OKI, nama, singkatan, logo, dan icon. `nama_organisasi` serta `singkatan` unik agar organisasi tidak terduplikasi.

### `pengguna`

Menyimpan akun berdasarkan NIM. Relasi `id_organisasi` memastikan setiap pengguna berasal dari organisasi yang valid.

Constraint penting:

- Nama tidak boleh kosong.
- Role harus berasal dari enum.
- `password_hash` harus berbentuk hash bcrypt.
- `status_akun` menentukan apakah akun boleh login.

Password polos tidak boleh disimpan. Jika password kosong saat insert, trigger akan membuat password default dari NIM lalu melakukan hash.

### `kategori`

Menyimpan kategori inventaris. Unique index berbasis `lower(nama_kategori)` membuat `Elektronik` dan `elektronik` dianggap sama.

### `inventaris`

Menyimpan barang milik organisasi, jumlah unit, kondisi, deskripsi, foto, dan waktu soft delete.

`deleted_at` dipakai untuk soft delete: barang tidak muncul di daftar aktif, tetapi riwayat peminjaman tetap dapat menunjuk ke barang tersebut.

### `peminjaman`

Menyimpan pengajuan peminjaman dan seluruh fase pengambilan barang.

Kolom penting:

- `tgl_mulai` dan `tgl_selesai`: periode peminjaman.
- `tgl_blok_mulai` dan `tgl_blok_selesai`: periode yang juga mengunci satu hari persiapan dan satu hari pengecekan.
- `tanggal_pengambilan` dan `foto_pengambilan_path`: bukti barang sudah diambil.
- `kondisi_sebelum`: snapshot kondisi barang saat diambil.
- `alasan_penolakan`: alasan ketika pengajuan ditolak.

Constraint memastikan rentang tanggal valid, pengajuan minimal H+2, penolakan memiliki alasan dan pemroses, serta status barang keluar memiliki tanggal pengambilan.

### `pengembalian`

Menyimpan maksimal satu record pengembalian untuk setiap peminjaman. Unique constraint pada `id_peminjaman` memungkinkan pengajuan ulang menggunakan record yang sama setelah ditolak.

Saat status menjadi `Dikembalikan`, jumlah, tanggal, kondisi barang, dan pemroses wajib tersedia. Saat status menjadi `Ditolak`, alasan dan pemroses wajib tersedia.

### `request_pj`

Menyimpan permintaan pengguna untuk menjadi Penanggung Jawab. Partial unique index memastikan satu pengguna hanya memiliki satu request berstatus `Menunggu`.

### `request_password`

Menyimpan permintaan lupa password dan token reset.

Token asli hanya dikembalikan sekali oleh fungsi proses request. Database menyimpan `token_hash`, tanggal kedaluwarsa, dan waktu token dipakai. Partial unique index mencegah request menunggu ganda untuk NIM yang sama.

### `log_aktivitas`

Menyimpan audit perubahan status pada peminjaman, pengembalian, request PJ, dan request password. Data ini berguna untuk histori, pelacakan tindakan, dan audit.

## 5. Indeks

Indeks dibuat untuk mempercepat query yang paling sering digunakan:

- `idx_pengguna_org`: mencari pengguna berdasarkan organisasi.
- `idx_inventaris_org_aktif`: daftar inventaris aktif milik organisasi.
- `idx_inventaris_kategori`: filter barang berdasarkan kategori.
- `idx_peminjaman_nim_status`: daftar peminjaman pengguna berdasarkan status.
- `idx_peminjaman_kuota`: pencarian peminjaman yang menahan kuota pada kalender.
- `idx_peminjaman_inventaris`: status peminjaman untuk satu barang.
- `idx_request_pj_nim` dan `idx_request_password_nim`: histori request per pengguna.
- `idx_log_record`: histori log untuk record tertentu.

Indeks partial hanya mengindeks data yang relevan, misalnya inventaris yang belum dihapus atau peminjaman yang masih menahan kuota.

## 6. Kalender Ketersediaan

### `fn_kalender_ketersediaan(...)`

Fungsi ini mengembalikan satu baris per tanggal pada rentang yang diminta:

- total unit inventaris,
- unit yang sedang dipinjam,
- unit yang dipakai untuk periode berjalan,
- unit persiapan,
- total unit terpakai,
- sisa unit,
- penanda kondisi kalender.

**Dipakai saat:**

1. FE menampilkan kalender pada form pengajuan.
2. Trigger memvalidasi kuota ketika peminjaman baru dibuat.
3. Trigger memvalidasi pengurangan jumlah unit inventaris.

**Mekanisme:**

1. CTE `hari` membuat semua tanggal menggunakan `generate_series`.
2. CTE `pakai` melakukan `LEFT JOIN` ke peminjaman aktif.
3. Periode blok memakai `tgl_blok_mulai` dan `tgl_blok_selesai`.
4. Peminjaman terlambat tetap dihitung memakai kuota sampai barang dikembalikan.
5. Parameter `p_kecuali` mengecualikan satu peminjaman saat proses edit.

### `fn_pastikan_pj(...)`

Memastikan aktor adalah PJ aktif. Jika `p_id_organisasi` diberikan, fungsi juga memastikan PJ hanya mengelola barang/request milik organisasinya sendiri.

Fungsi ini dipanggil oleh seluruh fungsi proses yang membutuhkan otorisasi PJ. Jika valid, fungsi mengembalikan ID organisasinya.

## 7. Trigger

### Trigger password dan `updated_at`

`trg_pengguna_password` membuat hash bcrypt dari NIM ketika password belum diberikan. Trigger `trg_*_updated` memperbarui timestamp setiap ada perubahan record.

### `trg_validasi_peminjaman`

Berjalan sebelum insert peminjaman. Trigger:

1. Memaksa status awal menjadi `Diajukan`.
2. Mengisi tanggal pengajuan berdasarkan WIB.
3. Menghapus data pemrosesan lama.
4. Memastikan akun aktif.
5. Mengunci baris inventaris dengan `FOR UPDATE` agar pengajuan bersamaan tidak menyebabkan over-booking.
6. Menolak barang rusak atau barang milik OKI sendiri.
7. Memvalidasi H+2 dan rentang tanggal.
8. Memanggil kalender untuk memastikan kuota cukup.

### `trg_peminjaman_transisi`

Berjalan saat status peminjaman berubah. Hanya transisi berikut yang valid:

`Diajukan -> Disetujui`, `Diajukan -> Ditolak`, `Disetujui -> Dipinjam`, `Dipinjam -> Pengembalian`, dan `Pengembalian -> Selesai`.

Saat barang menjadi `Dipinjam`, kondisi inventaris disalin ke `kondisi_sebelum` dan tanggal pengambilan diisi jika belum ada.

### `trg_validasi_ubah_inventaris`

Mencegah `total_unit` dikurangi di bawah jumlah unit yang sedang terpakai pada peminjaman aktif atau terjadwal. Trigger menghitung puncak pemakaian melalui `fn_kalender_ketersediaan`.

### `trg_validasi_pengembalian`

Memastikan pengembalian baru hanya dibuat untuk peminjaman berstatus `Dipinjam`, lalu memaksa status awal menjadi `Menunggu`.

### `trg_pengembalian_sinkron`

Menjaga konsistensi lintas tabel:

- Pengembalian `Menunggu` mengubah peminjaman menjadi `Pengembalian`.
- Pengembalian `Dikembalikan` memperbarui kondisi inventaris dan mengubah peminjaman menjadi `Selesai`.

### Trigger request PJ

`trg_request_pj_validasi` memastikan pemohon aktif dan masih berrole Peminjam. `trg_request_pj_proses` mengisi waktu proses dan menaikkan role pengguna menjadi PJ ketika request disetujui.

### `trg_log_status`

Berjalan setelah insert atau perubahan status. Jika status benar-benar berubah, trigger menyimpan tabel, ID record, status lama, status baru, dan aktor ke `log_aktivitas`. Update lain yang tidak mengubah status tidak dicatat.

## 8. Fungsi Proses Bisnis

Semua fungsi pada bagian ini dipanggil BE dengan pola `SELECT nama_fungsi(...)`. Fungsi menggabungkan validasi, otorisasi, update, dan transaksi bisnis agar frontend tidak dapat melewati aturan database.

### Autentikasi

#### `fn_login`

Mencari pengguna berdasarkan NIM, membandingkan password dengan `crypt`, menolak akun nonaktif, lalu mengembalikan data sesi tanpa `password_hash`.

Pesan error untuk NIM dan password salah dibuat sama agar keberadaan NIM tidak dapat ditebak.

#### `sp_ubah_password`

Memverifikasi password lama, memastikan password baru minimal delapan karakter, lalu menyimpan hash bcrypt baru.

### Lupa password

#### `sp_ajukan_lupa_password`

Memastikan NIM terdaftar dan membuat request password. Jika masih ada request `Menunggu`, nomor WhatsApp diperbarui pada record yang sama.

#### `sp_proses_request_password`

Dipakai PJ saat menyetujui request. Fungsi mengunci request, memvalidasi PJ dari organisasi yang sesuai, membuat token acak 32 byte, menyimpan hash token dan masa berlaku 24 jam, lalu mengembalikan token asli satu kali ke BE untuk dibuat menjadi tautan.

#### `sp_konfirmasi_request_password`

Menyelesaikan request setelah tautan/pesan disiapkan. Fungsi memastikan request masih menunggu, token sudah dibuat, PJ berwenang, lalu menyimpan pesan dan waktu konfirmasi.

#### `sp_reset_password_dengan_token`

Memvalidasi hash token, status, masa berlaku, dan bahwa token belum pernah digunakan. Setelah password diubah, `token_dipakai_pada` diisi sehingga tautan tidak dapat digunakan kembali.

### Kelola pengguna dan inventaris

#### `sp_tambah_pengguna`

Memastikan PJ mengelola OKI sendiri, lalu menambah pengguna baru. Password default akan dibuat trigger sebagai hash dari NIM.

#### `sp_ubah_pengguna`

Memastikan PJ berwenang atas OKI pengguna, kemudian memperbarui data yang diizinkan.

#### `sp_tambah_inventaris`

Memastikan PJ berwenang atas organisasi inventaris, lalu memasukkan barang baru.

#### `sp_ubah_inventaris`

Memastikan PJ berwenang, memperbarui data inventaris, dan menyerahkan validasi pengurangan unit kepada trigger.

#### `sp_hapus_inventaris`

Melakukan soft delete dengan mengisi `deleted_at`. Data tidak benar-benar dihapus agar foreign key dan histori transaksi tetap aman.

### Peminjaman

#### `sp_ajukan_peminjaman`

Memasukkan pengajuan baru. Validasi detail dijalankan oleh `trg_validasi_peminjaman`, termasuk akun, kondisi barang, OKI, H+2, rentang tanggal, dan kuota.

#### `sp_proses_peminjaman`

Dipakai PJ untuk menyetujui atau menolak pengajuan. Fungsi mengunci record, memastikan PJ adalah pemilik OKI, memeriksa status masih `Diajukan`, lalu mengubah status. Penolakan wajib memiliki alasan.

#### `sp_pengambilan_barang`

Dipakai PJ ketika barang diserahkan. Hanya status `Disetujui` yang dapat diproses. Tanggal dan foto wajib diisi, kemudian status berubah menjadi `Dipinjam`; trigger menyimpan kondisi awal.

### Pengembalian

#### `sp_ajukan_pengembalian`

Dipakai untuk pengajuan pertama maupun pengajuan ulang setelah ditolak. Pengajuan ulang mengubah record lama menjadi `Menunggu`, mengatur tanggal pengajuan baru, dan menghapus data penolakan. Pengajuan pertama membuat record baru.

#### `sp_setujui_pengembalian`

Dipakai PJ untuk menerima barang. Jumlah harus sama dengan jumlah yang dipinjam. Fungsi menyimpan tanggal, kondisi, foto, sanksi, dan pemroses, lalu trigger menyelesaikan peminjaman serta memperbarui kondisi inventaris.

#### `sp_tolak_pengembalian`

Dipakai PJ untuk menolak pengembalian. Alasan wajib diisi dan disimpan bersama pemroses.

### Pengajuan PJ

#### `sp_ajukan_pj`

Membuat request menjadi PJ. Unique index mencegah request menunggu ganda; jika terjadi konflik, fungsi mengembalikan pesan yang lebih mudah dipahami.

#### `sp_proses_request_pj`

Dipakai PJ yang berwenang untuk menyetujui atau menolak request. Saat disetujui, trigger otomatis mengubah role pemohon menjadi PJ. Saat ditolak, alasan wajib diisi.

## 9. View untuk BE dan FE

Semua view operasional memakai `security_invoker`, sehingga hak akses pemanggil tetap diterapkan. Tidak ada view yang menampilkan `password_hash`.

### `v_inventaris`

Menggabungkan inventaris dengan kategori dan organisasi, serta menghitung unit keluar dan unit tersedia hari ini. Barang soft delete tidak ditampilkan.

### `v_katalog_inventaris`

Memfilter `v_inventaris` agar hanya barang berkondisi `Baik` yang masuk katalog peminjaman.

### `v_jadwal_peminjaman`

Menyediakan jadwal per barang untuk kalender/detail. Status `Pengembalian` ditampilkan sebagai `Dipinjam` karena barang masih berada di luar.

### `v_peminjaman_detail`

Menyatukan data peminjaman, peminjam, organisasi peminjam, inventaris, organisasi pemilik, dan PJ pemroses. BE memfilter hasil berdasarkan NIM peminjam atau organisasi pemilik.

### `v_pengembalian_detail`

Menyediakan daftar pengembalian lengkap. Bagian `UNION ALL` menambahkan baris virtual `Terlambat` untuk peminjaman `Dipinjam` yang melewati tanggal selesai dan belum mempunyai record pengembalian.

### `v_request_pj_detail`

Menampilkan detail request PJ, organisasi pemohon, pemroses, tanggal proses, lampiran, dan alasan penolakan.

### `v_request_password_detail`

Menampilkan request password untuk tab pengelolaan request, termasuk status, nomor WhatsApp, pesan, dan pemroses.

### `v_pengguna`

Menampilkan daftar pengguna tanpa `password_hash`, termasuk organisasi, role, dan status akun.

### `v_dashboard_peminjam`

Menghasilkan satu baris ringkasan per NIM: total peminjaman, pengajuan PJ, disetujui, ditolak, dikembalikan, dan terlambat. `CROSS JOIN LATERAL` menjalankan agregasi terpisah yang berkaitan dengan pengguna saat ini.

### `v_dashboard_pj`

Menghasilkan ringkasan per organisasi untuk dashboard PJ dan badge sidebar, seperti jumlah pengajuan masuk, peminjaman aktif, pengembalian menunggu, dan request password.

## 10. Materialized View dan Laporan

### `mv_rekap_peminjaman_bulanan`

Menyimpan agregasi historis per organisasi dan bulan: total pengajuan, total disetujui, total ditolak, unit dipinjam, dan pengembalian terlambat.

Digunakan untuk laporan manajerial yang tidak harus real-time. Unique index pada organisasi dan bulan diperlukan agar refresh concurrent dapat dilakukan.

### `mv_barang_terpopuler`

Mengurutkan barang berdasarkan jumlah peminjaman per organisasi. `RANK()` memberi peringkat dan `LEFT JOIN` memastikan barang yang belum pernah dipinjam tetap dapat muncul dengan nilai nol.

### `sp_refresh_laporan`

Melakukan `REFRESH MATERIALIZED VIEW CONCURRENTLY` untuk kedua laporan. Pemakaiannya cocok melalui scheduler, misalnya pg_cron setiap 30 menit:

```sql
SELECT cron.schedule(
  'refresh-laporan-pinjemdulu',
  '*/30 * * * *',
  'CALL public.sp_refresh_laporan()'
);
```

Kartu dashboard real-time tidak memakai materialized view karena harus membaca kondisi transaksi terbaru.

## 11. Keamanan dan Hak Akses

Blok `DO` mengaktifkan Row Level Security untuk seluruh tabel publik. Tidak adanya policy untuk role publik berarti akses langsung ditutup.

Query `REVOKE` mencabut akses tabel, sequence, function, dan routine dari `anon`, `authenticated`, dan `PUBLIC`. Query `ALTER DEFAULT PRIVILEGES` memastikan objek baru juga tidak otomatis terbuka.

Query `GRANT` memberikan akses penuh hanya kepada `service_role`, yang dipakai BE. Dengan pola ini, frontend tidak terhubung langsung ke tabel dan seluruh operasi melewati fungsi BE atau koneksi backend.

## 12. Data Uji

Bagian data uji dibungkus `BEGIN ... COMMIT` agar seluruh seed bersifat atomik. Trigger user pada tabel transaksi dinonaktifkan sementara karena seed berisi tanggal historis yang sengaja tidak mengikuti aturan H+2.

Urutan data uji:

1. Insert organisasi.
2. Insert kategori.
3. Insert pengguna.
4. Insert inventaris.
5. Insert peminjaman melalui kombinasi data pengguna dan tanggal relatif.
6. Insert pengembalian.
7. Insert request PJ.
8. Insert request password.
9. Aktifkan kembali trigger.
10. Commit transaksi.

Jika salah satu query gagal, seluruh seed di-rollback dan trigger kembali ke kondisi sebelum transaksi. Token `contoh-token` hanya untuk development dan harus dihapus atau diabaikan pada production.

## 13. Contoh Alur Mekanisme

### Pengajuan peminjaman

1. FE meminta kalender melalui `fn_kalender_ketersediaan`.
2. Pengguna mengirim form ke BE.
3. BE memanggil `sp_ajukan_peminjaman`.
4. Insert menjalankan `trg_validasi_peminjaman`.
5. Barang dikunci sementara dan kuota dihitung.
6. Status disimpan sebagai `Diajukan`.
7. Audit status dicatat oleh `trg_log_status`.

### Persetujuan dan pengambilan

1. PJ memanggil `sp_proses_peminjaman(..., 'Setujui', ...)`.
2. Status berubah menjadi `Disetujui`.
3. Saat barang diserahkan, BE memanggil `sp_pengambilan_barang`.
4. Status berubah menjadi `Dipinjam`.
5. Trigger menyimpan tanggal pengambilan dan kondisi awal.

### Pengembalian dan pengajuan ulang

1. Peminjam memanggil `sp_ajukan_pengembalian`.
2. Trigger membuat status pengembalian `Menunggu` dan peminjaman menjadi `Pengembalian`.
3. PJ memanggil `sp_setujui_pengembalian` atau `sp_tolak_pengembalian`.
4. Jika ditolak, alasan tampil pada detail dan pengguna dapat memanggil fungsi yang sama untuk mengajukan ulang.
5. Jika disetujui, inventaris diperbarui dan peminjaman menjadi `Selesai`.

### Lupa password

1. Pengguna memanggil `sp_ajukan_lupa_password`.
2. PJ memproses request melalui `sp_proses_request_password`.
3. BE menerima token asli satu kali dan membuat tautan reset.
4. PJ menyimpan pesan melalui `sp_konfirmasi_request_password`.
5. Pengguna membuka tautan dan memanggil `sp_reset_password_dengan_token`.
6. Token di-hash untuk pencarian, diverifikasi masa berlaku, lalu ditandai sudah digunakan.

## 14. Catatan Operasional

- Jalankan operasi bisnis melalui stored function, bukan insert/update langsung dari FE.
- Jangan mengirim `password_hash` ke frontend.
- Gunakan view untuk daftar/detail dan fungsi proses untuk perubahan data.
- Pastikan BE memfilter organisasi sesuai hasil `fn_pastikan_pj`.
- File foto/lampiran disimpan di storage; database hanya menyimpan path.
- Jangan menonaktifkan trigger di production.
- Refresh materialized view secara berkala jika laporan dibutuhkan.
- Backup database sebelum mengubah enum, constraint, atau fungsi proses bisnis.
