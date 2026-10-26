import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterKelolaInventaris,
  countActiveFilters,
  paginateKelola,
  sortKelola,
} from '../js/lib/kelola-inventaris.js';
import { getInventarisKelola } from '../js/services/inventaris.js';
import { ROLES } from '../js/lib/constants.js';

const MOCK_ITEMS = [
  {
    idInventaris: 'inv-1',
    namaBarang: 'Proyektor Epson EB-X500',
    idKategori: 'kat-1',
    namaKategori: 'Elektronik',
    idOrganisasi: 'oki-bem',
    namaOrganisasi: 'BEM Polinema',
    kondisi: 'baik',
    totalBarang: 5,
    sisaHariIni: 3,
  },
  {
    idInventaris: 'inv-2',
    namaBarang: 'Speaker JBL EON ONE',
    idKategori: 'kat-2',
    namaKategori: 'Audio',
    idOrganisasi: 'oki-bem',
    namaOrganisasi: 'BEM Polinema',
    kondisi: 'baik',
    totalBarang: 2,
    sisaHariIni: 0,
  },
  {
    idInventaris: 'inv-3',
    namaBarang: 'Kabel HDMI 15 Meter',
    idKategori: 'kat-1',
    namaKategori: 'Elektronik',
    idOrganisasi: 'oki-hmti',
    namaOrganisasi: 'HMTI Polinema',
    kondisi: 'rusak',
    totalBarang: 4,
    sisaHariIni: 4,
  },
  {
    idInventaris: 'inv-4',
    namaBarang: 'Meja Lipat Krisbow',
    idKategori: 'kat-3',
    namaKategori: 'Furnitur',
    idOrganisasi: 'oki-hmti',
    namaOrganisasi: 'HMTI Polinema',
    kondisi: 'baik',
    totalBarang: 10,
    sisaHariIni: 10,
  },
];

/* ========================================================================== */
/* 1. Logika filterKelolaInventaris                                           */
/* ========================================================================== */

test('filterKelolaInventaris: menangani input array kosong atau null', () => {
  assert.deepEqual(filterKelolaInventaris(null), []);
  assert.deepEqual(filterKelolaInventaris(undefined), []);
  assert.deepEqual(filterKelolaInventaris([]), []);
});

test('filterKelolaInventaris: tanpa filter mengembalikan semua item', () => {
  const res = filterKelolaInventaris(MOCK_ITEMS, {});
  assert.equal(res.length, 4);
});

test('filterKelolaInventaris: pencarian nama barang case-insensitive dan trim', () => {
  const res1 = filterKelolaInventaris(MOCK_ITEMS, { cari: '  epson  ' });
  assert.equal(res1.length, 1);
  assert.equal(res1[0].idInventaris, 'inv-1');

  const res2 = filterKelolaInventaris(MOCK_ITEMS, { q: 'KABEL' });
  assert.equal(res2.length, 1);
  assert.equal(res2[0].idInventaris, 'inv-3');

  const res3 = filterKelolaInventaris(MOCK_ITEMS, { cari: 'tidak-ada' });
  assert.equal(res3.length, 0);
});

test('filterKelolaInventaris: filter kategori tunggal atau multi-pilih OR', () => {
  // Tunggal string
  const res1 = filterKelolaInventaris(MOCK_ITEMS, { kategori: 'kat-1' });
  assert.equal(res1.length, 2);

  // Array multi-pilih
  const res2 = filterKelolaInventaris(MOCK_ITEMS, { kategoriIds: ['kat-1', 'kat-2'] });
  assert.equal(res2.length, 3);
});

test('filterKelolaInventaris: filter kondisi baik dan rusak', () => {
  const baik = filterKelolaInventaris(MOCK_ITEMS, { kondisi: 'baik' });
  assert.equal(baik.length, 3);

  const rusak = filterKelolaInventaris(MOCK_ITEMS, { kondisi: 'rusak' });
  assert.equal(rusak.length, 1);
  assert.equal(rusak[0].idInventaris, 'inv-3');
});

