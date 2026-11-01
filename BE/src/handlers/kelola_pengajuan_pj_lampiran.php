<?php
// GET /api/kelola-pengajuan-pj/lampiran?id=  -- mengunduh berkas lampiran_approval (biner).
// Jenis berkas dideteksi dari isinya; ditampilkan inline (PDF/gambar) atau diunduh.

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $pj = wajib_pj($pdo);
    $id = query_id();
    if (!$id) {
        json_error('Parameter id wajib.', 'ID_WAJIB', 400);
    }

    $stmt = $pdo->prepare('SELECT lampiran_approval FROM request_pj WHERE id_request = :id AND id_organisasi = :org');
    $stmt->execute(['id' => $id, 'org' => $pj['idOrganisasi']]);
    $stmt->bindColumn(1, $lob, PDO::PARAM_LOB);
    if (!$stmt->fetch(PDO::FETCH_BOUND)) {
        json_error('Pengajuan tidak ditemukan.', 'NOT_FOUND', 404);
    }
    $isi = is_resource($lob) ? stream_get_contents($lob) : (string)$lob;
    if ($isi === '' || $isi === false) {
        json_error('Lampiran kosong.', 'NOT_FOUND', 404);
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($isi) ?: 'application/octet-stream';
    $ext  = ['application/pdf' => 'pdf', 'image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'][$mime] ?? 'bin';
    $inline = in_array($mime, ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'], true);

    http_response_code(200);
    header("Content-Type: $mime");
    header('Content-Length: ' . strlen($isi));
    header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . "; filename=\"lampiran-pengajuan-$id.$ext\"");
    header('X-Content-Type-Options: nosniff');
    echo $isi;
    exit;
} catch (PDOException $e) {
    pdo_error($e);
}
