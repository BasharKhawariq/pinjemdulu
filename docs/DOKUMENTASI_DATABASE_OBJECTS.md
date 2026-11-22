# Dokumentasi Objek Database PinjemDulu
## Views, Materialized Views, Triggers, Functions, & Stored Procedures

> **DBMS:** PostgreSQL 15+ / Supabase  
> **Berkas Sumber Skema:** [`BE/database/01_skema_final.sql`](../BE/database/01_skema_final.sql)  
> **Tabel Basis (3NF):** 9 tabel (`organisasi`, `pengguna`, `kategori`, `inventaris`, `peminjaman`, `pengembalian`, `request_pj`, `request_password`, `log_aktivitas`)

---

## 1. Ringkasan Kuantitatif Objek Database

| Kategori Objek | Total | Komponen / Daftar Objek |
| :--- | :---: | :--- |
| **Views** | **10** | `v_inventaris`, `v_katalog_inventaris`, `v_jadwal_peminjaman`, `v_peminjaman_detail`, `v_pengembalian_detail`, `v_request_pj_detail`, `v_request_password_detail`, `v_pengguna`, `v_dashboard_peminjam`, `v_dashboard_pj` |
| **Materialized Views** | **2** | `mv_rekap_peminjaman_bulanan`, `mv_barang_terpopuler` |
| **Triggers** | **16** | 12 trigger aturan bisnis, validasi kuota, & mesin status + 4 trigger pembaruan otomatis timestamp `updated_at` |
| **Trigger Functions** | **10** | `trg_pengguna_password_default`, `trg_set_updated_at`, `trg_validasi_peminjaman`, `trg_peminjaman_transisi`, `trg_validasi_ubah_inventaris`, `trg_validasi_pengembalian`, `trg_pengembalian_sinkron`, `trg_request_pj_validasi`, `trg_request_pj_proses`, `trg_log_status` |
| **Helper & Logic Functions** | **6** | `fn_hari_ini`, `fn_kalender_ketersediaan`, `fn_maks_unit_tersedia`, `fn_jadwal_berdekatan`, `fn_pastikan_pj`, `fn_login` |
| **Stored Procedures (`sp_*`)** | **17** | `sp_ubah_password`, `sp_ajukan_lupa_password`, `sp_proses_request_password`, `sp_konfirmasi_request_password`, `sp_reset_password_dengan_token`, `sp_tambah_pengguna`, `sp_ubah_pengguna`, `sp_set_status_akun`, `sp_hapus_inventaris`, `sp_ajukan_peminjaman`, `sp_proses_peminjaman`, `sp_pengambilan_barang`, `sp_ajukan_pengembalian`, `sp_setujui_pengembalian`, `sp_tolak_pengembalian`, `sp_ajukan_pj`, `sp_proses_request_pj` |
| **Native Procedure (`CALL`)** | **1** | `sp_refresh_laporan` |
| **TOTAL KESELURUHAN** | **62** | **Arsitektur Database Terenkapsulasi Penuh (*Database-First Integrity*)** |

---

## 2. Views (Total: 10)

Seluruh View dikonfigurasi dengan `security_invoker = true` (atau view aman default) agar hak akses baris mengikuti pengguna yang memanggilnya dan secara ketat **tidak mengekspos kolom kredensial sensitif** seperti `password_hash` atau token asli.

### 1. `v_inventaris`
- **Fungsi:** Menyajikan inventaris barang lengkap milik OKI beserta ketersediaan unit riil per hari ini (`fn_hari_ini()`). Digunakan di panel Penanggung Jawab (PJ) pada menu *Kelola Inventaris*.
- **Cara Kerja:** Melakukan `LEFT JOIN` dari tabel `inventaris i`, `kategori k`, `organisasi o`, dan subquery agregasi dari tabel `peminjaman` yang sedang aktif (`Dipinjam`, `Pengembalian`, atau `Disetujui` pada hari ini). Menghitung `unit_keluar` dan sisa `unit_tersedia = total_unit - COALESCE(unit_keluar, 0)`. Menyaring barang yang di-soft delete (`deleted_at IS NULL`).
- **Hubungan Tabel:** `inventaris`, `kategori`, `organisasi`, `peminjaman`.
- **Dampak:** Backend dan Frontend tidak perlu lagi menghitung manual ketersediaan unit harian. Menghilangkan risiko selisih data stok saat inventaris ditampilkan ke PJ.

