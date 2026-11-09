<?php
declare(strict_types=1);

/*
 * [METHOD, pola URL, nama fungsi handler, akses]
 * akses: public | user (semua role) | peminjam (hanya role Peminjam) | pj (hanya Penanggung Jawab)
 * Rute yang lebih spesifik harus ditulis lebih dulu.
 */
return [
    // ---- Publik
    ['GET',  '/api/health',                       'h_health',               'public'],
    ['POST', '/api/login',                        'h_login',                'public'],
    ['POST', '/api/lupa-password',                'h_lupa_password',        'public'],
    ['POST', '/api/reset-password',               'h_reset_password',       'public'],
    ['GET',  '/api/berkas/{path}',                'h_berkas',               'public'],

    // ---- Akun & referensi (semua role)
    ['GET',  '/api/me',                           'h_me',                   'user'],
    ['POST', '/api/ubah-password',                'h_ubah_password',        'user'],
    ['GET',  '/api/organisasi',                   'h_organisasi',           'user'],
    ['GET',  '/api/kategori',                     'h_kategori_ref',         'user'],
    ['GET',  '/api/badge',                        'h_badge',                'user'],

    // ---- Katalog & pengajuan peminjaman (semua role)
    ['GET',  '/api/inventaris',                   'h_katalog',              'user'],
    ['GET',  '/api/inventaris/{id}/kalender',     'h_kalender',             'user'],
    ['GET',  '/api/inventaris/{id}/cek',          'h_cek_jadwal',           'user'],
    ['GET',  '/api/inventaris/{id}',              'h_katalog_detail',       'user'],
    ['POST', '/api/peminjaman',                   'h_ajukan_peminjaman',    'user'],
    ['GET',  '/api/dashboard',                    'h_dashboard',            'user'],

    // ---- Pengajuan Saya (semua role; hanya milik sendiri sebagai peminjam)
    ['GET',  '/api/pengajuan-saya/peminjaman',                    'h_saya_peminjaman_list',   'user'],
    ['POST', '/api/pengajuan-saya/peminjaman/{id}/pengembalian',  'h_saya_ajukan_pengembalian', 'user'],
    ['GET',  '/api/pengajuan-saya/peminjaman/{id}',               'h_saya_peminjaman_detail', 'user'],
    ['GET',  '/api/pengajuan-saya/pengembalian',                  'h_saya_pengembalian_list', 'user'],
    ['POST', '/api/pengajuan-saya/pengembalian/{id}/ajukan-ulang', 'h_saya_ajukan_ulang', 'user'],
    ['GET',  '/api/pengajuan-saya/pengembalian/{id}',             'h_saya_pengembalian_detail', 'user'],

    // ---- Pengajuan PJ (khusus Peminjam)
    ['GET',  '/api/pengajuan-pj',                 'h_pengajuan_pj_list',    'peminjam'],
    ['POST', '/api/pengajuan-pj',                 'h_pengajuan_pj_buat',    'peminjam'],
    ['GET',  '/api/pengajuan-pj/{id}',            'h_pengajuan_pj_detail',  'peminjam'],

    // ---- Area PJ
    ['GET',  '/api/dashboard-pj',                 'h_dashboard_pj',         'pj'],

    ['GET',  '/api/kelola-inventaris',            'h_ki_list',              'pj'],
    ['POST', '/api/kelola-inventaris',            'h_ki_tambah',            'pj'],
    ['GET',  '/api/kelola-inventaris/{id}',       'h_ki_detail',            'pj'],
    ['PUT',  '/api/kelola-inventaris/{id}',       'h_ki_ubah',              'pj'],
    ['POST', '/api/kelola-inventaris/{id}',       'h_ki_ubah',              'pj'], // multipart (PUT tidak diparse PHP)
    ['DELETE', '/api/kelola-inventaris/{id}',     'h_ki_hapus',             'pj'],

    ['GET',  '/api/kelola-kategori',              'h_kk_list',              'pj'],
    ['POST', '/api/kelola-kategori',              'h_kk_tambah',            'pj'],
    ['PUT',  '/api/kelola-kategori/{id}',         'h_kk_ubah',              'pj'],
    ['DELETE', '/api/kelola-kategori/{id}',       'h_kk_hapus',             'pj'],

    ['GET',  '/api/kelola-peminjaman',            'h_kp_list',              'pj'],
    ['GET',  '/api/kelola-peminjaman/{id}',       'h_kp_detail',            'pj'],
    ['POST', '/api/kelola-peminjaman/{id}/setujui',    'h_kp_setujui',      'pj'],
    ['POST', '/api/kelola-peminjaman/{id}/tolak',      'h_kp_tolak',        'pj'],
    ['POST', '/api/kelola-peminjaman/{id}/pengambilan', 'h_kp_pengambilan', 'pj'],

    ['GET',  '/api/kelola-pengembalian',          'h_kg_list',              'pj'],
    ['GET',  '/api/kelola-pengembalian/{id}',     'h_kg_detail',            'pj'],
    ['POST', '/api/kelola-pengembalian/{id}/setujui',  'h_kg_setujui',      'pj'],
    ['POST', '/api/kelola-pengembalian/{id}/tolak',    'h_kg_tolak',        'pj'],

    ['GET',  '/api/kelola-pengajuan-pj',          'h_kj_list',              'pj'],
    ['GET',  '/api/kelola-pengajuan-pj/{id}',     'h_kj_detail',            'pj'],
    ['POST', '/api/kelola-pengajuan-pj/{id}/setujui',  'h_kj_setujui',      'pj'],
    ['POST', '/api/kelola-pengajuan-pj/{id}/tolak',    'h_kj_tolak',        'pj'],

    ['GET',  '/api/kelola-pengguna/request-password',                 'h_rp_list',       'pj'],
    ['GET',  '/api/kelola-pengguna/request-password/{id}',            'h_rp_detail',     'pj'],
    ['POST', '/api/kelola-pengguna/request-password/{id}/proses',     'h_rp_proses',     'pj'],
    ['POST', '/api/kelola-pengguna/request-password/{id}/konfirmasi', 'h_rp_konfirmasi', 'pj'],
    ['GET',  '/api/kelola-pengguna',              'h_kuser_list',           'pj'],
    ['POST', '/api/kelola-pengguna',              'h_kuser_tambah',         'pj'],
    ['PUT',  '/api/kelola-pengguna/{nim}/status', 'h_kuser_status',         'pj'],
    ['GET',  '/api/kelola-pengguna/{nim}',        'h_kuser_detail',         'pj'],
    ['PUT',  '/api/kelola-pengguna/{nim}',        'h_kuser_ubah',           'pj'],

    ['GET',  '/api/laporan/rekap',                'h_laporan_rekap',        'pj'],
    ['GET',  '/api/laporan/barang-populer',       'h_laporan_populer',      'pj'],
    ['POST', '/api/laporan/refresh',              'h_laporan_refresh',      'pj'],
];
