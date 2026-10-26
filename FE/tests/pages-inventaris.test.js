import test from 'node:test';
import assert from 'node:assert/strict';

import * as InventarisPage from '../js/pages/inventaris.js';

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

test('pages-inventaris: render menghasilkan struktur katalog lengkap tanpa escape ganda', () => {
  const html = InventarisPage.render({ path: '#/inventaris?q=kabel&kategori=kat-1&page=2' });
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Katalog Barang Inventaris'));
  assert.ok(html.includes('katalog-search-input'));
  assert.ok(html.includes('katalog-results'));
  assert.ok(html.includes('btn-filter-kategori'));
  assert.ok(html.includes('btn-filter-oki'));
  assert.ok(html.includes('value="kabel"'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'InventarisPage.render');
  assert.ok(html.includes('<input'));
  assert.ok(html.includes('<button'));
  assert.ok(html.includes('<svg'));
});

test('pages-inventaris: renderInventarisCard merender informasi barang dan tautan yang valid', () => {
  const mockInv = {
    idInventaris: 'inv-123',
    namaBarang: 'Proyektor Epson EB-X500',
    namaKategori: 'Elektronik',
    namaOrganisasi: 'BEM Polinema',
    thumbnail: 'assets/inventaris/proyektor.svg',
    totalBarang: 5,
    sisaHariIni: 3,
    kondisi: 'baik',
  };

  const cardHtml = InventarisPage.renderInventarisCard(mockInv).toString();
  assert.ok(cardHtml.includes('Proyektor Epson EB-X500'));
  assert.ok(cardHtml.includes('href="#/inventaris/inv-123"'));
  assert.ok(cardHtml.includes('Elektronik'));
  assert.ok(cardHtml.includes('BEM Polinema'));
  assert.ok(cardHtml.includes('3 / 5 Tersedia'));
  assert.ok(cardHtml.includes('<img'));
  assert.ok(cardHtml.includes('src="assets/inventaris/proyektor.svg"'));
  assert.ok(!cardHtml.includes('undefined'));
  assert.ok(!cardHtml.includes('[object Object]'));

  assertNoEscapedMarkup(cardHtml, 'renderInventarisCard');
});

test('pages-inventaris: renderInventarisCard menampilkan status rusak jika kondisi rusak', () => {
  const mockRusak = {
    idInventaris: 'inv-999',
    namaBarang: 'Kamera Rusak',
    namaKategori: 'Dokumentasi',
    namaOrganisasi: 'UKM Foto',
    thumbnail: '',
    totalBarang: 2,
    sisaHariIni: 2,
    kondisi: 'rusak',
  };

  const cardHtml = InventarisPage.renderInventarisCard(mockRusak).toString();
  assert.ok(cardHtml.includes('Kondisi Rusak'));
  assert.ok(cardHtml.includes('text-rose-600'));
  assert.ok(cardHtml.includes('Tanpa gambar'));
  assertNoEscapedMarkup(cardHtml, 'renderInventarisCard (Rusak)');
});

test('pages-inventaris: renderCardSkeleton menghasilkan skeleton yang valid', () => {
  const skelHtml = InventarisPage.renderCardSkeleton().toString();
  assert.ok(skelHtml.includes('animate-pulse'));
  assert.ok(skelHtml.includes('rounded-2xl'));
  assert.ok(!skelHtml.includes('undefined'));
  assertNoEscapedMarkup(skelHtml, 'renderCardSkeleton');
});

test('pages-inventaris: renderPagination menghasilkan tombol navigasi halaman', () => {
  const paginHtml = InventarisPage.renderPagination(2, 5).toString();
  assert.ok(paginHtml.includes('Halaman sebelumnya'));
  assert.ok(paginHtml.includes('Halaman berikutnya'));
  assert.ok(paginHtml.includes('data-page="2"'));
  assert.ok(paginHtml.includes('aria-current="page"'));
  assert.ok(!paginHtml.includes('undefined'));
  assertNoEscapedMarkup(paginHtml, 'renderPagination');
});

test('pages-inventaris: data berbahaya XSS pada barang tetap ter-escape aman', () => {
  const maliciousInv = {
    idInventaris: 'inv-evil',
    namaBarang: '<script>alert("xss")</script>',
    namaKategori: '"><img src=x onerror=1>',
    namaOrganisasi: '<span onclick="evil()">OKI</span>',
    thumbnail: '',
    totalBarang: 1,
    sisaHariIni: 1,
    kondisi: 'baik',
  };

  const cardHtml = InventarisPage.renderInventarisCard(maliciousInv).toString();
  assert.equal(cardHtml.includes('<script>alert("xss")</script>'), false);
  assert.ok(cardHtml.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
  assert.equal(cardHtml.includes('<img src=x onerror=1>'), false);
  assert.ok(cardHtml.includes('&lt;img src=x onerror=1&gt;'));
});