### 2. `v_katalog_inventaris`
- **Fungsi:** Sumber data utama untuk halaman Katalog Peminjam (katalog eksplorasi barang yang siap dipinjam).
- **Cara Kerja:** Mengeksekusi `SELECT * FROM v_inventaris WHERE kondisi = 'Baik'`.
- **Hubungan Tabel:** Menginduk pada `v_inventaris` (`inventaris`, `kategori`, `organisasi`, `peminjaman`).
- **Dampak:** Memastikan barang berkondisi `Rusak` tidak akan pernah tampil di katalog peminjam. Backend tinggal menyaring `WHERE id_organisasi <> <OKI peminjam>` agar PJ tidak meminjam barang milik organisasinya sendiri.

### 3. `v_jadwal_peminjaman`
- **Fungsi:** Menampilkan blok jadwal peminjaman aktif pada halaman detail barang dan kalender publik.
- **Cara Kerja:** Mengambil baris dari `peminjaman` yang berstatus `Disetujui`, `Dipinjam`, dan `Pengembalian`. Mengabstraksi status internal `Pengembalian` menjadi label `Dipinjam` agar sederhana bagi peminjam umum.
- **Hubungan Tabel:** `peminjaman`.
- **Dampak:** Peminjam dapat melihat kapan barang tertentu sedang dipinjam orang lain tanpa membocorkan identitas pribadi atau NIM mahasiswa lain (privasi terlindungi).

### 4. `v_peminjaman_detail`
- **Fungsi:** View terpusat transaksi peminjaman (data peminjam, OKI peminjam, identitas barang, OKI pemilik barang, status logistik pengambilan, hingga alasan penolakan).
- **Cara Kerja:** Melakukan `JOIN` 6 tabel: `peminjaman p`, `pengguna u` (peminjam), `organisasi uo` (OKI peminjam), `inventaris i`, `organisasi io` (OKI pemilik), `kategori k`, serta `LEFT JOIN pengguna pj` (PJ pemroses).
- **Hubungan Tabel:** `peminjaman`, `pengguna`, `organisasi`, `inventaris`, `kategori`.
- **Dampak:** Menghilangkan kebutuhan menulis ulang query JOIN 6 tabel berulang kali di berbagai endpoint API backend. Peminjam cukup memfilter `WHERE nim_peminjam = :nim`, sedangkan PJ memfilter `WHERE id_organisasi_pemilik = :org`.

### 5. `v_pengembalian_detail`
- **Fungsi:** Menampilkan data alur pengembalian barang, kondisi fisik saat barang kembali, sanksi/denda, serta mendeteksi peminjaman yang telah melewati tenggat (*overdue/Terlambat*).
- **Cara Kerja:** Menggunakan teknik `UNION ALL`:
  1. Baris aktual dari tabel `pengembalian g` yang berelasi ke `v_peminjaman_detail`.
  2. Baris virtual dari transaksi `peminjaman` berstatus `Dipinjam` yang belum mengembalikan barang padahal `fn_hari_ini() > p.tgl_selesai` (langsung diberi status dinamis `'Terlambat'`).
- **Hubungan Tabel:** `pengembalian`, `peminjaman`, `pengguna`, `organisasi`, `inventaris`, `kategori`.
- **Dampak:** Mendeteksi keterlambatan peminjaman secara *real-time* tanpa memerlukan cron job atau worker background terpisah untuk memperbarui status database.

