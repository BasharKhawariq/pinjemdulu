<?php
declare(strict_types=1);

/*
 * Pengajuan Saya: riwayat peminjaman & pengembalian milik pengguna yang login
 * (Peminjam maupun PJ yang meminjam ke OKI lain).
 */

const STATUS_PEMINJAMAN = ['Diajukan', 'Disetujui', 'Dipinjam', 'Ditolak', 'Pengembalian', 'Selesai'];
const STATUS_PENGEMBALIAN = ['Menunggu', 'Dikembalikan', 'Ditolak', 'Terlambat'];

const KOLOM_PINJAM = "id_peminjaman, nim_peminjam, nama_peminjam, oki_peminjam, id_inventaris, nama_barang,
    id_organisasi_pemilik, oki_pemilik, logo_pemilik, jumlah_pinjam, tanggal_pengajuan, tgl_mulai, tgl_selesai,
    tanggal_pengambilan, keperluan, status, alasan_penolakan, nama_pemroses, created_at,
    (status = 'Dipinjam') AS bisa_ajukan_pengembalian";

const KOLOM_KEMBALI = 'id_pengembalian, id_peminjaman, nim_peminjam, nama_peminjam, oki_peminjam, id_organisasi_pemilik,
    oki_pemilik, nama_barang, jumlah_pinjam, tgl_mulai, tanggal_pengambilan, tgl_selesai, keperluan,
    tanggal_diajukan, tanggal_dikembalikan, status, lewat_tenggat';

function pinjam_map(array $r): array
{
    return urlkan($r, ['logo_pemilik' => 'logo_pemilik_url']);
}

/** Data pengembalian sebuah peminjaman (termasuk baris 'Terlambat' virtual), atau null. */
function pengembalian_dari_peminjaman(int $idPinjam): ?array
{
    $g = db_one(
        'SELECT id_pengembalian, status, tanggal_diajukan, tanggal_dikembalikan, lewat_tenggat, jumlah_dikembalikan,
                kondisi_kembali, foto_kondisi_path, sanksi, alasan_penolakan, nama_pemroses
         FROM v_pengembalian_detail WHERE id_peminjaman = :id
         ORDER BY (id_pengembalian IS NULL) LIMIT 1',
        ['id' => $idPinjam]
    );
    return $g ? urlize($g, 'foto_kondisi_path', 'foto_kondisi_url') : null;
}

/** Detail peminjaman lengkap + pengembalian; $w membatasi hak akses (pemilik data / OKI pemilik). */
function peminjaman_detail_out(string $kondisi, array $params): never
{
    $r = ambil_atau_404("SELECT * FROM v_peminjaman_detail WHERE $kondisi", $params, 'Peminjaman tidak ditemukan');
    $r = urlkan($r, ['logo_pemilik' => 'logo_pemilik_url', 'foto_pengambilan_path' => 'foto_pengambilan_url']);
    $r['bisa_ajukan_pengembalian'] = $r['status'] === 'Dipinjam';
    $r['pengembalian'] = pengembalian_dari_peminjaman((int) $r['id_peminjaman']);
    json_out(camelize($r));
}

/* ------------------------------ Peminjaman ------------------------------ */
function h_saya_peminjaman_list(array $p): void
{
    $w = new Where();
    $w->add('nim_peminjam = ?', [me()['nim']]);
    $st = qs_enum_multi('status', STATUS_PEMINJAMAN);
    if ($st) {
        $w->add('status::text = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    filter_cari($w, ['nama_barang', 'oki_pemilik']);
    filter_rentang($w, 'tgl_mulai', 'tgl_selesai');
    list_out(paginate(KOLOM_PINJAM, 'v_peminjaman_detail', $w, 'created_at DESC, id_peminjaman DESC'), 'pinjam_map');
}

function h_saya_peminjaman_detail(array $p): void
{
    peminjaman_detail_out('id_peminjaman = :id AND nim_peminjam = :nim', ['id' => path_id($p), 'nim' => me()['nim']]);
}

/** POST /api/pengajuan-saya/peminjaman/{id}/pengembalian : Ajukan Pengembalian (juga dari baris Terlambat). */
function h_saya_ajukan_pengembalian(array $p): void
{
    $id = path_id($p);
    $nim = me()['nim'];
    ambil_atau_404('SELECT 1 FROM peminjaman WHERE id_peminjaman = :id AND nim = :nim', ['id' => $id, 'nim' => $nim], 'Peminjaman tidak ditemukan');
    $idKembali = (int) db_val(
        'SELECT sp_ajukan_pengembalian(CAST(:id AS integer), CAST(:nim AS varchar))',
        ['id' => $id, 'nim' => $nim]
    );
    json_out(['message' => 'Pengajuan pengembalian berhasil dikirim', 'idPengembalian' => $idKembali], 201);
}

/* ------------------------------ Pengembalian ----------------------------- */
function h_saya_pengembalian_list(array $p): void
{
    $w = new Where();
    $w->add('nim_peminjam = ?', [me()['nim']]);
    $st = qs_enum_multi('status', STATUS_PENGEMBALIAN);
    if ($st) {
        $w->add('status = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    filter_cari($w, ['nama_barang', 'oki_pemilik']);
    filter_rentang($w, 'tgl_mulai', 'tgl_selesai');
    list_out(paginate(KOLOM_KEMBALI, 'v_pengembalian_detail', $w, 'COALESCE(tanggal_diajukan, tgl_selesai) DESC, id_peminjaman DESC'));
}

function h_saya_pengembalian_detail(array $p): void
{
    $r = ambil_atau_404(
        'SELECT * FROM v_pengembalian_detail WHERE id_pengembalian = :id AND nim_peminjam = :nim',
        ['id' => path_id($p), 'nim' => me()['nim']],
        'Pengembalian tidak ditemukan'
    );
    json_out(camelize(urlize($r, 'foto_kondisi_path', 'foto_kondisi_url')));
}

/** POST /api/pengajuan-saya/pengembalian/{id}/ajukan-ulang : Ajukan Kembali setelah ditolak PJ. */
function h_saya_ajukan_ulang(array $p): void
{
    $nim = me()['nim'];
    $r = ambil_atau_404(
        'SELECT id_peminjaman FROM v_pengembalian_detail WHERE id_pengembalian = :id AND nim_peminjam = :nim',
        ['id' => path_id($p), 'nim' => $nim],
        'Pengembalian tidak ditemukan'
    );
    $idKembali = (int) db_val(
        'SELECT sp_ajukan_pengembalian(CAST(:id AS integer), CAST(:nim AS varchar))',
        ['id' => $r['id_peminjaman'], 'nim' => $nim]
    );
    json_out(['message' => 'Pengajuan pengembalian dikirim ulang', 'idPengembalian' => $idKembali], 201);
}
