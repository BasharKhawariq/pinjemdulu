import test from 'node:test';
import assert from 'node:assert/strict';

import * as KelolaPage from '../js/pages/kelola-inventaris.js';

const FORBIDDEN_ESCAPED_TAGS = [
  '&lt;svg',
  '&lt;button',
  '&lt;div',
  '&lt;p',
  '&lt;span',
  '&lt;a ',
  '&lt;img',
  '&lt;input',
  '&lt;label',
  '&lt;td',
  '&lt;tr',
  '&amp;lt;',
];

function assertNoEscapedMarkup(output, componentName) {
  for (const token of FORBIDDEN_ESCAPED_TAGS) {
    assert.equal(
      output.includes(token),
      false,
      `${componentName} tidak boleh memuat fragmen markup ter-escape '${token}'`
    );
  }
}

test('pages-kelola-inventaris: render awal menghasilkan skeleton tabel tanpa escape ganda', () => {
  const html = KelolaPage.render({ loading: true });
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('animate-pulse'));
  assert.ok(html.includes('Kelola Inventaris'));
  assert.ok(html.includes('List Barang Inventaris'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'KelolaPage.render (Skeleton)');
});

test('pages-kelola-inventaris: renderKelolaContent merender tabel inventaris lengkap dengan kolom dan aksi', () => {
  const mockItems = [
    {
      idInventaris: 'inv-101',
      namaBarang: 'Proyektor Sony VPL-DX221',
      idKategori: 'kat-1',
      namaKategori: 'Elektronik',
      idOrganisasi: 'oki-bem',
      namaOrganisasi: 'BEM Polinema',
      kondisi: 'baik',
      totalBarang: 4,
      sisaHariIni: 2,
      thumbnail: 'assets/inventaris/proyektor.png',
      deskripsiBarang: 'Spesifikasi HD 2800 Lumens',
    },
    {
      idInventaris: 'inv-102',
      namaBarang: 'Speaker Portable Huper',
      idKategori: 'kat-2',
      namaKategori: 'Audio',
      idOrganisasi: 'oki-bem',
      namaOrganisasi: 'BEM Polinema',
      kondisi: 'rusak',
      totalBarang: 1,
      sisaHariIni: 0,
      thumbnail: '',
    },
  ];

  const html = KelolaPage.renderKelolaContent({
    items: mockItems,
    meta: { page: 1, perPage: 10, total: 2, totalPages: 1 },
    loading: false,
    error: null,
    cari: '',
    filters: { kategori: null, kondisi: null, status: null },
    nAktif: 0,
  }).toString();

  // Kolom Header Tabel Semantik
  assert.ok(html.includes('<th scope="col"'));
  assert.ok(html.includes('Nama Barang'));
  assert.ok(html.includes('Jumlah Unit'));
  assert.ok(html.includes('Kondisi'));
  assert.ok(html.includes('Status'));
  assert.ok(html.includes('Aksi'));

  // Data Item
  assert.ok(html.includes('Proyektor Sony VPL-DX221'));
  assert.ok(html.includes('Speaker Portable Huper'));
  assert.ok(html.includes('BEM Polinema'));
  assert.ok(html.includes('Elektronik'));
  assert.ok(html.includes('Audio'));
  assert.ok(html.includes('4'));
  assert.ok(html.includes('(2 sisa)'));
  assert.ok(html.includes('Baik'));
  assert.ok(html.includes('Rusak'));
  assert.ok(html.includes('Tersedia'));
  assert.ok(html.includes('Dipinjam'));

  // Aksi tombol memiliki aria-label dan title
  assert.ok(html.includes('aria-label="Ubah Proyektor Sony VPL-DX221"'));
  assert.ok(html.includes('aria-label="Lihat detail Proyektor Sony VPL-DX221"'));
  assert.ok(html.includes('aria-label="Hapus Proyektor Sony VPL-DX221"'));

  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'KelolaPage.renderKelolaContent (Data)');
});

test('pages-kelola-inventaris: escape karakter berbahaya dari pengguna/mock', () => {
  const xssItem = {
    idInventaris: 'inv-xss',
    namaBarang: '<script>alert("xss")</script>',
    namaKategori: '"><img src=x onerror=1>',
    namaOrganisasi: '<b>OKI Bahaya</b>',
    kondisi: 'baik',
    totalBarang: 1,
    sisaHariIni: 1,
    thumbnail: 'javascript:alert(1)',
    deskripsiBarang: '"><script>alert(2)</script>',
  };

  const html = KelolaPage.renderKelolaContent({
    items: [xssItem],
    meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
    loading: false,
    detailItem: xssItem,
  }).toString();

  // Memastikan tag berbahaya tidak dirender secara mentah
  assert.equal(html.includes('<script>alert("xss")</script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;') || html.includes('&lt;script&gt;'));
  assert.equal(html.includes('"><img src=x onerror=1>'), false);
});

test('pages-kelola-inventaris: render state kosong dan state filter kosong', () => {
  // State kosong alami
  const htmlKosong = KelolaPage.renderKelolaContent({
    items: [],
    loading: false,
    cari: '',
    nAktif: 0,
  }).toString();
  assert.ok(htmlKosong.includes('Belum ada inventaris'));
  assert.ok(htmlKosong.includes('Anda belum memiliki barang inventaris'));
  assert.ok(htmlKosong.includes('Tambah Inventaris'));

  // State hasil filter kosong
  const htmlFilterKosong = KelolaPage.renderKelolaContent({
    items: [],
    loading: false,
    cari: 'laptop-alienware',
    nAktif: 1,
  }).toString();
  assert.ok(htmlFilterKosong.includes('Tidak ada hasil yang cocok'));
  assert.ok(htmlFilterKosong.includes('Coba ubah kata kunci pencarian atau setel ulang filter.'));
  assert.ok(htmlFilterKosong.includes('Setel Ulang Filter'));
});

test('pages-kelola-inventaris: render state galat dengan tombol coba lagi', () => {
  const htmlGalat = KelolaPage.renderKelolaContent({
    items: [],
    loading: false,
    error: 'Koneksi jaringan terputus.',
  }).toString();

  assert.ok(htmlGalat.includes('Gagal memuat inventaris'));
  assert.ok(htmlGalat.includes('Koneksi jaringan terputus.'));
  assert.ok(htmlGalat.includes('Coba Lagi'));
});

test('pages-kelola-inventaris: dialog filter dan dialog detail memakai tag dialog native yang valid', () => {
  const html = KelolaPage.renderKelolaContent({
    items: [],
    loading: false,
    filters: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
    nAktif: 3,
    kategoriList: [{ idKategori: 'kat-1', namaKategori: 'Elektronik' }],
  }).toString();

  assert.ok(html.includes('<dialog id="dialog-filter-kelola"'));
  assert.ok(html.includes('<dialog id="dialog-detail-kelola"'));
  assert.ok(html.includes('Filter Barang Inventaris'));
  assert.ok(html.includes('Detail Inventaris'));
});