test('filterKelolaInventaris: filter status tersedia (sisa > 0) dan dipinjam (sisa <= 0)', () => {
  const tersedia = filterKelolaInventaris(MOCK_ITEMS, { status: 'tersedia' });
  assert.equal(tersedia.length, 3);
  assert.equal(tersedia.some((x) => x.idInventaris === 'inv-2'), false);

  const dipinjam = filterKelolaInventaris(MOCK_ITEMS, { status: 'dipinjam' });
  assert.equal(dipinjam.length, 1);
  assert.equal(dipinjam[0].idInventaris, 'inv-2');
});

test('filterKelolaInventaris: kombinasi cari, kategori, kondisi, dan status', () => {
  const res = filterKelolaInventaris(MOCK_ITEMS, {
    cari: 'proyektor',
    kategori: 'kat-1',
    kondisi: 'baik',
    status: 'tersedia',
  });
  assert.equal(res.length, 1);
  assert.equal(res[0].idInventaris, 'inv-1');
});

/* ========================================================================== */
/* 2. countActiveFilters & sortKelola                                         */
/* ========================================================================== */

test('countActiveFilters: menghitung kelompok filter aktif', () => {
  assert.equal(countActiveFilters({}), 0);
  assert.equal(countActiveFilters({ kategori: 'kat-1' }), 1);
  assert.equal(countActiveFilters({ kategoriIds: ['kat-1', 'kat-2'], kondisi: 'baik' }), 2);
  assert.equal(countActiveFilters({ kategori: 'kat-1', kondisi: 'baik', status: 'tersedia' }), 3);
});

test('sortKelola: mempertahankan urutan default atau mengembalikan array baru', () => {
  const res = sortKelola(MOCK_ITEMS);
  assert.equal(res.length, MOCK_ITEMS.length);
  assert.notEqual(res, MOCK_ITEMS); // shallow copy
});

/* ========================================================================== */
/* 3. paginateKelola                                                          */
/* ========================================================================== */

test('paginateKelola: membagi data menjadi halaman perPage yang valid', () => {
  const p1 = paginateKelola(MOCK_ITEMS, 1, 2);
  assert.equal(p1.items.length, 2);
  assert.equal(p1.page, 1);
  assert.equal(p1.totalPages, 2);
  assert.equal(p1.total, 4);

  const p2 = paginateKelola(MOCK_ITEMS, 2, 2);
  assert.equal(p2.items.length, 2);
  assert.equal(p2.page, 2);
});

/* ========================================================================== */
/* 4. Layanan getInventarisKelola                                              */
/* ========================================================================== */

test('getInventarisKelola: menolak pengguna bukan PJ dengan galat 403', async () => {
  const userPeminjam = { nim: '12345', role: ROLES.PEMINJAM, idOrganisasi: 'oki-bem' };
  await assert.rejects(
    () => getInventarisKelola(userPeminjam),
    (err) => err.status === 403 || err.statusCode === 403
  );

  await assert.rejects(
    () => getInventarisKelola(null),
    (err) => err.status === 403 || err.statusCode === 403
  );
});

test('getInventarisKelola: mengembalikan hanya barang milik OKI PJ yang sedang login', async () => {
  const pjBEM = {
    nim: '11111',
    nama: 'PJ BEM',
    role: ROLES.PENANGGUNG_JAWAB,
    idOrganisasi: 'oki-1',
    organisasi: { idOrganisasi: 'oki-1', namaOrganisasi: 'BEM' },
  };

  const resBEM = await getInventarisKelola(pjBEM);
  assert.ok(resBEM.data.length > 0);
  for (const it of resBEM.data) {
    assert.equal(it.idOrganisasi, 'oki-1');
  }

  const pjHMTI = {
    nim: '22222',
    nama: 'PJ HMTI',
    role: ROLES.PENANGGUNG_JAWAB,
    idOrganisasi: 'oki-2',
    organisasi: { idOrganisasi: 'oki-2', namaOrganisasi: 'HMTI' },
  };

  const resHMTI = await getInventarisKelola(pjHMTI);
  assert.ok(resHMTI.data.length > 0);
  for (const it of resHMTI.data) {
    assert.equal(it.idOrganisasi, 'oki-2');
  }
});
