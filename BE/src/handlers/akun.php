<?php
declare(strict_types=1);

function h_health(array $p): void
{
    json_out(['status' => 'ok', 'waktu' => date('c')]);
}

/** Satu pintu penerbitan sesi setelah kredensial terbukti benar. */
function sesi_baru(array $u): array
{
    return array_merge(token_make($u['nim']), ['user' => user_payload($u)]);
}

function h_login(array $p): void
{
    $err = [];
    $nim = f_str('nim', $err, true, 20, 'NIM');
    $pw = body()['password'] ?? '';
    if (!is_string($pw) || $pw === '') {
        $err['password'] = 'Password wajib diisi';
    }
    validasi_selesai($err);

    rl_check('login-ip:' . client_ip(), 30, 900);
    rl_check('login-nim:' . $nim, 5, 900);
    captcha_verify(body()['captchaToken'] ?? null);

    try {
        db_one('SELECT nim FROM fn_login(CAST(:nim AS varchar), CAST(:pw AS text))', ['nim' => $nim, 'pw' => $pw]);
    } catch (PDOException $e) {
        if (pg_state($e) !== 'P0001') {
            throw $e;
        }
        $msg = pg_message($e);
        if (str_contains($msg, 'nonaktif')) {
            fail(403, 'AKUN_NONAKTIF', $msg);
        }
        rl_hit('login-nim:' . $nim, 900);
        rl_hit('login-ip:' . client_ip(), 900);
        fail(401, 'KREDENSIAL_SALAH', 'NIM atau password salah');
    }
    rl_reset('login-nim:' . $nim);
    $u = load_user($nim) ?? fail(401, 'KREDENSIAL_SALAH', 'NIM atau password salah');
    json_out(sesi_baru($u));
}

function h_me(array $p): void
{
    json_out(user_payload(require_login()));
}

function h_ubah_password(array $p): void
{
    $u = me();
    $err = [];
    $lama = body()['passwordLama'] ?? '';
    $baru = body()['passwordBaru'] ?? '';
    $konf = body()['konfirmasiPassword'] ?? '';
    if (!is_string($lama) || $lama === '') {
        $err['passwordLama'] = 'Password saat ini wajib diisi';
    }
    if (!is_string($baru) || $baru === '') {
        $err['passwordBaru'] = 'Password baru wajib diisi';
    } elseif (mb_strlen($baru) < 8) {
        $err['passwordBaru'] = 'Password baru minimal 8 karakter';
    }
    if ($konf !== $baru) {
        $err['konfirmasiPassword'] = 'Konfirmasi password harus sama dengan password baru';
    }
    validasi_selesai($err);

    rl_check('ubahpw:' . $u['nim'], 5, 900);
    try {
        db_one('SELECT sp_ubah_password(CAST(:nim AS varchar), CAST(:lama AS text), CAST(:baru AS text))', [
            'nim' => $u['nim'], 'lama' => $lama, 'baru' => $baru,
        ]);
    } catch (PDOException $e) {
        if (pg_state($e) === 'P0001') {
            rl_hit('ubahpw:' . $u['nim'], 900);
        }
        throw $e;
    }
    rl_reset('ubahpw:' . $u['nim']);
    // Token lama gugur karena data akun berubah; terbitkan token baru agar sesi berlanjut.
    $u = load_user($u['nim']);
    if ($u === null) {
        fail(401, 'TIDAK_TERAUTENTIKASI', 'Sesi tidak valid atau sudah berakhir. Silakan login kembali.');
    }
    json_out(array_merge(['message' => 'Password berhasil diubah'], sesi_baru($u)));
}

function h_lupa_password(array $p): void
{
    $err = [];
    $nim = f_str('nim', $err, true, 20, 'NIM');
    $wa = f_str('noWhatsapp', $err, true, 20, 'No WhatsApp');
    if ($wa !== null && !preg_match('/^[0-9+]{8,20}$/', $wa)) {
        $err['noWhatsapp'] = 'No WhatsApp hanya boleh angka dan +, 8 sampai 20 karakter';
    }
    validasi_selesai($err);

    rl_check('lupa-ip:' . client_ip(), 10, 900);
    rl_hit('lupa-ip:' . client_ip(), 900);
    captcha_verify(body()['captchaToken'] ?? null);

    try {
        db_one('SELECT sp_ajukan_lupa_password(CAST(:nim AS varchar), CAST(:wa AS varchar))', ['nim' => $nim, 'wa' => $wa]);
    } catch (PDOException $e) {
        if (pg_state($e) === 'P0001' && str_contains(pg_message($e), 'tidak terdaftar')) {
            fail(404, 'NIM_TIDAK_TERDAFTAR', 'NIM tidak terdaftar');
        }
        throw $e;
    }
    json_out(['message' => 'Permintaan ubah password dikirim ke penanggung jawab OKI Anda'], 201);
}

