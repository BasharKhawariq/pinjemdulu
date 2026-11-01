<?php
// Kelola Pengembalian (PJ).
//   GET /api/kelola-pengembalian[?status=&q=&dari=&sampai=&page=&limit=]  daftar (default: MenungguPengembalian,Dipinjam,Terlambat = belum kembali)
//                                                                    ?status=Dikembalikan untuk riwayat pengembalian
//   GET /api/kelola-pengembalian?id=                                      detail
//   PUT /api/kelola-pengembalian?id=  { "tanggalPengembalian": "YYYY-MM-DD" (opsional, default hari ini),
//                                   "kondisiSesudah": "Baik"|"Rusak", "sanksi": "..." (opsional) }
//        Bila peminjaman sudah Dikembalikan, PUT hanya boleh mengubah "sanksi".
//   PUT /api/kelola-pengembalian?id=  { "aksi": "tolak", "alasanPenolakan": "..." }
//        "Tolak pengembalian": hanya untuk status MenungguPengembalian -> Terlambat (alasan wajib).

$method = $_SERVER['REQUEST_METHOD'];
$id     = query_id();

try {
    $pj  = wajib_pj($pdo);
    $org = $pj['idOrganisasi'];

    switch ($method) {
        case 'GET':
            if ($id) {
                $r = ambil_peminjaman_pj($pdo, $org, $id);
                if (!$r || !in_array($r['status'], ['Dipinjam', 'MenungguPengembalian', 'Terlambat', 'Dikembalikan'], true)) {
                    json_error('Data pengembalian tidak ditemukan.', 'NOT_FOUND', 404);
                }
                json_out(camel_keys($r));
            }
            daftar_peminjaman_pj(
                $pdo, $org,
                ['MenungguPengembalian', 'Dipinjam', 'Terlambat'],
                'p.end_date, p.id_peminjaman'
            );

        case 'PUT':
            if (!$id) {
                json_error('Parameter id wajib.', 'ID_WAJIB', 400);
            }
            $in  = input();
            $err = [];
            $aksi = $in['aksi'] ?? 'konfirmasi';
            if (!in_array($aksi, ['konfirmasi', 'tolak'], true)) {
                json_error('Aksi tidak dikenal.', 'VALIDASI_GAGAL', 422, ['aksi' => "Pilihan: konfirmasi, tolak."]);
            }

            $sanksi = $in['sanksi'] ?? null;
            if ($sanksi !== null && (!is_string($sanksi) || mb_strlen($sanksi) > 255)) {
                $err['sanksi'] = 'Sanksi maksimal 255 karakter.';
            }
            $sanksi = ($sanksi === null || trim($sanksi) === '') ? null : trim($sanksi);

            $pdo->beginTransaction();
            $row = kunci_peminjaman_pj($pdo, $org, $id);
            if (!$row) {
                json_error('Peminjaman tidak ditemukan.', 'NOT_FOUND', 404);
            }

            // Sudah dikembalikan: hanya sanksi yang boleh dikoreksi
            if ($row['status'] === 'Dikembalikan') {
                if ($err) {
                    json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, $err);
                }
                if (!array_key_exists('sanksi', $in)) {
                    json_error('Peminjaman sudah dikembalikan; hanya sanksi yang bisa diubah.', 'STATUS_TIDAK_SESUAI', 409);
                }
                $pdo->prepare('UPDATE peminjaman SET sanksi = :s WHERE id_peminjaman = :id')
                    ->execute(['s' => $sanksi, 'id' => $id]);
                $pdo->commit();
                json_out([
                    'message'    => 'Sanksi diperbarui.',
                    'peminjaman' => camel_keys(ambil_peminjaman_pj($pdo, $org, $id)),
                ]);
            }

            if ($aksi === 'tolak') {
                if ($row['status'] !== 'MenungguPengembalian') {
                    json_error("Hanya pengembalian berstatus MenungguPengembalian yang bisa ditolak (sekarang: {$row['status']}).", 'STATUS_TIDAK_SESUAI', 409);
                }
                $alasan = trim((string)($in['alasanPenolakan'] ?? ''));
                if ($alasan === '' || mb_strlen($alasan) > 255) {
                    json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, ['alasanPenolakan' => 'Alasan wajib diisi (maksimal 255 karakter).']);
                }
                $pdo->prepare("UPDATE peminjaman SET status = 'Terlambat', alasan_penolakan = :a WHERE id_peminjaman = :id")
                    ->execute(['a' => $alasan, 'id' => $id]);
                $pdo->commit();
                json_out([
                    'message'    => 'Pengembalian ditolak; peminjaman kembali berstatus Terlambat.',
                    'peminjaman' => camel_keys(ambil_peminjaman_pj($pdo, $org, $id)),
                ]);
            }

            if (!in_array($row['status'], ['Dipinjam', 'MenungguPengembalian', 'Terlambat'], true)) {
                json_error("Hanya peminjaman berstatus Dipinjam/MenungguPengembalian/Terlambat yang bisa dikembalikan (sekarang: {$row['status']}).", 'STATUS_TIDAK_SESUAI', 409);
            }

            $kondisi = $in['kondisiSesudah'] ?? '';
            if (!in_array($kondisi, ['Baik', 'Rusak'], true)) {
                $err['kondisiSesudah'] = "Kondisi harus 'Baik' atau 'Rusak'.";
            }

            $hariIni = (string)$pdo->query('SELECT internal.fn_hari_ini()')->fetchColumn();
            $tgl = $in['tanggalPengembalian'] ?? null;
            if ($tgl === null || $tgl === '') {
                // bila peminjam sudah mengajukan pengembalian, pakai tanggal yang tercatat saat itu
                $tgl = $row['tanggal_pengembalian'] ?? $hariIni;
            } else {
                $d = is_string($tgl) ? DateTime::createFromFormat('!Y-m-d', $tgl) : false;
                if (!$d || $d->format('Y-m-d') !== $tgl) {
                    $err['tanggalPengembalian'] = 'Format harus YYYY-MM-DD.';
                } elseif ($tgl > $hariIni) {
                    $err['tanggalPengembalian'] = 'Tanggal pengembalian tidak boleh di masa depan.';
                } elseif ($tgl < $row['start_date']) {
                    $err['tanggalPengembalian'] = 'Tanggal pengembalian tidak boleh sebelum tanggal mulai pinjam.';
                }
            }
            if ($err) {
                json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, $err);
            }

            $stmt = $pdo->prepare("UPDATE peminjaman
                                      SET status = 'Dikembalikan', tanggal_pengembalian = :tgl,
                                          kondisi_sesudah = :k, sanksi = :s
                                    WHERE id_peminjaman = :id");
            $stmt->execute(['tgl' => $tgl, 'k' => $kondisi, 's' => $sanksi, 'id' => $id]);
            $pdo->commit();

            json_out([
                'message' => $kondisi === 'Rusak'
                    ? 'Pengembalian dicatat. Barang ditandai Rusak dan tidak bisa dipinjam lagi.'
                    : 'Pengembalian dicatat.',
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
