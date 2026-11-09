# Dokumentasi Fungsi Query Database --- PinjemDulu

> **Tujuan:** referensi teknis bagi developer dan coding agent untuk
> memahami fungsi query SQL, mekanisme kerjanya, tujuan penggunaannya,
> dan pemetaan ke modul aplikasi.
>
> **Sumber acuan:** `01_skema_final.sql`, `02_pengujian.sql`, User Story
> PinjemDulu, dan `database-sql-guide.md`.
>
> **Aturan utama:** dokumen ini adalah peta penjelasan. Untuk nama
> objek, kolom, parameter, tipe data, return value, status, dan hak
> akses yang tepat, selalu periksa SQL final. Jangan menebak atau
> membuat objek baru jika objek yang sesuai sudah tersedia.

------------------------------------------------------------------------

## 1. Gambaran umum

PinjemDulu merupakan aplikasi pengelolaan peminjaman inventaris
antar-OKI. Pengajuan dilakukan melalui aplikasi, sedangkan pengambilan
dan pengembalian barang dilakukan secara fisik.

Database bertanggung jawab untuk: - Menyimpan data organisasi, pengguna,
kategori, inventaris, transaksi, dan permintaan. - Menjaga integritas
data melalui constraint. - Menjalankan validasi aturan bisnis. -
Mengatur perubahan status dan sinkronisasi antar-tabel. - Menyediakan
data siap tampil melalui view. - Mempercepat pencarian melalui index. -
Menyediakan rekap laporan melalui materialized view. - Membatasi akses
data melalui privilege dan Row Level Security (RLS).

### 1.1 Arsitektur pemakaian query

  ----------------------------------------------------------------------------
  Lapisan                 Tanggung jawab          Pola
  ----------------------- ----------------------- ----------------------------
  Frontend (FE)           Menampilkan form,       Memanggil endpoint BE; tidak
                          tabel, kalender,        menjalankan query langsung
                          dashboard, detail, dan  ke tabel.
                          status.                 

  Backend (BE)            Menerima aksi,          `SELECT` dari view atau
                          memanggil fungsi        `SELECT nama_fungsi(...)`.
                          database, dan mengatur  
                          data sesuai             
                          pengguna/organisasi.    

  PostgreSQL / Supabase   Menyimpan data dan      Tabel, constraint, function,
                          menegakkan aturan       trigger, view, index,
                          final.                  materialized view, RLS.
  ----------------------------------------------------------------------------

Validasi di FE berguna untuk pengalaman pengguna, tetapi validasi final
tetap harus ditegakkan di database. BE menjadi perantara FE dan
database.

------------------------------------------------------------------------

## 2. Pemetaan modul aplikasi

  -----------------------------------------------------------------------------------
  Modul / bagian          Kebutuhan aplikasi      Objek SQL terkait
  ----------------------- ----------------------- -----------------------------------
  Login                   Memvalidasi             `fn_login`, `pengguna`, `pgcrypto`.
                          NIM/password, status    
                          akun, dan role.         

  Dashboard Peminjam      Ringkasan transaksi dan `v_dashboard_peminjam`,
                          peminjaman terbaru.     `v_peminjaman_detail`.

  Dashboard PJ            Ringkasan pengajuan     `v_dashboard_pj`.
                          masuk, peminjaman       
                          aktif, pengembalian     
                          menunggu, request       
                          password, badge.        

  Inventaris --- Katalog  Daftar barang OKI lain, `v_katalog_inventaris`,
                          pencarian, filter       `v_inventaris`, index
                          kategori, pagination.   inventaris/kategori.

  Inventaris --- Detail   Informasi barang,       `v_inventaris`,
  Barang                  pemilik, kondisi, stok  `v_jadwal_peminjaman`.
                          tersedia, jadwal.       

  Inventaris --- Kalender Ketersediaan per        `fn_kalender_ketersediaan`,
                          tanggal dan batas       `fn_maks_unit_tersedia`,
                          jumlah unit.            `fn_jadwal_berdekatan`.

  Pengajuan Saya ---      Tab/status peminjaman   `v_peminjaman_detail`,
  Peminjaman              dan detail transaksi.   `sp_ajukan_peminjaman`, trigger
                                                  validasi/transisi.

  Pengajuan Saya ---      Status pengembalian,    `v_pengembalian_detail`,
  Pengembalian            detail, pengajuan       `sp_ajukan_pengembalian`,
                          ulang.                  `sp_setujui_pengembalian`,
                                                  `sp_tolak_pengembalian`.

  Pengajuan PJ (Peminjam) Mengajukan kenaikan     `sp_ajukan_pj`,
                          role menjadi PJ dan     `v_request_pj_detail`, trigger
                          memantau status.        request PJ.

  List Pengajuan PJ (PJ)  Melihat dan memproses   `v_request_pj_detail`,
                          permohonan menjadi PJ.  `sp_proses_request_pj`.

  Kelola Inventaris (PJ)  Tambah, ubah, dan hapus `sp_tambah_inventaris`,
                          inventaris.             `sp_ubah_inventaris`,
                                                  `sp_hapus_inventaris`, trigger
                                                  validasi, `v_inventaris`.

  Kelola Pengguna (PJ)    Mengelola pengguna      `sp_tambah_pengguna`,
                          dalam OKI PJ.           `sp_ubah_pengguna`,
                                                  `sp_set_status_akun`, `v_pengguna`.

  Lupa Password           Mengajukan request,     `sp_ajukan_lupa_password`,
                          memproses request,      `sp_proses_request_password`,
                          membuat token, reset    `sp_konfirmasi_request_password`,
                          password.               `sp_reset_password_dengan_token`,
                                                  `v_request_password_detail`.

  Profil                  Menampilkan dan         `pengguna`, `v_pengguna`, fungsi
                          memperbarui data akun   perubahan terkait.
                          yang diizinkan.         

  Audit internal          Menelusuri perubahan    `log_aktivitas`, `trg_log_status`,
                          status                  `idx_log_record`.
                          transaksi/request.      
  -----------------------------------------------------------------------------------