### 6. `v_request_pj_detail`
- **Fungsi:** Menampilkan daftar pengajuan peminjam yang ingin naik peran (*upgrade role*) menjadi Penanggung Jawab OKI.
- **Cara Kerja:** `JOIN` antara `request_pj r`, `pengguna u` (pemohon), `organisasi o`, dan `LEFT JOIN pengguna pj` (verifikator).
- **Hubungan Tabel:** `request_pj`, `pengguna`, `organisasi`.
- **Dampak:** Mempermudah verifikasi surat keputusan/lampiran SK dan rekam jejak persetujuan PJ di satu pintu data.

### 7. `v_request_password_detail`
- **Fungsi:** Menyuplai data tabel tiket lupa password pada menu PJ (*Kelola Pengguna > List Request Password*).
- **Cara Kerja:** `JOIN` tabel `request_password r`, `pengguna u`, `organisasi o`, dan `LEFT JOIN pengguna pj`. Kolom rahasia `token_hash` **dikecualikan** dari query view.
- **Hubungan Tabel:** `request_password`, `pengguna`, `organisasi`.
- **Dampak:** Melindungi kerahasiaan token hash dari lapisan presentasi dan mempermudah PJ menghubungi pemohon langsung melalui nomor WhatsApp yang tertera.

### 8. `v_pengguna`
- **Fungsi:** Menampilkan daftar pengguna pada menu *Kelola Pengguna* untuk manajemen status aktif/nonaktif dan peran.
- **Cara Kerja:** `JOIN` antara tabel `pengguna u` dan `organisasi o`, mengecualikan kolom `password_hash`.
- **Hubungan Tabel:** `pengguna`, `organisasi`.
- **Dampak:** Menghilangkan celah kebocoran hash password bcrypt ke lapisan API backend maupun frontend.

### 9. `v_dashboard_peminjam`
- **Fungsi:** Menghasilkan 4 metrik kartu status utama (Total Pengajuan, Disetujui, Ditolak, dan Perlu Dikembalikan) pada dashboard peminjam.
- **Cara Kerja:** Melakukan subquery teragregasi per `NIM` dari tabel `peminjaman`, `request_pj`, dan `pengembalian` menggunakan conditional aggregation `FILTER (WHERE ...)`.
- **Hubungan Tabel:** `pengguna`, `peminjaman`, `request_pj`, `pengembalian`.
- **Dampak:** Mengurangi beban panggilan database: dashboard peminjam cukup menjalankan 1 query `SELECT * FROM v_dashboard_peminjam WHERE nim = :nim` alih-alih 5 query terpisah.

### 10. `v_dashboard_pj`
- **Fungsi:** Menyuplai counter notifikasi ringkasan dan angka badge pada menu sidebar PJ (*badge counter*).
- **Cara Kerja:** Menghitung jumlah record berstatus `Diajukan` atau `Menunggu` per `id_organisasi` pada peminjaman, pengembalian, inventaris, request PJ, dan request password.
- **Hubungan Tabel:** `organisasi`, `v_peminjaman_detail`, `v_inventaris`, `pengembalian`, `request_pj`, `request_password`.
- **Dampak:** Sidebar navigasi PJ menjadi reaktif dan memuat badge counter secara instan dalam satu query ringan.

---

## 3. Materialized Views (Total: 2)

Materialized View menyimpan hasil kalkulasi query agregat berat langsung ke dalam disk fisik PostgreSQL, sehingga query analitik tidak membebani transaksi operasional (*OLTP*).

### 1. `mv_rekap_peminjaman_bulanan`
- **Fungsi:** Menyajikan rekapitulasi data manajerial peminjaman per bulan per OKI (total pengajuan, total disetujui, total ditolak, total unit dipinjam, dan total keterlambatan).
- **Cara Kerja:** Mengelompokkan riwayat peminjaman berdasarkan bulan (`date_trunc('month', p.tanggal_pengajuan)`) dan organisasi pemilik barang menggunakan agregasi kondisional `COUNT(*) FILTER (...)`. Dilengkapi indeks unik `uq_mv_rekap ON (id_organisasi_pemilik, bulan)`.
- **Hubungan Tabel:** `peminjaman`, `inventaris`, `organisasi`, `pengembalian`.
- **Dampak:** Laporan bulanan dapat dibuka dalam waktu < 5 ms tanpa melakukan *full table scan* terhadap ribuan baris riwayat peminjaman.

