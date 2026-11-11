<?php
declare(strict_types=1);

/*
 * Kelola Pengguna & Request Password. PJ hanya mengelola pengguna dari OKI-nya sendiri;
 * pengguna OKI lain dianggap tidak ada (404). Password awal pengguna baru = NIM (di-hash trigger).
 */

const ROLE_PENGGUNA = ['Peminjam', 'Penanggung Jawab'];
const STATUS_REQ_PASSWORD = ['Menunggu', 'Dikonfirmasi'];

const KOLOM_PENGGUNA = 'nim, nama_pengguna, id_organisasi, nama_organisasi, singkatan, logo_path, role, status_akun';

function pengguna_map(array $r): array
{
    return urlkan($r, ['logo_path' => 'logo_url']);
}

function pengguna_milik_oki(string $nim): array
{
    return ambil_atau_404(
        'SELECT ' . KOLOM_PENGGUNA . ' FROM v_pengguna WHERE nim = :nim AND id_organisasi = :org',
        ['nim' => $nim, 'org' => me()['id_organisasi']],
        'Pengguna tidak ditemukan'
    );
}

function h_kuser_list(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi = ?', [me()['id_organisasi']]);
    $role = qs_enum('role', ROLE_PENGGUNA);
    if ($role !== null) {
        $w->add('role::text = ?', [$role]);
    }
    $aktif = qs_enum('status', ['aktif', 'nonaktif']);
    if ($aktif !== null) {
        $w->add('status_akun = CAST(? AS boolean)', [$aktif === 'aktif' ? 'true' : 'false']);
    }
    filter_cari($w, ['nim', 'nama_pengguna']);
    list_out(paginate(KOLOM_PENGGUNA, 'v_pengguna', $w, 'nama_pengguna, nim'), 'pengguna_map');
}

function h_kuser_detail(array $p): void
{
    json_out(camelize(pengguna_map(pengguna_milik_oki(path_nim($p)))));
}

/** POST /api/kelola-pengguna { nim, namaPengguna, role? } : OKI otomatis = OKI PJ. */
function h_kuser_tambah(array $p): void
{
    $u = me();
    $err = [];
    $nim = f_nim('nim', $err);
    $nama = f_str('namaPengguna', $err, true, 100, 'Nama pengguna');
    $role = f_enum('role', $err, ROLE_PENGGUNA, false, 'Peminjam', 'Role');
    validasi_selesai($err);

    db_one(
        'SELECT sp_tambah_pengguna(CAST(:pj AS varchar), CAST(:nim AS varchar), CAST(:nama AS varchar),
                                   CAST(:org AS integer), CAST(:role AS role_pengguna))',
        ['pj' => $u['nim'], 'nim' => $nim, 'nama' => $nama, 'org' => $u['id_organisasi'], 'role' => $role]
    );
    json_out([
        'message' => 'Pengguna berhasil ditambahkan. Password awal sama dengan NIM.',
        'data' => camelize(pengguna_map(pengguna_milik_oki($nim))),
    ], 201);
}

/** PUT /api/kelola-pengguna/{nim} { nim?, namaPengguna?, role? } */
function h_kuser_ubah(array $p): void
{
    $u = me();
    $nimLama = path_nim($p);
    $lama = pengguna_milik_oki($nimLama);
    $b = body();
    $err = [];
    $nimBaru = array_key_exists('nim', $b) ? f_nim('nim', $err) : $lama['nim'];
    $nama = array_key_exists('namaPengguna', $b) ? f_str('namaPengguna', $err, true, 100, 'Nama pengguna') : $lama['nama_pengguna'];
    $role = array_key_exists('role', $b) ? f_enum('role', $err, ROLE_PENGGUNA, true, null, 'Role') : $lama['role'];
    validasi_selesai($err);

    db_one(
        'SELECT sp_ubah_pengguna(CAST(:pj AS varchar), CAST(:lama AS varchar), CAST(:baru AS varchar), CAST(:nama AS varchar),
                                 CAST(:org AS integer), CAST(:role AS role_pengguna))',
        ['pj' => $u['nim'], 'lama' => $nimLama, 'baru' => $nimBaru, 'nama' => $nama, 'org' => $u['id_organisasi'], 'role' => $role]
    );
    json_out([
        'message' => 'Data pengguna berhasil diperbarui',
        'data' => camelize(pengguna_map(pengguna_milik_oki((string) $nimBaru))),
    ]);
}

