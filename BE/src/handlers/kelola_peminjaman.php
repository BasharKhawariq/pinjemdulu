<?php
declare(strict_types=1);

/*
 * Kelola Peminjaman: pengajuan untuk barang milik OKI si PJ.
 * Data peminjaman OKI lain dianggap tidak ada (404).
 */

/** Pastikan peminjaman ada dan barangnya milik OKI si PJ. */
function pinjam_milik_oki(int $id): array
{
    return ambil_atau_404(
        'SELECT id_peminjaman, status FROM v_peminjaman_detail WHERE id_peminjaman = :id AND id_organisasi_pemilik = :org',
        ['id' => $id, 'org' => me()['id_organisasi']],
        'Peminjaman tidak ditemukan'
    );
}

function h_kp_list(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi_pemilik = ?', [me()['id_organisasi']]);
    $st = qs_enum_multi('status', STATUS_PEMINJAMAN);
    if ($st) {
        $w->add('status::text = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    filter_cari($w, ['nama_barang', 'nama_peminjam', 'nim_peminjam', 'oki_peminjam']);
    filter_rentang($w, 'tgl_mulai', 'tgl_selesai');
    list_out(paginate(KOLOM_PINJAM, 'v_peminjaman_detail', $w, 'created_at DESC, id_peminjaman DESC'), 'pinjam_map');
}

function h_kp_detail(array $p): void
{
    peminjaman_detail_out(
        'id_peminjaman = :id AND id_organisasi_pemilik = :org',
        ['id' => path_id($p), 'org' => me()['id_organisasi']]
    );
}

function h_kp_setujui(array $p): void
{
    $id = path_id($p);
    pinjam_milik_oki($id);
    db_one(
        "SELECT sp_proses_peminjaman(CAST(:id AS integer), CAST(:nim AS varchar), 'Setujui', NULL)",
        ['id' => $id, 'nim' => me()['nim']]
    );
    json_out(['message' => 'Pengajuan peminjaman disetujui']);
}

/** POST .../tolak  { alasan } */
function h_kp_tolak(array $p): void
{
    $id = path_id($p);
    $err = [];
    $alasan = f_str('alasan', $err, true, 500, 'Alasan penolakan');
    validasi_selesai($err);
    pinjam_milik_oki($id);
    db_one(
        "SELECT sp_proses_peminjaman(CAST(:id AS integer), CAST(:nim AS varchar), 'Tolak', CAST(:alasan AS text))",
        ['id' => $id, 'nim' => me()['nim'], 'alasan' => $alasan]
    );
    json_out(['message' => 'Pengajuan peminjaman ditolak']);
}

/** POST .../pengambilan (multipart): tanggal (YYYY-MM-DD), foto (JPG/PNG maks 2 MB) */
function h_kp_pengambilan(array $p): void
{
    $id = path_id($p);
    $err = [];
    $tgl = f_date('tanggal', $err, true, 'Tanggal pengambilan');
    $foto = upload_validasi('foto', MIME_GAMBAR, true, $err, 'Foto pengambilan');
    validasi_selesai($err);
    pinjam_milik_oki($id);

    $path = storage_put('pengambilan', $foto);
    bersihkan_jika_gagal([$path], fn() => db_one(
        'SELECT sp_pengambilan_barang(CAST(:id AS integer), CAST(:nim AS varchar), CAST(:tgl AS date), CAST(:path AS text))',
        ['id' => $id, 'nim' => me()['nim'], 'tgl' => $tgl, 'path' => $path]
    ));
    json_out(['message' => 'Pengambilan barang dicatat, status peminjaman menjadi Dipinjam']);
}