### 2. `mv_barang_terpopuler`
- **Fungsi:** Menentukan peringkat (*ranking*) inventaris yang paling diminati per organisasi pemilik untuk analisis utilisasi aset OKI.
- **Cara Kerja:** Menghitung frekuensi peminjaman dan total unit terpakai dengan window function `RANK() OVER (PARTITION BY i.id_organisasi ORDER BY COUNT(p.id_peminjaman) DESC)`. Dilengkapi indeks unik `uq_mv_populer ON (id_inventaris)`.
- **Hubungan Tabel:** `inventaris`, `kategori`, `peminjaman`.
- **Dampak:** Menghindari kalkulasi sorting/agregasi peringkat yang berat secara live saat admin/PJ membuka halaman analitik.

---

## 4. Triggers (Total: 16) & Trigger Functions (Total: 10)

Trigger di PinjemDulu berfungsi sebagai **benteng pertahanan integritas bisnis tingkat pertama (*database-enforced rules*)**, memastikan data tetap valid meskipun terjadi kesalahan dari kode API atau interaksi langsung.

| No | Nama Trigger | Event / Waktu | Tabel Target | Trigger Function | Cara Kerja & Dampak |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | `trg_pengguna_password` | `BEFORE INSERT` | `pengguna` | `trg_pengguna_password_default()` | Jika `password_hash` tidak diisi, otomatis meng-generate hash bcrypt dari NIM (`crypt(NEW.nim, gen_salt('bf', 10))`). Menjamin tidak ada akun tanpa password. |
| **2** | `trg_pengguna_updated` | `BEFORE UPDATE` | `pengguna` | `trg_set_updated_at()` | Memperbarui kolom `updated_at = now()`. |
| **3** | `trg_inventaris_updated` | `BEFORE UPDATE` | `inventaris` | `trg_set_updated_at()` | Memperbarui kolom `updated_at = now()`. |
| **4** | `trg_peminjaman_updated` | `BEFORE UPDATE` | `peminjaman` | `trg_set_updated_at()` | Memperbarui kolom `updated_at = now()`. |
| **5** | `trg_pengembalian_updated` | `BEFORE UPDATE` | `pengembalian` | `trg_set_updated_at()` | Memperbarui kolom `updated_at = now()`. |
| **6** | `trg_peminjaman_validasi` | `BEFORE INSERT` | `peminjaman` | `trg_validasi_peminjaman()` | **Validasi Kuota & Tanggal:** (a) tgl selesai >= mulai, (b) tgl mulai >= hari ini, (c) maks rentang 14 hari, (d) barang tidak boleh rusak, (e) PJ tidak boleh meminjam barang OKI sendiri, (f) kuota unit tersedia di setiap hari rentang pinjam. Menghilangkan bug *overbooking*. |
| **7** | `trg_peminjaman_transisi` | `BEFORE UPDATE OF status` | `peminjaman` | `trg_peminjaman_transisi()` | **Finite State Machine:** Memastikan alur status sah (`Diajukan -> Disetujui/Ditolak`, `Disetujui -> Dipinjam/Ditolak`, `Dipinjam -> Pengembalian/Selesai`). Menyimpan kondisi awal saat barang diambil. |
| **8** | `trg_inventaris_total` | `BEFORE UPDATE OF total_unit` | `inventaris` | `trg_validasi_ubah_inventaris()` | Mencegah PJ menurunkan jumlah unit inventaris ke angka di bawah kuota barang yang sudah terlanjur disetujui untuk dipinjam di masa mendatang. |
| **9** | `trg_pengembalian_validasi`| `BEFORE INSERT` | `pengembalian` | `trg_validasi_pengembalian()` | Memastikan pengembalian barang hanya bisa diajukan jika transaksi peminjaman terkait berstatus `Dipinjam`. |
| **10**| `trg_pengembalian_sinkron` | `AFTER INSERT OR UPDATE OF status` | `pengembalian` | `trg_pengembalian_sinkron()` | **Sinkronisasi Lintas Tabel:** Saat pengembalian diajukan (`Menunggu`), status peminjaman otomatis menjadi `Pengembalian`. Saat disetujui (`Dikembalikan`), peminjaman menjadi `Selesai` dan kondisi barang diupdate (jika rusak). Jika ditolak, kembali ke `Dipinjam`. |
| **11**| `trg_request_pj_validasi` | `BEFORE INSERT` | `request_pj` | `trg_request_pj_validasi()` | Memastikan hanya akun `Peminjam` aktif yang bisa mengajukan permohonan PJ dan tidak ada pengajuan ganda yang masih `Menunggu`. |
| **12**| `trg_request_pj_proses` | `BEFORE UPDATE OF status` | `request_pj` | `trg_request_pj_proses()` | Saat pengajuan PJ disetujui, trigger otomatis mengeksekusi `UPDATE pengguna SET role = 'Penanggung Jawab'`. Role naik secara instan dan atomik. |
| **13**| `trg_log_peminjaman` | `AFTER INSERT OR UPDATE OF status` | `peminjaman` | `trg_log_status('id_peminjaman')` | Mencatat audit trail perpindahan status peminjaman ke tabel `log_aktivitas`. |
| **14**| `trg_log_pengembalian` | `AFTER INSERT OR UPDATE OF status` | `pengembalian` | `trg_log_status('id_pengembalian')` | Mencatat audit trail perpindahan status pengembalian ke tabel `log_aktivitas`. |
| **15**| `trg_log_request_pj` | `AFTER INSERT OR UPDATE OF status` | `request_pj` | `trg_log_status('id_request')` | Mencatat audit trail verifikasi pengajuan PJ ke tabel `log_aktivitas`. |
| **16**| `trg_log_request_pass` | `AFTER INSERT OR UPDATE OF status` | `request_password` | `trg_log_status('id_request_password')` | Mencatat audit trail permohonan reset password ke tabel `log_aktivitas`. |