> User Story menyebut riwayat transaksi pada Pengajuan Saya, tetapi
> tidak menetapkan halaman khusus bernama Log Aktivitas. `log_aktivitas`
> adalah fasilitas audit internal BE/administrator, bukan menu UI wajib.

------------------------------------------------------------------------

## 3. Struktur database

### 3.1 Ekstensi dan ENUM

  ---------------------------------------------------------------------------
  Objek                       Fungsi                  Modul
  --------------------------- ----------------------- -----------------------
  `pgcrypto`                  Menyediakan fungsi      Login, ubah password,
                              kriptografi seperti     lupa password.
                              `crypt`, `gen_salt`,    
                              `gen_random_bytes`, dan 
                              `digest`; digunakan     
                              untuk hash              
                              password/token.         

  `role_pengguna`             Membatasi role menjadi  Login dan otorisasi
                              Peminjam atau           seluruh modul.
                              Penanggung Jawab.       

  `kondisi_barang`            Membatasi nilai kondisi Katalog, detail
                              barang.                 inventaris,
                                                      pengembalian.

  `status_peminjaman`         Membatasi status        Dashboard, Pengajuan
                              transaksi peminjaman    Saya, proses PJ.
                              sesuai definisi SQL.    

  `status_pengembalian`       Membatasi status        Pengajuan Saya dan
                              pengembalian. Status    proses pengembalian PJ.
                              Terlambat dapat         
                              dihitung oleh view,     
                              bukan disimpan sebagai  
                              ENUM.                   

  `status_request_pj`         Membatasi status        Pengajuan PJ dan List
                              permohonan PJ.          Pengajuan PJ.

  `status_request_password`   Membatasi status        Lupa Password dan panel
                              permintaan reset        PJ.
                              password.               
  ---------------------------------------------------------------------------

Gunakan nilai ENUM persis seperti di `01_skema_final.sql`. Jangan
menambahkan status tanpa memperbarui skema, fungsi, trigger, pengujian,
dan UI terkait.

### 3.2 Tabel utama

  -----------------------------------------------------------------------
  Tabel                   Data                    Modul pemakai
  ----------------------- ----------------------- -----------------------
  `organisasi`            Master OKI/organisasi,  Katalog, dashboard,
                          singkatan, logo, icon.  inventaris, profil.

  `pengguna`              NIM, organisasi, nama,  Login, profil, kelola
                          password hash, role,    pengguna, transaksi.
                          status akun.            

  `kategori`              Master kategori         Katalog, filter, kelola
                          inventaris.             inventaris.

  `inventaris`            Barang, pemilik OKI,    Katalog, detail,
                          kategori, jumlah unit,  kalender, kelola
                          kondisi, foto, soft     inventaris.
                          delete.                 

  `peminjaman`            Pengajuan, periode,     Peminjaman, dashboard,
                          jumlah, status,         jadwal, pengembalian.
                          pengambilan, pemroses,  
                          alasan penolakan.       

  `pengembalian`          Pengajuan pengembalian, Pengembalian dan proses
                          kondisi/jumlah saat     PJ.
                          kembali, foto, sanksi,  
                          status, pemroses.       

  `request_pj`            Permintaan kenaikan     Pengajuan PJ dan List
                          role beserta lampiran   Pengajuan PJ.
                          dan hasil proses.       

  `request_password`      Permintaan reset        Lupa Password dan panel
                          password, nomor         PJ.
                          WhatsApp, hash token,   
                          kedaluwarsa, pemroses.  

  `log_aktivitas`         Jejak perubahan status  Audit internal.
                          dari tabel              
                          transaksi/request yang  
                          dipasangi trigger log.  
  -----------------------------------------------------------------------

