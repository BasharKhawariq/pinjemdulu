<?php
declare(strict_types=1);

/*
 * Kelola Kategori. Kategori bersifat global (dipakai semua OKI), jadi semua PJ boleh mengelolanya.
 * Nama unik tanpa membedakan huruf besar/kecil (indeks uq_kategori_nama).
 */

function kategori_nama_dari_body(): string
{
    $err = [];
    $nama = f_str('namaKategori', $err, true, 30, 'Nama kategori');
    validasi_selesai($err);
    return (string) $nama;
}

function kategori_sudah_ada(): never
{
    fail(409, 'KATEGORI_SUDAH_ADA', 'Kategori sudah ada', ['namaKategori' => 'Nama kategori sudah digunakan']);
}

function h_kk_list(array $p): void
{
    $from = '(SELECT k.id_kategori, k.nama_kategori,
                     COUNT(i.id_inventaris) FILTER (WHERE i.deleted_at IS NULL)::integer AS jumlah_barang,
                     (COUNT(i.id_inventaris) = 0) AS bisa_dihapus
              FROM kategori k LEFT JOIN inventaris i ON i.id_kategori = k.id_kategori
              GROUP BY k.id_kategori, k.nama_kategori) t';
    $w = new Where();
    filter_cari($w, ['nama_kategori']);
    list_out(paginate('id_kategori, nama_kategori, jumlah_barang, bisa_dihapus', $from, $w, 'nama_kategori', 20));
}

function h_kk_tambah(array $p): void
{
    $nama = kategori_nama_dari_body();
    try {
        $id = (int) db_val('INSERT INTO kategori (nama_kategori) VALUES (:n) RETURNING id_kategori', ['n' => $nama]);
    } catch (PDOException $e) {
        if (pg_state($e) === '23505') {
            kategori_sudah_ada();
        }
        throw $e;
    }
    json_out(['message' => 'Kategori berhasil ditambahkan', 'idKategori' => $id, 'namaKategori' => $nama], 201);
}

function h_kk_ubah(array $p): void
{
    $id = path_id($p);
    $nama = kategori_nama_dari_body();
    try {
        $n = db_exec('UPDATE kategori SET nama_kategori = :n WHERE id_kategori = :id', ['n' => $nama, 'id' => $id]);
    } catch (PDOException $e) {
        if (pg_state($e) === '23505') {
            kategori_sudah_ada();
        }
        throw $e;
    }
    if ($n === 0) {
        fail(404, 'NOT_FOUND', 'Kategori tidak ditemukan');
    }
    json_out(['message' => 'Kategori berhasil diperbarui', 'idKategori' => $id, 'namaKategori' => $nama]);
}

function h_kk_hapus(array $p): void
{
    $id = path_id($p);
    ambil_atau_404('SELECT 1 FROM kategori WHERE id_kategori = :id', ['id' => $id], 'Kategori tidak ditemukan');
    try {
        db_exec('DELETE FROM kategori WHERE id_kategori = :id', ['id' => $id]);
    } catch (PDOException $e) {
        if (pg_state($e) === '23503') {
            // Dipakai untuk dialog "Kategori Tidak Bisa Dihapus" di FE.
            $jml = (int) db_val('SELECT COUNT(*) FROM inventaris WHERE id_kategori = :id', ['id' => $id]);
            fail(409, 'KATEGORI_DIPAKAI', 'Kategori Tidak Bisa Dihapus karena masih dipakai oleh barang inventaris', ['jumlahBarang' => (string) $jml]);
        }
        throw $e;
    }
    json_out(['message' => 'Kategori berhasil dihapus']);
}
