<?php
declare(strict_types=1);

// Router tunggal. Jalankan: php -S localhost:8000 -t public public/index.php
set_exception_handler(function (Throwable $e): void {
    if (!function_exists('error_out')) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'Terjadi kesalahan pada server', 'code' => 'GALAT_SERVER']);
        error_log('[BOOT] ' . $e);
        exit;
    }
    if ($e instanceof ApiError) {
        cors_headers();
        error_out($e);
    }
    if ($e instanceof PDOException) {
        cors_headers();
        try {
            map_pg_error($e);
        } catch (ApiError $mapped) {
            error_out($mapped);
        }
    }
    error_log('[ERR] ' . $e);
    cors_headers();
    json_out(['message' => 'Terjadi kesalahan pada server', 'code' => 'GALAT_SERVER'], 500);
});

function cors_headers(): void
{
    $allow = function_exists('env') ? env('CORS_ALLOW_ORIGIN', '*') : '*';
    header('Access-Control-Allow-Origin: ' . $allow);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 600');
}

require __DIR__ . '/../src/bootstrap.php';
cors_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$path = '/' . trim($path, '/');

$pathMatched = false;
foreach (require BASE_PATH . '/src/routes.php' as [$m, $pattern, $handler, $access]) {
    $regex = '#^' . preg_replace(['#\{path\}#', '#\{(\w+)\}#'], ['(?P<path>.+)', '(?P<$1>[^/]+)'], $pattern) . '$#';
    if (!preg_match($regex, $path, $mt)) {
        continue;
    }
    $pathMatched = true;
    if ($m !== $method) {
        continue;
    }
    $params = array_filter($mt, 'is_string', ARRAY_FILTER_USE_KEY);
    match ($access) {
        'user' => require_login(),
        'peminjam' => require_peminjam(),
        'pj' => require_pj(),
        default => null,
    };
    if (!is_callable($handler)) {
        fail(500, 'GALAT_SERVER', 'Terjadi kesalahan pada server');
    }
    $handler($params);
    exit;
}

if ($pathMatched) {
    fail(405, 'METHOD_NOT_ALLOWED', 'Method tidak diizinkan untuk endpoint ini');
}
fail(404, 'NOT_FOUND', 'Endpoint tidak ditemukan');