### 3.3 Constraint

Constraint menjaga integritas data: - `PRIMARY KEY`: identitas unik
record. - `FOREIGN KEY`: menjaga relasi antar-tabel. - `UNIQUE`:
mencegah nilai tertentu duplikat, misalnya NIM. - `NOT NULL`: memastikan
kolom wajib terisi. - `CHECK`: membatasi nilai, misalnya jumlah positif
atau tanggal valid.

Aturan bisnis yang diterapkan melalui constraint/function/trigger antara
lain jumlah pinjam positif, tanggal valid, ketentuan minimal H+2, alasan
penolakan, dan kelengkapan data pemeriksaan pengembalian. Periksa SQL
untuk mengetahui aturan spesifik ditempatkan pada objek yang mana.

### 3.4 Index

Index mempercepat pencarian dan penyaringan; tidak mengubah aturan
bisnis atau hasil logis query.

  -----------------------------------------------------------------------
  Index                               Kegunaan / modul
  ----------------------------------- -----------------------------------
  `idx_pengguna_org`                  Pencarian pengguna berdasarkan
                                      organisasi; Kelola Pengguna.

  `idx_inventaris_org_aktif`          Inventaris aktif per OKI;
                                      Katalog/Kelola Inventaris.

  `idx_inventaris_kategori`           Filter kategori inventaris.

  `idx_peminjaman_nim_status`         Daftar transaksi per NIM dan
                                      status; Pengajuan Saya.

  `idx_peminjaman_inventaris`         Transaksi per barang; jadwal
                                      inventaris.

  `idx_peminjaman_kuota`              Transaksi yang memengaruhi kuota;
                                      kalender.

  `idx_request_pj_nim`                Request PJ per pemohon.

  `idx_request_password_nim`          Request password per pengguna.

  `idx_log_record`                    Log berdasarkan tabel dan ID
                                      record.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 4. Fungsi pembantu dan kalender

  -------------------------------------------------------------------------------------------------------
  Fungsi                                                  Mekanisme               Penerapan
  ------------------------------------------------------- ----------------------- -----------------------
  `fn_hari_ini()`                                         Mengambil tanggal saat  Default tanggal dan
                                                          ini berdasarkan zona    validasi pengajuan.
                                                          waktu Asia/Jakarta.     

  `trg_set_updated_at()`                                  Mengisi `updated_at`    Update pengguna,
                                                          sebelum record          inventaris, peminjaman,
                                                          diperbarui.             pengembalian.

  `fn_kalender_ketersediaan(id, dari, sampai, kecuali)`   Membentuk deret         Detail Barang →
                                                          tanggal, menggabungkan  Kalender Pengajuan.
                                                          jadwal aktif,           
                                                          menghitung unit         
                                                          terpakai dan sisa per   
                                                          tanggal.                

  `fn_maks_unit_tersedia(id, mulai, selesai)`             Menghitung batas jumlah Form Ajukan Peminjaman
                                                          unit aman untuk rentang → Jumlah Unit.
                                                          tanggal berdasarkan     
                                                          ketersediaan harian.    

  `fn_jadwal_berdekatan(id, mulai, selesai)`              Memeriksa jadwal aktif  Peringatan jadwal pada
                                                          yang                    form pengajuan.
                                                          beririsan/berdekatan    
                                                          dengan tanggal pilihan. 

  `fn_pastikan_pj(nim, organisasi opsional)`              Memastikan aktor aktif  Otorisasi operasi
                                                          dan ber-role PJ; bila   khusus PJ.
                                                          organisasi disertakan,  
                                                          memastikan kewenangan   
                                                          OKI.                    
  -------------------------------------------------------------------------------------------------------

### 4.1 Alur kalender

1.  FE meminta kalender melalui BE dengan ID inventaris dan rentang
    tanggal.
2.  BE memanggil `fn_kalender_ketersediaan(...)`.
3.  Fungsi menghitung pemakaian unit per tanggal.
4.  FE menampilkan status tanggal dan sisa unit.
5.  BE dapat memanggil `fn_maks_unit_tersedia(...)` untuk menentukan
    batas jumlah unit.
6.  Saat pengajuan disimpan, trigger memvalidasi ulang kuota di
    database.

Kalender FE membantu pengguna memilih tanggal. Validasi final harus
tetap dilakukan ketika transaksi disimpan agar pengajuan bersamaan tidak
menyebabkan over-booking.

------------------------------------------------------------------------

## 5. VIEW --- penyedia data tampilan aplikasi

