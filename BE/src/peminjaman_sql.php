<?php
// SQL bersama untuk endpoint PJ yang membaca peminjaman. Selalu dibatasi
// organisasi pemilik barang (i.id_organisasi = :org) oleh pemanggil.

const SQL_PJ_PEMINJAMAN = 'SELECT p.id_peminjaman, p.nim, u.nama_pengguna,
        p.id_inventaris, i.nama_barang, p.jumlah_pinjam,
        p.tanggal_pengajuan, p.start_date, p.end_date, p.tanggal_pengembalian,
        p.status, p.keperluan, p.alasan_penolakan,
        p.kondisi_sebelum, p.kondisi_sesudah, p.sanksi,
        (p.status = \'Terlambat\'
          OR (p.status = \'Dipinjam\' AND p.end_date < internal.fn_hari_ini())) AS terlambat,
        CASE WHEN p.status IN (\'Dipinjam\', \'MenungguPengembalian\', \'Terlambat\', \'Dikembalikan\')
             THEN GREATEST(COALESCE(p.tanggal_pengembalian, internal.fn_hari_ini()) - p.end_date, 0)
             ELSE 0 END AS hari_terlambat
    FROM peminjaman p
    JOIN inventaris i ON i.id_inventaris = p.id_inventaris
    LEFT JOIN pengguna u ON u.nim = p.nim';

const STATUS_PEMINJAMAN = ['Diajukan', 'Disetujui', 'Ditolak', 'Dipinjam', 'MenungguPengembalian', 'Dikembalikan', 'Terlambat'];

/**
 * Daftar peminjaman milik organisasi PJ, dengan filter status, pencarian (q),
 * rentang tanggal pengajuan (dari/sampai) dan paginasi. Langsung mengirim respons.
 */
function daftar_peminjaman_pj(PDO $pdo, int $org, array $statusDefault, string $urut): never
{
    $status = filter_enum('status', STATUS_PEMINJAMAN, $statusDefault);
    [$page, $limit, $offset] = paging();

    $params = ['org' => $org];
    $where  = ['i.id_organisasi = :org'];
    $where[] = 'p.status IN (' . in_params('st', $status, $params) . ')';

    $q = trim((string)($_GET['q'] ?? ''));
    if ($q !== '') {
        $like = '%' . like_escape($q) . '%';
        $where[] = '(i.nama_barang ILIKE :q1 OR u.nama_pengguna ILIKE :q2 OR p.nim ILIKE :q3)';
        $params['q1'] = $params['q2'] = $params['q3'] = $like;
    }
    foreach (['dari' => '>=', 'sampai' => '<='] as $kunci => $op) {
        $v = trim((string)($_GET[$kunci] ?? ''));
        if ($v !== '') {
            $d = DateTime::createFromFormat('!Y-m-d', $v);
            if (!$d || $d->format('Y-m-d') !== $v) {
                json_error("Parameter $kunci harus berformat YYYY-MM-DD.", 'VALIDASI_GAGAL', 422, [$kunci => 'Format YYYY-MM-DD']);
            }
            $where[] = "p.tanggal_pengajuan $op :$kunci";
            $params[$kunci] = $v;
        }
    }
    $w = ' WHERE ' . implode(' AND ', $where);

    $c = $pdo->prepare('SELECT COUNT(*) FROM peminjaman p
                          JOIN inventaris i ON i.id_inventaris = p.id_inventaris
                          LEFT JOIN pengguna u ON u.nim = p.nim' . $w);
    $c->execute($params);
    $total = (int)$c->fetchColumn();

    $stmt = $pdo->prepare(SQL_PJ_PEMINJAMAN . $w . " ORDER BY $urut LIMIT $limit OFFSET $offset");
    $stmt->execute($params);
    json_list($stmt->fetchAll(), $total, $page, $limit);
}

/** Satu peminjaman milik organisasi PJ, atau null bila tidak ada/bukan miliknya. */
function ambil_peminjaman_pj(PDO $pdo, int $org, int $id): ?array
{
    $stmt = $pdo->prepare(SQL_PJ_PEMINJAMAN . ' WHERE p.id_peminjaman = :id AND i.id_organisasi = :org');
    $stmt->execute(['id' => $id, 'org' => $org]);
    $r = $stmt->fetch();
    return $r ?: null;
}

/** Kunci baris peminjaman untuk diubah; null bila bukan milik organisasi PJ. */
function kunci_peminjaman_pj(PDO $pdo, int $org, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT p.id_peminjaman, p.status, p.start_date, p.end_date, p.tanggal_pengembalian
                             FROM peminjaman p
                             JOIN inventaris i ON i.id_inventaris = p.id_inventaris
                            WHERE p.id_peminjaman = :id AND i.id_organisasi = :org
                              FOR UPDATE OF p');
    $stmt->execute(['id' => $id, 'org' => $org]);
    $r = $stmt->fetch();
    return $r ?: null;
}