function h_reset_password(array $p): void
{
    $err = [];
    $token = f_str('token', $err, true, 200, 'Token');
    $baru = body()['passwordBaru'] ?? '';
    $konf = body()['konfirmasiPassword'] ?? '';
    if (!is_string($baru) || mb_strlen($baru) < 8) {
        $err['passwordBaru'] = 'Password baru minimal 8 karakter';
    }
    if ($konf !== $baru) {
        $err['konfirmasiPassword'] = 'Konfirmasi password harus sama dengan password baru';
    }
    validasi_selesai($err);

    rl_check('reset-ip:' . client_ip(), 10, 900);
    try {
        db_one('SELECT sp_reset_password_dengan_token(CAST(:t AS text), CAST(:pw AS text))', ['t' => $token, 'pw' => $baru]);
    } catch (PDOException $e) {
        if (pg_state($e) === 'P0001' && str_contains(pg_message($e), 'Tautan')) {
            rl_hit('reset-ip:' . client_ip(), 900);
            fail(400, 'TAUTAN_TIDAK_VALID', pg_message($e));
        }
        throw $e;
    }
    json_out(['message' => 'Password berhasil diubah. Silakan login dengan password baru.']);
}

/* ------------------------------------------------------------------ */
/* Referensi & berkas                                                  */
/* ------------------------------------------------------------------ */
function h_organisasi(array $p): void
{
    $rows = db_all('SELECT id_organisasi, nama_organisasi, singkatan, logo_path FROM organisasi ORDER BY singkatan');
    json_out(['data' => array_map(fn($r) => camelize(urlize($r, 'logo_path', 'logo_url')), $rows)]);
}

function h_kategori_ref(array $p): void
{
    json_out(['data' => array_map('camelize', db_all('SELECT id_kategori, nama_kategori FROM kategori ORDER BY nama_kategori'))]);
}

/** Menyajikan berkas driver lokal lewat URL bertanda tangan (kedaluwarsa 1 jam). */
function h_berkas(array $p): void
{
    if (storage_driver() !== 'local') {
        fail(404, 'NOT_FOUND', 'Berkas tidak ditemukan');
    }
    $path = (string) $p['path'];
    $exp = (int) ($_GET['exp'] ?? 0);
    $sig = (string) ($_GET['sig'] ?? '');
    if ($exp < time() || !hash_equals(file_sig($path, $exp), $sig)) {
        fail(403, 'TAUTAN_BERKAS_TIDAK_VALID', 'Tautan berkas tidak valid atau sudah kedaluwarsa');
    }
    $root = realpath(BASE_PATH . '/storage/uploads');
    $full = realpath(BASE_PATH . '/storage/uploads/' . $path);
    if (!$root || !$full || !str_starts_with($full, $root . DIRECTORY_SEPARATOR) || !is_file($full)) {
        fail(404, 'NOT_FOUND', 'Berkas tidak ditemukan');
    }
    header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file($full));
    header('Content-Length: ' . filesize($full));
    header('Cache-Control: private, max-age=300');
    header('X-Content-Type-Options: nosniff');
    readfile($full);
    exit;
}

/** Angka badge sidebar (jumlah data menurut status). */
function h_badge(array $p): void
{
    $u = me();
    $pinjam = db_one(
        "SELECT COUNT(*) FILTER (WHERE status='Diajukan')::int AS diajukan,
                COUNT(*) FILTER (WHERE status='Disetujui')::int AS disetujui,
                COUNT(*) FILTER (WHERE status='Dipinjam')::int AS dipinjam,
                COUNT(*) FILTER (WHERE status='Ditolak')::int AS ditolak
         FROM v_peminjaman_detail WHERE nim_peminjam = :nim",
        ['nim' => $u['nim']]
    );
    $kembali = db_one(
        "SELECT COUNT(*) FILTER (WHERE status='Menunggu')::int AS menunggu,
                COUNT(*) FILTER (WHERE status='Dikembalikan')::int AS dikembalikan,
                COUNT(*) FILTER (WHERE status='Terlambat')::int AS terlambat,
                COUNT(*) FILTER (WHERE status='Ditolak')::int AS ditolak
         FROM v_pengembalian_detail WHERE nim_peminjam = :nim",
        ['nim' => $u['nim']]
    );
    $pj = null;
    if ($u['is_pj']) {
        $pj = db_one(
            'SELECT pengajuan AS kelola_peminjaman, pengembalian_menunggu AS kelola_pengembalian,
                    persetujuan_pj AS list_pengajuan_pj, request_password_menunggu AS request_password
             FROM v_dashboard_pj WHERE id_organisasi = CAST(:org AS integer)',
            ['org' => $u['id_organisasi']]
        );
    }
    json_out(['pengajuanSaya' => ['peminjaman' => camelize($pinjam), 'pengembalian' => camelize($kembali)], 'pj' => camelize($pj)]);
}
