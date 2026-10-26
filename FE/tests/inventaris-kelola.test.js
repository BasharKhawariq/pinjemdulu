import test from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';
import {
  filterInventaris,
  countActiveFilters,
  paginate,
  hasActiveBookings,
  getMinTotalBarang,
} from '../js/lib/inventaris-kelola.js';

const MOCK_ITEMS = [
  {
    idInventaris: 'inv-a',
    namaBarang: 'Proyektor Epson',
    idKategori: 'kat-elek',
    namaKategori: 'Elektronik',
    idOrganisasi: 'org-bem',
    namaOrganisasi: 'BEM',
    kondisi: 'baik',
    totalBarang: 3,
    sisaHariIni: 0,
  },
  {
    idInventaris: 'inv-b',
    namaBarang: 'Speaker JBL Portable',
    idKategori: 'kat-audio',
    namaKategori: 'Audio',
    kondisi: 'baik',
    totalBarang: 2,
    sisaHariIni: 1,
  },
  {
    idInventaris: 'inv-c',
    namaBarang: 'Mic Wireless',
    idKategori: 'kat-audio',
    namaKategori: 'Audio',
    kondisi: 'rusak',
    totalBarang: 4,
    sisaHariIni: 4,
  },
  {
    idInventaris: 'inv-d',
    namaBarang: 'Kabel HDMI pendek',
    idKategori: 'kat-elek',
    namaKategori: 'Elektronik',
    kondisi: 'baik',
    totalBarang: 10,
    sisaHariIni: 10,
  },
  {
    idInventaris: 'inv-e',
    namaBarang: 'Meja Lipat',
    idKategori: 'kat-furnitur',
    namaKategori: 'Furnitur',
    kondisi: 'rusak',
    totalBarang: 8,
    sisaHariIni: 5,
  },
];

/* ========================================================================== */
/* 1. filterInventaris                                                        */
/* ========================================================================== */

test('filterInventaris: input tidak valid → array kosong', () => {
  assert.deepEqual(filterInventaris(null), []);
  assert.deepEqual(filterInventaris(undefined), []);
  assert.deepEqual(filterInventaris('apa?'), []);
  assert.deepEqual(filterInventaris([], { q: 'x' }), []);
});

test('filterInventaris: tanpa filter (default) → semua lolos', () => {
  assert.equal(filterInventaris(MOCK_ITEMS).length, MOCK_ITEMS.length);
  assert.equal(filterInventaris(MOCK_ITEMS, {}).length, MOCK_ITEMS.length);
  assert.equal(
    filterInventaris(MOCK_ITEMS, { q: '', kategori: null, kondisi: null, status: null }).length,
    MOCK_ITEMS.length
  );
});

test('filterInventaris: cari nama (trim, case-insensitive)', () => {
  assert.equal(filterInventaris(MOCK_ITEMS, { q: 'proyektor' }).length, 1);
  assert.equal(filterInventaris(MOCK_ITEMS, { q: 'ProYekTor EPSON' }).length, 1);
  assert.equal(filterInventaris(MOCK_ITEMS, { q: '  portable  ' }).length, 1);
  assert.equal(filterInventaris(MOCK_ITEMS, { q: 'tidak ada sama sekali' }).length, 0);
  assert.equal(filterInventaris(MOCK_ITEMS, { q: 'Kabel' }).length, 1);
  // "audio" tidak ada di nama barang (hanya di kategori) → tidak ketemu.
  assert.equal(filterInventaris(MOCK_ITEMS, { q: 'audio' }).length, 0);
});

test('filterInventaris: filter kategori', () => {
  assert.equal(filterInventaris(MOCK_ITEMS, { kategori: 'kat-elek' }).length, 2);
  assert.equal(filterInventaris(MOCK_ITEMS, { kategori: 'kat-audio' }).length, 2);
  // Bisa filter pakai namaKategori (lebih fleksibel untuk UI)
  assert.equal(filterInventaris(MOCK_ITEMS, { kategori: 'Furnitur' }).length, 1);
  // Tidak cocok
  assert.equal(filterInventaris(MOCK_ITEMS, { kategori: 'kat-xyz' }).length, 0);
});

test('filterInventaris: filter kondisi', () => {
  assert.equal(filterInventaris(MOCK_ITEMS, { kondisi: 'baik' }).length, 3);
  assert.equal(filterInventaris(MOCK_ITEMS, { kondisi: 'rusak' }).length, 2);
  assert.equal(filterInventaris(MOCK_ITEMS, { kondisi: 'ngawur' }).length, 0);
});

