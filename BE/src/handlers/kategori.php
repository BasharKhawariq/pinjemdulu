<?php
// Handler /api/kategori (baca saja dulu; tulis menunggu keputusan cek peran).

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $rows = $pdo->query(
        'SELECT k.id_kategori, k.nama_kategori, COUNT(i.id_inventaris)::int AS total_barang
           FROM kategori k
           LEFT JOIN inventaris i ON i.id_kategori = k.id_kategori
          GROUP BY k.id_kategori, k.nama_kategori
          ORDER BY lower(k.nama_kategori)'
    )->fetchAll();
    json_out(array_map('camel_keys', $rows));
} catch (PDOException $e) {
    pdo_error($e);
}