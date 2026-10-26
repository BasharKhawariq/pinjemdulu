<?php
// Handler gambar: GET /api/inventaris/thumbnail?id=N dan GET /api/organisasi/icon?id=N
// Membalas biner gambar (bukan JSON). $path dan $pdo berasal dari public/index.php.

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
}

// Daftar putih: nama tabel/kolom tidak pernah datang dari klien.
$sumber = [
    '/api/inventaris/thumbnail' => ['inventaris', 'thumbnail', 'id_inventaris'],
    '/api/organisasi/icon'      => ['organisasi', 'icon', 'id_organisasi'],
];
[$tabel, $kolom, $kunci] = $sumber[$path];

$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($id === false || $id < 1) {
    json_error('Parameter id wajib.', 'ID_WAJIB', 400);
}

/** Tentukan Content-Type dari byte awal. JPG/PNG dikenali helper; sisanya untuk icon lama. */
function mime_untuk_tampil(string $b): string
{
    $mime = deteksi_mime_gambar(substr($b, 0, 8));
    if ($mime !== null) {
        return $mime;
    }
    if (str_starts_with($b, 'GIF8')) {
        return 'image/gif';
    }
    if (str_starts_with($b, 'RIFF') && substr($b, 8, 4) === 'WEBP') {
        return 'image/webp';
    }
    $awal = ltrim(substr($b, 0, 256));
    if (str_starts_with($awal, '<svg') || str_starts_with($awal, '<?xml')) {
        return 'image/svg+xml';
    }
    return 'application/octet-stream';
}

try {
    $stmt = $pdo->prepare("SELECT $kolom FROM $tabel WHERE $kunci = :id");
    $stmt->execute(['id' => $id]);
    $data = $stmt->fetchColumn();
} catch (PDOException $e) {
    pdo_error($e);
}

if (is_resource($data)) {            // kolom bytea dari PDO pgsql berupa stream
    $data = stream_get_contents($data);
}
if (!is_string($data) || $data === '') {
    json_error('Gambar tidak ditemukan.', 'NOT_FOUND', 404);
}

// ETag: URL gambar tetap sama saat foto diganti, jadi browser selalu bertanya
// dulu (no-cache) dan hanya mengunduh ulang bila isinya berubah.
$etag = '"' . md5($data) . '"';
header('ETag: ' . $etag);
header('Cache-Control: no-cache');
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

$mime = mime_untuk_tampil($data);
header('Content-Type: ' . $mime);
header('Content-Length: ' . strlen($data));
header('X-Content-Type-Options: nosniff');
if ($mime === 'image/svg+xml') {
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'");
}
echo $data;
exit;