/** PUT /api/kelola-pengguna/{nim}/status { statusAkun: true|false } */
function h_kuser_status(array $p): void
{
    $u = me();
    $nim = path_nim($p);
    pengguna_milik_oki($nim);
    $err = [];
    $aktif = f_bool('statusAkun', $err, true, 'Status akun');
    validasi_selesai($err);

    db_one(
        'SELECT sp_set_status_akun(CAST(:pj AS varchar), CAST(:nim AS varchar), CAST(:aktif AS boolean))',
        ['pj' => $u['nim'], 'nim' => $nim, 'aktif' => $aktif ? 'true' : 'false']
    );
    json_out(['message' => $aktif ? 'Akun diaktifkan' : 'Akun dinonaktifkan']);
}

/* ------------------------------ Request password ------------------------------ */
const KOLOM_REQ_PASS = 'id_request_password, nim, nama_pengguna, oki_pemohon, no_whatsapp, tanggal_request, status,
    pesan_terkirim, nim_pemroses, dikonfirmasi_pada';

function req_pass_milik_oki(int $id): array
{
    return ambil_atau_404(
        'SELECT ' . KOLOM_REQ_PASS . ' FROM v_request_password_detail WHERE id_request_password = :id AND id_organisasi_pemohon = :org',
        ['id' => $id, 'org' => me()['id_organisasi']],
        'Request password tidak ditemukan'
    );
}

function h_rp_list(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi_pemohon = ?', [me()['id_organisasi']]);
    $st = qs_enum_multi('status', STATUS_REQ_PASSWORD);
    if ($st) {
        $w->add('status::text = ANY(CAST(? AS text[]))', [pg_array($st)]);
    }
    filter_cari($w, ['nim', 'nama_pengguna']);
    list_out(paginate(KOLOM_REQ_PASS, 'v_request_password_detail', $w, "(status = 'Menunggu') DESC, id_request_password DESC"));
}

function h_rp_detail(array $p): void
{
    json_out(camelize(req_pass_milik_oki(path_id($p))));
}

/**
 * POST .../{id}/proses : membuat token sekali pakai (24 jam). Token asli hanya muncul di respons ini.
 * Respons memuat tautan reset, pesan siap kirim, dan tautan wa.me untuk membuka WhatsApp.
 */
function h_rp_proses(array $p): void
{
    $id = path_id($p);
    $req = req_pass_milik_oki($id);
    $token = (string) db_val(
        'SELECT sp_proses_request_password(CAST(:id AS integer), CAST(:nim AS varchar))',
        ['id' => $id, 'nim' => me()['nim']]
    );
    $tautan = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/#/reset-password?token=' . $token;
    $pesan = "Halo {$req['nama_pengguna']}, ini tautan untuk mengatur ulang password akun PinjemDulu kamu "
        . "(berlaku 24 jam dan hanya bisa dipakai sekali):\n$tautan";
    json_out([
        'message' => 'Tautan reset password dibuat',
        'tautanReset' => $tautan,
        'pesan' => $pesan,
        'waUrl' => 'https://wa.me/' . wa_internasional((string) $req['no_whatsapp']) . '?text=' . rawurlencode($pesan),
        'berlakuSampai' => date('c', time() + 24 * 3600),
    ]);
}

/** POST .../{id}/konfirmasi { pesan } : tandai sudah dikirim ke peminjam. */
function h_rp_konfirmasi(array $p): void
{
    $id = path_id($p);
    $err = [];
    $pesan = f_str('pesan', $err, true, 2000, 'Pesan');
    validasi_selesai($err);
    req_pass_milik_oki($id);

    // Token asli tidak boleh tersimpan: sembunyikan string 64 heks (token) bila ikut tertulis di pesan.
    $aman = (string) preg_replace('/[0-9a-f]{64}/i', '[token disembunyikan]', (string) $pesan);
    db_one(
        'SELECT sp_konfirmasi_request_password(CAST(:id AS integer), CAST(:nim AS varchar), CAST(:pesan AS text))',
        ['id' => $id, 'nim' => me()['nim'], 'pesan' => $aman]
    );
    json_out(['message' => 'Request password dikonfirmasi']);
}