VIEW adalah query tersimpan yang menyajikan data dari satu atau beberapa
tabel. View membantu BE mengambil data gabungan/terolah tanpa mengulang
JOIN kompleks di setiap endpoint.

  -----------------------------------------------------------------------------
  View                          Data yang disediakan    Modul
  ----------------------------- ----------------------- -----------------------
  `v_inventaris`                Inventaris digabung     Kelola Inventaris dan
                                kategori dan            detail/list barang.
                                organisasi, termasuk    
                                informasi unit/kondisi  
                                yang dihitung.          

  `v_katalog_inventaris`        Data katalog sesuai     Inventaris → Katalog
                                aturan katalog,         Peminjam.
                                termasuk penyaringan    
                                kondisi barang.         

  `v_jadwal_peminjaman`         Jadwal peminjaman aktif Detail Barang → Jadwal
                                per barang.             Peminjaman.

  `v_peminjaman_detail`         Detail peminjaman       Dashboard Peminjam,
                                digabung peminjam,      Pengajuan Saya, daftar
                                organisasi, barang, dan PJ.
                                PJ pemroses.            

  `v_pengembalian_detail`       Detail pengembalian     Dashboard, Pengajuan
                                digabung peminjaman;    Saya, Kelola
                                dapat menyajikan status Pengembalian PJ.
                                virtual Terlambat       
                                sesuai aturan view.     

  `v_request_pj_detail`         Detail request PJ,      Pengajuan PJ dan List
                                pemohon, organisasi,    Pengajuan PJ.
                                pemroses, lampiran,     
                                alasan.                 

  `v_request_password_detail`   Detail permintaan lupa  Panel request password
                                password dan status     PJ.
                                proses.                 

  `v_pengguna`                  Data pengguna dan       Kelola Pengguna dan
                                organisasi tanpa        kebutuhan profil.
                                mengekspos password     
                                hash.                   

  `v_dashboard_peminjam`        Agregasi ringkasan      Dashboard Peminjam.
                                transaksi milik         
                                peminjam.               

  `v_dashboard_pj`              Ringkasan               Dashboard PJ dan badge.
                                aktivitas/transaksi     
                                organisasi PJ.          
  -----------------------------------------------------------------------------

### 5.1 Pola query pembacaan

  ---------------------------------------------------------------------------------------------------
  Pola                                                Fungsi                  Modul
  --------------------------------------------------- ----------------------- -----------------------
  `SELECT ... FROM v_katalog_inventaris WHERE ...`    Mengambil barang dengan Katalog.
                                                      pencarian/filter.       

  `ORDER BY ... LIMIT ... OFFSET ...`                 Mengurutkan dan         Katalog dan daftar
                                                      pagination.             transaksi.

  `SELECT * FROM fn_kalender_ketersediaan(...)`       Mengambil ketersediaan  Kalender barang.
                                                      per tanggal.            

  `SELECT ... FROM v_dashboard_peminjam WHERE ...`    Mengambil ringkasan     Dashboard Peminjam.
                                                      peminjam.               

  `SELECT ... FROM v_peminjaman_detail ... LIMIT 4`   Mengambil transaksi     Dashboard Peminjam.
                                                      terbaru.                

  `SELECT ... FROM v_dashboard_pj WHERE ...`          Mengambil ringkasan     Dashboard PJ.
                                                      organisasi PJ.          

  `SELECT ... FROM v_pengembalian_detail ...`         Mengambil daftar        Kelola Pengembalian PJ.
                                                      pengembalian.           

  `GROUP BY` dan `HAVING`                             Mengelompokkan dan      Laporan/analisis.
                                                      menyaring hasil         
                                                      agregasi.               

  Subquery seperti `NOT IN`                           Menyaring data          Analisis
                                                      berdasarkan hasil query inventaris/transaksi.
                                                      lain.                   
  ---------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 6. TRIGGER --- validasi dan otomasi

