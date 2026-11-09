<?php
declare(strict_types=1);

/*
 * Pembantu bersama untuk handler (dimuat otomatis oleh bootstrap.php).
 */

/** Ambil satu baris; bila tidak ada => 404 (dipakai juga untuk data OKI lain). */
function ambil_atau_404(string $sql, array $params, string $pesan = 'Data tidak ditemukan'): array
{
    $r = db_one($sql, $params);
    if ($r === null) {
        fail(404, 'NOT_FOUND', $pesan);
    }
    return $r;
}

/** Ubah kolom path berkas menjadi URL. $peta: ['kolom_path' => 'kolom_url', ...]. */
function urlkan(array $row, array $peta): array
{
    foreach ($peta as $path => $url) {
        $row = urlize($row, $path, $url);
    }
    return $row;
}

/** Filter status dipisah koma, mis. ?status=Diajukan,Disetujui. Mengembalikan daftar nilai sah. */
function qs_enum_multi(string $k, array $allowed): array
{
    $v = qs($k);
    if ($v === '') {
        return [];
    }
    $out = [];
    foreach (explode(',', $v) as $x) {
        $x = trim($x);
        if (!in_array($x, $allowed, true)) {
            fail(422, 'VALIDASI_GAGAL', "Parameter $k tidak valid", [$k => 'Harus salah satu dari: ' . implode(', ', $allowed)]);
        }
        $out[] = $x;
    }
    return array_values(array_unique($out));
}

/** Literal array Postgres dari daftar bilangan bulat / string aman. */
function pg_array(array $vals): string
{
    $esc = array_map(fn($v) => '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], (string) $v) . '"', $vals);
    return '{' . implode(',', $esc) . '}';
}

/** Pencarian teks bebas pada beberapa kolom (ILIKE, aman dari karakter khusus LIKE). */
function filter_cari(Where $w, array $kolom): void
{
    $q = qs('q');
    if ($q === '') {
        return;
    }
    if (mb_strlen($q) > 100) {
        fail(422, 'VALIDASI_GAGAL', 'Parameter q terlalu panjang', ['q' => 'Maksimal 100 karakter']);
    }
    $pola = like_pattern($q);
    $bagian = [];
    $vals = [];
    foreach ($kolom as $c) {
        $bagian[] = "$c ILIKE ?";
        $vals[] = $pola;
    }
    $w->add('(' . implode(' OR ', $bagian) . ')', $vals);
}

/**
 * Jalankan $fn; bila gagal, hapus berkas yang sudah terlanjur diunggah lalu lempar ulang galatnya.
 * @param string[] $paths
 */
function bersihkan_jika_gagal(array $paths, callable $fn): mixed
{
    try {
        return $fn();
    } catch (Throwable $e) {
        foreach ($paths as $p) {
            storage_delete($p);
        }
        throw $e;
    }
}

/** NIM: huruf/angka saja, 3-20 karakter. */
function f_nim(string $k, array &$err, bool $required = true, string $label = 'NIM'): ?string
{
    $v = f_str($k, $err, $required, 20, $label);
    if ($v !== null && !preg_match('/^[A-Za-z0-9]{3,20}$/', $v)) {
        $err[$k] = "$label hanya boleh huruf dan angka, 3 sampai 20 karakter";
        return null;
    }
    return $v;
}

/** Nomor WhatsApp -> format internasional tanpa tanda + (62812...). */
function wa_internasional(string $no): string
{
    $d = preg_replace('/\D+/', '', $no) ?? '';
    if (str_starts_with($d, '0')) {
        return '62' . substr($d, 1);
    }
    return $d;
}
