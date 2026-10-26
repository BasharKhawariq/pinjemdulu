import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterKategori,
  sortKategori,
  hitungPenggunaan,
  paginateKategori,
} from '../js/lib/kelola-kategori.js';

const MOCK_KATEGORI = [
  { idKategori: 'kat-1', namaKategori: 'Elektronik', totalBarang: 25 },
  { idKategori: 'kat-2', namaKategori: 'Audio & Visual', totalBarang: 7 },
  { idKategori: 'kat-3', namaKategori: 'Dokumentasi', totalBarang: 5 },
  { idKategori: 'kat-4', namaKategori: 'ATK', totalBarang: 12 },
];

const MOCK_INVENTARIS = [
  { idInventaris: 'inv-1', idKategori: 'kat-1', namaBarang: 'Laptop' },
  { idInventaris: 'inv-2', idKategori: 'kat-1', namaBarang: 'Proyektor' },
  { idInventaris: 'inv-3', idKategori: 'kat-2', namaBarang: 'Mic Wireless' },
  { idInventaris: 'inv-4', idKategori: 'kat-3', namaBarang: 'Kamera' },
];

test('filterKategori: pencarian cocok sebagian, case-insensitive, abaikan spasi tepi', () => {
  // Tanpa filter
  const all = filterKategori(MOCK_KATEGORI, { cari: '' });
  assert.equal(all.length, 4);

  // Pencarian 'audio'
  const audio = filterKategori(MOCK_KATEGORI, { cari: '  audio  ' });
  assert.equal(audio.length, 1);
  assert.equal(audio[0].idKategori, 'kat-2');

  // Pencarian huruf kecil 'atk'
  const atk = filterKategori(MOCK_KATEGORI, { cari: 'atk' });
  assert.equal(atk.length, 1);
  assert.equal(atk[0].namaKategori, 'ATK');

  // Pencarian tidak ditemukan
  const none = filterKategori(MOCK_KATEGORI, { cari: 'olahraga' });
  assert.equal(none.length, 0);
});

test('sortKategori: urutan default alfabetis A-Z dan kriteria total barang', () => {
  // Default alfabetis A-Z (ATK, Audio & Visual, Dokumentasi, Elektronik)
  const sortedNamaAsc = sortKategori(MOCK_KATEGORI);
  assert.equal(sortedNamaAsc[0].namaKategori, 'ATK');
  assert.equal(sortedNamaAsc[1].namaKategori, 'Audio & Visual');
  assert.equal(sortedNamaAsc[2].namaKategori, 'Dokumentasi');
  assert.equal(sortedNamaAsc[3].namaKategori, 'Elektronik');

  // Alfabetis Z-A
  const sortedNamaDesc = sortKategori(MOCK_KATEGORI, { arah: 'desc', kriteria: 'nama' });
  assert.equal(sortedNamaDesc[0].namaKategori, 'Elektronik');
  assert.equal(sortedNamaDesc[3].namaKategori, 'ATK');

  // Urutan total terbanyak
  const sortedTotalDesc = sortKategori(MOCK_KATEGORI, { arah: 'desc', kriteria: 'total' });
  assert.equal(sortedTotalDesc[0].totalBarang, 25);
  assert.equal(sortedTotalDesc[3].totalBarang, 5);
});

test('hitungPenggunaan: menghitung jumlah barang yang menggunakan kategori tertentu', () => {
  assert.equal(hitungPenggunaan('kat-1', MOCK_INVENTARIS), 2);
  assert.equal(hitungPenggunaan('kat-2', MOCK_INVENTARIS), 1);
  assert.equal(hitungPenggunaan('kat-3', MOCK_INVENTARIS), 1);
  assert.equal(hitungPenggunaan('kat-4', MOCK_INVENTARIS), 0);
  assert.equal(hitungPenggunaan('kat-none', MOCK_INVENTARIS), 0);
  assert.equal(hitungPenggunaan(null, MOCK_INVENTARIS), 0);
});

test('paginateKategori: membagi daftar per halaman secara akurat', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({
    idKategori: `kat-${i + 1}`,
    namaKategori: `Kategori ${i + 1}`,
  }));

  const hal1 = paginateKategori(items, 1, 10);
  assert.equal(hal1.items.length, 10);
  assert.equal(hal1.page, 1);
  assert.equal(hal1.totalPages, 3);
  assert.equal(hal1.total, 25);

  const hal3 = paginateKategori(items, 3, 10);
  assert.equal(hal3.items.length, 5);
  assert.equal(hal3.page, 3);
});