Trigger dijalankan otomatis ketika operasi tertentu terjadi, misalnya
`INSERT` atau `UPDATE`. Tujuannya memastikan aturan bisnis tetap berlaku
meskipun perubahan berasal dari endpoint BE yang berbeda.

  -----------------------------------------------------------------------
  Trigger / fungsi        Mekanisme               Modul / manfaat
  trigger                                         
  ----------------------- ----------------------- -----------------------
  Trigger password        Sebelum `INSERT`        Kelola Pengguna PJ.
  default pengguna        pengguna; menyiapkan    
                          password default dalam  
                          bentuk hash jika aturan 
                          skema mengharuskannya.  

  Trigger `updated_at`    Sebelum `UPDATE`;       Lintas modul.
                          memperbarui waktu       
                          perubahan terakhir.     

  Trigger validasi        Sebelum `INSERT`;       Form Ajukan Peminjaman.
  peminjaman              memvalidasi akun,       
                          barang, kondisi,        
                          organisasi, tanggal,    
                          dan kuota.              

  Trigger transisi        Sebelum perubahan       Pengajuan Saya dan
  peminjaman              status; membatasi       proses PJ.
                          perpindahan status dan  
                          mengisi data            
                          pengambilan sesuai      
                          alur.                   

  Trigger validasi        Sebelum perubahan       Kelola Inventaris PJ.
  perubahan inventaris    jumlah unit; mencegah   
                          stok diturunkan di      
                          bawah unit terpakai.    

  Trigger validasi        Sebelum `INSERT`;       Ajukan Pengembalian.
  pengembalian            memastikan transaksi    
                          memenuhi syarat dan     
                          status awal sesuai      
                          aturan.                 

  Trigger sinkronisasi    Setelah perubahan       Pengajuan Saya dan
  pengembalian            pengembalian;           Kelola Pengembalian PJ.
                          menyinkronkan status    
                          peminjaman dan kondisi  
                          inventaris.             

  Trigger validasi        Sebelum `INSERT`;       Pengajuan PJ.
  request PJ              memeriksa kelayakan     
                          pemohon.                

  Trigger proses request  Sebelum perubahan       List Pengajuan PJ.
  PJ                      status; mengisi         
                          informasi proses dan    
                          memperbarui role jika   
                          disetujui.              

  `trg_log_status`        Setelah `INSERT` atau   Audit internal.
                          perubahan status;       
                          menulis jejak status ke 
                          `log_aktivitas`.        
  -----------------------------------------------------------------------

Nama trigger aktual dapat berbeda dari label deskriptif di tabel ini.
Gunakan definisi `CREATE TRIGGER` dalam SQL final sebagai rujukan nama
dan tabel yang tepat.

### 6.1 Audit trail: `log_aktivitas`

`log_aktivitas` adalah catatan internal perubahan status, bukan rekaman
semua aktivitas pengguna.

Mekanisme: 1. Record baru dibuat pada tabel yang dipasangi trigger log.
2. Trigger mengambil identitas record dan status awal. 3.
`trg_log_status` menulis informasi ke `log_aktivitas`. 4. Ketika status
berubah, trigger menulis status lama dan status baru. 5. UPDATE yang
tidak mengubah status tidak menghasilkan catatan perubahan status.

Informasi log mencakup `id_log`, `tabel`, `id_record`, `status_lama`,
`status_baru`, `oleh`, dan `waktu`.

Audit status dipasang pada tabel `peminjaman`, `pengembalian`,
`request_pj`, dan `request_password` sesuai definisi skema.

**Tujuan:** menelusuri perubahan status dan waktu, membantu pemeriksaan
sengketa transaksi, audit internal, dan troubleshooting.

**Lokasi:** backend/internal administrator. User Story saat ini tidak
mensyaratkan halaman khusus Log Aktivitas. Riwayat transaksi pada
Pengajuan Saya tetap dibaca dari view transaksi, bukan dari
`log_aktivitas`.

**Batasan:** log ini tidak merekam setiap klik, login, edit teks,
perubahan foto, atau semua perubahan kolom. Cakupannya adalah perubahan
status yang dipasangi trigger.

------------------------------------------------------------------------

## 7. Stored function --- proses bisnis yang dipanggil BE

