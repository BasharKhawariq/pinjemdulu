import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialKategoriState,
  kategoriStateReducer,
} from '../js/lib/kelola-kategori-state.js';

test('createInitialKategoriState: inisialisasi default', () => {
  const s = createInitialKategoriState();
  assert.equal(s.cari, '');
  assert.equal(s.halaman, 1);
  assert.equal(s.dialog, null);
  assert.equal(s.editItem, null);
  assert.equal(s.deleteItem, null);
  assert.equal(s.inputNama, '');
  assert.equal(s.inputError, null);
  assert.equal(s.isSubmitting, false);
});

test('kategoriStateReducer: cari-berubah mereset halaman ke 1', () => {
  let s = createInitialKategoriState({ halaman: 3 });
  s = kategoriStateReducer(s, { type: 'cari-berubah', payload: { cari: 'elektronik' } });
  assert.equal(s.cari, 'elektronik');
  assert.equal(s.halaman, 1);
});

test('kategoriStateReducer: ganti-halaman mengubah nomor halaman', () => {
  let s = createInitialKategoriState({ halaman: 1 });
  s = kategoriStateReducer(s, { type: 'ganti-halaman', payload: { halaman: 4 } });
  assert.equal(s.halaman, 4);
});

test('kategoriStateReducer: alur dialog tambah kategori', () => {
  let s = createInitialKategoriState();

  // Buka dialog tambah
  s = kategoriStateReducer(s, { type: 'buka-dialog-tambah' });
  assert.equal(s.dialog, 'tambah');
  assert.equal(s.inputNama, '');

  // Ketik nama
  s = kategoriStateReducer(s, { type: 'ubah-input-nama', payload: { nama: 'Robotik' } });
  assert.equal(s.inputNama, 'Robotik');

  // Konfirmasi kirim
  s = kategoriStateReducer(s, { type: 'konfirmasi-tambah' });
  assert.equal(s.dialog, 'confirm-tambah');

  // Esc / Batal di dialog konfirmasi mengembalikan ke form tambah
  s = kategoriStateReducer(s, { type: 'escape-tekan' });
  assert.equal(s.dialog, 'tambah');
  assert.equal(s.inputNama, 'Robotik');

  // Tutup dialog form tambah
  s = kategoriStateReducer(s, { type: 'tutup-dialog' });
  assert.equal(s.dialog, null);
});

test('kategoriStateReducer: alur dialog edit kategori', () => {
  let s = createInitialKategoriState();
  const mockItem = { idKategori: 'kat-1', namaKategori: 'Elektronik' };

  // Buka dialog edit
  s = kategoriStateReducer(s, { type: 'buka-dialog-edit', payload: { item: mockItem } });
  assert.equal(s.dialog, 'edit');
  assert.equal(s.editItem, mockItem);
  assert.equal(s.inputNama, 'Elektronik');

  // Ubah nama
  s = kategoriStateReducer(s, { type: 'ubah-input-nama', payload: { nama: 'Elektronika' } });
  assert.equal(s.inputNama, 'Elektronika');

  // Konfirmasi edit
  s = kategoriStateReducer(s, { type: 'konfirmasi-edit' });
  assert.equal(s.dialog, 'confirm-edit');

  // Kembali ke form edit
  s = kategoriStateReducer(s, { type: 'kembali-ke-form-edit' });
  assert.equal(s.dialog, 'edit');
});

test('kategoriStateReducer: alur dialog hapus dan feedback', () => {
  let s = createInitialKategoriState();
  const mockItem = { idKategori: 'kat-2', namaKategori: 'ATK' };

  s = kategoriStateReducer(s, { type: 'buka-dialog-hapus', payload: { item: mockItem } });
  assert.equal(s.dialog, 'hapus');
  assert.equal(s.deleteItem, mockItem);

  s = kategoriStateReducer(s, {
    type: 'buka-feedback',
    payload: {
      feedback: { type: 'success', title: 'Kategori Berhasil Dihapus!', message: 'Sukses' },
    },
  });
  assert.equal(s.dialog, 'feedback');
  assert.equal(s.feedback.type, 'success');

  s = kategoriStateReducer(s, { type: 'tutup-dialog' });
  assert.equal(s.dialog, null);
  assert.equal(s.feedback, null);
});
