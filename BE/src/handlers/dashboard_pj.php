<?php
// GET /api/dashboard-pj  -- ringkasan untuk Dashboard PJ (organisasi milik PJ yang login).

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $pj  = wajib_pj($pdo);
    $org = $pj['idOrganisasi'];

    // Peminjaman. "terlambat" = status Terlambat + Dipinjam yang sudah lewat tanggal akhir
    // (sebelum cron menandainya); sedangDipinjam hanya yang belum lewat.
    $s = $pdo->prepare("SELECT
            COUNT(*) FILTER (WHERE p.status = 'Diajukan')::int  AS menunggu_persetujuan,
            COUNT(*) FILTER (WHERE p.status = 'Disetujui')::int AS siap_diserahkan,
            COUNT(*) FILTER (WHERE (p.status = 'Dipinjam' AND p.end_date >= internal.fn_hari_ini())
                                OR p.status = 'MenungguPengembalian')::int AS sedang_dipinjam,
            COUNT(*) FILTER (WHERE p.status = 'MenungguPengembalian')::int AS menunggu_konfirmasi_pengembalian,
            COUNT(*) FILTER (WHERE p.status = 'Terlambat'
                                OR (p.status = 'Dipinjam' AND p.end_date < internal.fn_hari_ini()))::int AS terlambat,
            COUNT(*) FILTER (WHERE p.status = 'Dipinjam'
                               AND p.end_date = internal.fn_hari_ini())::int AS jatuh_tempo_hari_ini,
            COUNT(*) FILTER (WHERE p.status = 'Dikembalikan')::int AS sudah_dikembalikan
          FROM peminjaman p
          JOIN inventaris i ON i.id_inventaris = p.id_inventaris
         WHERE i.id_organisasi = :org");
    $s->execute(['org' => $org]);
    $peminjaman = camel_keys($s->fetch());

    // Inventaris
    $s = $pdo->prepare("SELECT COUNT(*)::int AS jenis_barang,
            COALESCE(SUM(i.total_barang), 0)::int AS total_unit,
            COALESCE(SUM(r.jumlah_tersedia), 0)::int AS unit_tersedia,
            COUNT(*) FILTER (WHERE i.kondisi = 'Rusak')::int AS barang_rusak
          FROM inventaris i
          JOIN v_inv_ringkas r ON r.id_inventaris = i.id_inventaris
         WHERE i.id_organisasi = :org");
    $s->execute(['org' => $org]);
    $inventaris = camel_keys($s->fetch());

    // Pengajuan PJ & anggota
    $s = $pdo->prepare("SELECT
            (SELECT COUNT(*) FROM request_pj WHERE id_organisasi = :o1 AND status = 'Diajukan')::int AS pengajuan_pj_menunggu,
            (SELECT COUNT(*) FROM pengguna WHERE id_organisasi = :o2 AND role = 'Pengelola' AND status_akun)::int AS jumlah_pj");
    $s->execute(['o1' => $org, 'o2' => $org]);
    $lain = camel_keys($s->fetch());

    // Pengajuan peminjaman yang menunggu keputusan (paling lama dulu)
    $s = $pdo->prepare(SQL_PJ_PEMINJAMAN . " WHERE i.id_organisasi = :org AND p.status = 'Diajukan'
                         ORDER BY p.tanggal_pengajuan, p.id_peminjaman LIMIT 5");
    $s->execute(['org' => $org]);
    $perluDiputuskan = array_map('camel_keys', $s->fetchAll());

    // Peminjaman yang perlu ditagih: terlambat / jatuh tempo hari ini
    $s = $pdo->prepare(SQL_PJ_PEMINJAMAN . " WHERE i.id_organisasi = :org
                          AND p.tanggal_pengembalian IS NULL
                          AND (p.status = 'Terlambat'
                               OR (p.status = 'Dipinjam' AND p.end_date <= internal.fn_hari_ini()))
                         ORDER BY p.end_date, p.id_peminjaman LIMIT 5");
    $s->execute(['org' => $org]);
    $perluDitagih = array_map('camel_keys', $s->fetchAll());

    json_out([
        'pj'         => $pj,
        'peminjaman' => $peminjaman,
        'inventaris' => $inventaris,
        'pengajuanPj' => ['menunggu' => $lain['pengajuanPjMenunggu']],
        'jumlahPj'   => $lain['jumlahPj'],
        'perluDiputuskan' => $perluDiputuskan,
        'perluDitagih'    => $perluDitagih,
    ]);
} catch (PDOException $e) {
    pdo_error($e);
}