---

## 5. Functions & Stored Procedures (Total: 34)

Semua proses bisnis dibungkus ke dalam fungsi/stored procedure di basis data untuk menjamin keamanan ACID dan kompatibilitas panggilan API backend (`SELECT sp_xxx(...)` / RPC).

### A. Helper & Query Logic Functions (6 Fungsi)

1. **`fn_hari_ini() -> date`**
   - *Fungsi:* Mengembalikan tanggal hari ini berdasarkan zona waktu Indonesia Barat (`Asia/Jakarta`).
   - *Hubungan:* Digunakan di seluruh fungsi, trigger, dan view.
   - *Dampak:* Menjamin konsistensi tanggal operasional kampus tanpa terpengaruh perbedaan zona waktu server (misal UTC).
2. **`fn_kalender_ketersediaan(p_id_inventaris, p_dari, p_sampai, p_kecuali) -> TABLE`**
   - *Fungsi:* Menghasilkan deret tanggal kalender (`generate_series`) berisi status ketersediaan harian barang (`Tersedia`, `Terbatas`, `Habis`).
   - *Hubungan:* `inventaris`, `peminjaman`.
   - *Dampak:* Menggerakkan kalender visual interaktif di Frontend.
3. **`fn_maks_unit_tersedia(p_id_inventaris, p_mulai, p_selesai) -> integer`**
   - *Fungsi:* Menghitung kapasitas unit terendah yang masih bebas dipinjam di setiap hari dalam suatu rentang tanggal.
   - *Hubungan:* `inventaris`, `peminjaman`.
   - *Dampak:* Menjadi parameter penentu persetujuan pinjaman pada form pengajuan peminjam.
4. **`fn_jadwal_berdekatan(p_id_inventaris, p_mulai, p_selesai) -> TABLE`**
   - *Fungsi:* Menampilkan daftar jadwal peminjaman lain yang berada di sekitar atau beririsan dengan tanggal yang dipilih.
   - *Hubungan:* `peminjaman`.