test('filterInventaris: filter status Tersedia / Dipinjam (berdasar sisaHariIni > 0)', () => {
  // inv-a sisaHariIni=0 → dipinjam; 4 lainnya tersedia.
  assert.equal(filterInventaris(MOCK_ITEMS, { status: 'tersedia' }).length, 4);
  assert.equal(filterInventaris(MOCK_ITEMS, { status: 'dipinjam' }).length, 1);
  // status selain dua nilai itu diabaikan.
  assert.equal(filterInventaris(MOCK_ITEMS, { status: 'apa' }).length, MOCK_ITEMS.length);
  assert.equal(filterInventaris(MOCK_ITEMS, { status: null }).length, MOCK_ITEMS.length);
});

test('filterInventaris: semua kriteria digabung AND', () => {
  const r1 = filterInventaris(MOCK_ITEMS, {
    q: 'kabel',
    kategori: 'kat-elek',
    kondisi: 'baik',
    status: 'tersedia',
  });
  assert.equal(r1.length, 1);
  assert.equal(r1[0].idInventaris, 'inv-d');

  // kriteria yang satu saja gagal → kosong.
  const r2 = filterInventaris(MOCK_ITEMS, {
    q: 'proyektor',
    kondisi: 'rusak',
  });
  assert.equal(r2.length, 0);
});

/* ========================================================================== */
/* 2. countActiveFilters                                                      */
/* ========================================================================== */

test('countActiveFilters: tanpa filter = 0', () => {
  assert.equal(countActiveFilters(), 0);
  assert.equal(countActiveFilters({}), 0);
  assert.equal(countActiveFilters({ kategori: null, kondisi: undefined, status: '' }), 0);
});

test('countActiveFilters: menghitung yang non-empty saja', () => {
  assert.equal(countActiveFilters({ kategori: 'kat-elek' }), 1);
  assert.equal(countActiveFilters({ kategori: 'x', kondisi: 'baik' }), 2);
  assert.equal(countActiveFilters({ kategori: 'x', kondisi: 'baik', status: 'tersedia' }), 3);
  // yang empty string tidak dihitung.
  assert.equal(countActiveFilters({ kategori: '', kondisi: 'baik', status: '' }), 1);
});

/* ========================================================================== */
/* 3. paginate                                                                 */
/* ========================================================================== */

const P5 = Array.from({ length: 5 }, (_, i) => i); // [0,1,2,3,4]
const P10 = Array.from({ length: 10 }, (_, i) => i);
const P12 = Array.from({ length: 12 }, (_, i) => i);

test('paginate: input invalid / kosong', () => {
  assert.deepEqual(paginate(null), { items: [], page: 1, totalPages: 0 });
  assert.deepEqual(paginate([]), { items: [], page: 1, totalPages: 0 });
});

test('paginate: default page=1 perPage=10', () => {
  const r = paginate(P5);
  assert.deepEqual(r, { items: [0, 1, 2, 3, 4], page: 1, totalPages: 1 });

  const r10 = paginate(P10);
  assert.equal(r10.items.length, 10);
  assert.equal(r10.totalPages, 1);

  const r12 = paginate(P12);
  assert.equal(r12.items.length, 10);
  assert.equal(r12.items[9], 9);
  assert.equal(r12.totalPages, 2);
});

test('paginate: page di luar rentang → dikoreksi', () => {
  const r1 = paginate(P12, 0);
  assert.equal(r1.page, 1);

  const r2 = paginate(P12, -99);
  assert.equal(r2.page, 1);

  const r3 = paginate(P12, 999);
  assert.equal(r3.page, 2);
  assert.deepEqual(r3.items, [10, 11]);

  const r4 = paginate(P12, 'bukan angka');
  assert.equal(r4.page, 1);
});

test('paginate: perPage kustom & perPage negatif/default ke 10', () => {
  const r = paginate(P12, 1, 3);
  assert.equal(r.totalPages, 4);
  assert.equal(r.items.length, 3);

  const r2 = paginate(P12, 4, 3);
  assert.deepEqual(r2.items, [9, 10, 11]);

  // perPage invalid → fallback ke 10
  const r3 = paginate(P12, 1, -5);
  assert.equal(r3.items.length, 10);
  assert.equal(r3.totalPages, 2);

  const r4 = paginate(P12, 1, 0);
  assert.equal(r4.items.length, 10);

  // Invalid perPage + page 2, slice sesuai fallback per=10.
  const r5 = paginate(P12, 2, 0);
  assert.equal(r5.items.length, 2);
});

