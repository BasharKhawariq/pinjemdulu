<?php
declare(strict_types=1);

/*
 * Kelola Inventaris: hanya barang milik OKI si PJ. Barang OKI lain diperlakukan
 * seolah tidak ada (404), bukan 403, agar keberadaannya tidak bocor.
 */

const KOLOM_INVENTARIS = 'id_inventaris, nama_barang, id_kategori, nama_kategori, total_unit, unit_keluar,
    jumlah_tersedia, kondisi, ketersediaan, deskripsi, foto_path, created_at';

function inv_map(array $r): array
{
    return urlkan($r, ['foto_path' => 'foto_url']);
}

function inv_milik_saya(int $id): array
{
    return ambil_atau_404(
        'SELECT * FROM v_inventaris WHERE id_inventaris = :id AND id_organisasi = :org',
        ['id' => $id, 'org' => me()['id_organisasi']],
        'Barang tidak ditemukan'
    );
}

function kategori_harus_ada(?int $id): void
{
    if ($id !== null && !db_val('SELECT 1 FROM kategori WHERE id_kategori = :id', ['id' => $id])) {
        fail(422, 'VALIDASI_GAGAL', 'Data yang dikirim belum valid', ['idKategori' => 'Kategori tidak ditemukan']);
    }
}

function h_ki_list(array $p): void
{
    $w = new Where();
    $w->add('id_organisasi = ?', [me()['id_organisasi']]);
    $kat = qs_ids('kategori');
    if ($kat) {
        $w->add('id_kategori = ANY(CAST(? AS integer[]))', [pg_array($kat)]);
    }
    $kond = qs_enum('kondisi', ['Baik', 'Rusak']);
    if ($kond !== null) {
        $w->add('kondisi::text = ?', [$kond]);
    }
    $ket = qs_enum('ketersediaan', ['Tersedia', 'Dipinjam']);
    if ($ket !== null) {
        $w->add('ketersediaan = ?', [$ket]);
    }
    filter_cari($w, ['nama_barang', 'nama_kategori']);
    list_out(paginate(KOLOM_INVENTARIS, 'v_inventaris', $w, 'nama_barang, id_inventaris'), 'inv_map');
}

function h_ki_detail(array $p): void
{
    $id = path_id($p);
    $r = inv_map(inv_milik_saya($id));
    $r['jadwal'] = db_all(
        "SELECT id_peminjaman, nama_peminjam, oki_peminjam, jumlah_pinjam, tgl_mulai, tgl_selesai, status
         FROM v_peminjaman_detail
         WHERE id_inventaris = :id AND status IN ('Diajukan', 'Disetujui', 'Dipinjam', 'Pengembalian')
         ORDER BY tgl_mulai, tgl_selesai",
        ['id' => $id]
    );
    json_out(camelize($r));
}

/** POST /api/kelola-inventaris (multipart): namaBarang, idKategori, totalUnit, kondisi?, deskripsi?, foto? */
function h_ki_tambah(array $p): void
{
    $u = me();
    $err = [];
    $nama = f_str('namaBarang', $err, true, 100, 'Nama barang');
    $kat = f_int('idKategori', $err, true, 1, 2147483647, 'Kategori');
    $total = f_int('totalUnit', $err, true, 1, 999, 'Jumlah unit');
    $kond = f_enum('kondisi', $err, ['Baik', 'Rusak'], false, 'Baik', 'Kondisi');
    $desk = f_str('deskripsi', $err, false, 1000, 'Deskripsi');
    $foto = upload_validasi('foto', MIME_GAMBAR, false, $err, 'Foto barang');
    validasi_selesai($err);
    kategori_harus_ada($kat);

    $path = $foto ? storage_put('inventaris', $foto) : null;
    $id = (int) bersihkan_jika_gagal($path ? [$path] : [], fn() => db_val(
        'INSERT INTO inventaris (id_organisasi, id_kategori, nama_barang, total_unit, kondisi, deskripsi, foto_path)
         VALUES (:org, :kat, :nama, :total, CAST(:kond AS kondisi_barang), :desk, :foto)
         RETURNING id_inventaris',
        ['org' => $u['id_organisasi'], 'kat' => $kat, 'nama' => $nama, 'total' => $total,
         'kond' => $kond, 'desk' => $desk, 'foto' => $path]
    ));
    json_out(['message' => 'Barang berhasil ditambahkan', 'idInventaris' => $id], 201);
}

