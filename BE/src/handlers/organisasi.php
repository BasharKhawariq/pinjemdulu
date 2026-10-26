<?php
// Handler /api/organisasi (baca saja). Gambar icon (bytea) tidak ikut di JSON;
// FE memakai iconUrl (null bila organisasi belum punya icon).

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method tidak didukung.', 'METHOD_NOT_ALLOWED', 405);
}

try {
    $rows = $pdo->query(
        'SELECT id_organisasi, nama_organisasi, (icon IS NOT NULL) AS punya_icon
           FROM organisasi
          ORDER BY nama_organisasi'
    )->fetchAll();
    json_out(array_map(function (array $row): array {
        $out = camel_keys($row);
        $ada = filter_var($out['punyaIcon'], FILTER_VALIDATE_BOOLEAN);
        unset($out['punyaIcon']);
        $out['iconUrl'] = url_gambar('/api/organisasi/icon', (int)$out['idOrganisasi'], $ada);
        return $out;
    }, $rows));
} catch (PDOException $e) {
    pdo_error($e);
}