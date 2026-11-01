<?php
// List Pengajuan PJ: permintaan seorang Peminjam untuk menjadi PJ organisasi ini.
//   GET /api/kelola-pengajuan-pj[?status=&q=&page=&limit=]   daftar (default semua status, yang Diajukan paling atas)
//   GET /api/kelola-pengajuan-pj?id=                         detail
//   PUT /api/kelola-pengajuan-pj?id=  { "aksi": "setujui" | "tolak", "alasanPenolakan": "..." }
//   (lampiran: lihat /api/kelola-pengajuan-pj/lampiran)
// Persetujuan otomatis menaikkan pengaju menjadi Pengelola lewat trigger database.

const SQL_PJ_PENGAJUAN = 'SELECT r.id_request, r.nim, u.nama_pengguna, u.role AS role_saat_ini,
        r.id_organisasi, o.nama_organisasi, r.status, r.tanggal_request, r.alasan_penolakan,
        (r.lampiran_approval IS NOT NULL) AS punya_lampiran,
        octet_length(r.lampiran_approval) AS ukuran_lampiran
    FROM request_pj r
    JOIN organisasi o ON o.id_organisasi = r.id_organisasi
    LEFT JOIN pengguna u ON u.nim = r.nim';

function ambil_pengajuan_pj(PDO $pdo, int $org, int $id): ?array
{
    $stmt = $pdo->prepare(SQL_PJ_PENGAJUAN . ' WHERE r.id_request = :id AND r.id_organisasi = :org');
    $stmt->execute(['id' => $id, 'org' => $org]);
    $r = $stmt->fetch();
    return $r ?: null;
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = query_id();

try {
    $pj  = wajib_pj($pdo);
    $org = $pj['idOrganisasi'];

    switch ($method) {
        case 'GET':
            if ($id) {
                $r = ambil_pengajuan_pj($pdo, $org, $id);
                if (!$r) {
                    json_error('Pengajuan tidak ditemukan.', 'NOT_FOUND', 404);
                }
                json_out(camel_keys($r));
            }

            $status = filter_enum('status', ['Diajukan', 'Disetujui', 'Ditolak'], ['Diajukan', 'Disetujui', 'Ditolak']);
            [$page, $limit, $offset] = paging();

            $params = ['org' => $org];
            $where  = ['r.id_organisasi = :org'];
            $where[] = 'r.status IN (' . in_params('st', $status, $params) . ')';
            $q = trim((string)($_GET['q'] ?? ''));
            if ($q !== '') {
                $like = '%' . like_escape($q) . '%';
                $where[] = '(u.nama_pengguna ILIKE :q1 OR r.nim ILIKE :q2)';
                $params['q1'] = $params['q2'] = $like;
            }
            $w = ' WHERE ' . implode(' AND ', $where);

            $c = $pdo->prepare('SELECT COUNT(*) FROM request_pj r LEFT JOIN pengguna u ON u.nim = r.nim' . $w);
            $c->execute($params);
            $total = (int)$c->fetchColumn();

            $stmt = $pdo->prepare(SQL_PJ_PENGAJUAN . $w .
                " ORDER BY CASE r.status WHEN 'Diajukan' THEN 0 ELSE 1 END, r.tanggal_request DESC, r.id_request DESC
                  LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            json_list($stmt->fetchAll(), $total, $page, $limit);

        case 'PUT':
            if (!$id) {
                json_error('Parameter id wajib.', 'ID_WAJIB', 400);
            }
            $in   = input();
            $aksi = $in['aksi'] ?? '';
            if (!in_array($aksi, ['setujui', 'tolak'], true)) {
                json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, ['aksi' => 'Pilihan: setujui, tolak.']);
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
            $stmt = $pdo->prepare('SELECT status FROM request_pj WHERE id_request = :id AND id_organisasi = :org FOR UPDATE');
            $stmt->execute(['id' => $id, 'org' => $org]);
            $status = $stmt->fetchColumn();
            if ($status === false) {
                json_error('Pengajuan tidak ditemukan.', 'NOT_FOUND', 404);
            }
            if ($status !== 'Diajukan') {
                json_error("Pengajuan sudah diproses (status: $status).", 'STATUS_TIDAK_SESUAI', 409);
            }

            $pdo->prepare('UPDATE request_pj SET status = :st, alasan_penolakan = :alasan WHERE id_request = :id')
                ->execute(['st' => $aksi === 'setujui' ? 'Disetujui' : 'Ditolak', 'alasan' => $alasan, 'id' => $id]);
            $pdo->commit();

            json_out([
                'message'   => $aksi === 'setujui'
                    ? 'Pengajuan disetujui. Pengaju kini menjadi PJ organisasi ini.'
                    : 'Pengajuan ditolak.',
                'pengajuan' => camel_keys(ambil_pengajuan_pj($pdo, $org, $id)),
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
