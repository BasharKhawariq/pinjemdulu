<?php
declare(strict_types=1);

/*
 * Laporan dari materialized view (disegarkan pg_cron setiap 30 menit atau manual lewat /laporan/refresh).
 * Selalu difilter ke OKI pemilik barang = OKI si PJ.
 */

/** GET /api/laporan/rekap?tahun=2026 : rekap per bulan (terbaru dulu). */
function h_laporan_rekap(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi_pemilik = ?', [me()['id_organisasi']]);
    $tahun = qs('tahun');
    if ($tahun !== '') {
        if (!preg_match('/^(19|20)\d{2}$/', $tahun)) {
            fail(422, 'VALIDASI_GAGAL', 'Parameter tahun tidak valid', ['tahun' => 'Harus berformat YYYY']);
        }
        $w->add('bulan >= CAST(? AS date) AND bulan <= CAST(? AS date)', ["$tahun-01-01", "$tahun-12-01"]);
    }
    $rows = db_all(
        'SELECT oki_pemilik, bulan, total_pengajuan, total_disetujui, total_ditolak, total_unit_dipinjam,
                total_dikembalikan_terlambat
         FROM mv_rekap_peminjaman_bulanan WHERE ' . $w->sql() . ' ORDER BY bulan DESC',
        $w->params
    );
    json_out(['data' => array_map('camelize', $rows)]);
}

/** GET /api/laporan/barang-populer?limit=10 */
function h_laporan_populer(array $p): void
{
    $limit = min(100, max(1, (int) ($_GET['limit'] ?? 10)));
    $rows = db_all(
        "SELECT peringkat, id_inventaris, nama_barang, nama_kategori, total_peminjaman, total_unit_dipinjam
         FROM mv_barang_terpopuler WHERE id_organisasi_pemilik = :org
         ORDER BY peringkat, nama_barang LIMIT $limit",
        ['org' => me()['id_organisasi']]
    );
    json_out(['data' => array_map('camelize', $rows)]);
}

/** POST /api/laporan/refresh : segarkan laporan sekarang (dibatasi agar tidak membebani database). */
function h_laporan_refresh(array $p): void
{
    $kunci = 'refresh-laporan:' . me()['nim'];
    rl_check($kunci, 3, 600);
    rl_hit($kunci, 600);
    db_exec('CALL sp_refresh_laporan()');
    json_out(['message' => 'Laporan berhasil disegarkan', 'waktu' => date('c')]);
}
