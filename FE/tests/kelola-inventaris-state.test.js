import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  kelolaStateReducer,
} from '../js/lib/kelola-inventaris-state.js';

test('kelolaStateReducer: inisialisasi state awal', () => {
  const state = createInitialState();
  assert.equal(state.cari, '');
  assert.equal(state.halaman, 1);
  assert.equal(state.dialog, null);
  assert.deepEqual(state.filterAktif, { kategori: null, kondisi: null, status: null });
  assert.deepEqual(state.filterDraft, { kategori: null, kondisi: null, status: null });
});

test('kelolaStateReducer: cari-berubah mereset halaman ke 1 dan TIDAK mengubah filter', () => {
  const initial = createInitialState({
    halaman: 3,
    filterAktif: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
    filterDraft: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
  });

  const next = kelolaStateReducer(initial, {
    type: 'cari-berubah',
    payload: { cari: 'proyektor' },
  });

  assert.equal(next.cari, 'proyektor');
  assert.equal(next.halaman, 1);
  assert.deepEqual(next.filterAktif, { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' });
  assert.deepEqual(next.filterDraft, { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' });
});

test('kelolaStateReducer: buka-filter menyalin filterAktif ke filterDraft dan buka dialog filter', () => {
  const initial = createInitialState({
    filterAktif: { kategori: 'kat-2', kondisi: 'rusak', status: 'dipinjam' },
    filterDraft: { kategori: null, kondisi: null, status: null },
    dialog: null,
  });

  const next = kelolaStateReducer(initial, { type: 'buka-filter' });
  assert.equal(next.dialog, 'filter');
  assert.deepEqual(next.filterDraft, { kategori: 'kat-2', kondisi: 'rusak', status: 'dipinjam' });
});

test('kelolaStateReducer: filter-ubah-* hanya mengubah filterDraft dan tidak mengubah filterAktif', () => {
  const initial = createInitialState({
    dialog: 'filter',
    filterAktif: { kategori: null, kondisi: null, status: null },
    filterDraft: { kategori: null, kondisi: null, status: null },
  });

  let s = kelolaStateReducer(initial, {
    type: 'filter-ubah-kategori',
    payload: { kategori: 'kat-1' },
  });
  s = kelolaStateReducer(s, {
    type: 'filter-ubah-kondisi',
    payload: { kondisi: 'baik' },
  });
  s = kelolaStateReducer(s, {
    type: 'filter-ubah-status',
    payload: { status: 'tersedia' },
  });

  assert.deepEqual(s.filterDraft, { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' });
  assert.deepEqual(s.filterAktif, { kategori: null, kondisi: null, status: null });
});

test('kelolaStateReducer: filter-reset mengosongkan SELURUH filterDraft seketika', () => {
  const initial = createInitialState({
    dialog: 'filter',
    filterAktif: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
    filterDraft: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
  });

  const next = kelolaStateReducer(initial, { type: 'filter-reset' });
  assert.deepEqual(next.filterDraft, { kategori: null, kondisi: null, status: null });
  // filterAktif belum berubah sampai 'filter-terapkan'
  assert.deepEqual(next.filterAktif, { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' });
});

test('kelolaStateReducer: filter-terapkan menyalin draft ke aktif, reset halaman 1, dan tutup dialog', () => {
  const initial = createInitialState({
    dialog: 'filter',
    halaman: 4,
    filterAktif: { kategori: null, kondisi: null, status: null },
    filterDraft: { kategori: 'kat-3', kondisi: 'rusak', status: 'dipinjam' },
  });

  const next = kelolaStateReducer(initial, { type: 'filter-terapkan' });
  assert.deepEqual(next.filterAktif, { kategori: 'kat-3', kondisi: 'rusak', status: 'dipinjam' });
  assert.equal(next.halaman, 1);
  assert.equal(next.dialog, null);
});

test('kelolaStateReducer: filter-tutup membuang draft dan mengembalikan ke filterAktif', () => {
  const initial = createInitialState({
    dialog: 'filter',
    filterAktif: { kategori: 'kat-1', kondisi: null, status: null },
    filterDraft: { kategori: 'kat-99', kondisi: 'rusak', status: 'dipinjam' },
  });

  const next = kelolaStateReducer(initial, { type: 'filter-tutup' });
  assert.deepEqual(next.filterDraft, { kategori: 'kat-1', kondisi: null, status: null });
  assert.deepEqual(next.filterAktif, { kategori: 'kat-1', kondisi: null, status: null });
  assert.equal(next.dialog, null);
});

test('kelolaStateReducer: buka-detail dan tutup-detail', () => {
  const initial = createInitialState();
  const mockItem = { idInventaris: 'inv-1', namaBarang: 'Proyektor' };

  const opened = kelolaStateReducer(initial, {
    type: 'buka-detail',
    payload: { item: mockItem },
  });
  assert.equal(opened.dialog, 'detail');
  assert.equal(opened.detailItem, mockItem);

  const closed = kelolaStateReducer(opened, { type: 'tutup-detail' });
  assert.equal(closed.dialog, null);
  assert.equal(closed.detailItem, null);
});

test('kelolaStateReducer: buka-hapus dan tutup-hapus', () => {
  const initial = createInitialState();
  const mockItem = { idInventaris: 'inv-2', namaBarang: 'Kamera' };

  const opened = kelolaStateReducer(initial, {
    type: 'buka-hapus',
    payload: { item: mockItem },
  });
  assert.equal(opened.dialog, 'hapus');
  assert.equal(opened.deleteItem, mockItem);

  const closed = kelolaStateReducer(opened, { type: 'tutup-hapus' });
  assert.equal(closed.dialog, null);
  assert.equal(closed.deleteItem, null);
});

test('kelolaStateReducer: ganti-halaman mengubah nomor halaman', () => {
  const initial = createInitialState({ halaman: 1 });
  const next = kelolaStateReducer(initial, {
    type: 'ganti-halaman',
    payload: { halaman: 3 },
  });
  assert.equal(next.halaman, 3);
});

test('kelolaStateReducer: reset-semua mengosongkan cari dan filter aktif/draft', () => {
  const initial = createInitialState({
    cari: 'laptop',
    halaman: 3,
    filterAktif: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
    filterDraft: { kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' },
  });

  const next = kelolaStateReducer(initial, { type: 'reset-semua' });
  assert.equal(next.cari, '');
  assert.equal(next.halaman, 1);
  assert.deepEqual(next.filterAktif, { kategori: null, kondisi: null, status: null });
  assert.deepEqual(next.filterDraft, { kategori: null, kondisi: null, status: null });
});
