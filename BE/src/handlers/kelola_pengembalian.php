<?php
declare(strict_types=1);

/*
 * Kelola Pengembalian untuk barang milik OKI si PJ.
 * Baris berstatus 'Terlambat' belum punya id_pengembalian (dihitung view); untuk
 * barang terlambat, FE membuka detail lewat /kelola-peminjaman/{idPeminjaman}.
 */

function kembali_milik_oki(int $id): array
{
    return ambil_atau_404(
        'SELECT id_pengembalian, status FROM v_pengembalian_detail WHERE id_pengembalian = :id AND id_organisasi_pemilik = :org',
        ['id' => $id, 'org' => me()['id_organisasi']],
        'Pengembalian tidak ditemukan'
    );
}

function h_kg_list(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi_pemilik = ?', [me()['id_organisasi']]);
    $st = qs_enum_multi('status', STATUS_PENGEMBALIAN);
    if ($st) {
        $w->add('status = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    filter_cari($w, ['nama_barang', 'nama_peminjam', 'nim_peminjam', 'oki_peminjam']);
    filter_rentang($w, 'tgl_mulai', 'tgl_selesai');
    list_out(paginate(KOLOM_KEMBALI, 'v_pengembalian_detail', $w, 'COALESCE(tanggal_diajukan, tgl_selesai) DESC, id_peminjaman DESC'));
}

function h_kg_detail(array $p): void
{
    $r = ambil_atau_404(
        'SELECT * FROM v_pengembalian_detail WHERE id_pengembalian = :id AND id_organisasi_pemilik = :org',
        ['id' => path_id($p), 'org' => me()['id_organisasi']],
        'Pengembalian tidak ditemukan'
    );
    json_out(camelize(urlize($r, 'foto_kondisi_path', 'foto_kondisi_url')));
}

/** POST .../setujui (multipart): jumlah, tanggal, kondisi (Baik|Rusak), foto, sanksi? */
function h_kg_setujui(array $p): void
{
    $id = path_id($p);
    $err = [];
    $jumlah = f_int('jumlah', $err, true, 1, 999, 'Jumlah dikembalikan');
    $tgl = f_date('tanggal', $err, true, 'Tanggal pengembalian');
    $kondisi = f_enum('kondisi', $err, ['Baik', 'Rusak'], true, null, 'Kondisi barang');
    $sanksi = f_str('sanksi', $err, false, 500, 'Sanksi');
    $foto = upload_validasi('foto', MIME_GAMBAR, true, $err, 'Foto kondisi barang');
    validasi_selesai($err);
    kembali_milik_oki($id);

    $path = storage_put('kondisi', $foto);
    // Database memeriksa jumlah, mengubah kondisi inventaris, dan menjadikan peminjaman Selesai.
    bersihkan_jika_gagal([$path], fn() => db_one(
        'SELECT sp_setujui_pengembalian(CAST(:id AS integer), CAST(:nim AS varchar), CAST(:jml AS integer),
                                        CAST(:tgl AS date), CAST(:kond AS kondisi_barang), CAST(:path AS text), CAST(:sanksi AS text))',
        ['id' => $id, 'nim' => me()['nim'], 'jml' => $jumlah, 'tgl' => $tgl, 'kond' => $kondisi, 'path' => $path, 'sanksi' => $sanksi]
    ));
    json_out(['message' => 'Pengembalian disetujui, peminjaman selesai']);
}

/** POST .../tolak  { alasan } */
function h_kg_tolak(array $p): void
{
    $id = path_id($p);
    $err = [];
    $alasan = f_str('alasan', $err, true, 500, 'Alasan penolakan');
    validasi_selesai($err);
    kembali_milik_oki($id);
    db_one(
        'SELECT sp_tolak_pengembalian(CAST(:id AS integer), CAST(:nim AS varchar), CAST(:alasan AS text))',
        ['id' => $id, 'nim' => me()['nim'], 'alasan' => $alasan]
    );
    json_out(['message' => 'Pengembalian ditolak, peminjam dapat mengajukan ulang']);
}
