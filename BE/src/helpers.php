<?php
declare(strict_types=1);

/** Kirim JSON lalu hentikan skrip. */
function json_out(mixed $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Kirim galat dengan bentuk seragam: { message, code, errors? }. */
function json_error(string $message, string $code, int $status, array $errors = []): never
{
    $body = ['message' => $message, 'code' => $code];
    if ($errors) {
        $body['errors'] = $errors;
    }
    json_out($body, $status);
}

/** Baca body JSON; kalau bukan JSON, pakai form biasa ($_POST). */
function input(): array
{
    $json = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($json) ? $json : $_POST;
}

/** nama_barang -> namaBarang */
function snake_to_camel(string $s): string
{
    return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $s))));
}

/** Ubah semua kunci satu baris hasil query dari snake_case ke camelCase. */
function camel_keys(array $row): array
{
    $out = [];
    foreach ($row as $k => $v) {
        $out[snake_to_camel((string)$k)] = $v;
    }
    return $out;
}

/**
 * Terjemahkan galat database menjadi respons HTTP.
 * - P0001 = RAISE EXCEPTION dari trigger/fungsi database (pesannya memang
 *   ditulis untuk pengguna, mis. "Stok tidak cukup. Tersedia: 1, diminta: 2.")
 */
function pdo_error(PDOException $e): never
{
    $state = (string)$e->getCode();
    $pesan = $e->getMessage();

    if ($state === 'P0001') {
        if (preg_match('/ERROR:\s+(.+?)(?:\R(?:CONTEXT|DETAIL|HINT):.*)?$/s', $pesan, $m)) {
            $pesan = trim($m[1]);
        }
        json_error($pesan, 'ATURAN_BISNIS', 422);
    }

    if ($state === '23503') {
        if (str_contains($pesan, 'still referenced')) {
            json_error('Data masih dipakai oleh data lain.', 'DATA_TERPAKAI', 409);
        }
        json_error('Data yang dirujuk (kategori/organisasi/barang) tidak ada.', 'RUJUKAN_TIDAK_ADA', 422);
    }

    if ($state === '23505') {
        json_error('Data sudah ada (duplikat).', 'DUPLIKAT', 409);
    }

    if (in_array($state, ['23502', '23514', '22P02', '22001'], true)) {
        json_error('Data tidak memenuhi aturan tabel.', 'VALIDASI_GAGAL', 422);
    }

    error_log($pesan); // detail hanya di log server
    json_error('Kesalahan database', 'DB_ERROR', 500);
}

/** Deteksi JPG/PNG dari byte awal file (bukan dari nama file atau header klien). */
function deteksi_mime_gambar(string $awal): ?string
{
    if (str_starts_with($awal, "\xFF\xD8\xFF")) {
        return 'image/jpeg';
    }
    if (str_starts_with($awal, "\x89PNG\r\n\x1A\n")) {
        return 'image/png';
    }
    return null;
}

/**
 * Ambil unggahan gambar dari $_FILES[$kolom] (hanya multipart/form-data).
 * Mengembalikan path file sementara kalau valid. Kalau tidak ada file:
 * null, atau galat 422 bila $wajib = true.
 * Kalau file tidak valid (bukan JPG/PNG, lebih dari 2 MB, unggah gagal): 422.
 */
function ambil_unggahan_gambar(string $kolom, bool $wajib = false, int $maksByte = 2097152): ?string
{
    $f    = $_FILES[$kolom] ?? null;
    $kode = $f['error'] ?? UPLOAD_ERR_NO_FILE;

    if ($kode === UPLOAD_ERR_NO_FILE) {
        if ($wajib) {
            json_error('Foto wajib diunggah.', 'VALIDASI_GAGAL', 422, [$kolom => 'Foto wajib diunggah.']);
        }
        return null;
    }
    if ($kode === UPLOAD_ERR_INI_SIZE || $kode === UPLOAD_ERR_FORM_SIZE || $f['size'] > $maksByte) {
        json_error('Ukuran file maksimal 2 MB.', 'VALIDASI_GAGAL', 422, [$kolom => 'Ukuran file maksimal 2 MB.']);
    }
    if ($kode !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        json_error('Unggahan file gagal.', 'UNGGAH_GAGAL', 422, [$kolom => 'Unggahan file gagal.']);
    }

    $h    = fopen($f['tmp_name'], 'rb');
    $awal = $h ? (string)fread($h, 8) : '';
    if ($h) {
        fclose($h);
    }
    if (deteksi_mime_gambar($awal) === null) {
        json_error('File harus berformat JPG atau PNG.', 'VALIDASI_GAGAL', 422, [$kolom => 'File harus berformat JPG atau PNG.']);
    }

    return $f['tmp_name'];
}


/** Alamat dasar server ini untuk membuat URL absolut. Bisa dipaksa lewat APP_URL di .env. */
function base_url(): string
{
    if (!empty($_ENV['APP_URL'])) {
        return rtrim($_ENV['APP_URL'], '/');
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

/** URL gambar absolut, atau null bila datanya tidak punya gambar. */
function url_gambar(string $path, int $id, bool $ada): ?string
{
    return $ada ? base_url() . $path . '?id=' . $id : null;
}