5. **`fn_pastikan_pj(p_nim, p_id_organisasi) -> void`**
   - *Fungsi:* Guard otorisasi internal database. Memastikan pengguna ber-role `Penanggung Jawab`, akun aktif, dan berwenang atas ID organisasi target.
   - *Hubungan:* `pengguna`.
   - *Dampak:* Mencegah akses lintas organisasi (*cross-tenant privilege escalation*).
6. **`fn_login(p_nim, p_password) -> TABLE`**
   - *Fungsi:* Memverifikasi autentikasi kredensial login menggunakan fungsi `crypt()` bcrypt.
   - *Hubungan:* `pengguna`, `organisasi`.
   - *Dampak:* Hash password tidak perlu dikirim keluar dari basis data.

---

### B. Business Stored Procedures (17 Fungsi `sp_*` + 1 `CALL`)

#### Kelompok Autentikasi & Reset Password
- **`sp_ubah_password(p_nim, p_password_lama, p_password_baru)`**  
  *Fungsi:* Mengganti password pengguna dari menu profil. Memverifikasi password lama, meng-hash password baru, dan **otomatis membatalkan seluruh token reset password yang belum terpakai**.
- **`sp_ajukan_lupa_password(p_nim, p_no_whatsapp) -> integer`**  
  *Fungsi:* Peminjam mengajukan tiket lupa password. Memvalidasi kecocokan nomor WhatsApp terdaftar, membatalkan token lama, dan memperbarui nomor jika sebelumnya kosong.
- **`sp_proses_request_password(p_id_request, p_pj_nim) -> text`**  
  *Fungsi:* PJ menyetujui tiket lupa password. Menghasilkan token acak 64-karakter hex (SHA-256), **menetapkan masa kedaluwarsa 7 hari**, menginvalidadasikan token lama milik pemohon, dan mengembalikan token plaintext satu kali untuk dikirimkan PJ via WhatsApp.
- **`sp_konfirmasi_request_password(p_id_request, p_pj_nim, p_pesan)`**  
  *Fungsi:* Menyimpan salinan teks pesan WhatsApp dan menandai konfirmasi pengiriman oleh PJ.
- **`sp_reset_password_dengan_token(p_token, p_password_baru)`**  
  *Fungsi:* Memverifikasi keabsahan token (hash cocok, belum kedaluwarsa 7 hari, dan belum pernah dipakai). Mengubah password pengguna dan seketika membakar token tersebut (`token_dipakai_pada = now()`).

#### Kelompok Kelola Pengguna
- **`sp_tambah_pengguna(p_pj_nim, p_nim, p_nama, p_id_organisasi, p_role, p_no_whatsapp) -> varchar`**  
  *Fungsi:* PJ mendaftarkan akun mahasiswa baru ke dalam organisasi miliknya.
- **`sp_ubah_pengguna(p_pj_nim, p_nim_lama, p_nim_baru, p_nama, p_id_organisasi, p_role, p_no_whatsapp)`**  
  *Fungsi:* Memperbarui identitas pengguna (NIM, Nama, Role, WhatsApp) dengan pengamanan validasi organisasi.
- **`sp_set_status_akun(p_pj_nim, p_nim, p_aktif)`**  
  *Fungsi:* Menonaktifkan atau mengaktifkan akun pengguna. Memblokir PJ menonaktifkan akunnya sendiri.

#### Kelompok Inventaris
- **`sp_hapus_inventaris(p_id_inventaris, p_pj_nim)`**  
  *Fungsi:* Menjalankan soft-delete (`deleted_at = now()`) pada barang inventaris jika tidak sedang memiliki transaksi pinjaman aktif.

#### Kelompok Peminjaman
- **`sp_ajukan_peminjaman(p_nim, p_id_inventaris, p_jumlah, p_tgl_mulai, p_tgl_selesai, p_keperluan) -> integer`**  
  *Fungsi:* Peminjam membuat permohonan pinjam baru. Memicu trigger validasi kuota dan aturan tanggal.
- **`sp_proses_peminjaman(p_id_peminjaman, p_pj_nim, p_aksi, p_alasan)`**  
  *Fungsi:* PJ menyetujui (`Disetujui`) atau menolak (`Ditolak`) pengajuan peminjaman barang.
