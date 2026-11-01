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

/** Ambil ?id= sebagai bilangan bulat positif. null bila tidak ada; 400 bila tidak valid. */
function query_id(): ?int
{
    if (!isset($_GET['id']) || $_GET['id'] === '') {
        return null;
    }
    $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        json_error('Parameter id tidak valid.', 'VALIDASI_GAGAL', 400);
    }
    return $id;
}

/**
 * Baca filter berbentuk daftar nilai dipisah koma, mis. ?status=Diajukan,Dipinjam.
 * Nilai di luar $diizinkan ditolak (422). Bila parameter kosong, pakai $default.
 */
function filter_enum(string $nama, array $diizinkan, array $default): array
{
    $mentah = trim((string)($_GET[$nama] ?? ''));
    if ($mentah === '') {
        return $default;
    }
    $nilai = array_values(array_unique(array_filter(array_map('trim', explode(',', $mentah)), 'strlen')));
    foreach ($nilai as $n) {
        if (!in_array($n, $diizinkan, true)) {
            json_error("Nilai $nama tidak valid.", 'VALIDASI_GAGAL', 422, [
                $nama => 'Pilihan: ' . implode(', ', $diizinkan),
            ]);
        }
    }
    return $nilai ?: $default;
}

/**
 * Buat daftar placeholder untuk IN (...). Mengisi $params dan mengembalikan
 * string seperti ":st0, :st1". Daftar kosong menghasilkan "NULL" (tidak cocok apa pun).
 */
function in_params(string $prefix, array $nilai, array &$params): string
{
    if (!$nilai) {
        return 'NULL';
    }
    $ph = [];
    foreach (array_values($nilai) as $i => $v) {
        $kunci = $prefix . $i;
        $params[$kunci] = $v;
        $ph[] = ':' . $kunci;
    }
    return implode(', ', $ph);
}

/** Escape karakter khusus LIKE (% _ \) agar pencarian dianggap teks biasa. */
function like_escape(string $s): string
{
    return addcslashes($s, '%_\\');
}

/** Paginasi dari ?page= dan ?limit= (default 20, maksimal 100). Mengembalikan [page, limit, offset]. */
function paging(): array
{
    $page  = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $limit = filter_var($_GET['limit'] ?? 20, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
    if ($page === false || $limit === false) {
        json_error('Parameter page/limit tidak valid (page >= 1, limit 1-100).', 'VALIDASI_GAGAL', 422, [
            'page'  => 'Bilangan bulat >= 1',
            'limit' => 'Bilangan bulat 1-100',
        ]);
    }
    return [$page, $limit, ($page - 1) * $limit];
}

/** Kirim daftar berhalaman: { data: [...], meta: { total, page, limit, totalHalaman } }. */
function json_list(array $rows, int $total, int $page, int $limit): never
{
    json_out([
        'data' => array_map('camel_keys', $rows),
        'meta' => [
            'total'        => $total,
            'page'         => $page,
            'limit'        => $limit,
            'totalHalaman' => (int)ceil($total / $limit),
        ],
    ]);
}