Objek bernama `sp_*` pada skema dapat berupa PostgreSQL `FUNCTION` yang
dipanggil dengan `SELECT`. Jangan menganggap semuanya `PROCEDURE`;
periksa deklarasi aktual.

  -------------------------------------------------------------------------------------
  Fungsi                             Tujuan/mekanisme           Modul
  ---------------------------------- -------------------------- -----------------------
  `fn_login`                         Mencari akun berdasarkan   Login.
                                     NIM, memverifikasi         
                                     password dengan hash,      
                                     memeriksa status akun, dan 
                                     mengembalikan data         
                                     pengguna yang diperlukan.  

  `sp_ubah_password`                 Memverifikasi password     Profil / Ubah Password.
                                     lama, memvalidasi password 
                                     baru, lalu menyimpan hash  
                                     baru.                      

  `sp_ajukan_lupa_password`          Memvalidasi data           Login → Lupa Password.
                                     permintaan dan             
                                     membuat/memperbarui        
                                     request sesuai aturan      
                                     status.                    

  `sp_proses_request_password`       Dipanggil PJ untuk         Panel request password
                                     memproses request dan      PJ.
                                     membuat token reset;       
                                     database menyimpan hash    
                                     token dan masa berlaku.    

  `sp_konfirmasi_request_password`   Menyimpan konfirmasi/pesan Proses request password
                                     proses sesuai otorisasi.   PJ.

  `sp_reset_password_dengan_token`   Memvalidasi token, masa    Reset Password.
                                     berlaku, dan status        
                                     pemakaian, lalu mengganti  
                                     password.                  

  `sp_tambah_pengguna`               Memeriksa kewenangan PJ    Kelola Pengguna PJ.
                                     lalu menambahkan pengguna. 

  `sp_ubah_pengguna`                 Memeriksa kewenangan PJ    Kelola Pengguna PJ.
                                     dan memperbarui data       
                                     pengguna yang diizinkan.   

  `sp_set_status_akun`               Mengaktifkan atau          Kelola Pengguna PJ.
                                     menonaktifkan akun sesuai  
                                     aturan otorisasi.          

  `sp_tambah_inventaris`             Menambahkan barang dengan  Kelola Inventaris PJ.
                                     pemeriksaan kewenangan     
                                     organisasi PJ.             

  `sp_ubah_inventaris`               Memperbarui data barang    Kelola Inventaris PJ.
                                     dan mengikuti validasi     
                                     jumlah unit.               

  `sp_hapus_inventaris`              Soft delete sesuai aturan  Kelola Inventaris PJ.
                                     fungsi; bukan selalu       
                                     menghapus permanen.        

  `sp_ajukan_peminjaman`             Membuat pengajuan;         Detail Barang → Ajukan
                                     validasi final dilakukan   Peminjaman.
                                     trigger terkait.           

  `sp_proses_peminjaman`             Memproses                  Kelola Peminjaman PJ.
                                     persetujuan/penolakan oleh 
                                     PJ dengan pemeriksaan      
                                     kewenangan dan status.     

  `sp_pengambilan_barang`            Mencatat                   Proses Pengambilan oleh
                                     serah-terima/pengambilan   PJ.
                                     dan mengubah status sesuai 
                                     alur.                      

  `sp_ajukan_pengembalian`           Membuat pengajuan          Pengajuan Saya → Ajukan
                                     pengembalian dan mendukung Pengembalian.
                                     pengajuan ulang sesuai     
                                     aturan skema.              

  `sp_setujui_pengembalian`          Mencatat pemeriksaan       Kelola Pengembalian PJ.
                                     barang dan menyelesaikan   
                                     proses sesuai aturan.      

  `sp_tolak_pengembalian`            Menolak pengajuan          Kelola Pengembalian PJ.
                                     pengembalian dengan alasan 
                                     dan pemroses.              

  `sp_ajukan_pj`                     Membuat permohonan menjadi Pengajuan PJ Peminjam.
                                     PJ beserta data/lampiran.  

  `sp_proses_request_pj`             Memproses permohonan oleh  List Pengajuan PJ.
                                     PJ berwenang; persetujuan  
                                     dapat memicu perubahan     
                                     role.                      
  -------------------------------------------------------------------------------------

**Penting bagi developer:** nama parameter, urutan, tipe data, return
value, exception, dan hak akses harus dibaca langsung dari deklarasi
fungsi di `01_skema_final.sql`. Tabel ini menjelaskan tanggung jawab
fungsional, bukan kontrak API lengkap.

------------------------------------------------------------------------

## 8. Materialized view dan laporan

  -------------------------------------------------------------------------------
  Objek                           Mekanisme               Penerapan
  ------------------------------- ----------------------- -----------------------
  `mv_rekap_peminjaman_bulanan`   Menyimpan agregasi      Laporan/rekap bulanan.
                                  transaksi per OKI dan   
                                  bulan.                  

  `mv_barang_terpopuler`          Menyimpan jumlah        Laporan barang paling
                                  peminjaman per barang   sering dipinjam.
                                  dan peringkat.          

  `sp_refresh_laporan()`          Memperbarui             Scheduler atau proses
                                  materialized view       admin/BE.
                                  laporan.                
  -------------------------------------------------------------------------------

Materialized view menyimpan hasil query dan tidak otomatis berubah
setiap ada transaksi. Diperlukan proses refresh. Gunakan view biasa
untuk data operasional terbaru dan materialized view untuk laporan yang
dapat diperbarui berkala.

------------------------------------------------------------------------

## 9. Keamanan dan hak akses

  -----------------------------------------------------------------------------
  Konfigurasi                   Fungsi                  Dampak
  ----------------------------- ----------------------- -----------------------
  `ENABLE ROW LEVEL SECURITY`   Mengaktifkan RLS pada   Lapisan perlindungan
                                tabel yang ditentukan.  akses data.

  `REVOKE ALL`                  Mencabut hak akses      FE tidak mengakses
                                langsung role           tabel langsung.
                                publik/klien sesuai     
                                objek.                  

  `GRANT` ke `service_role`     Memberikan hak kepada   BE menjadi jalur akses
                                role backend yang       database.
                                ditentukan.             

  `security_invoker` pada view  Membuat view mengikuti  Menjaga pembatasan hak
                                hak pemanggil sesuai    akses.
                                definisi PostgreSQL.    

  View pengguna tanpa           Mencegah hash password  Kelola Pengguna dan
  `password_hash`               ikut terkirim dalam     Profil.
                                data daftar pengguna.   

  `fn_pastikan_pj`              Memastikan aktor PJ     Operasi khusus PJ.
                                aktif dan sesuai        
                                organisasi.             
  -----------------------------------------------------------------------------

