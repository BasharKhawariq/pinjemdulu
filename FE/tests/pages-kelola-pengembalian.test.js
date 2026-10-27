import test from 'node:test';
import assert from 'node:assert/strict';

import * as KelolaPengembalianPage from '../js/pages/kelola-pengembalian.js';

test('pages-kelola-pengembalian: render merender judul, search input, filter button, tabel, dan filter modal', () => {
  const html = KelolaPengembalianPage.render();
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Kelola Pengembalian'));
  assert.ok(html.includes('search-pengembalian'));
  assert.ok(html.includes('btn-filter-pengembalian'));
  assert.ok(html.includes('dialog-filter-pengembalian'));
  assert.ok(html.includes('Filter Kelola Pengembalian'));
  assert.ok(html.includes('OKI Peminjam'));
  assert.ok(html.includes('Tanggal Peminjaman'));
  assert.ok(html.includes('Status'));
  assert.ok(html.includes('Pilih OKI'));
  assert.ok(html.includes('Pilih Tanggal'));
  assert.ok(html.includes('Pilih status'));
  assert.ok(html.includes('Menunggu Konfirmasi'));
  assert.ok(html.includes('Terlambat'));
  assert.ok(html.includes('Dikembalikan'));
  assert.ok(html.includes('Reset'));
  assert.ok(html.includes('Terapkan'));
});