/**
 * PUT (JSON) atau POST (multipart) /api/kelola-inventaris/{id}
 * Kirim hanya field yang diubah: namaBarang, idKategori, totalUnit, kondisi, deskripsi, foto, hapusFoto.
 */
function h_ki_ubah(array $p): void
{
    $id = path_id($p);
    $lama = inv_milik_saya($id);
    $b = body();
    $err = [];
    $set = [];
    $par = ['id' => $id, 'org' => me()['id_organisasi']];

    if (array_key_exists('namaBarang', $b)) {
        $v = f_str('namaBarang', $err, true, 100, 'Nama barang');
        if ($v !== null) {
            $set[] = 'nama_barang = :nama';
            $par['nama'] = $v;
        }
    }
    if (array_key_exists('idKategori', $b)) {
        $v = f_int('idKategori', $err, true, 1, 2147483647, 'Kategori');
        if ($v !== null) {
            $set[] = 'id_kategori = :kat';
            $par['kat'] = $v;
        }
    }
    if (array_key_exists('totalUnit', $b)) {
        $v = f_int('totalUnit', $err, true, 1, 999, 'Jumlah unit');
        if ($v !== null) {
            $set[] = 'total_unit = :total';
            $par['total'] = $v;
        }
    }
    if (array_key_exists('kondisi', $b)) {
        $v = f_enum('kondisi', $err, ['Baik', 'Rusak'], true, null, 'Kondisi');
        if ($v !== null) {
            $set[] = 'kondisi = CAST(:kond AS kondisi_barang)';
            $par['kond'] = $v;
        }
    }
    if (array_key_exists('deskripsi', $b)) {
        $v = f_str('deskripsi', $err, false, 1000, 'Deskripsi');   // kosong = hapus deskripsi
        $set[] = 'deskripsi = :desk';
        $par['desk'] = $v;
    }
    $hapusFoto = array_key_exists('hapusFoto', $b) ? f_bool('hapusFoto', $err, true, 'Hapus foto') : false;
    $foto = upload_validasi('foto', MIME_GAMBAR, false, $err, 'Foto barang');
    validasi_selesai($err);

    if (isset($par['kat'])) {
        kategori_harus_ada($par['kat']);
    }
    if (!$set && !$foto && !$hapusFoto) {
        fail(422, 'VALIDASI_GAGAL', 'Tidak ada perubahan yang dikirim');
    }

    $pathBaru = $foto ? storage_put('inventaris', $foto) : null;
    if ($pathBaru !== null) {
        $set[] = 'foto_path = :foto';
        $par['foto'] = $pathBaru;
    } elseif ($hapusFoto) {
        $set[] = 'foto_path = NULL';
    }

    // Kolom di $set seluruhnya literal di atas (tidak ada input pengguna yang masuk ke teks SQL).
    bersihkan_jika_gagal($pathBaru ? [$pathBaru] : [], fn() => db_exec(
        'UPDATE inventaris SET ' . implode(', ', $set) . ' WHERE id_inventaris = :id AND id_organisasi = :org AND deleted_at IS NULL',
        $par
    ));
    if ($pathBaru !== null || $hapusFoto) {
        storage_delete($lama['foto_path'] ?? null);
    }
    json_out(['message' => 'Barang berhasil diperbarui', 'data' => camelize(inv_map(inv_milik_saya($id)))]);
}

function h_ki_hapus(array $p): void
{
    $id = path_id($p);
    inv_milik_saya($id);
    // Hapus lunak; ditolak database bila masih ada peminjaman aktif/terjadwal. Foto dibiarkan demi riwayat.
    db_one('SELECT sp_hapus_inventaris(CAST(:id AS integer), CAST(:nim AS varchar))', ['id' => $id, 'nim' => me()['nim']]);
    json_out(['message' => 'Barang berhasil dihapus']);
}
