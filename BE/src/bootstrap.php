<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Jakarta');
define('BASE_PATH', dirname(__DIR__));

/** Memuat .env sederhana (KEY=VALUE, # komentar, tanda kutip opsional). */
function env_load(string $file): void
{
    if (!is_file($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $v = trim($v);
        if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) {
            $v = substr($v, 1, -1);
        }
        $_ENV[trim($k)] = $v;
    }
}

function env(string $key, ?string $default = null): ?string
{
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key] === '' ? $default : $_ENV[$key];
    }
    $v = getenv($key);
    return ($v === false || $v === '') ? $default : $v;
}

env_load(BASE_PATH . '/.env');

foreach (['helpers', 'db', 'auth', 'storage'] as $f) {
    require_once __DIR__ . "/$f.php";
}
foreach (['_util','akun','katalog','pengajuan_saya','pengajuan_pj','kelola_inventaris',
          'kelola_kategori','kelola_peminjaman','kelola_pengembalian','kelola_pengajuan_pj',
          'kelola_pengguna','laporan'] as $h) {
    require_once __DIR__ . "/handlers/$h.php";
}

// Pemeriksaan konfigurasi wajib (gagal cepat, bukan diam-diam tidak aman).
if (strlen((string) env('TOKEN_SECRET', '')) < 32) {
    fail(500, 'KONFIGURASI_SALAH', 'TOKEN_SECRET wajib diisi minimal 32 karakter');
}
if (env('CAPTCHA_MODE', 'turnstile') === 'off' && env('APP_ENV', 'production') !== 'local') {
    fail(500, 'KONFIGURASI_SALAH', 'CAPTCHA_MODE=off hanya boleh dengan APP_ENV=local');
}