Jangan menaruh `service_role` atau kredensial database di frontend.
Pemeriksaan role dan organisasi harus dilakukan di BE/database, bukan
hanya dengan menyembunyikan tombol di UI.

------------------------------------------------------------------------

## 10. File `02_pengujian.sql`

File pengujian memiliki dua peran: 1. Menguji integritas dan aturan
database. 2. Memberikan contoh query pembacaan data yang dibutuhkan
fitur aplikasi.

Pengujian dibungkus transaksi dan diakhiri `ROLLBACK` agar data uji
tidak menetap setelah skrip selesai.

  -----------------------------------------------------------------------
  Kelompok                Fokus pengujian         Modul
  ----------------------- ----------------------- -----------------------
  Autentikasi/pengguna    Password, login         Login, Kelola Pengguna,
                          benar/salah, akun       Profil.
                          nonaktif, role PJ, NIM  
                          ganda, ubah password.   

  Aturan peminjaman       Barang sendiri/rusak,   Katalog, kalender, form
                          tanggal, H+2, kuota,    peminjaman.
                          persiapan,              
                          over-booking.           

  Alur transaksi          Persetujuan, transisi   Pengajuan Saya dan
                          status, pengambilan,    proses PJ.
                          pengembalian,           
                          penolakan, pengajuan    
                          ulang, penyelesaian,    
                          audit log.              

  Inventaris/kategori     Soft delete, stok,      Kelola Inventaris.
                          barang masih dipinjam,  
                          kategori.               

  Pengajuan PJ            Syarat pemohon, request Pengajuan PJ dan List
                          ganda, kewenangan PJ,   Pengajuan PJ.
                          persetujuan, perubahan  
                          role.                   

  Lupa password           Request, token, hash,   Lupa Password.
                          masa berlaku,           
                          konfirmasi, token       
                          sekali pakai.           

  Keamanan                View tidak menampilkan  Keamanan lintas modul.
                          hash password dan akses 
                          role klien dibatasi.    
  -----------------------------------------------------------------------

Query contoh di bagian akhir file pengujian juga memperlihatkan pola
konsumsi data: katalog dengan filter/pagination, kalender, dashboard
Peminjam/PJ, daftar pengembalian, agregasi `GROUP BY`/`HAVING`,
subquery, dan `EXPLAIN ANALYZE`.

------------------------------------------------------------------------

## 11. Alur proses lintas modul

### 11.1 Peminjaman sampai selesai

1.  Peminjam membuka detail barang.
2.  BE membaca view inventaris/jadwal dan meminta data kalender.
3.  Peminjam mengirim form pengajuan.
4.  BE memanggil `sp_ajukan_peminjaman(...)`.
5.  Trigger validasi memeriksa akun, barang, kondisi, organisasi,
    tanggal, dan kuota.
6.  Status awal dicatat; trigger audit menambahkan jejak status ke
    `log_aktivitas`.
7.  PJ memproses pengajuan melalui fungsi proses peminjaman.
8.  Trigger memastikan transisi status diperbolehkan.
9.  Saat pengambilan, PJ mencatat serah-terima melalui fungsi yang
    tersedia.
10. Peminjam mengajukan pengembalian.
11. PJ memeriksa barang dan menyetujui atau menolak pengembalian.
12. Jika ditolak, peminjam mengikuti mekanisme pengajuan ulang yang
    tersedia.
13. Jika diterima, data inventaris dan status peminjaman disinkronkan
    sesuai fungsi/trigger.
14. Riwayat transaksi dibaca melalui view; audit status tersedia melalui
    `log_aktivitas` untuk kebutuhan internal.

### 11.2 Pengajuan menjadi PJ

1.  Peminjam mengirim permohonan melalui modul Pengajuan PJ.
2.  BE memanggil `sp_ajukan_pj(...)`.
3.  Trigger memvalidasi kelayakan pemohon.
4.  PJ membaca daftar permohonan melalui `v_request_pj_detail`.
5.  PJ memproses melalui `sp_proses_request_pj(...)`.
6.  Jika disetujui, mekanisme database memperbarui role sesuai aturan
    skema.

### 11.3 Lupa password

