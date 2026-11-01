<?php
// Kelola Pengguna (PJ). Cakupan: anggota organisasi PJ + peminjam yang pernah
// meminjam barang organisasi ini. Pengguna di luar cakupan dianggap tidak ada.
//   GET /api/kelola-pengguna[?q=&role=&statusAkun=aktif|nonaktif&page=&limit=]   daftar
//   GET /api/kelola-pengguna?nim=                                              detail + 10 peminjaman terakhir
//   PUT /api/kelola-pengguna?nim=  { "aksi": "nonaktifkan" | "aktifkan" | "cabutPj" }
//        nonaktifkan/aktifkan : hanya untuk Peminjam (akun status_akun)
//        cabutPj              : mencabut hak PJ anggota organisasi ini (role -> Peminjam)
//   PJ tidak bisa mengubah akunnya sendiri.

const SQL_PJ_PENGGUNA = 'SELECT u.nim, u.nama_pengguna, u.role, u.status_akun,
        u.id_organisasi, o.nama_organisasi,
        (u.id_organisasi = :org1) AS anggota_organisasi,
        COALESCE(s.total_peminjaman, 0)::int AS total_peminjaman,
        COALESCE(s.sedang_dipinjam, 0)::int  AS sedang_dipinjam,
        COALESCE(s.terlambat, 0)::int        AS terlambat
    FROM pengguna u
    LEFT JOIN organisasi o ON o.id_organisasi = u.id_organisasi
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total_peminjaman,
               COUNT(*) FILTER (WHERE (p.status = \'Dipinjam\' AND p.end_date >= internal.fn_hari_ini())
                                   OR p.status = \'MenungguPengembalian\') AS sedang_dipinjam,
               COUNT(*) FILTER (WHERE p.status = \'Terlambat\'
                                   OR (p.status = \'Dipinjam\' AND p.end_date < internal.fn_hari_ini())) AS terlambat
          FROM peminjaman p
          JOIN inventaris i ON i.id_inventaris = p.id_inventaris
         WHERE p.nim = u.nim AND i.id_organisasi = :org2
    ) s ON TRUE';

const SQL_PJ_PENGGUNA_CAKUPAN = '(u.id_organisasi = :org3 OR COALESCE(s.total_peminjaman, 0) > 0)';

function ambil_pengguna_pj(PDO $pdo, int $org, string $nim): ?array
{
    $stmt = $pdo->prepare(SQL_PJ_PENGGUNA . ' WHERE u.nim = :nim AND ' . SQL_PJ_PENGGUNA_CAKUPAN);
    $stmt->execute(['org1' => $org, 'org2' => $org, 'org3' => $org, 'nim' => $nim]);
    $r = $stmt->fetch();
    return $r ?: null;
}

$method = $_SERVER['REQUEST_METHOD'];
$nim    = isset($_GET['nim']) ? trim((string)$_GET['nim']) : null;
if ($nim !== null && ($nim === '' || mb_strlen($nim) > 15)) {
    json_error('Parameter nim tidak valid.', 'VALIDASI_GAGAL', 400);
}

try {
    $pj  = wajib_pj($pdo);
    $org = $pj['idOrganisasi'];

    switch ($method) {
        case 'GET':
            if ($nim !== null) {
                $u = ambil_pengguna_pj($pdo, $org, $nim);
                if (!$u) {
                    json_error('Pengguna tidak ditemukan.', 'NOT_FOUND', 404);
                }
                $stmt = $pdo->prepare(SQL_PJ_PEMINJAMAN . ' WHERE p.nim = :nim AND i.id_organisasi = :org
                                         ORDER BY p.id_peminjaman DESC LIMIT 10');
                $stmt->execute(['nim' => $nim, 'org' => $org]);
                $out = camel_keys($u);
                $out['peminjamanTerakhir'] = array_map('camel_keys', $stmt->fetchAll());
                json_out($out);
            }

            [$page, $limit, $offset] = paging();
            $params = ['org1' => $org, 'org2' => $org, 'org3' => $org];
            $where  = [SQL_PJ_PENGGUNA_CAKUPAN];

            $role = filter_enum('role', ['Peminjam', 'Pengelola'], []);
            if ($role) {
                $where[] = 'u.role::text IN (' . in_params('rl', $role, $params) . ')';
            }
            $sa = trim((string)($_GET['statusAkun'] ?? ''));
            if ($sa !== '') {
                if (!in_array($sa, ['aktif', 'nonaktif'], true)) {
                    json_error('Nilai statusAkun tidak valid.', 'VALIDASI_GAGAL', 422, ['statusAkun' => 'Pilihan: aktif, nonaktif']);
                }
                $where[] = $sa === 'aktif' ? 'u.status_akun' : 'NOT u.status_akun';
            }
            $q = trim((string)($_GET['q'] ?? ''));
            if ($q !== '') {
                $like = '%' . like_escape($q) . '%';
                $where[] = '(u.nama_pengguna ILIKE :q1 OR u.nim ILIKE :q2)';
                $params['q1'] = $params['q2'] = $like;
            }
            $w = ' WHERE ' . implode(' AND ', $where);

            $c = $pdo->prepare('SELECT COUNT(*) FROM (' . SQL_PJ_PENGGUNA . $w . ') x');
            $c->execute($params);
            $total = (int)$c->fetchColumn();

            $stmt = $pdo->prepare(SQL_PJ_PENGGUNA . $w . " ORDER BY (u.id_organisasi = :org4) DESC NULLS LAST, u.nama_pengguna
                                    LIMIT $limit OFFSET $offset");
            $stmt->execute($params + ['org4' => $org]);
            json_list($stmt->fetchAll(), $total, $page, $limit);

        case 'PUT':
            if ($nim === null) {
                json_error('Parameter nim wajib.', 'ID_WAJIB', 400);
            }
            $aksi = input()['aksi'] ?? '';
            if (!in_array($aksi, ['nonaktifkan', 'aktifkan', 'cabutPj'], true)) {
                json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, ['aksi' => 'Pilihan: nonaktifkan, aktifkan, cabutPj.']);
            }
            if ($nim === $pj['nim']) {
                json_error('Anda tidak bisa mengubah akun Anda sendiri.', 'AKSI_DITOLAK', 403);
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare('SELECT nim, role, id_organisasi, status_akun FROM pengguna WHERE nim = :nim FOR UPDATE');
            $stmt->execute(['nim' => $nim]);
            $t = $stmt->fetch();
            // Di luar cakupan (bukan anggota & tidak pernah meminjam barang organisasi ini) = tidak ada
            if (!$t || !ambil_pengguna_pj($pdo, $org, $nim)) {
                json_error('Pengguna tidak ditemukan.', 'NOT_FOUND', 404);
            }

            if ($aksi === 'cabutPj') {
                if ($t['role'] !== 'Pengelola' || (int)$t['id_organisasi'] !== $org) {
                    json_error('Pengguna ini bukan PJ di organisasi Anda.', 'STATUS_TIDAK_SESUAI', 409);
                }
                $pdo->prepare("UPDATE pengguna SET role = 'Peminjam', id_organisasi = NULL WHERE nim = :nim")
                    ->execute(['nim' => $nim]);
                $pesan = 'Hak PJ dicabut. Pengguna kembali menjadi Peminjam.';
            } else {
                if ($t['role'] !== 'Peminjam') {
                    json_error('Akun PJ tidak bisa dinonaktifkan dari sini. Cabut hak PJ-nya dulu (aksi cabutPj).', 'AKSI_DITOLAK', 403);
                }
                $aktif = $aksi === 'aktifkan';
                if ((bool)$t['status_akun'] === $aktif) {
                    json_error('Akun sudah dalam keadaan ' . ($aktif ? 'aktif' : 'nonaktif') . '.', 'STATUS_TIDAK_SESUAI', 409);
                }
                $up = $pdo->prepare('UPDATE pengguna SET status_akun = :a WHERE nim = :nim');
                $up->bindValue('a', $aktif, PDO::PARAM_BOOL);
                $up->bindValue('nim', $nim);
                $up->execute();
                $pesan = $aktif ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.';
            }
            $pdo->commit();

            json_out(['message' => $pesan, 'pengguna' => camel_keys(ambil_pengguna_pj($pdo, $org, $nim) ?? [])]);

        default:
            json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    pdo_error($e);
}
