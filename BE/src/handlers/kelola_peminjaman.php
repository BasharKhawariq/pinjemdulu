<?php
// Kelola Peminjaman (PJ).
//   GET /api/kelola-peminjaman[?status=&q=&dari=&sampai=&page=&limit=]  daftar (default: Diajukan,Disetujui,Ditolak,Dipinjam)
//   GET /api/kelola-peminjaman?id=                                      detail
//   PUT /api/kelola-peminjaman?id=   { "aksi": "setujui" | "tolak" | "serahkan", "alasanPenolakan": "..." }

$method = $_SERVER['REQUEST_METHOD'];
$id     = query_id();

try {
    $pj  = wajib_pj($pdo);
    $org = $pj['idOrganisasi'];

    switch ($method) {
        case 'GET':
            if ($id) {
                $r = ambil_peminjaman_pj($pdo, $org, $id);
                if (!$r) {
                    json_error('Peminjaman tidak ditemukan.', 'NOT_FOUND', 404);
                }
                json_out(camel_keys($r));
            }
            daftar_peminjaman_pj(
                $pdo, $org,
                ['Diajukan', 'Disetujui', 'Ditolak', 'Dipinjam'],
                "CASE p.status WHEN 'Diajukan' THEN 0 ELSE 1 END, p.tanggal_pengajuan DESC, p.id_peminjaman DESC"
            );

        case 'PUT':
            if (!$id) {
                json_error('Parameter id wajib.', 'ID_WAJIB', 400);
            }
            $in   = input();
            $aksi = $in['aksi'] ?? '';
            $peta = ['setujui' => 'Disetujui', 'tolak' => 'Ditolak', 'serahkan' => 'Dipinjam'];
            if (!is_string($aksi) || !isset($peta[$aksi])) {
                json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, ['aksi' => "Pilihan: setujui, tolak, serahkan."]);
            }
            $alasan = null;
            if ($aksi === 'tolak') {
                $alasan = trim((string)($in['alasanPenolakan'] ?? ''));
                if ($alasan === '' || mb_strlen($alasan) > 255) {
                    json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, [
                        'alasanPenolakan' => 'Alasan penolakan wajib diisi (maksimal 255 karakter).',
                    ]);
                }
            }

            $pdo->beginTransaction();
            $row = kunci_peminjaman_pj($pdo, $org, $id);
            if (!$row) {
                json_error('Peminjaman tidak ditemukan.', 'NOT_FOUND', 404);
            }
            $dari = ['setujui' => 'Diajukan', 'tolak' => 'Diajukan', 'serahkan' => 'Disetujui'][$aksi];
            if ($row['status'] !== $dari) {
                json_error("Aksi '$aksi' hanya untuk peminjaman berstatus $dari (sekarang: {$row['status']}).", 'STATUS_TIDAK_SESUAI', 409);
            }

            $stmt = $pdo->prepare('UPDATE peminjaman SET status = :st, alasan_penolakan = :alasan WHERE id_peminjaman = :id');
            $stmt->execute(['st' => $peta[$aksi], 'alasan' => $alasan, 'id' => $id]);
            $pdo->commit();

            json_out([
                'message'    => ['setujui' => 'Peminjaman disetujui.', 'tolak' => 'Peminjaman ditolak.', 'serahkan' => 'Barang ditandai sudah diserahkan (Dipinjam).'][$aksi],
                'peminjaman' => camel_keys(ambil_peminjaman_pj($pdo, $org, $id)),
            ]);

        default:
            json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    pdo_error($e);
}
