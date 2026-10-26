<?php
// Handler /api/inventaris. Dipanggil dari public/index.php ($pdo sudah tersedia).
// Input dan output memakai camelCase (idKategori, namaBarang, ...).

const SQL_INVENTARIS = 'SELECT i.id_inventaris, i.nama_barang, i.total_barang, i.kondisi,
        i.deskripsi_barang, i.id_kategori, k.nama_kategori,
        i.id_organisasi, o.nama_organisasi, r.jumlah_tersedia,
        (i.thumbnail IS NOT NULL) AS punya_thumbnail,
        CASE WHEN i.kondisi = \'Rusak\' THEN \'Tidak Tersedia\'
        WHEN COALESCE(r.jumlah_tersedia, 0) > 0 THEN \'Tersedia\'
        ELSE \'Dipinjam\' END AS status_ketersediaan
    FROM inventaris i
    JOIN kategori k ON k.id_kategori = i.id_kategori
    JOIN organisasi o ON o.id_organisasi = i.id_organisasi
    JOIN v_inv_ringkas r ON r.id_inventaris = i.id_inventaris';

/** Validasi untuk POST dan PUT; mengembalikan data bersih. */
function validasi_inventaris(array $d): array
{
    $err = [];

    $nama = trim((string)($d['namaBarang'] ?? ''));
    if ($nama === '' || mb_strlen($nama) > 100) {
        $err['namaBarang'] = 'Nama barang wajib diisi (maksimal 100 karakter).';
    }

    $kat = filter_var($d['idKategori'] ?? null, FILTER_VALIDATE_INT);
    if ($kat === false || $kat < 1) {
        $err['idKategori'] = 'Kategori tidak valid.';
    }

    $org = filter_var($d['idOrganisasi'] ?? null, FILTER_VALIDATE_INT);
    if ($org === false || $org < 1) {
        $err['idOrganisasi'] = 'Organisasi tidak valid.';
    }

    $total = filter_var($d['totalBarang'] ?? null, FILTER_VALIDATE_INT);
    if ($total === false || $total < 0) {
        $err['totalBarang'] = 'Total barang harus angka 0 atau lebih.';
    }

    $kondisi = $d['kondisi'] ?? '';
    if (!in_array($kondisi, ['Baik', 'Rusak'], true)) {
        $err['kondisi'] = "Kondisi harus 'Baik' atau 'Rusak'.";
    }

    $desk = $d['deskripsiBarang'] ?? null;
    if ($desk !== null && (!is_string($desk) || mb_strlen($desk) > 255)) {
        $err['deskripsiBarang'] = 'Deskripsi maksimal 255 karakter.';
    }

    if ($err) {
        json_error('Validasi gagal.', 'VALIDASI_GAGAL', 422, $err);
    }

    return [
        'nama'  => $nama,
        'kat'   => $kat,
        'org'   => $org,
        'total' => $total,
        'kond'  => $kondisi,
        'desk'  => ($desk === '' ? null : $desk),
    ];
}

/** Satu baris hasil query -> JSON: camelCase, bytea diganti thumbnailUrl (null bila tak ada foto). */
function format_inventaris(array $row): array
{
    $out = camel_keys($row);
    $ada = filter_var($out['punyaThumbnail'], FILTER_VALIDATE_BOOLEAN);
    unset($out['punyaThumbnail']);
    $out['thumbnailUrl'] = url_gambar('/api/inventaris/thumbnail', (int)$out['idInventaris'], $ada);
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'];
// PHP tidak mengisi $_POST/$_FILES untuk PUT multipart, jadi form dengan foto
// mengirim POST ke ?id=N&_method=PUT.
if ($method === 'POST' && ($_GET['_method'] ?? '') === 'PUT') {
    $method = 'PUT';
}
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    switch ($method) {

        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare(SQL_INVENTARIS . ' WHERE i.id_inventaris = :id');
                $stmt->execute(['id' => $id]);
                $row = $stmt->fetch();
                if (!$row) {
                    json_error('Inventaris tidak ditemukan.', 'NOT_FOUND', 404);
                }
                json_out(format_inventaris($row));
            }
            $rows = $pdo->query(SQL_INVENTARIS . " WHERE i.kondisi <> 'Rusak' ORDER BY i.nama_barang")->fetchAll();
            json_out(array_map('format_inventaris', $rows));

        case 'POST':
            $v     = validasi_inventaris(input());
            $thumb = ambil_unggahan_gambar('thumbnail', true); // foto wajib
            $fp    = fopen($thumb, 'rb');
            $stmt  = $pdo->prepare(
                'INSERT INTO inventaris (id_kategori, id_organisasi, nama_barang, total_barang, kondisi, deskripsi_barang, thumbnail)
                 VALUES (:kat, :org, :nama, :total, :kond, :desk, :thumb)
                 RETURNING id_inventaris'
            );
            foreach ($v as $k => $nilai) {
                $stmt->bindValue(':' . $k, $nilai);
            }
            $stmt->bindValue(':thumb', $fp, PDO::PARAM_LOB);
            $stmt->execute();
            json_out(['idInventaris' => $stmt->fetchColumn(), 'message' => 'Berhasil ditambahkan'], 201);

        case 'PUT':
            if (!$id) {
                json_error('Parameter id wajib.', 'ID_WAJIB', 400);
            }
            $v       = validasi_inventaris(input());
            $v['id'] = $id;
            $thumb   = ambil_unggahan_gambar('thumbnail');

            if ($thumb === null) {
                // tidak ada foto baru: barang ini harus sudah punya foto
                $cek = $pdo->prepare('SELECT (thumbnail IS NOT NULL) AS ada FROM inventaris WHERE id_inventaris = :id');
                $cek->execute(['id' => $id]);
                $baris = $cek->fetch();
                if (!$baris) {
                    json_error('Inventaris tidak ditemukan.', 'NOT_FOUND', 404);
                }
                if (!$baris['ada']) {
                    json_error('Foto wajib diunggah.', 'VALIDASI_GAGAL', 422, ['thumbnail' => 'Foto wajib diunggah.']);
                }
            }

            $fp   = $thumb !== null ? fopen($thumb, 'rb') : null;
            $stmt = $pdo->prepare(
                'UPDATE inventaris
                    SET id_kategori = :kat, id_organisasi = :org, nama_barang = :nama,
                        total_barang = :total, kondisi = :kond, deskripsi_barang = :desk,
                        thumbnail = COALESCE(:thumb, thumbnail)
                  WHERE id_inventaris = :id'
            );
            foreach ($v as $k => $nilai) {
                $stmt->bindValue(':' . $k, $nilai);
            }
            $stmt->bindValue(':thumb', $fp, $fp ? PDO::PARAM_LOB : PDO::PARAM_NULL);
            $stmt->execute();
            if (!$stmt->rowCount()) {
                json_error('Inventaris tidak ditemukan.', 'NOT_FOUND', 404);
            }
            json_out(['message' => 'Berhasil diubah']);

        case 'DELETE':
            if (!$id) {
                json_error('Parameter id wajib.', 'ID_WAJIB', 400);
            }
            $stmt = $pdo->prepare('DELETE FROM inventaris WHERE id_inventaris = :id');
            $stmt->execute(['id' => $id]);
            if (!$stmt->rowCount()) {
                json_error('Inventaris tidak ditemukan.', 'NOT_FOUND', 404);
            }
            json_out(['message' => 'Berhasil dihapus']);

        default:
            json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
    }
} catch (PDOException $e) {
    pdo_error($e);
}