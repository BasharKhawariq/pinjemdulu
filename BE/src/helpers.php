<?php
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/* Galat & respons                                                     */
/* ------------------------------------------------------------------ */
final class ApiError extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $errors = []
    ) {
        parent::__construct($message);
    }
}

function fail(int $status, string $code, string $message, array $errors = []): never
{
    throw new ApiError($status, $code, $message, $errors);
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function error_out(ApiError $e): never
{
    $body = ['message' => $e->getMessage(), 'code' => $e->errorCode];
    if ($e->errors) {
        $body['errors'] = $e->errors;
    }
    json_out($body, $e->status);
}

/** snake_case -> camelCase (rekursif, hanya kunci string). */
function camelize(mixed $v): mixed
{
    if (!is_array($v)) {
        return $v;
    }
    $o = [];
    foreach ($v as $k => $x) {
        $key = is_string($k) ? lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $k)))) : $k;
        $o[$key] = camelize($x);
    }
    return $o;
}

/** Ganti kolom path berkas dengan URL siap pakai (kolom asal dibuang). */
function urlize(array $row, string $pathKey, string $newKey): array
{
    $row[$newKey] = storage_url($row[$pathKey] ?? null);
    unset($row[$pathKey]);
    return $row;
}

function list_out(array $res, ?callable $map = null): never
{
    $rows = $map ? array_map($map, $res['rows']) : $res['rows'];
    json_out(['data' => array_map('camelize', $rows), 'meta' => $res['meta']]);
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */
function body(): array
{
    static $b = null;
    if ($b !== null) {
        return $b;
    }
    $ct = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_contains($ct, 'application/json')) {
        $raw = file_get_contents('php://input');
        if (trim((string) $raw) === '') {
            return $b = [];
        }
        $d = json_decode($raw, true);
        if (!is_array($d)) {
            fail(400, 'JSON_TIDAK_VALID', 'Body harus berupa JSON object yang valid');
        }
        return $b = $d;
    }
    return $b = $_POST;
}

function f_str(string $k, array &$err, bool $required = true, int $max = 255, ?string $label = null): ?string
{
    $label ??= $k;
    $v = body()[$k] ?? null;
    if ($v === null || (is_string($v) && trim($v) === '')) {
        if ($required) {
            $err[$k] = "$label wajib diisi";
        }
        return null;
    }
    if (!is_scalar($v) || is_bool($v)) {
        $err[$k] = "$label tidak valid";
        return null;
    }
    $v = trim((string) $v);
    if (mb_strlen($v) > $max) {
        $err[$k] = "$label maksimal $max karakter";
        return null;
    }
    return $v;
}

function f_int(string $k, array &$err, bool $required = true, int $min = 1, int $max = PHP_INT_MAX, ?string $label = null): ?int
{
    $label ??= $k;
    $v = body()[$k] ?? null;
    if ($v === null || $v === '') {
        if ($required) {
            $err[$k] = "$label wajib diisi";
        }
        return null;
    }
    $i = filter_var($v, FILTER_VALIDATE_INT);
    if ($i === false || $i < $min || $i > $max) {
        $err[$k] = "$label harus bilangan bulat $min sampai $max";
        return null;
    }
    return $i;
}

function valid_date(string $s): bool
{
    $d = DateTime::createFromFormat('!Y-m-d', $s);
    return $d !== false && $d->format('Y-m-d') === $s;
}

function f_date(string $k, array &$err, bool $required = true, ?string $label = null): ?string
{
    $label ??= $k;
    $v = f_str($k, $err, $required, 10, $label);
    if ($v === null) {
        return null;
    }
    if (!valid_date($v)) {
        $err[$k] = "$label harus berformat YYYY-MM-DD";
        return null;
    }
    return $v;
}

function f_enum(string $k, array &$err, array $allowed, bool $required = true, ?string $default = null, ?string $label = null): ?string
{
    $label ??= $k;
    $v = f_str($k, $err, false, 50, $label);
    if ($v === null) {
        if ($default !== null) {
            return $default;
        }
        if ($required) {
            $err[$k] = "$label wajib diisi";
        }
        return null;
    }
    if (!in_array($v, $allowed, true)) {
        $err[$k] = "$label harus salah satu dari: " . implode(', ', $allowed);
        return null;
    }
    return $v;
}