1.  Pengguna mengirim NIM dan data permintaan.
2.  BE memanggil `sp_ajukan_lupa_password(...)`.
3.  PJ memproses request melalui fungsi yang tersedia.
4.  Token reset dibuat; database menyimpan hash token dan masa berlaku.
5.  Konfirmasi proses dilakukan sesuai fungsi yang disediakan.
6.  Pengguna membuka tautan reset.
7.  `sp_reset_password_dengan_token(...)` memvalidasi token dan
    mengganti password jika memenuhi syarat.

------------------------------------------------------------------------

## 12. Pedoman khusus untuk coding agent

Saat mengerjakan fitur PinjemDulu, ikuti aturan berikut:

1.  **Baca SQL sebelum membuat integrasi.** Periksa deklarasi tabel,
    view, function, trigger, ENUM, dan parameter di
    `01_skema_final.sql`.
2.  **Gunakan objek yang sudah tersedia.** Jangan membuat view/function
    baru jika objek yang sesuai sudah ada.
3.  **Jangan menebak kontrak fungsi.** Cocokkan nama parameter, urutan,
    tipe data, return type, dan exception dari SQL.
4.  **Gunakan view untuk kebutuhan baca jika sesuai.** Hindari mengulang
    JOIN kompleks yang sudah disediakan.
5.  **Gunakan fungsi untuk aksi bisnis yang tersedia.** Jangan melakukan
    INSERT/UPDATE langsung dari FE.
6.  **Jangan menggandakan aturan trigger.** FE boleh memberi validasi
    awal, tetapi aturan final tetap di database.
7.  **Pertahankan status dan alur transisi.** Jangan mengubah
    ENUM/transisi tanpa meninjau fungsi, trigger, pengujian, dan UI.
8.  **Jaga batas organisasi.** Aksi PJ harus dibatasi pada organisasi
    kewenangannya.
9.  **Jaga keamanan kredensial.** Jangan mengekspos `password_hash`,
    token rahasia, atau `service_role` ke FE.
10. **Bedakan riwayat transaksi dan audit.** Riwayat pengguna berasal
    dari view transaksi; `log_aktivitas` adalah audit perubahan status
    internal.
11. **Periksa file pengujian.** Jalankan atau sesuaikan skenario relevan
    dari `02_pengujian.sql` saat mengubah alur database.
12. **Jangan anggap materialized view real-time.** Pastikan mekanisme
    refresh laporan berjalan.
13. **Jika dokumentasi dan SQL berbeda, verifikasi SQL aktual.** Catat
    ketidaksesuaian dan jangan mengubah skema berdasarkan asumsi.

### Checklist sebelum menyelesaikan perubahan

-   [ ] Modul dan user story yang terdampak sudah diidentifikasi.
-   [ ] Objek SQL yang dipakai sudah diverifikasi pada file final.
-   [ ] Kontrak fungsi dan parameter sudah dicocokkan.
-   [ ] Hak akses pengguna dan organisasi sudah diperiksa.
-   [ ] Validasi database dan transisi status tetap terjaga.
-   [ ] Data sensitif tidak dikirim ke frontend.
-   [ ] Skenario pengujian terkait sudah dijalankan/diperbarui.
-   [ ] Dokumentasi diperbarui jika skema atau alur berubah.

------------------------------------------------------------------------

## 13. Ringkasan

  -----------------------------------------------------------------------
  Jenis objek SQL         Peran                   Contoh
  ----------------------- ----------------------- -----------------------
  Tabel                   Menyimpan data utama.   Pengguna, inventaris,
                                                  peminjaman,
                                                  pengembalian.

  ENUM/constraint         Membatasi nilai dan     Role, status, jumlah,
                          menjaga integritas.     tanggal, relasi.

  Function                Menjalankan proses      Login, pengajuan,
                          bisnis/perhitungan.     kalender, reset
                                                  password.

  Trigger                 Validasi dan otomasi    Kuota, transisi status,
                          saat data berubah.      sinkronisasi, audit.

  View                    Menyediakan data siap   Katalog, detail
                          baca.                   transaksi, dashboard.

  Index                   Mempercepat pencarian.  Filter organisasi,
                                                  status, jadwal, log.

  Materialized view       Menyimpan agregasi      Rekap bulanan dan
                          laporan.                barang terpopuler.

  RLS/privilege           Membatasi akses         Akses backend dan
                          database.               perlindungan tabel.
  -----------------------------------------------------------------------

**Kesimpulan:** query SQL PinjemDulu menjadi fondasi penyimpanan, proses
bisnis, validasi, penyediaan data, laporan, audit, dan keamanan. Gunakan
dokumen ini sebagai peta navigasi, tetapi verifikasi detail teknis dan
kontrak objek pada `01_skema_final.sql` serta skenario pada
`02_pengujian.sql` sebelum menulis atau mengubah kode.