/* ========================================================================== */
/* 4. hasActiveBookings                                                        */
/* ========================================================================== */

const MK = [
  { idInventaris: 'inv-a', status: STATUS_PEMINJAMAN.DIAJUKAN },
  { idInventaris: 'inv-a', status: STATUS_PEMINJAMAN.DITOLAK }, // TIDAK menahan
  { idInventaris: 'inv-b', status: STATUS_PEMINJAMAN.DIKEMBALIKAN }, // TIDAK
  { idInventaris: 'inv-c', status: STATUS_PEMINJAMAN.TERLAMBAT },
  { idInventaris: 'inv-c', status: STATUS_PEMINJAMAN.SELESAI }, // TIDAK
  { idInventaris: 'inv-d', status: STATUS_PEMINJAMAN.DISETUJUI },
];

test('hasActiveBookings: input invalid → false', () => {
  assert.equal(hasActiveBookings(), false);
  assert.equal(hasActiveBookings(''), false);
  assert.equal(hasActiveBookings('inv-a', null), false);
  assert.equal(hasActiveBookings('inv-a', []), false);
});

test('hasActiveBookings: booking yang hanya DITOLAK / SELESAI / DIKEMBALIKAN → false', () => {
  assert.equal(hasActiveBookings('inv-b', MK), false);
});

test('hasActiveBookings: booking di STATUS_MENAHAN_BARANG → true', () => {
  assert.equal(hasActiveBookings('inv-a', MK), true); // DIAJUKAN
  assert.equal(hasActiveBookings('inv-c', MK), true); // TERLAMBAT
  assert.equal(hasActiveBookings('inv-d', MK), true); // DISETUJUI
});

test('hasActiveBookings: inventaris tidak punya booking → false', () => {
  assert.equal(hasActiveBookings('inv-tidak-ada', MK), false);
});

/* ========================================================================== */
/* 5. getMinTotalBarang                                                        */
/* ========================================================================== */

test('getMinTotalBarang: tanpa booking / array kosong → 0', () => {
  assert.equal(getMinTotalBarang('inv-x', [], '2026-10-09'), 0);
  assert.equal(getMinTotalBarang('inv-x', null, '2026-10-09'), 0);
  assert.equal(getMinTotalBarang('inv-x', MK, '2026-10-09'), 0); // inv-x tidak ada di MK
});

test('getMinTotalBarang: semua booking status TIDAK menahan → 0', () => {
  const tidak = [
    { idInventaris: 'inv-a', status: STATUS_PEMINJAMAN.DITOLAK },
    { idInventaris: 'inv-a', status: STATUS_PEMINJAMAN.SELESAI },
  ];
  assert.equal(getMinTotalBarang('inv-a', tidak, '2026-10-09'), 0);
});

test('getMinTotalBarang: satu booking menahan q=3 pada hari tertentu → puncak = 3', () => {
  // Booking 11-14 Okt 2026 q=3 → buffer 10-15 Okt
  const t = '2026-10-09';
  const bs = [
    {
      idInventaris: 'inv-x',
      status: STATUS_PEMINJAMAN.DISETUJUI,
      startDate: '2026-10-11',
      endDate: '2026-10-14',
      jumlahPinjam: 3,
    },
  ];
  const r = getMinTotalBarang('inv-x', bs, t);
  // Puncak di hari pakai: Σ pakai=3 (hari 11,12,13,14) → puncak minimal 3.
  assert.ok(r >= 3, `Expected puncak >=3, got ${r}`);
  assert.ok(Number.isInteger(r), `harus integer, got ${r}`);
  // TotalBarang inventaris tidak akan turun di bawah puncak booking.
});

test('getMinTotalBarang: dua booking tumpang tindih pakai → Σ jumlahPinjam', () => {
  const t = '2026-10-09';
  const bs = [
    {
      idInventaris: 'inv-y',
      status: STATUS_PEMINJAMAN.DIPINJAM,
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      jumlahPinjam: 2,
    },
    {
      idInventaris: 'inv-y',
      status: STATUS_PEMINJAMAN.DIAJUKAN,
      startDate: '2026-10-12',
      endDate: '2026-10-13',
      jumlahPinjam: 3,
    },
  ];
  const r = getMinTotalBarang('inv-y', bs, t);
  // Puncak Σ pakai (hari 12 dan 13): 2 + 3 = 5
  assert.ok(r >= 5, `Expected puncak >=5, got ${r}`);
});
