import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeNamaKategori,
  validateNamaKategori,
  MAKS_PANJANG_KATEGORI,
} from '../js/lib/kategori-validation.js';

const MOCK_EXISTING = [
  { idKategori: 'kat-1', namaKategori: 'Elektronik' },
  { idKategori: 'kat-2', namaKategori: 'Audio & Visual' },
  { idKategori: 'kat-3', namaKategori: 'Perlengkapan Panggung' },
];

test('normalizeNamaKategori: merapikan spasi tepi dan ganda tanpa mengubah kapitalisasi', () => {
  assert.equal(normalizeNamaKategori('   Elektronik   '), 'Elektronik');
  assert.equal(normalizeNamaKategori('Audio    dan    Visual'), 'Audio dan Visual');
  assert.equal(normalizeNamaKategori('  Kamera   DSLR  Canon '), 'Kamera DSLR Canon');
  assert.equal(normalizeNamaKategori(''), '');
  assert.equal(normalizeNamaKategori(null), '');
  assert.equal(normalizeNamaKategori(undefined), '');
});

test('validateNamaKategori: menolak nama kosong atau hanya spasi', () => {
  const r1 = validateNamaKategori('');
  assert.equal(r1.isValid, false);
  assert.match(r1.error, /wajib diisi/i);

  const r2 = validateNamaKategori('     ');
  assert.equal(r2.isValid, false);
  assert.match(r2.error, /wajib diisi/i);
});

test('validateNamaKategori: menolak nama melebihi batas 30 karakter', () => {
  const nama30 = 'A'.repeat(30);
  const r1 = validateNamaKategori(nama30);
  assert.equal(r1.isValid, true);
  assert.equal(r1.error, null);

  const nama31 = 'A'.repeat(31);
  const r2 = validateNamaKategori(nama31);
  assert.equal(r2.isValid, false);
  assert.match(r2.error, /maksimal 30 karakter/i);
});

test('validateNamaKategori: menolak duplikat tanpa peka huruf besar-kecil', () => {
  // Persis sama
  const r1 = validateNamaKategori('Elektronik', { daftar: MOCK_EXISTING });
  assert.equal(r1.isValid, false);
  assert.match(r1.error, /sudah ada/i);

  // Huruf kecil semua
  const r2 = validateNamaKategori('elektronik', { daftar: MOCK_EXISTING });
  assert.equal(r2.isValid, false);
  assert.match(r2.error, /sudah ada/i);

  // Huruf besar semua dengan spasi tambahan
  const r3 = validateNamaKategori('   ELEKTRONIK   ', { daftar: MOCK_EXISTING });
  assert.equal(r3.isValid, false);
  assert.match(r3.error, /sudah ada/i);

  // Nama baru unik diterima
  const r4 = validateNamaKategori('Peralatan Olahraga', { daftar: MOCK_EXISTING });
  assert.equal(r4.isValid, true);
  assert.equal(r4.error, null);
  assert.equal(r4.nama, 'Peralatan Olahraga');
});

test('validateNamaKategori: mengizinkan pengubahan huruf besar-kecil untuk kategori sendiri (idDiabaikan)', () => {
  // Mengubah 'Elektronik' (kat-1) menjadi 'ELEKTRONIK' diperbolehkan karena id-nya sama
  const r1 = validateNamaKategori('ELEKTRONIK', { daftar: MOCK_EXISTING, idDiabaikan: 'kat-1' });
  assert.equal(r1.isValid, true);
  assert.equal(r1.error, null);

  // Mengubah kat-2 menjadi 'elektronik' (milik kat-1) tetap ditolak
  const r2 = validateNamaKategori('elektronik', { daftar: MOCK_EXISTING, idDiabaikan: 'kat-2' });
  assert.equal(r2.isValid, false);
  assert.match(r2.error, /sudah ada/i);
});
