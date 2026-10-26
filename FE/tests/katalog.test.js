import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterInventaris,
  paginate,
  buildPageList,
  getStatusKetersediaan,
  parseKatalogParams,
  buildKatalogQueryString,
} from '../js/lib/katalog.js';

const mockItems = [
  { idInventaris: 'inv-1', namaBarang: 'Proyektor Epson EB-X500', idKategori: 'kat-1', idOrganisasi: 'oki-1', totalBarang: 2, sisaHariIni: 2, kondisi: 'baik' },
  { idInventaris: 'inv-2', namaBarang: 'Speaker Portable Baretone', idKategori: 'kat-2', idOrganisasi: 'oki-1', totalBarang: 4, sisaHariIni: 0, kondisi: 'baik' },
  { idInventaris: 'inv-3', namaBarang: 'Kabel HDMI 15 Meter', idKategori: 'kat-1', idOrganisasi: 'oki-2', totalBarang: 5, sisaHariIni: 3, kondisi: 'baik' },
  { idInventaris: 'inv-4', namaBarang: 'Kamera Sony Alpha A7 II', idKategori: 'kat-3', idOrganisasi: 'oki-2', totalBarang: 1, sisaHariIni: 0, kondisi: 'rusak' },
  { idInventaris: 'inv-5', namaBarang: 'Mic Wireless Shure', idKategori: 'kat-2', idOrganisasi: 'oki-3', totalBarang: 2, sisaHariIni: 1, kondisi: 'baik' },
];

test('katalog: filterInventaris mencari nama barang tanpa peka huruf dan mengabaikan spasi tepi', () => {
  const hasil = filterInventaris(mockItems, { cari: '  epson  ' });
  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].idInventaris, 'inv-1');

  const hasilUpper = filterInventaris(mockItems, { cari: 'PROYEKTOR' });
  assert.equal(hasilUpper.length, 1);
  assert.equal(hasilUpper[0].idInventaris, 'inv-1');
});

test('katalog: filterInventaris mendukung multi-pilih kategori dengan logika OR', () => {
  const hasil = filterInventaris(mockItems, { kategoriIds: ['kat-1', 'kat-3'] });
  // inv-4 (kat-3) rusak, jadi harusnya tidak muncul
  assert.equal(hasil.length, 2);
  const ids = hasil.map((x) => x.idInventaris);
  assert.deepEqual(ids.sort(), ['inv-1', 'inv-3'].sort());
});

test('katalog: filterInventaris mendukung multi-pilih OKI dengan logika OR', () => {
  const hasil = filterInventaris(mockItems, { okiIds: ['oki-1', 'oki-3'] });
  assert.equal(hasil.length, 3);
  const ids = hasil.map((x) => x.idInventaris);
  assert.deepEqual(ids.sort(), ['inv-1', 'inv-2', 'inv-5'].sort());
});

test('katalog: filterInventaris menggabungkan cari, kategori, dan OKI dengan logika AND', () => {
  // Cari 'speaker' di kat-2 dan oki-1
  const hasil1 = filterInventaris(mockItems, { cari: 'speaker', kategoriIds: ['kat-2'], okiIds: ['oki-1'] });
  assert.equal(hasil1.length, 1);
  assert.equal(hasil1[0].idInventaris, 'inv-2');

  // Cari 'speaker' di kat-2 tapi oki-2 (seharusnya kosong)
  const hasil2 = filterInventaris(mockItems, { cari: 'speaker', kategoriIds: ['kat-2'], okiIds: ['oki-2'] });
  assert.equal(hasil2.length, 0);
});

test('katalog: filterInventaris menangani array kosong dan opsi kosong', () => {
  assert.deepEqual(filterInventaris([], {}), []);
  // mockItems punya 5 item, tapi inv-4 rusak, jadi sisa 4
  assert.equal(filterInventaris(mockItems, {}).length, 4);
  assert.equal(filterInventaris(null, {}).length, 0);
});

test('katalog: filterInventaris menyembunyikan barang rusak dari hasil', () => {
  const hasil = filterInventaris(mockItems, {});
  assert.equal(hasil.some((x) => x.idInventaris === 'inv-4'), false);
  assert.equal(hasil.every((x) => x.kondisi !== 'rusak'), true);

  const hanyaRusak = filterInventaris(mockItems, { kategoriIds: ['kat-3'] });
  assert.deepEqual(hanyaRusak, []);
});

