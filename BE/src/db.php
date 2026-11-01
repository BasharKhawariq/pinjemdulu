<?php
$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
    $_ENV['DB_HOST'] ?? '',
    $_ENV['DB_PORT'] ?? '5432',
    $_ENV['DB_NAME'] ?? '',
    $_ENV['DB_SSLMODE'] ?? 'require'
);

try {
    $pdo = new PDO($dsn, $_ENV['DB_USER'] ?? '', $_ENV['DB_PASS'] ?? '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    error_log('Koneksi DB gagal: ' . $e->getMessage());
    json_out(['message' => 'Database tidak bisa dihubungi', 'code' => 'DB_DOWN'], 500);
}