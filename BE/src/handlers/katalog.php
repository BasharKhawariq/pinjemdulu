<?php
declare(strict_types=1);

/*
 * Katalog barang OKI lain, kalender ketersediaan, dan pengajuan peminjaman.
 * Berlaku untuk semua role. Barang milik OKI sendiri tidak pernah ditampilkan
 * (aturan ini juga dijaga trigger saat pengajuan).
 */

const KOLOM_KATALOG = 'id_inventaris, nama_barang, id_kategori, nama_kategori, id_organisasi, nama_organisasi,
    singkatan, logo_path, total_unit, unit_keluar, jumlah_tersedia, kondisi, ketersediaan, deskripsi, foto_path';

function katalog_map(array $r): array
{
    return urlkan($r, ['foto_path' => 'foto_url', 'logo_path' => 'logo_url']);
}

/** Barang harus ada di katalog dan bukan milik OKI pengguna; selain itu 404. */
function katalog_pastikan(int $id): array
{
    return ambil_atau_404(
        'SELECT ' . KOLOM_KATALOG . ' FROM v_katalog_inventaris WHERE id_inventaris = :id AND id_organisasi <> :org',
        ['id' => $id, 'org' => me()['id_organisasi']],
        'Barang tidak ditemukan'
    );
}

/** Validasi rentang tanggal untuk query kalender (cegah rentang raksasa). */
function rentang_valid(string $dari, string $sampai, string $kunci, int $maksHari = 400): void
{
    $a = new DateTimeImmutable($dari);
    $b = new DateTimeImmutable($sampai);
    if ($b < $a) {
        fail(422, 'VALIDASI_GAGAL', 'Rentang tanggal tidak valid', [$kunci => 'Tanggal selesai tidak boleh sebelum tanggal mulai']);
    }
    if ($a->diff($b)->days > $maksHari) {
        fail(422, 'VALIDASI_GAGAL', 'Rentang tanggal terlalu panjang', [$kunci => "Maksimal $maksHari hari"]);
    }
}

function h_katalog(array $p): void
{
    $u = me();
    $w = new Where();
    $w->add('id_organisasi <> ?', [$u['id_organisasi']]);

    $kat = qs_ids('kategori');
    if ($kat) {
        $w->add('id_kategori = ANY(CAST(? AS integer[]))', [pg_array($kat)]);
    }
    $org = qs_ids('organisasi');
    if ($org) {
        $w->add('id_organisasi = ANY(CAST(? AS integer[]))', [pg_array($org)]);
    }
    $ket = qs_enum('ketersediaan', ['Tersedia', 'Dipinjam']);
    if ($ket !== null) {
        $w->add('ketersediaan = ?', [$ket]);
    }
    filter_cari($w, ['nama_barang', 'nama_kategori', 'singkatan']);

    list_out(paginate(KOLOM_KATALOG, 'v_katalog_inventaris', $w, 'nama_barang, id_inventaris', 12), 'katalog_map');
}

function h_katalog_detail(array $p): void
{
    $id = path_id($p);
    $r = katalog_map(katalog_pastikan($id));
    $r['jadwal'] = db_all(
        "SELECT tgl_mulai, tgl_selesai, keperluan, jumlah_pinjam, status
         FROM v_jadwal_peminjaman
         WHERE id_inventaris = :id AND (tgl_selesai >= fn_hari_ini() OR status = 'Dipinjam')
         ORDER BY tgl_mulai, tgl_selesai",
        ['id' => $id]
    );
    json_out(camelize($r));
}

/** GET /api/inventaris/{id}/kalender?dari=YYYY-MM-DD&sampai=YYYY-MM-DD (bawaan: hari ini + 120 hari) */
function h_kalender(array $p): void
{
    $id = path_id($p);
    katalog_pastikan($id);

    $dari = qs_date('dari') ?? hari_ini();
    $sampai = qs_date('sampai') ?? (new DateTimeImmutable($dari))->modify('+120 days')->format('Y-m-d');
    rentang_valid($dari, $sampai, 'sampai');

    $rows = db_all(
        'SELECT tanggal, total_unit, unit_dipinjam, unit_persiapan, terpakai, sisa_unit, penanda
         FROM fn_kalender_ketersediaan(CAST(:id AS integer), CAST(:dari AS date), CAST(:sampai AS date))',
        ['id' => $id, 'dari' => $dari, 'sampai' => $sampai]
    );
    json_out([
        'data' => array_map('camelize', $rows),
        'meta' => [
            'dari' => $dari,
            'sampai' => $sampai,
            'tanggalMulaiPalingCepat' => (string) db_val('SELECT fn_hari_ini() + 2'),
        ],
    ]);
}

/** GET /api/inventaris/{id}/cek?mulai=...&selesai=... : batas unit + peringatan jadwal berdekatan. */
function h_cek_jadwal(array $p): void
{
    $id = path_id($p);
    katalog_pastikan($id);

    $mulai = qs_date('mulai');
    $selesai = qs_date('selesai');
    $err = [];
    if ($mulai === null) {
        $err['mulai'] = 'Tanggal mulai wajib diisi';
    }
    if ($selesai === null) {
        $err['selesai'] = 'Tanggal selesai wajib diisi';
    }
    validasi_selesai($err);
    rentang_valid($mulai, $selesai, 'selesai', 120);

    $r = db_one(
        'SELECT fn_maks_unit_tersedia(CAST(:id1 AS integer), CAST(:m1 AS date), CAST(:s1 AS date)) AS maks,
                fn_jadwal_berdekatan(CAST(:id2 AS integer), CAST(:m2 AS date), CAST(:s2 AS date)) AS dekat',
        ['id1' => $id, 'm1' => $mulai, 's1' => $selesai, 'id2' => $id, 'm2' => $mulai, 's2' => $selesai]
    );
    json_out([
        'idInventaris' => $id,
        'mulai' => $mulai,
        'selesai' => $selesai,
        'maksUnitTersedia' => (int) $r['maks'],
        'jadwalBerdekatan' => (bool) $r['dekat'],
    ]);
}

/** POST /api/peminjaman  { idInventaris, jumlahPinjam, tglMulai, tglSelesai, keperluan } */
function h_ajukan_peminjaman(array $p): void
{
    $u = me();
    $err = [];
    $id = f_int('idInventaris', $err, true, 1, 2147483647, 'Barang');
    $jml = f_int('jumlahPinjam', $err, true, 1, 999, 'Jumlah unit');
    $mulai = f_date('tglMulai', $err, true, 'Tanggal mulai');
    $selesai = f_date('tglSelesai', $err, true, 'Tanggal selesai');
    $kep = f_str('keperluan', $err, true, 255, 'Keperluan');
    validasi_selesai($err);

    // Seluruh aturan (H+2, kuota per hari, kondisi, OKI sendiri) dijalankan trigger database.
    $idBaru = (int) db_val(
        'SELECT sp_ajukan_peminjaman(CAST(:nim AS varchar), CAST(:inv AS integer), CAST(:jml AS integer),
                                     CAST(:m AS date), CAST(:s AS date), CAST(:kep AS varchar))',
        ['nim' => $u['nim'], 'inv' => $id, 'jml' => $jml, 'm' => $mulai, 's' => $selesai, 'kep' => $kep]
    );
    json_out(['message' => 'Pengajuan peminjaman berhasil dikirim', 'idPeminjaman' => $idBaru], 201);
}

function h_dashboard(array $p): void
{
    $r = db_one('SELECT * FROM v_dashboard_peminjam WHERE nim = :nim', ['nim' => me()['nim']]);
    json_out(camelize($r ?? []));
}
