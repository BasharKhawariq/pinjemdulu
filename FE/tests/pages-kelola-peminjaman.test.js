import test from 'node:test';
import assert from 'node:assert/strict';

import * as KelolaPeminjamanPage from '../js/pages/kelola-peminjaman.js';

test('pages-kelola-peminjaman: render merender judul, search input, filter button, tabel, dan filter modal', () => {
  const html = KelolaPeminjamanPage.render();
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Kelola Peminjaman'));
  assert.ok(html.includes('search-peminjam'));
  assert.ok(html.includes('btn-filter-peminjaman'));
  assert.ok(html.includes('dialog-filter-peminjaman'));
  assert.ok(html.includes('Filter Kelola Peminjaman'));
  assert.ok(html.includes('OKI Peminjam'));
  assert.ok(html.includes('Tanggal Peminjaman'));
  assert.ok(html.includes('Status'));
  assert.ok(html.includes('Pilih OKI'));
  assert.ok(html.includes('Pilih Tanggal'));
  assert.ok(html.includes('Pilih status'));
  assert.ok(html.includes('Diajukan'));
  assert.ok(html.includes('Disetujui'));
  assert.ok(html.includes('Dipinjam'));
  assert.ok(html.includes('Ditolak'));
  assert.ok(html.includes('Reset'));
  assert.ok(html.includes('Terapkan'));
});