function f_bool(string $k, array &$err, bool $required = true, ?string $label = null): ?bool
{
    $label ??= $k;
    $v = body()[$k] ?? null;
    if ($v === null || $v === '') {
        if ($required) {
            $err[$k] = "$label wajib diisi";
        }
        return null;
    }
    $b = filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($b === null) {
        $err[$k] = "$label harus true atau false";
        return null;
    }
    return $b;
}

function validasi_selesai(array $err): void
{
    if ($err) {
        fail(422, 'VALIDASI_GAGAL', 'Data yang dikirim belum valid', $err);
    }
}

/** ID dari path harus bilangan bulat positif; selain itu dianggap tidak ada. */
function path_id(array $p, string $key = 'id'): int
{
    $v = $p[$key] ?? '';
    if (!is_string($v) || !ctype_digit($v) || (int) $v < 1 || (int) $v > 2147483647) {
        fail(404, 'NOT_FOUND', 'Data tidak ditemukan');
    }
    return (int) $v;
}

/** NIM di path: huruf/angka 3-20; selain itu dianggap tidak ada. */
function path_nim(array $p): string
{
    $v = $p['nim'] ?? '';
    if (!is_string($v) || !preg_match('/^[A-Za-z0-9]{3,20}$/', $v)) {
        fail(404, 'NOT_FOUND', 'Pengguna tidak ditemukan');
    }
    return $v;
}

/* ------------------------------------------------------------------ */
/* Query string, filter, paginasi                                      */
/* ------------------------------------------------------------------ */
function qs(string $k): string
{
    $v = $_GET[$k] ?? '';
    return is_string($v) ? trim($v) : '';
}

function qs_enum(string $k, array $allowed): ?string
{
    $v = qs($k);
    if ($v === '') {
        return null;
    }
    if (!in_array($v, $allowed, true)) {
        fail(422, 'VALIDASI_GAGAL', "Parameter $k tidak valid", [$k => 'Harus salah satu dari: ' . implode(', ', $allowed)]);
    }
    return $v;
}

/** "1,2,3" -> [1,2,3] (hanya bilangan bulat positif). */
function qs_ids(string $k): array
{
    $v = qs($k);
    if ($v === '') {
        return [];
    }
    $out = [];
    foreach (explode(',', $v) as $x) {
        $x = trim($x);
        if (!ctype_digit($x) || (int) $x < 1 || (int) $x > 2147483647) {
            fail(422, 'VALIDASI_GAGAL', "Parameter $k tidak valid", [$k => 'Harus daftar ID dipisah koma']);
        }
        $out[] = (int) $x;
    }
    return array_values(array_unique($out));
}

function qs_date(string $k): ?string
{
    $v = qs($k);
    if ($v === '') {
        return null;
    }
    if (!valid_date($v)) {
        fail(422, 'VALIDASI_GAGAL', "Parameter $k tidak valid", [$k => 'Harus berformat YYYY-MM-DD']);
    }
    return $v;
}

function like_pattern(string $q): string
{
    return '%' . strtr($q, ['\\' => '\\\\', '%' => '\\%', '_' => '\\_']) . '%';
}

function page_params(int $defaultLimit = 10): array
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = (int) ($_GET['limit'] ?? $defaultLimit);
    $limit = min(100, max(1, $limit));
    return [$page, $limit];
}

/** Pembangun klausa WHERE dengan placeholder bernama (anti injeksi). */
final class Where
{
    private array $parts = [];
    public array $params = [];
    private int $i = 0;

    /** Gunakan tanda ? sebagai placeholder; nilai dipasang berurutan. */
    public function add(string $sql, array $vals = []): self
    {
        foreach ($vals as $v) {
            $name = 'w' . (++$this->i);
            $sql = preg_replace('/\?/', ':' . $name, $sql, 1);
            $this->params[$name] = $v;
        }
        $this->parts[] = $sql;
        return $this;
    }

    public function sql(): string
    {
        return $this->parts ? implode(' AND ', $this->parts) : 'TRUE';
    }
}

