-- =====================================================================
-- PinjemDulu — File 02: PENGUJIAN INTEGRITAS & CONTOH QUERY APLIKASI
-- Jalankan SETELAH file 01 (Supabase SQL Editor atau psql).
-- BAGIAN A (pengujian) dibungkus transaksi lalu di-ROLLBACK, jadi data seed tidak
--   berubah. Hasilnya tampil sebagai tabel: hasil = LULUS. Jika ada aturan yang
--   tidak bekerja, eksekusi berhenti dengan error "GAGAL [nama pengujian]".
-- BAGIAN B berisi contoh query aplikasi; jalankan SATU PER SATU (editor Supabase
--   hanya menampilkan hasil query terakhir dalam satu eksekusi).
-- Fungsi bantu dibuat di pg_temp (hilang otomatis saat sesi selesai).
-- =====================================================================
BEGIN;

CREATE TEMP TABLE hasil_uji (
  no integer GENERATED ALWAYS AS IDENTITY, nama text, hasil text, keterangan text);

CREATE FUNCTION pg_temp.harus_gagal(p_nama text, p_sql text, p_pesan text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF p_pesan IS NOT NULL AND position(p_pesan IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'GAGAL [%]: ditolak, tetapi pesan tidak sesuai: %', p_nama, SQLERRM;
    END IF;
    INSERT INTO pg_temp.hasil_uji (nama, hasil, keterangan) VALUES (p_nama, 'LULUS', 'ditolak: ' || SQLERRM);
    RETURN;
  END;
  RAISE EXCEPTION 'GAGAL [%]: seharusnya ditolak tetapi berhasil', p_nama;
END $$;

CREATE FUNCTION pg_temp.harus_berhasil(p_nama text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  INSERT INTO pg_temp.hasil_uji (nama, hasil, keterangan) VALUES (p_nama, 'LULUS', 'berhasil dijalankan');
END $$;

CREATE FUNCTION pg_temp.cek(p_nama text, p_ok boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'GAGAL [%]: kondisi tidak terpenuhi', p_nama; END IF;
  INSERT INTO pg_temp.hasil_uji (nama, hasil, keterangan) VALUES (p_nama, 'LULUS', 'kondisi terpenuhi');
END $$;

CREATE FUNCTION pg_temp.inv(p_nama text) RETURNS integer
LANGUAGE sql AS $$ SELECT id_inventaris FROM public.inventaris WHERE nama_barang = p_nama $$;
CREATE FUNCTION pg_temp.hari(p_n integer) RETURNS date
LANGUAGE sql AS $$ SELECT public.fn_hari_ini() + p_n $$;

-- ---------------------------------------------------------------------
-- A. PENGUJIAN INTEGRITAS
-- ---------------------------------------------------------------------
-- A1. Password: wajib hash; pengguna baru berpassword = NIM
SELECT pg_temp.harus_gagal('Password polos ditolak CHECK',
  $q$INSERT INTO pengguna (nim, id_organisasi, nama_pengguna, password_hash) VALUES ('9990000001', 1, 'X', 'passwordpolos')$q$,
  'ck_pengguna_hash');
SELECT pg_temp.harus_berhasil('PJ menambah pengguna baru', $q$SELECT sp_tambah_pengguna('2441720001', '9990000002', 'Uji Baru', 1)$q$);
SELECT pg_temp.cek('Login pengguna baru dengan password = NIM', (SELECT count(*) = 1 FROM fn_login('9990000002', '9990000002')));
SELECT pg_temp.cek('Yang tersimpan hash bcrypt, bukan NIM',
  (SELECT password_hash <> nim AND password_hash LIKE '$2a$10$%' FROM pengguna WHERE nim = '9990000002'));
SELECT pg_temp.harus_gagal('Login password salah', $q$SELECT * FROM fn_login('9990000002', 'salah')$q$, 'NIM atau password salah');
SELECT pg_temp.harus_gagal('Login NIM tidak ada (pesan sama)', $q$SELECT * FROM fn_login('0000', 'x')$q$, 'NIM atau password salah');
SELECT pg_temp.harus_gagal('Login akun nonaktif', $q$SELECT * FROM fn_login('2441720018', '2441720018')$q$, 'Akun nonaktif');
SELECT pg_temp.harus_gagal('Peminjam tidak boleh menambah pengguna', $q$SELECT sp_tambah_pengguna('2441720011', '9990000003', 'X', 1)$q$, 'Penanggung Jawab');
SELECT pg_temp.harus_gagal('PJ tidak boleh menambah pengguna ke OKI lain', $q$SELECT sp_tambah_pengguna('2441720001', '9990000004', 'X', 2)$q$, 'OKI Anda sendiri');
SELECT pg_temp.harus_gagal('PJ tidak boleh mengubah pengguna OKI lain', $q$SELECT sp_ubah_pengguna('2441720001', '2441720013', '2441720013', 'Andi', 2, 'Peminjam')$q$, 'OKI Anda sendiri');
SELECT pg_temp.harus_gagal('PJ tidak boleh memindahkan pengguna ke OKI lain', $q$SELECT sp_ubah_pengguna('2441720001', '2441720011', '2441720011', 'Fajar', 2, 'Peminjam')$q$, 'dipindahkan');
SELECT pg_temp.harus_gagal('PJ tidak boleh menonaktifkan akun OKI lain', $q$SELECT sp_set_status_akun('2441720001', '2441720013', false)$q$, 'OKI Anda sendiri');
SELECT pg_temp.harus_berhasil('PJ menonaktifkan akun OKI sendiri', $q$SELECT sp_set_status_akun('2441720001', '2441720012', false)$q$);
SELECT pg_temp.harus_gagal('PJ tidak boleh menonaktifkan akun sendiri', $q$SELECT sp_set_status_akun('2441720001', '2441720001', false)$q$, 'akun sendiri');
SELECT pg_temp.harus_gagal('NIM ganda', $q$SELECT sp_tambah_pengguna('2441720001', '9990000002', 'Dobel', 1)$q$, 'NIM sudah terdaftar');
SELECT pg_temp.harus_berhasil('Ubah password', $q$SELECT sp_ubah_password('9990000002', '9990000002', 'PasswordBaru1')$q$);
SELECT pg_temp.harus_gagal('Ubah password: password lama salah', $q$SELECT sp_ubah_password('9990000002', 'salah', 'PasswordBaru2')$q$, 'Password saat ini salah');

-- A2. Aturan pengajuan peminjaman (trigger trg_validasi_peminjaman)
SELECT pg_temp.harus_gagal('Barang milik OKI sendiri',
  format($q$SELECT sp_ajukan_peminjaman('2441720011', %s, 1, %L, %L, 'Uji')$q$, pg_temp.inv('Proyektor Epson EB-X500'), pg_temp.hari(20), pg_temp.hari(21)),
  'milik OKI Anda');
SELECT pg_temp.harus_gagal('Barang Rusak tidak bisa dipinjam',
  format($q$SELECT sp_ajukan_peminjaman('2441720013', %s, 1, %L, %L, 'Uji')$q$, pg_temp.inv('Kamera Mirrorless Sony A6000'), pg_temp.hari(20), pg_temp.hari(21)),
  'Rusak');
SELECT pg_temp.harus_gagal('Tanggal mulai H+1 ditolak',
  format($q$SELECT sp_ajukan_peminjaman('2441720011', %s, 1, %L, %L, 'Uji')$q$, pg_temp.inv('Carrier 60L'), pg_temp.hari(1), pg_temp.hari(2)),
  'H+2');
SELECT pg_temp.harus_gagal('Tanggal selesai sebelum mulai',
  format($q$SELECT sp_ajukan_peminjaman('2441720011', %s, 1, %L, %L, 'Uji')$q$, pg_temp.inv('Carrier 60L'), pg_temp.hari(10), pg_temp.hari(9)),
  'Tanggal selesai');
SELECT pg_temp.harus_gagal('Keperluan kosong',
  format($q$SELECT sp_ajukan_peminjaman('2441720011', %s, 1, %L, %L, '  ')$q$, pg_temp.inv('Carrier 60L'), pg_temp.hari(10), pg_temp.hari(11)),
  'keperluan');
SELECT pg_temp.harus_gagal('Jumlah melebihi total unit',
  format($q$SELECT sp_ajukan_peminjaman('2441720011', %s, 9, %L, %L, 'Uji')$q$, pg_temp.inv('Carrier 60L'), pg_temp.hari(10), pg_temp.hari(11)),
  'Kuota');
-- Backdrop (2 unit) sudah dipesan 1 unit pada +3..+4 (blok +2..+5).
-- Hari persiapan/pengecekan boleh dibagi selama unit cukup:
SELECT pg_temp.harus_berhasil('Berbagi hari persiapan/pengecekan (1+1 <= 2 unit)',
  format($q$SELECT sp_ajukan_peminjaman('2441720013', %s, 1, %L, %L, 'Uji berbagi')$q$, pg_temp.inv('Backdrop Panggung'), pg_temp.hari(5), pg_temp.hari(6)));
SELECT pg_temp.harus_gagal('Kuota habis pada hari yang sama (over-booking dicegah)',
  format($q$SELECT sp_ajukan_peminjaman('2441720017', %s, 1, %L, %L, 'Uji')$q$, pg_temp.inv('Backdrop Panggung'), pg_temp.hari(5), pg_temp.hari(6)),
  'Kuota');
-- Peminjaman terlambat tetap menahan kuota (Tenda: 3 unit terlambat + 2 unit terjadwal)
SELECT pg_temp.cek('Kuota Tenda hari +4 = 5 unit terpakai (3 terlambat + 2 terjadwal)',
  (SELECT terpakai = 5 FROM fn_kalender_ketersediaan(pg_temp.inv('Tenda Dome 4P'), pg_temp.hari(4), pg_temp.hari(4))));
SELECT pg_temp.cek('Batas maksimal unit form = sisa terkecil pada rentang',
  fn_maks_unit_tersedia(pg_temp.inv('Tenda Dome 4P'), pg_temp.hari(4), pg_temp.hari(5)) = 1);
SELECT pg_temp.cek('Jadwal berdekatan terdeteksi', fn_jadwal_berdekatan(pg_temp.inv('Backdrop Panggung'), pg_temp.hari(6), pg_temp.hari(7)));

-- A3. Alur lengkap peminjaman -> pengembalian + sinkronisasi trigger
DO $$
DECLARE v_id integer; v_g integer; v_inv integer := pg_temp.inv('Carrier 60L');
BEGIN
  v_id := sp_ajukan_peminjaman('2441720011', v_inv, 2, pg_temp.hari(10), pg_temp.hari(11), 'Pendakian Uji');
  PERFORM pg_temp.cek('Kuota ditahan saat Diajukan', (SELECT sisa_unit = 6 FROM fn_kalender_ketersediaan(v_inv, pg_temp.hari(10), pg_temp.hari(10))));

  PERFORM pg_temp.harus_gagal('PJ OKI lain tidak boleh menyetujui',
    format('SELECT sp_proses_peminjaman(%s, %L, %L)', v_id, '2441720001', 'Setujui'), 'OKI Anda sendiri');
  PERFORM pg_temp.harus_gagal('Peminjam tidak boleh menyetujui',
    format('SELECT sp_proses_peminjaman(%s, %L, %L)', v_id, '2441720011', 'Setujui'), 'Penanggung Jawab');
  PERFORM pg_temp.harus_gagal('Tolak tanpa alasan',
    format('SELECT sp_proses_peminjaman(%s, %L, %L)', v_id, '2441720005', 'Tolak'), 'Alasan');
  PERFORM sp_proses_peminjaman(v_id, '2441720005', 'Setujui');
  PERFORM pg_temp.cek('Status Disetujui', (SELECT status = 'Disetujui' FROM peminjaman WHERE id_peminjaman = v_id));
  PERFORM pg_temp.harus_gagal('Tidak bisa diproses dua kali',
    format('SELECT sp_proses_peminjaman(%s, %L, %L)', v_id, '2441720005', 'Setujui'), 'sudah diproses');
  PERFORM pg_temp.harus_gagal('Status tidak boleh melompat (Disetujui -> Selesai)',
    format('UPDATE peminjaman SET status = %L WHERE id_peminjaman = %s', 'Selesai', v_id), 'tidak diizinkan');

  PERFORM sp_pengambilan_barang(v_id, '2441720005', pg_temp.hari(10), 'pengambilan/foto.jpg');
  PERFORM pg_temp.cek('Dipinjam + kondisi_sebelum tercatat otomatis',
    (SELECT status = 'Dipinjam' AND kondisi_sebelum = 'Baik' FROM peminjaman WHERE id_peminjaman = v_id));

  PERFORM pg_temp.harus_gagal('Pengembalian oleh bukan peminjam',
    format('SELECT sp_ajukan_pengembalian(%s, %L)', v_id, '2441720012'), 'tidak ditemukan');
  v_g := sp_ajukan_pengembalian(v_id, '2441720011');
  PERFORM pg_temp.cek('Peminjaman otomatis menjadi Pengembalian',
    (SELECT status = 'Pengembalian' FROM peminjaman WHERE id_peminjaman = v_id));

  PERFORM sp_tolak_pengembalian(v_g, '2441720005', 'Jumlah barang yang dikembalikan kurang lengkap');
  PERFORM pg_temp.cek('Pengembalian Ditolak', (SELECT status = 'Ditolak' FROM pengembalian WHERE id_pengembalian = v_g));
  PERFORM pg_temp.cek('Ajukan kembali memakai baris yang sama', sp_ajukan_pengembalian(v_id, '2441720011') = v_g);
  PERFORM pg_temp.cek('Kembali ke Menunggu, alasan lama dibersihkan',
    (SELECT status = 'Menunggu' AND alasan_penolakan IS NULL FROM pengembalian WHERE id_pengembalian = v_g));

  PERFORM pg_temp.harus_gagal('Jumlah dikembalikan tidak sama',
    format('SELECT sp_setujui_pengembalian(%s, %L, 1, %L, %L, %L)', v_g, '2441720005', pg_temp.hari(11), 'Baik', 'f.jpg'), 'tidak sesuai');
  PERFORM sp_setujui_pengembalian(v_g, '2441720005', 2, pg_temp.hari(11), 'Rusak', 'kembali/foto.jpg', 'Carrier sobek');
  PERFORM pg_temp.cek('Peminjaman Selesai otomatis', (SELECT status = 'Selesai' FROM peminjaman WHERE id_peminjaman = v_id));
  PERFORM pg_temp.cek('Kondisi inventaris ikut diperbarui menjadi Rusak', (SELECT kondisi = 'Rusak' FROM inventaris WHERE id_inventaris = v_inv));
  PERFORM pg_temp.cek('Kuota dilepas setelah Selesai', (SELECT sisa_unit = 8 FROM fn_kalender_ketersediaan(v_inv, pg_temp.hari(10), pg_temp.hari(10))));
  PERFORM pg_temp.cek('Barang Rusak hilang dari katalog', NOT EXISTS (SELECT 1 FROM v_katalog_inventaris WHERE id_inventaris = v_inv));
  PERFORM pg_temp.cek('Audit trail tercatat', (SELECT count(*) >= 5 FROM log_aktivitas WHERE tabel = 'peminjaman' AND id_record = v_id::text));
END $$;

-- A4. Inventaris & kategori
SELECT pg_temp.harus_gagal('Hapus barang dengan peminjaman aktif',
  format($q$SELECT sp_hapus_inventaris(%s, '2441720005')$q$, pg_temp.inv('Tenda Dome 4P')), 'peminjaman aktif');
SELECT pg_temp.harus_gagal('PJ OKI lain tidak boleh menghapus',
  format($q$SELECT sp_hapus_inventaris(%s, '2441720002')$q$, pg_temp.inv('Terminal Kabel Roll')), 'OKI Anda sendiri');
SELECT pg_temp.harus_berhasil('Hapus barang tanpa peminjaman (soft delete)',
  format($q$SELECT sp_hapus_inventaris(%s, '2441720001')$q$, pg_temp.inv('Terminal Kabel Roll')));
SELECT pg_temp.cek('Barang terhapus hilang dari v_inventaris', NOT EXISTS (SELECT 1 FROM v_inventaris WHERE nama_barang = 'Terminal Kabel Roll'));
SELECT pg_temp.harus_gagal('Jumlah unit di bawah puncak pemakaian (5)',
  $q$UPDATE inventaris SET total_unit = 4 WHERE nama_barang = 'Tenda Dome 4P'$q$, 'Jumlah unit tidak boleh kurang');
SELECT pg_temp.harus_berhasil('Jumlah unit = puncak pemakaian diizinkan',
  $q$UPDATE inventaris SET total_unit = 5 WHERE nama_barang = 'Tenda Dome 4P'$q$);
SELECT pg_temp.harus_gagal('total_unit = 0', $q$UPDATE inventaris SET total_unit = 0 WHERE nama_barang = 'Gitar Akustik'$q$, 'check');
SELECT pg_temp.harus_gagal('Kategori masih dipakai tidak bisa dihapus', $q$DELETE FROM kategori WHERE nama_kategori = 'Audio'$q$, 'foreign key');
SELECT pg_temp.harus_gagal('Nama kategori unik tanpa beda huruf besar/kecil', $q$INSERT INTO kategori (nama_kategori) VALUES ('audio')$q$, 'uq_kategori_nama');
SELECT pg_temp.harus_gagal('Nama kategori maks 30 karakter', $q$INSERT INTO kategori (nama_kategori) VALUES (repeat('x', 31))$q$, 'value too long');

-- A5. Pengajuan PJ (role naik otomatis lewat trigger)
SELECT pg_temp.harus_gagal('PJ tidak boleh mengajukan PJ lagi', $q$SELECT sp_ajukan_pj('2441720001', 'x.jpg')$q$, 'berrole Peminjam');
SELECT pg_temp.harus_gagal('Satu pengajuan menunggu per pengguna', $q$SELECT sp_ajukan_pj('2441720011', 'x.jpg')$q$, 'Masih ada pengajuan');
SELECT pg_temp.harus_gagal('PJ OKI lain tidak boleh memproses',
  format($q$SELECT sp_proses_request_pj(%s, '2441720002', 'Setujui')$q$, (SELECT id_request FROM request_pj WHERE nim = '2441720011')), 'OKI Anda sendiri');
SELECT pg_temp.harus_berhasil('PJ OKI sama menyetujui',
  format($q$SELECT sp_proses_request_pj(%s, '2441720006', 'Setujui')$q$, (SELECT id_request FROM request_pj WHERE nim = '2441720011')));
SELECT pg_temp.cek('Tanggal Disetujui tercatat otomatis (tanggal_diproses = hari ini)',
  (SELECT tanggal_diproses = fn_hari_ini() AND status = 'Disetujui' FROM v_request_pj_detail WHERE nim_pemohon = '2441720011'));
SELECT pg_temp.cek('Role pemohon otomatis menjadi Penanggung Jawab', (SELECT role = 'Penanggung Jawab' FROM pengguna WHERE nim = '2441720011'));
SELECT pg_temp.harus_gagal('Tidak bisa diproses ulang',
  format($q$SELECT sp_proses_request_pj(%s, '2441720001', 'Setujui')$q$, (SELECT id_request FROM request_pj WHERE nim = '2441720011')), 'sudah diproses');

-- A6. Lupa password: token sekali pakai
SELECT pg_temp.harus_gagal('NIM tidak terdaftar', $q$SELECT sp_ajukan_lupa_password('0000', '081200000000')$q$, 'NIM tidak terdaftar');
SELECT pg_temp.harus_gagal('Format WhatsApp salah', $q$SELECT sp_ajukan_lupa_password('2441720013', 'abc')$q$, 'no_whatsapp');
DO $$
DECLARE v_req integer; v_token text;
BEGIN
  SELECT id_request_password INTO v_req FROM request_password WHERE nim = '2441720017';
  PERFORM pg_temp.harus_gagal('PJ OKI lain tidak boleh memproses request password',
    format('SELECT sp_proses_request_password(%s, %L)', v_req, '2441720001'), 'OKI Anda sendiri');
  v_token := sp_proses_request_password(v_req, '2441720002');
  PERFORM pg_temp.cek('Token acak 64 hex dibuat', length(v_token) = 64);
  PERFORM pg_temp.cek('Token asli TIDAK tersimpan di tabel',
    (SELECT token_hash <> v_token AND length(token_hash) = 64 FROM request_password WHERE id_request_password = v_req));
  PERFORM pg_temp.harus_gagal('Token belum dikonfirmasi PJ tidak berlaku',
    format('SELECT sp_reset_password_dengan_token(%L, %L)', v_token, 'PasswordBaru1'), 'tidak valid');
  PERFORM sp_konfirmasi_request_password(v_req, '2441720002', 'Halo Yoga, tautan: ?token=' || v_token);
  PERFORM pg_temp.harus_gagal('Password baru terlalu pendek',
    format('SELECT sp_reset_password_dengan_token(%L, %L)', v_token, 'pendek'), 'minimal 8');
  PERFORM sp_reset_password_dengan_token(v_token, 'PasswordBaru1');
  PERFORM pg_temp.cek('Login dengan password baru', (SELECT count(*) = 1 FROM fn_login('2441720017', 'PasswordBaru1')));
  PERFORM pg_temp.harus_gagal('Tautan hanya sekali pakai',
    format('SELECT sp_reset_password_dengan_token(%L, %L)', v_token, 'PasswordLain2'), 'tidak valid');
END $$;
SELECT pg_temp.harus_berhasil('Token seed (contoh-token) bisa dipakai',
  $q$SELECT sp_reset_password_dengan_token('contoh-token', 'PasswordBaru1')$q$);

-- A7. Keamanan akses
SELECT pg_temp.cek('View pengguna tidak memuat password_hash',
  NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'v_pengguna' AND column_name = 'password_hash'));
DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM 1 FROM pengguna LIMIT 1;
    RESET ROLE;
    RAISE EXCEPTION 'GAGAL [anon diblokir]: anon dapat membaca tabel pengguna';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    INSERT INTO pg_temp.hasil_uji (nama, hasil, keterangan) VALUES ('anon diblokir dari tabel pengguna', 'LULUS', 'ditolak: insufficient_privilege');
  END;
END $$;

-- Rekap hasil pengujian
SELECT no, nama, hasil, keterangan FROM pg_temp.hasil_uji ORDER BY no;

ROLLBACK;

-- ---------------------------------------------------------------------
-- B. CONTOH QUERY YANG DIPAKAI FITUR APLIKASI (query lanjutan)
--    Jalankan satu per satu. Nilai 2441720012 dst. = parameter dari BE.
-- ---------------------------------------------------------------------
-- B1. Katalog Inventaris untuk user HMTI: OKI lain, barang Baik, cari nama + filter kategori, 8 per halaman
SELECT id_inventaris, singkatan AS oki, nama_kategori, nama_barang, jumlah_tersedia || ' / ' || total_unit AS tersedia
FROM v_katalog_inventaris
WHERE id_organisasi <> (SELECT id_organisasi FROM pengguna WHERE nim = '2441720012')
  AND nama_barang ILIKE '%a%' AND nama_kategori = ANY (ARRAY['Audio', 'Acara'])
ORDER BY nama_barang LIMIT 8 OFFSET 0;

-- B2. Kalender ketersediaan Backdrop Panggung, 7 hari ke depan
SELECT * FROM fn_kalender_ketersediaan(
  (SELECT id_inventaris FROM inventaris WHERE nama_barang = 'Backdrop Panggung'), fn_hari_ini() + 1, fn_hari_ini() + 7);

-- B3. Kartu Dashboard Peminjam
SELECT * FROM v_dashboard_peminjam WHERE nim = '2441720012';

-- B4. Tabel Dashboard Peminjam: 4 peminjaman teratas
SELECT nama_barang, tanggal_pengajuan, tgl_mulai, tgl_selesai, jumlah_pinjam, status
FROM v_peminjaman_detail WHERE nim_peminjam = '2441720012' ORDER BY tanggal_pengajuan DESC LIMIT 4;

-- B5. Kartu Dashboard PJ + badge sidebar (OKI BEM)
SELECT * FROM v_dashboard_pj WHERE id_organisasi = (SELECT id_organisasi FROM organisasi WHERE singkatan = 'BEM');

-- B6. Kelola Pengembalian PJ BEM, termasuk status Terlambat
SELECT nama_peminjam, nama_barang, tgl_selesai, tanggal_dikembalikan, status
FROM v_pengembalian_detail
WHERE id_organisasi_pemilik = (SELECT id_organisasi FROM organisasi WHERE singkatan = 'BEM')
ORDER BY tgl_selesai;

-- B7. Laporan manajerial (materialized view): rekap per OKI per bulan
SELECT oki_pemilik, bulan, total_pengajuan, total_disetujui, total_ditolak, total_unit_dipinjam, total_dikembalikan_terlambat
FROM mv_rekap_peminjaman_bulanan ORDER BY oki_pemilik, bulan;

-- B8. Barang terpopuler (peringkat 1 tiap OKI)
SELECT oki.singkatan AS oki, m.nama_barang, m.nama_kategori, m.total_peminjaman, m.peringkat
FROM mv_barang_terpopuler m JOIN organisasi oki ON oki.id_organisasi = m.id_organisasi_pemilik
WHERE m.peringkat = 1 AND m.total_peminjaman > 0 ORDER BY oki.singkatan;

-- B9. GROUP BY / HAVING: OKI peminjam dengan pengajuan ditolak
SELECT oki_peminjam, count(*) AS ditolak
FROM v_peminjaman_detail WHERE status = 'Ditolak' GROUP BY oki_peminjam HAVING count(*) >= 1;

-- B10. Subquery: barang yang belum pernah dipinjam
SELECT nama_barang, singkatan FROM v_inventaris
WHERE id_inventaris NOT IN (SELECT id_inventaris FROM peminjaman) ORDER BY singkatan, nama_barang;

-- B11. Rencana eksekusi query kalender (memakai idx_peminjaman_kuota)
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
SELECT * FROM peminjaman
WHERE id_inventaris = (SELECT id_inventaris FROM inventaris WHERE nama_barang = 'Tenda Dome 4P')
  AND status IN ('Diajukan', 'Disetujui', 'Dipinjam', 'Pengembalian')
  AND tgl_blok_mulai <= fn_hari_ini() + 7 AND tgl_blok_selesai >= fn_hari_ini() + 1;
