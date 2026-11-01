<?php
declare(strict_types=1);

// 1. Baca .env
$envPath = __DIR__ . '/../.env';
if (is_file($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $baris) {
        $baris = trim($baris);
        if ($baris === '' || str_starts_with($baris, '#') || !str_contains($baris, '=')) continue;
        [$k, $v] = explode('=', $baris, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

require __DIR__ . '/helpers.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/peminjaman_sql.php';

// 2. CORS (diperlukan selama FE dan BE beda alamat/port)
$origin = $_ENV['CORS_ORIGIN'] ?? 'http://127.0.0.1:5500';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Dev-Nim');
header('Vary: Origin');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 3. Error tak terduga: catat di log, jangan tampilkan detailnya ke pengguna
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage());
    json_out(['message' => 'Kesalahan server', 'code' => 'SERVER_ERROR'], 500);
});

require __DIR__ . '/db.php';