test('katalog: paginasi dihitung setelah barang rusak dibuang', () => {
  const terfilter = filterInventaris(mockItems, {});
  assert.equal(terfilter.length, 4);
  const halaman = paginate(terfilter, 1, 2);
  assert.equal(halaman.total, 4);
  assert.equal(halaman.totalHalaman, 2);
  assert.equal(halaman.items.length, 2);
  assert.equal(halaman.items.some((x) => x.kondisi === 'rusak'), false);
});

test('katalog: paginate mengoreksi nomor halaman dan memotong data dengan benar', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

  // Halaman 1
  const p1 = paginate(items, 1, 8);
  assert.equal(p1.halaman, 1);
  assert.equal(p1.totalHalaman, 4);
  assert.equal(p1.total, 25);
  assert.equal(p1.items.length, 8);
  assert.equal(p1.items[0].id, 1);

  // Halaman 4 (terakhir, sisa 1 item)
  const p4 = paginate(items, 4, 8);
  assert.equal(p4.halaman, 4);
  assert.equal(p4.items.length, 1);
  assert.equal(p4.items[0].id, 25);

  // Koreksi halaman melebihi batas totalHalaman
  const pOver = paginate(items, 999, 8);
  assert.equal(pOver.halaman, 4);
  assert.equal(pOver.items.length, 1);

  // Koreksi halaman negatif atau nol
  const pUnder = paginate(items, -5, 8);
  assert.equal(pUnder.halaman, 1);

  // Input kosong
  const pEmpty = paginate([], 1, 8);
  assert.equal(pEmpty.halaman, 1);
  assert.equal(pEmpty.totalHalaman, 1);
  assert.equal(pEmpty.total, 0);
  assert.equal(pEmpty.items.length, 0);
});

test('katalog: buildPageList menghasilkan nomor halaman dengan elipsis yang benar', () => {
  // Hanya 1 halaman
  assert.deepEqual(buildPageList(1, 1), [1]);

  // 3 halaman
  assert.deepEqual(buildPageList(2, 3), [1, 2, 3]);

  // 10 halaman saat di halaman 1
  assert.deepEqual(buildPageList(1, 10), [1, 2, '…', 10]);

  // 10 halaman saat di halaman 5
  assert.deepEqual(buildPageList(5, 10), [1, '…', 4, 5, 6, '…', 10]);

  // 10 halaman saat di halaman 10
  assert.deepEqual(buildPageList(10, 10), [1, '…', 9, 10]);
});

test('katalog: getStatusKetersediaan menentukan label dan varian sesuai kondisi barang', () => {
  // Kondisi normal tersedia
  const s1 = getStatusKetersediaan({ totalBarang: 5, sisaHariIni: 3, kondisi: 'baik' });
  assert.equal(s1.label, '3 / 5 Tersedia');
  assert.equal(s1.isRusak, false);
  assert.equal(s1.habis, false);
  assert.equal(s1.variant, 'muted');

  // Kondisi normal habis
  const s2 = getStatusKetersediaan({ totalBarang: 4, sisaHariIni: 0, kondisi: 'baik' });
  assert.equal(s2.label, '0 / 4 Tersedia');
  assert.equal(s2.isRusak, false);
  assert.equal(s2.habis, true);
  assert.equal(s2.variant, 'danger');

  // Kondisi rusak
  const s3 = getStatusKetersediaan({ totalBarang: 2, sisaHariIni: 2, kondisi: 'rusak' });
  assert.equal(s3.label, 'Kondisi Rusak');
  assert.equal(s3.isRusak, true);
  assert.equal(s3.habis, true);
  assert.equal(s3.variant, 'danger');
});

test('katalog: parseKatalogParams dan buildKatalogQueryString konsisten (round-trip)', () => {
  const original = {
    cari: 'proyektor',
    kategoriIds: ['kat-1', 'kat-2'],
    okiIds: ['oki-1'],
    page: 2,
  };

  const qs = buildKatalogQueryString(original);
  assert.ok(qs.includes('q=proyektor'));
  assert.ok(qs.includes('kategori=kat-1%2Ckat-2') || qs.includes('kategori=kat-1,kat-2'));
  assert.ok(qs.includes('page=2'));

  const parsed = parseKatalogParams(`?${qs}`);
  assert.equal(parsed.cari, original.cari);
  assert.deepEqual(parsed.kategoriIds, original.kategoriIds);
  assert.deepEqual(parsed.okiIds, original.okiIds);
  assert.equal(parsed.page, original.page);
});
