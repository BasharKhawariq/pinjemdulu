<?php
declare(strict_types=1);

/**
 * Autentikasi untuk endpoint area PJ (kelola-*, dashboard-pj, inventaris tulis).
 *
 * PENTING: PHP terhubung ke database sebagai pemilik database (bukan role
 * 'authenticated'), jadi RLS dan pemeriksaan "siapa yang boleh" di trigger
 * TIDAK berlaku di sini. Karena itu semua pemeriksaan hak akses PJ dilakukan
 * di PHP, di file ini dan di tiap handler (selalu dibatasi id_organisasi PJ).
 *
 * AUTH_MODE (di .env):
 *   supabase : token Supabase (Authorization: Bearer <access_token>) divalidasi
 *              ke {SUPABASE_URL}/auth/v1/user. Perlu SUPABASE_URL dan
 *              SUPABASE_ANON_KEY. Ini mode untuk produksi.
 *   dev      : header X-Dev-Nim: <nim> dipercaya begitu saja. HANYA jalan bila
 *              APP_ENV=local. Dipakai untuk uji lokal / Postman tanpa login.
 */

/** Ambil token dari header "Authorization: Bearer ...". */
function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
    if (is_string($h) && preg_match('/^Bearer\s+(\S+)$/i', trim($h), $m)) {
        return $m[1];
    }
    return null;
}

/** Tanya Supabase Auth: token ini milik siapa? Mengembalikan auth user id (UUID) atau null. */
function supabase_user_id(string $token): ?string
{
    $url = rtrim($_ENV['SUPABASE_URL'] ?? '', '/');
    $key = $_ENV['SUPABASE_ANON_KEY'] ?? '';
    if ($url === '' || $key === '') {
        error_log('SUPABASE_URL / SUPABASE_ANON_KEY belum diisi di .env');
        json_error('Autentikasi belum dikonfigurasi di server.', 'AUTH_CONFIG', 500);
    }

    $ctx = stream_context_create(['http' => [
        'method'        => 'GET',
        'header'        => "Authorization: Bearer $token\r\napikey: $key\r\nAccept: application/json\r\n",
        'timeout'       => 8,
        'ignore_errors' => true,
    ]]);
    $body = @file_get_contents($url . '/auth/v1/user', false, $ctx);
    if ($body === false) {
        error_log('Gagal menghubungi Supabase Auth');
        json_error('Layanan autentikasi tidak bisa dihubungi.', 'AUTH_DOWN', 502);
    }
    $status = 0;
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
            $status = (int)$m[1];
        }
    }
    $data = json_decode($body, true);
    if ($status !== 200 || !is_array($data) || empty($data['id'])) {
        return null;
    }
    return (string)$data['id'];
}

/**
 * Identifikasi pemanggil (role apa pun). Mengembalikan baris pengguna
 * (nim, nama_pengguna, role, id_organisasi, status_akun) atau menghentikan
 * request dengan 401 / 403 (akun nonaktif).
 */
function pengguna_login(PDO $pdo): array
{
    $mode = $_ENV['AUTH_MODE'] ?? 'supabase';

    if ($mode === 'dev') {
        if (($_ENV['APP_ENV'] ?? '') !== 'local') {
            json_error('Mode dev hanya boleh dengan APP_ENV=local.', 'AUTH_CONFIG', 500);
        }
        $nim = trim((string)($_SERVER['HTTP_X_DEV_NIM'] ?? ''));
        if ($nim === '') {
            json_error('Header X-Dev-Nim wajib (mode dev).', 'TIDAK_TERAUTENTIKASI', 401);
        }
        $stmt = $pdo->prepare('SELECT nim, nama_pengguna, role, id_organisasi, status_akun
                                 FROM pengguna WHERE nim = :nim');
        $stmt->execute(['nim' => $nim]);
    } else {
        $token = bearer_token();
        if ($token === null) {
            json_error('Token login wajib dikirim (Authorization: Bearer ...).', 'TIDAK_TERAUTENTIKASI', 401);
        }
        $uid = supabase_user_id($token);
        if ($uid === null) {
            json_error('Token tidak valid atau sudah kedaluwarsa.', 'TIDAK_TERAUTENTIKASI', 401);
        }
        $stmt = $pdo->prepare('SELECT nim, nama_pengguna, role, id_organisasi, status_akun
                                 FROM pengguna WHERE auth_id = :uid');
        $stmt->execute(['uid' => $uid]);
    }

    $u = $stmt->fetch();
    if (!$u) {
        json_error('Akun belum terdaftar sebagai pengguna aplikasi.', 'TIDAK_TERAUTENTIKASI', 401);
    }
    if (!$u['status_akun']) {
        json_error('Akun dinonaktifkan.', 'AKUN_NONAKTIF', 403);
    }
    return $u;
}

/**
 * Memastikan pemanggil adalah PJ (role Pengelola, akun aktif, punya organisasi).
 * Mengembalikan: ['nim','nama','idOrganisasi','namaOrganisasi'].
 */
function wajib_pj(PDO $pdo): array
{
    $u = pengguna_login($pdo);
    if ($u['role'] !== 'Pengelola' || $u['id_organisasi'] === null) {
        json_error('Hanya PJ (Pengelola) yang boleh mengakses endpoint ini.', 'BUKAN_PJ', 403);
    }

    $o = $pdo->prepare('SELECT nama_organisasi FROM organisasi WHERE id_organisasi = :o');
    $o->execute(['o' => $u['id_organisasi']]);

    return [
        'nim'            => $u['nim'],
        'nama'           => $u['nama_pengguna'],
        'idOrganisasi'   => (int)$u['id_organisasi'],
        'namaOrganisasi' => (string)$o->fetchColumn(),
    ];
}
