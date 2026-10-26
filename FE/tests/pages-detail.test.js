import test from 'node:test';
import assert from 'node:assert/strict';

import * as DetailPage from '../js/pages/detail.js';
import { getDetailViewModel } from '../js/lib/detail-inventaris.js';
import { ROLES, STATUS_PEMINJAMAN } from '../js/lib/constants.js';

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

test('pages-detail: render awal menghasilkan skeleton yang valid tanpa escape ganda', () => {
  const html = DetailPage.render();
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('detail-page-root'));
  assert.ok(html.includes('animate-pulse'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'DetailPage.render (Skeleton)');
});

test('pages-detail: renderDetailContent merender informasi lengkap barang yang tersedia', () => {
  const mockInv = {
    idInventaris: 'inv-1',
    namaBarang: 'Proyektor Epson EB-X500',
    namaKategori: 'Elektronik',
    namaOrganisasi: 'BEM Polinema',
    idOrganisasi: 'oki-bem',
    totalBarang: 5,
    sisaHariIni: 3,
    kondisi: 'baik',
    thumbnail: 'assets/inventaris/proyektor.svg',
    deskripsiBarang: 'Proyektor tajam 3600 lumens.\nCocok untuk seminar dan workshop.',
  };

  const user = { role: ROLES.PEMINJAM, idOrganisasi: 'oki-hmti' };
  const vm = getDetailViewModel(mockInv, [], user);

  const html = DetailPage.renderDetailContent(vm, '#/inventaris?q=proyektor').toString();

  assert.ok(html.includes('Proyektor Epson EB-X500'));
  assert.ok(html.includes('Elektronik'));
  assert.ok(html.includes('BEM Polinema'));
  assert.ok(html.includes('href="#/inventaris?q=proyektor"'));
  assert.ok(html.includes('href="#/inventaris/inv-1/ajukan"'));
  assert.ok(html.includes('Ajukan Peminjaman'));
  assert.ok(html.includes('Belum ada jadwal peminjaman'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'DetailPage.renderDetailContent (Tersedia)');
});

test('pages-detail: tombol Ajukan dinonaktifkan dengan peringatan jika kondisi rusak', () => {
  const mockInvRusak = {
    idInventaris: 'inv-rusak',
    namaBarang: 'Kamera Rusak',
    namaKategori: 'Dokumentasi',
    namaOrganisasi: 'UKM Foto',
    idOrganisasi: 'oki-foto',
    totalBarang: 2,
    sisaHariIni: 2,
    kondisi: 'rusak',
    thumbnail: '',
  };

  const vm = getDetailViewModel(mockInvRusak, [], { role: ROLES.PEMINJAM });
  const html = DetailPage.renderDetailContent(vm, '#/inventaris').toString();

  assert.ok(html.includes('Barang Dalam Kondisi Rusak'));
  assert.ok(html.includes('Barang Rusak (Tidak Dapat Dipinjam)'));
  assert.ok(html.includes('disabled'));
  assert.ok(html.includes('aria-disabled="true"'));
  assert.ok(!html.includes('href="#/inventaris/inv-rusak/ajukan"'));

  assertNoEscapedMarkup(html, 'DetailPage.renderDetailContent (Rusak)');
});

test('pages-detail: tombol Ajukan dinonaktifkan dengan peringatan jika PJ meminjam barang OKI sendiri', () => {
  const mockInvOki = {
    idInventaris: 'inv-oki',
    namaBarang: 'Speaker BEM',
    namaKategori: 'Audio',
    namaOrganisasi: 'BEM Polinema',
    idOrganisasi: 'oki-bem',
    totalBarang: 2,
    sisaHariIni: 2,
    kondisi: 'baik',
  };

  const userPJ = {
    role: ROLES.PENANGGUNG_JAWAB,
    organisasi: { idOrganisasi: 'oki-bem', namaOrganisasi: 'BEM Polinema' },
  };

  const vm = getDetailViewModel(mockInvOki, [], userPJ);
  const html = DetailPage.renderDetailContent(vm, '#/inventaris').toString();

  assert.ok(html.includes('Barang milik OKI Anda'));
  assert.ok(html.includes('Barang Milik OKI Anda'));
  assert.ok(html.includes('disabled'));
  assert.ok(html.includes('aria-disabled="true"'));
  assert.ok(!html.includes('href="#/inventaris/inv-oki/ajukan"'));

  assertNoEscapedMarkup(html, 'DetailPage.renderDetailContent (OKI Sendiri)');
});

test('pages-detail: renderDetailContent menampilkan jadwal aktif beserta rinciannya', () => {
  const mockInv = {
    idInventaris: 'inv-jadwal',
    namaBarang: 'Kabel HDMI 15M',
    namaKategori: 'Kabel',
    namaOrganisasi: 'HMTI',
    idOrganisasi: 'oki-hmti',
    totalBarang: 5,
    sisaHariIni: 4,
    kondisi: 'baik',
  };

  const jadwalList = [
    {
      id: 'j-1',
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      bufferStartDate: '2026-10-19',
      bufferEndDate: '2026-10-23',
      jumlahPinjam: 2,
      status: STATUS_PEMINJAMAN.DISETUJUI,
      keperluan: 'Seminar Teknologi Web',
      namaOrganisasi: 'BEM Polinema',
    },
  ];

  const vm = getDetailViewModel(mockInv, jadwalList, { role: ROLES.PEMINJAM });
  const html = DetailPage.renderDetailContent(vm, '#/inventaris').toString();

  assert.ok(html.includes('Seminar Teknologi Web'));
  assert.ok(html.includes('2 unit'));
  assert.ok(html.includes('BEM Polinema'));
  assert.ok(html.includes('Disetujui'));
  assert.ok(!html.includes('Belum ada jadwal peminjaman'));

  assertNoEscapedMarkup(html, 'DetailPage.renderDetailContent (Dengan Jadwal)');
});

test('pages-detail: data berbahaya XSS tetap ter-escape aman pada nama dan deskripsi', () => {
  const maliciousInv = {
    idInventaris: 'inv-malicious',
    namaBarang: '<script>alert("evil")</script>',
    namaKategori: 'Kategori',
    namaOrganisasi: 'OKI',
    totalBarang: 1,
    sisaHariIni: 1,
    kondisi: 'baik',
    deskripsiBarang: 'Barang bagus <img src=x onerror=alert(1)> aman.',
  };

  const vm = getDetailViewModel(maliciousInv, [], { role: ROLES.PEMINJAM });
  const html = DetailPage.renderDetailContent(vm, '#/inventaris').toString();

  assert.equal(html.includes('<script>alert("evil")</script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;evil&quot;)&lt;/script&gt;'));
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});
