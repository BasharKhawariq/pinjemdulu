<?php
require __DIR__ . '/../src/bootstrap.php';

$path = '/' . trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

$routes = [
    '/api/inventaris' => __DIR__ . '/../src/handlers/inventaris.php',
    '/api/kategori'   => __DIR__ . '/../src/handlers/kategori.php',
    '/api/organisasi' => __DIR__ . '/../src/handlers/organisasi.php',
    '/api/inventaris/thumbnail' => __DIR__ . '/../src/handlers/gambar.php',
    '/api/organisasi/icon'      => __DIR__ . '/../src/handlers/gambar.php',

    '/api/me' => __DIR__ . '/../src/handlers/me.php',

    // Area PJ (Pengelola). Wajib login;
    '/api/dashboard-pj'                 => __DIR__ . '/../src/handlers/dashboard_pj.php',
    '/api/kelola-peminjaman'            => __DIR__ . '/../src/handlers/kelola_peminjaman.php',
    '/api/kelola-pengembalian'          => __DIR__ . '/../src/handlers/kelola_pengembalian.php',
    '/api/kelola-pengajuan-pj'          => __DIR__ . '/../src/handlers/kelola_pengajuan_pj.php',
    '/api/kelola-pengajuan-pj/lampiran' => __DIR__ . '/../src/handlers/kelola_pengajuan_pj_lampiran.php',
    '/api/kelola-pengguna'              => __DIR__ . '/../src/handlers/kelola_pengguna.php',
    // endpoint baru nanti ditambah di sini
];

if (!isset($routes[$path])) {
    json_error('Endpoint tidak ditemukan', 'NOT_FOUND', 404);
}

require $routes[$path];