- **`sp_pengambilan_barang(p_id_peminjaman, p_pj_nim, p_tanggal, p_foto_path)`**  
  *Fungsi:* Memproses serah terima fisik barang. Mengubah status peminjaman menjadi `Dipinjam`, mencatat tanggal pengambilan, dan mengunggah foto bukti serah terima.

#### Kelompok Pengembalian
- **`sp_ajukan_pengembalian(p_id_peminjaman, p_nim) -> integer`**  
  *Fungsi:* Peminjam mengabarkan barang siap dikembalikan (atau mengajukan ulang jika penolakan pengembalian sudah diperbaiki).
- **`sp_setujui_pengembalian(p_id_pengembalian, p_pj_nim, p_jumlah, p_tanggal, p_kondisi, p_foto_path, p_sanksi)`**  
  *Fungsi:* PJ memverifikasi fisik barang kembali, mencatat kondisi barang (`Baik`/`Rusak`), bukti foto, dan sanksi denda (bila ada). Otomatis menyelesaikan transaksi via trigger.
- **`sp_tolak_pengembalian(p_id_pengembalian, p_pj_nim, p_alasan)`**  
  *Fungsi:* PJ menolak pengembalian (misal unit fisik kurang atau aksesoris tertinggal) dengan catatan alasan wajib.

#### Kelompok Promosi Role PJ
- **`sp_ajukan_pj(p_nim, p_lampiran_path) -> integer`**  
  *Fungsi:* Peminjam mengunggah berkas SK untuk mendaftar menjadi Penanggung Jawab.
- **`sp_proses_request_pj(p_id_request, p_pj_nim, p_aksi, p_alasan)`**  
  *Fungsi:* PJ memverifikasi permohonan; jika disetujui, trigger otomatis menaikkan role pemohon.

#### Kelompok Laporan & Pemeliharaan
- **`sp_refresh_laporan()` (Native Procedure: `CALL sp_refresh_laporan()`)**  
  *Fungsi:* Menjalankan perintah `REFRESH MATERIALIZED VIEW CONCURRENTLY` pada `mv_rekap_peminjaman_bulanan` dan `mv_barang_terpopuler`. Dijadwalkan otomatis setiap 30 menit melalui `pg_cron` atau dipanggil manual melalui endpoint `/api/laporan/refresh`.

---

## 6. Dampak Sistemik Terhadap Arsitektur Aplikasi PinjemDulu

1. **Jaminan Integritas Data Tanpa Celah (*Zero Business-Logic Bypass*):**  
   Aturan penting seperti benturan kuota harian, rentang maksimal 14 hari, pelarangan peminjaman barang rusak, dan transisi status tidak hanya diperiksa di antarmuka web, melainkan dijamin mutlak oleh Trigger dan Stored Procedure basis data.
2. **Keamanan & Pencegahan Kebocoran Kredensial:**  
   Penggunaan *Views* membatasi paparan field sensitif (`password_hash`, `token_hash`). Hash token SHA-256 dan password bcrypt diproses sepenuhnya di dalam fungsi database.
3. **Pemberian Hak Akses & Isolasi Organisasi Multi-Tenant:**  
   Setiap stored procedure PJ diproteksi oleh `fn_pastikan_pj()`. Seorang PJ dari HMTI tidak akan pernah bisa memodifikasi inventaris, menyetujui peminjaman, atau mengubah status pengguna milik HIMASISFO.
4. **Performa Agregasi & Efisiensi Beban I/O:**  
   Pemisahan beban operasional (OLTP) dengan beban analitik (OLAP) menggunakan *Materialized Views* menjamin dashboard laporan manajerial terbuka instan tanpa memperlambat transaksi peminjaman aktif.
5. **Audit Trail Otomatis (*Traceability*):**  
   Setiap pergeseran siklus hidup transaksi tercatat otomatis ke `log_aktivitas` oleh trigger generik, memudahkan investigasi jika terjadi sengketa fisik barang antar-mahasiswa.
