<?php
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/* Token HS256 buatan sendiri (tanpa composer)                         */
/* Payload hanya: sub (NIM), iat, exp. Role/OKI dibaca ulang dari DB.  */
/* ------------------------------------------------------------------ */
function b64u_enc(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64u_dec(string $s): string
{
    $s = strtr($s, '-_', '+/');
    $pad = strlen($s) % 4;
    if ($pad > 0) {
        $s .= str_repeat('=', 4 - $pad);
    }
    $d = base64_decode($s, true);
    return $d === false ? '' : $d;
}

function now_epoch(): int
{
    static $n = null;
    return $n ??= (int) db_val('SELECT floor(extract(epoch FROM now()))::bigint');
}

function token_sign(string $data): string
{
    return b64u_enc(hash_hmac('sha256', $data, (string) env('TOKEN_SECRET'), true));
}

/** @return array{token:string, expiresAt:string} */
function token_make(string $nim): array
{
    $ttl = max(1, (int) env('TOKEN_TTL_HOURS', '8')) * 3600;
    // Waktu diambil dari database agar sejalan dengan pengguna.updated_at (hindari selisih jam server).
    $now = now_epoch();
    $head = b64u_enc(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $pay = b64u_enc(json_encode(['sub' => $nim, 'iat' => $now, 'exp' => $now + $ttl]));
    return [
        'token' => "$head.$pay." . token_sign("$head.$pay"),
        'expiresAt' => date('c', $now + $ttl),
    ];
}

/** Verifikasi tanda tangan & kedaluwarsa. Algoritma dipatok HS256 (header token diabaikan). */
function token_parse(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$h, $p, $s] = $parts;
    if (!hash_equals(token_sign("$h.$p"), $s)) {
        return null;
    }
    $pay = json_decode(b64u_dec($p), true);
    if (!is_array($pay) || !isset($pay['sub'], $pay['iat'], $pay['exp']) || !is_string($pay['sub'])) {
        return null;
    }
    if ((int) $pay['exp'] < now_epoch()) {
        return null;
    }
    return $pay;
}

/* ------------------------------------------------------------------ */
/* Pengguna saat ini                                                   */
/* ------------------------------------------------------------------ */
function load_user(string $nim): ?array
{
    $u = db_one(
        'SELECT u.nim, u.nama_pengguna, u.role, u.status_akun, u.id_organisasi,
                o.nama_organisasi, o.singkatan, o.logo_path,
                floor(extract(epoch FROM u.updated_at))::bigint AS diubah_epoch
         FROM pengguna u JOIN organisasi o ON o.id_organisasi = u.id_organisasi
         WHERE u.nim = :nim',
        ['nim' => $nim]
    );
    if ($u) {
        $u['is_pj'] = $u['role'] === 'Penanggung Jawab';
    }
    return $u;
}

function user_payload(array $u): array
{
    return [
        'nim' => $u['nim'],
        'namaPengguna' => $u['nama_pengguna'],
        'role' => $u['role'],
        'isPj' => $u['is_pj'],
        'idOrganisasi' => $u['id_organisasi'],
        'organisasi' => [
            'nama' => $u['nama_organisasi'],
            'singkatan' => $u['singkatan'],
            'logoUrl' => storage_url($u['logo_path']),
        ],
    ];
}

function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') {
                $h = $v;
            }
        }
    }
    return preg_match('/^Bearer\s+(\S+)$/i', $h, $m) ? $m[1] : null;
}

/** Pengguna aktif dari token; null bila tidak ada/ tidak valid. Memoized per request. */
function me(): ?array
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    $cache = null;
    $t = bearer_token();
    if ($t === null) {
        return null;
    }
    $pay = token_parse($t);
    if ($pay === null) {
        return null;
    }
    $u = load_user($pay['sub']);
    if ($u === null) {
        return null;
    }
    // Token yang terbit sebelum data akun berubah (password, role, status) tidak berlaku lagi.
    if ((int) $pay['iat'] < (int) $u['diubah_epoch']) {
        return null;
    }
    return $cache = $u;
}

function require_login(): array
{
    $u = me();
    if ($u === null) {
        fail(401, 'TIDAK_TERAUTENTIKASI', 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.');
    }
    if (!$u['status_akun']) {
        fail(403, 'AKUN_NONAKTIF', 'Akun nonaktif, hubungi penanggung jawab');
    }
    return $u;
}

function require_pj(): array
{
    $u = require_login();
    if (!$u['is_pj']) {
        fail(403, 'BUKAN_PJ', 'Fitur ini hanya untuk Penanggung Jawab');
    }
    return $u;
}

function require_peminjam(): array
{
    $u = require_login();
    if ($u['is_pj']) {
        fail(403, 'HANYA_PEMINJAM', 'Fitur ini hanya untuk role Peminjam');
    }
    return $u;
}

/* ------------------------------------------------------------------ */
/* Captcha Cloudflare Turnstile                                        */
/* ------------------------------------------------------------------ */
function captcha_verify(mixed $token): void
{
    if (env('CAPTCHA_MODE', 'turnstile') === 'off') {
        return;
    }
    if (!is_string($token) || trim($token) === '') {
        fail(422, 'CAPTCHA_WAJIB', 'Captcha wajib diselesaikan', ['captchaToken' => 'Captcha wajib diselesaikan']);
    }
    $secret = env('TURNSTILE_SECRET');
    if (!$secret) {
        fail(500, 'KONFIGURASI_SALAH', 'TURNSTILE_SECRET belum diisi');
    }
    [$status, $res] = http_request(
        'POST',
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        ['Content-Type: application/x-www-form-urlencoded'],
        http_build_query(['secret' => $secret, 'response' => $token, 'remoteip' => client_ip()])
    );
    $j = json_decode($res, true);
    if ($status !== 200 || !is_array($j) || ($j['success'] ?? false) !== true) {
        fail(422, 'CAPTCHA_GAGAL', 'Verifikasi captcha gagal, silakan coba lagi', ['captchaToken' => 'Verifikasi gagal']);
    }
}
