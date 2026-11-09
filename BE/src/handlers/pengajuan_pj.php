<?php
declare(strict_types=1);

/*
 * Pengajuan naik role menjadi PJ (khusus role Peminjam) + dashboard PJ.
 */

const STATUS_REQUEST_PJ = ['Menunggu', 'Disetujui', 'Ditolak'];

const KOLOM_REQ_PJ = 'id_request, nim_pemohon, nama_pemohon, oki_pemohon, logo_path, tanggal_request, status,
    alasan_penolakan, nama_pemroses, tanggal_diproses';

function req_pj_map(array $r): array
{
    return urlkan($r, ['logo_path' => 'logo_url']);
}

function req_pj_detail_map(array $r): array
{
    return urlkan($r, ['logo_path' => 'logo_url', 'lampiran_path' => 'lampiran_url']);
}

function h_pengajuan_pj_list(array $p): void
{
    $w = new Where();
    $w->add('nim_pemohon = ?', [me()['nim']]);
    $st = qs_enum_multi('status', STATUS_REQUEST_PJ);
    if ($st) {
        $w->add('status::text = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    list_out(paginate(KOLOM_REQ_PJ, 'v_request_pj_detail', $w, 'id_request DESC'), 'req_pj_map');
}

function h_pengajuan_pj_detail(array $p): void
{
    $r = ambil_atau_404(
        'SELECT * FROM v_request_pj_detail WHERE id_request = :id AND nim_pemohon = :nim',
        ['id' => path_id($p), 'nim' => me()['nim']],
        'Pengajuan tidak ditemukan'
    );
    json_out(camelize(req_pj_detail_map($r)));
}

/** POST /api/pengajuan-pj (multipart) : berkas `lampiran` (surat rekomendasi, maks 2 MB). */
function h_pengajuan_pj_buat(array $p): void
{
    $u = me();
    $err = [];
    $file = upload_validasi('lampiran', MIME_LAMPIRAN, true, $err, 'Lampiran surat');
    validasi_selesai($err);

    // Cegah unggahan sia-sia bila sudah ada pengajuan yang menunggu (aturan tetap dijaga database).
    if (db_val("SELECT 1 FROM request_pj WHERE nim = :nim AND status = 'Menunggu'", ['nim' => $u['nim']])) {
        fail(422, 'ATURAN_BISNIS', 'Masih ada pengajuan PJ yang menunggu keputusan');
    }

    $path = storage_put('lampiran-pj', $file);
    $id = (int) bersihkan_jika_gagal([$path], fn() => db_val(
        'SELECT sp_ajukan_pj(CAST(:nim AS varchar), CAST(:path AS text))',
        ['nim' => $u['nim'], 'path' => $path]
    ));
    json_out(['message' => 'Pengajuan PJ berhasil dikirim', 'idRequest' => $id], 201);
}

/* ------------------------------ Dashboard PJ ------------------------------ */
function h_dashboard_pj(array $p): void
{
    $r = db_one('SELECT * FROM v_dashboard_pj WHERE id_organisasi = :org', ['org' => me()['id_organisasi']]);
    json_out(camelize($r ?? []));
}