function paginate(string $cols, string $from, Where $w, string $order, int $defaultLimit = 10): array
{
    [$page, $limit] = page_params($defaultLimit);
    $where = $w->sql();
    $total = (int) db_val("SELECT COUNT(*) FROM $from WHERE $where", $w->params);
    $rows = db_all(
        "SELECT $cols FROM $from WHERE $where ORDER BY $order LIMIT $limit OFFSET " . (($page - 1) * $limit),
        $w->params
    );
    return [
        'rows' => $rows,
        'meta' => ['total' => $total, 'page' => $page, 'limit' => $limit, 'totalHalaman' => (int) ceil($total / $limit)],
    ];
}

/** Filter rentang tanggal: peminjaman beririsan dengan [dari, sampai]. */
function filter_rentang(Where $w, string $colMulai, string $colSelesai): void
{
    $dari = qs_date('dari');
    $sampai = qs_date('sampai');
    if ($dari && $sampai && $dari > $sampai) {
        fail(422, 'VALIDASI_GAGAL', 'Rentang tanggal tidak valid', ['dari' => 'Tidak boleh setelah sampai']);
    }
    if ($sampai) {
        $w->add("$colMulai <= CAST(? AS date)", [$sampai]);
    }
    if ($dari) {
        $w->add("$colSelesai >= CAST(? AS date)", [$dari]);
    }
}

/* ------------------------------------------------------------------ */
/* Galat PostgreSQL -> respons HTTP                                    */
/* ------------------------------------------------------------------ */
function pg_state(PDOException $e): string
{
    return (string) ($e->errorInfo[0] ?? '');
}

/** Pesan RAISE EXCEPTION murni (tanpa awalan ERROR: dan CONTEXT). */
function pg_message(PDOException $e): string
{
    $m = (string) ($e->errorInfo[2] ?? $e->getMessage());
    $m = explode("\n", $m)[0];
    return trim((string) preg_replace('/^ERROR:\s*/', '', $m));
}

function map_pg_error(PDOException $e): never
{
    switch (pg_state($e)) {
        case 'P0001':
            fail(422, 'ATURAN_BISNIS', pg_message($e));
        case '23505':
            fail(409, 'DATA_SUDAH_ADA', 'Data tersebut sudah ada');
        case '23503':
            fail(409, 'RELASI_TERPAKAI', 'Data masih berhubungan dengan data lain atau rujukannya tidak ditemukan');
        case '23514':
        case '23502':
        case '22001':
        case '22P02':
        case '22007':
        case '22008':
        case '22003':
            fail(422, 'VALIDASI_GAGAL', 'Data tidak memenuhi aturan penyimpanan');
        default:
            error_log('[DB] ' . $e->getMessage());
            fail(500, 'GALAT_SERVER', 'Terjadi kesalahan pada server');
    }
}

/* ------------------------------------------------------------------ */
/* Jaringan & pembatasan percobaan                                     */
/* ------------------------------------------------------------------ */
function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/** HTTP klien ringkas (curl). Mengembalikan [status, isi]. */
function http_request(string $method, string $url, array $headers = [], ?string $body = null): array
{
    if (!function_exists('curl_init')) {
        fail(500, 'KONFIGURASI_SALAH', 'Ekstensi curl PHP belum aktif');
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $res = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$status, $res === false ? '' : (string) $res];
}

function rl_file(string $key): string
{
    return sys_get_temp_dir() . '/pinjemdulu_rl_' . hash('sha256', $key);
}

function rl_read(string $key, int $window): array
{
    $f = rl_file($key);
    $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : [];
    $now = time();
    return array_values(array_filter(is_array($d) ? $d : [], fn($t) => is_int($t) && $t > $now - $window));
}

/** Tolak (429) bila percobaan dalam jendela waktu sudah mencapai batas. */
function rl_check(string $key, int $max, int $window): void
{
    if (count(rl_read($key, $window)) >= $max) {
        fail(429, 'TERLALU_BANYAK_PERCOBAAN', 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
    }
}

function rl_hit(string $key, int $window): void
{
    $d = rl_read($key, $window);
    $d[] = time();
    file_put_contents(rl_file($key), json_encode($d), LOCK_EX);
}

function rl_reset(string $key): void
{
    @unlink(rl_file($key));
}
