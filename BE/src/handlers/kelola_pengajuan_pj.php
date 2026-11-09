<?php
declare(strict_types=1);

/*
 * Persetujuan pengajuan PJ: PJ hanya memproses pemohon dari OKI yang sama.
 * Saat disetujui, trigger database menaikkan role pemohon menjadi Penanggung Jawab.
 */

function req_pj_milik_oki(int $id): array
{
    return ambil_atau_404(
        'SELECT id_request, status FROM v_request_pj_detail WHERE id_request = :id AND id_organisasi_pemohon = :org',
        ['id' => $id, 'org' => me()['id_organisasi']],
        'Pengajuan tidak ditemukan'
    );
}

function h_kj_list(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi_pemohon = ?', [me()['id_organisasi']]);
    $st = qs_enum_multi('status', STATUS_REQUEST_PJ);
    if ($st) {
        $w->add('status::text = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    filter_cari($w, ['nama_pemohon', 'nim_pemohon']);
    list_out(paginate(KOLOM_REQ_PJ, 'v_request_pj_detail', $w, "(status = 'Menunggu') DESC, id_request DESC"), 'req_pj_map');
}

/** Detail memuat lampiranUrl (tautan bertanda tangan berlaku 1 jam) untuk membuka surat. */
function h_kj_detail(array $p): void
{
    $r = ambil_atau_404(
        'SELECT * FROM v_request_pj_detail WHERE id_request = :id AND id_organisasi_pemohon = :org',
        ['id' => path_id($p), 'org' => me()['id_organisasi']],
        'Pengajuan tidak ditemukan'
    );
    json_out(camelize(req_pj_detail_map($r)));
}

function h_kj_setujui(array $p): void
{
    $id = path_id($p);
    req_pj_milik_oki($id);
    db_one(
        "SELECT sp_proses_request_pj(CAST(:id AS integer), CAST(:nim AS varchar), 'Setujui', NULL)",
        ['id' => $id, 'nim' => me()['nim']]
    );
    json_out(['message' => 'Pengajuan PJ disetujui, role pemohon sekarang Penanggung Jawab']);
}

/** POST .../tolak  { alasan } */
function h_kj_tolak(array $p): void
{
    $id = path_id($p);
    $err = [];
    $alasan = f_str('alasan', $err, true, 500, 'Alasan penolakan');
    validasi_selesai($err);
    req_pj_milik_oki($id);
    db_one(
        "SELECT sp_proses_request_pj(CAST(:id AS integer), CAST(:nim AS varchar), 'Tolak', CAST(:alasan AS text))",
        ['id' => $id, 'nim' => me()['nim'], 'alasan' => $alasan]
    );
    json_out(['message' => 'Pengajuan PJ ditolak']);
}
