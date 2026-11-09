<?php
declare(strict_types=1);

/*
 * Penyimpanan berkas. Database hanya menyimpan PATH (mis. "inventaris/ab12.jpg").
 *  - Awalan inventaris/ dan organisasi/  => bucket PUBLIK (URL tetap)
 *  - Awalan lain (pengambilan/, kondisi/, lampiran-pj/) => bucket PRIVAT (URL bertanda tangan)
 * STORAGE_DRIVER=supabase (produksi) atau local (pengembangan, folder storage/uploads).
 */
const UPLOAD_MAKS_BYTE = 2 * 1024 * 1024;
const MIME_GAMBAR = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
const MIME_LAMPIRAN = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'];

function storage_driver(): string
{
    return env('STORAGE_DRIVER', 'local') === 'supabase' ? 'supabase' : 'local';
}

function storage_is_public(string $path): bool
{
    return str_starts_with($path, 'inventaris/') || str_starts_with($path, 'organisasi/');
}

function storage_bucket(string $path): string
{
    return storage_is_public($path)
        ? (string) env('STORAGE_BUCKET_PUBLIK', 'pinjemdulu-publik')
        : (string) env('STORAGE_BUCKET_PRIVAT', 'pinjemdulu-privat');
}

function supabase_headers(array $extra = []): array
{
    $key = (string) env('SUPABASE_SERVICE_KEY');
    return array_merge(["Authorization: Bearer $key", "apikey: $key"], $extra);
}

function supabase_url(): string
{
    $u = rtrim((string) env('SUPABASE_URL', ''), '/');
    if ($u === '' || !env('SUPABASE_SERVICE_KEY')) {
        fail(500, 'KONFIGURASI_SALAH', 'SUPABASE_URL dan SUPABASE_SERVICE_KEY wajib diisi untuk STORAGE_DRIVER=supabase');
    }
    return $u;
}

/**
 * Validasi berkas unggahan multipart.
 * @param array<string,string> $mimeBoleh peta mime => ekstensi
 * @return array{tmp:string,ext:string}|null
 */
function upload_validasi(string $field, array $mimeBoleh, bool $required, array &$err, string $label): ?array
{
    $f = $_FILES[$field] ?? null;
    if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        if ($required) {
            $err[$field] = "$label wajib diunggah";
        }
        return null;
    }
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) {
        $err[$field] = "$label maksimal 2 MB";
        return null;
    }
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        $err[$field] = "$label gagal diunggah";
        return null;
    }
    if ($f['size'] > UPLOAD_MAKS_BYTE) {
        $err[$field] = "$label maksimal 2 MB";
        return null;
    }
    $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!isset($mimeBoleh[$mime])) {
        $err[$field] = "$label harus berformat " . strtoupper(implode('/', array_values($mimeBoleh)));
        return null;
    }
    return ['tmp' => $f['tmp_name'], 'ext' => $mimeBoleh[$mime], 'mime' => $mime];
}

/** Simpan berkas, kembalikan path. Folder = awalan path (lihat aturan bucket di atas). */
function storage_put(string $folder, array $file): string
{
    $path = trim($folder, '/') . '/' . bin2hex(random_bytes(12)) . '.' . $file['ext'];
    if (storage_driver() === 'supabase') {
        $bucket = storage_bucket($path);
        [$status] = http_request(
            'POST',
            supabase_url() . "/storage/v1/object/$bucket/" . implode('/', array_map('rawurlencode', explode('/', $path))),
            supabase_headers(['Content-Type: ' . $file['mime'], 'x-upsert: false']),
            (string) file_get_contents($file['tmp'])
        );
        if ($status !== 200 && $status !== 201) {
            error_log("[STORAGE] upload gagal ($status) untuk $path");
            fail(502, 'STORAGE_GAGAL', 'Gagal menyimpan berkas, silakan coba lagi');
        }
        return $path;
    }
    $full = BASE_PATH . '/storage/uploads/' . $path;
    if (!is_dir(dirname($full)) && !mkdir(dirname($full), 0775, true) && !is_dir(dirname($full))) {
        fail(500, 'STORAGE_GAGAL', 'Folder penyimpanan tidak dapat dibuat');
    }
    if (!move_uploaded_file($file['tmp'], $full)) {
        fail(500, 'STORAGE_GAGAL', 'Berkas tidak dapat disimpan');
    }
    return $path;
}

/** Hapus berkas (upaya terbaik; kegagalan hanya dicatat). */
function storage_delete(?string $path): void
{
    if (!$path) {
        return;
    }
    if (storage_driver() === 'supabase') {
        $bucket = storage_bucket($path);
        [$status] = http_request(
            'DELETE',
            supabase_url() . "/storage/v1/object/$bucket/" . implode('/', array_map('rawurlencode', explode('/', $path))),
            supabase_headers()
        );
        if ($status >= 400) {
            error_log("[STORAGE] hapus gagal ($status) untuk $path");
        }
        return;
    }
    $full = realpath(BASE_PATH . '/storage/uploads/' . $path);
    $root = realpath(BASE_PATH . '/storage/uploads');
    if ($full && $root && str_starts_with($full, $root . DIRECTORY_SEPARATOR)) {
        @unlink($full);
    }
}

function file_sig(string $path, int $exp): string
{
    return hash_hmac('sha256', "$path|$exp", (string) env('TOKEN_SECRET'));
}

/** URL siap pakai untuk FE; null bila tidak ada berkas. */
function storage_url(?string $path): ?string
{
    static $cache = [];
    if (!$path) {
        return null;
    }
    if (isset($cache[$path])) {
        return $cache[$path];
    }
    if (storage_driver() === 'local') {
        $exp = time() + 3600;
        $base = rtrim((string) env('APP_URL', 'http://localhost:8000'), '/');
        return $cache[$path] = "$base/api/berkas/" . implode('/', array_map('rawurlencode', explode('/', $path)))
            . "?exp=$exp&sig=" . file_sig($path, $exp);
    }
    $enc = implode('/', array_map('rawurlencode', explode('/', $path)));
    $bucket = storage_bucket($path);
    if (storage_is_public($path)) {
        return $cache[$path] = supabase_url() . "/storage/v1/object/public/$bucket/$enc";
    }
    [$status, $res] = http_request(
        'POST',
        supabase_url() . "/storage/v1/object/sign/$bucket/$enc",
        supabase_headers(['Content-Type: application/json']),
        json_encode(['expiresIn' => 3600])
    );
    $j = json_decode($res, true);
    if ($status !== 200 || !isset($j['signedURL'])) {
        error_log("[STORAGE] sign gagal ($status) untuk $path");
        return null;
    }
    return $cache[$path] = supabase_url() . '/storage/v1' . $j['signedURL'];
}
