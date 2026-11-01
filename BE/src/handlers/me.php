<?php
// GET /api/me -- profil pemanggil (role apa pun). Dipakai FE setelah login untuk tahu
// siapa yang masuk dan menu mana yang ditampilkan.

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $u = pengguna_login($pdo);
    $nama = null;
    if ($u['id_organisasi'] !== null) {
        $o = $pdo->prepare('SELECT nama_organisasi FROM organisasi WHERE id_organisasi = :o');
        $o->execute(['o' => $u['id_organisasi']]);
        $nama = $o->fetchColumn() ?: null;
    }
    json_out([
        'nim'            => $u['nim'],
        'namaPengguna'   => $u['nama_pengguna'],
        'role'           => $u['role'],               // 'Peminjam' | 'Pengelola'
        'isPj'           => $u['role'] === 'Pengelola' && $u['id_organisasi'] !== null,
        'idOrganisasi'   => $u['id_organisasi'] !== null ? (int)$u['id_organisasi'] : null,
        'namaOrganisasi' => $nama,
    ]);
} catch (PDOException $e) {
    pdo_error($e);
}
