import test from 'node:test';
import assert from 'node:assert/strict';

// Mode mock
process.env.NEXT_PUBLIC_USE_MOCK = 'true';

import {
  createPeminjaman,
  getPeminjaman,
  _resetPeminjamanMockState,
  _setMockCurrentUserOverride,
} from '../js/services/peminjaman.js';
import { getPeminjamanAktif, getInventarisById } from '../js/services/inventaris.js';
import { mockUsers } from '../js/data/users.js';
import { mockInventaris, setMockToday } from '../js/data/inventaris.js';
import { STATUS_PEMINJAMAN, ROLES } from '../js/lib/constants.js';
import { buildMonthModel } from '../js/lib/calendar-model.js';
import * as store from '../js/state/store.js';

test.beforeEach(() => {
  _resetPeminjamanMockState();
  _setMockCurrentUserOverride(null);
});

test.afterEach(() => {
  _resetPeminjamanMockState();
  _setMockCurrentUserOverride(null);
});

/* -------------------------------------------------------------------------- */
/*  1. PENGUJIAN SUKSES & DATA FORMAT                                         */
/* -------------------------------------------------------------------------- */

test('createPeminjaman: pengajuan sukses menghasilkan peminjaman dengan status menunggu_persetujuan dan buffer lengkap', async () => {
  const peminjam = mockUsers[0]; // Maitri Sakti
  _setMockCurrentUserOverride(peminjam);

  const start = '2027-04-10';
  const end = '2027-04-12';

  const res = await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: start,
    endDate: end,
    jumlahPinjam: 1,
    keperluan: 'Kegiatan Dokumentasi Ormawa',
  });

  assert.ok(res, 'hasil peminjaman ada');
  assert.equal(res.status, STATUS_PEMINJAMAN.DIAJUKAN, 'status awal harus menunggu_persetujuan');
  assert.equal(res.status, 'menunggu_persetujuan');
  assert.equal(res.startDate, start);
  assert.equal(res.endDate, end);
  assert.equal(res.bufferStartDate, '2027-04-09', 'bufferStartDate = start - 1 hari');
  assert.equal(res.bufferEndDate, '2027-04-13', 'bufferEndDate = end + 1 hari');
  assert.equal(res.jumlahPinjam, 1);
  assert.equal(res.keperluan, 'Kegiatan Dokumentasi Ormawa');
  assert.ok(res.idPeminjaman, 'memiliki idPeminjaman unik');
  assert.ok(res.tanggalPengajuan, 'tanggalPengajuan terisi timestamp ISO');
  assert.equal(res.pengguna.nim, peminjam.nim);
});

/* -------------------------------------------------------------------------- */
/*  2. PENGUJIAN PENOLAKAN LENGKAP                                            */
/* -------------------------------------------------------------------------- */

test('createPeminjaman: tolak 401 jika belum login', async () => {
  _setMockCurrentUserOverride(false); // Simulasi belum login

  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: '2027-04-10',
        endDate: '2027-04-12',
        jumlahPinjam: 1,
        keperluan: 'Test belum login',
      });
    },
    (err) => {
      assert.equal(err.status, 401);
      assert.equal(err.code, 'UNAUTHORIZED');
      assert.match(err.message, /masuk \(login\) terlebih dahulu/);
      return true;
    }
  );
});

test('createPeminjaman: tolak 404 jika barang tidak ditemukan', async () => {
  _setMockCurrentUserOverride(mockUsers[0]);

  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-fiktif-999',
        startDate: '2027-04-10',
        endDate: '2027-04-12',
        jumlahPinjam: 1,
        keperluan: 'Test barang fiktif',
      });
    },
    (err) => {
      assert.equal(err.status, 404);
      assert.match(err.message, /Inventaris tidak ditemukan/);
      return true;
    }
  );
});

test('createPeminjaman: tolak 422 INVENTARIS_RUSAK jika barang rusak', async () => {
  _setMockCurrentUserOverride(mockUsers[0]);

  // Cari barang rusak di mock
  const rusak = mockInventaris.find((it) => it.kondisi === 'rusak' || it.kondisi === 'rusak_ringan');
  assert.ok(rusak, 'harus ada barang rusak di mock');

  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: rusak.idInventaris,
        startDate: '2027-04-10',
        endDate: '2027-04-12',
        jumlahPinjam: 1,
        keperluan: 'Test barang rusak',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.equal(err.code, 'INVENTARIS_RUSAK');
      assert.match(err.message, /kondisi rusak tidak dapat dipinjam/);
      return true;
    }
  );
});

test('createPeminjaman: tolak 422 OKI_SENDIRI jika PJ meminjam barang milik OKI sendiri', async () => {
  const pjBem = mockUsers[1]; // role PENANGGUNG_JAWAB, organisasi BEM (oki-1)
  assert.equal(pjBem.role, ROLES.PENANGGUNG_JAWAB);
  _setMockCurrentUserOverride(pjBem);

  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1', // milik BEM (oki-1)
        startDate: '2027-04-10',
        endDate: '2027-04-12',
        jumlahPinjam: 1,
        keperluan: 'PJ pinjam barang sendiri',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.equal(err.code, 'OKI_SENDIRI');
      assert.match(err.errors?.umum, /Barang milik OKI Anda tidak dapat dipinjam/);
      return true;
    }
  );
});

test('createPeminjaman: validasi ulang field (keperluan, jumlah, H+2, endDate < startDate)', async () => {
  _setMockCurrentUserOverride(mockUsers[0]);

  // Keperluan kosong
  await assert.rejects(
    () => createPeminjaman({ idInventaris: 'inv-1', startDate: '2027-04-10', endDate: '2027-04-12', jumlahPinjam: 1, keperluan: '' }),
    (err) => err.status === 422 && Boolean(err.errors?.keperluan)
  );

  // Jumlah melebihi total barang
  await assert.rejects(
    () => createPeminjaman({ idInventaris: 'inv-1', startDate: '2027-04-10', endDate: '2027-04-12', jumlahPinjam: 99, keperluan: 'Testing' }),
    (err) => err.status === 422 && Boolean(err.errors?.jumlahPinjam)
  );

  // Tanggal mulai kurang dari H+2 (misal hari ini atau kemarin)
  await assert.rejects(
    () => createPeminjaman({ idInventaris: 'inv-1', startDate: '2026-10-09', endDate: '2026-10-12', jumlahPinjam: 1, keperluan: 'Testing' }),
    (err) => err.status === 422 && Boolean(err.errors?.startDate)
  );

  // Tanggal selesai sebelum mulai
  await assert.rejects(
    () => createPeminjaman({ idInventaris: 'inv-1', startDate: '2027-04-15', endDate: '2027-04-10', jumlahPinjam: 1, keperluan: 'Testing' }),
    (err) => err.status === 422 && Boolean(err.errors?.endDate)
  );
});

/* -------------------------------------------------------------------------- */
/*  3. BALAPAN KUOTA (DUA PENGAJUAN BERURUTAN UNTUK SLOT TERAKHIR)            */
/* -------------------------------------------------------------------------- */

test('createPeminjaman: balapan kuota slot terakhir ditolak 409 dengan pesan Indonesia yang menyebut tanggal', async () => {
  _setMockCurrentUserOverride(mockUsers[0]);

  const targetInv = 'inv-1'; // totalBarang = 2
  const start = '2027-05-15';
  const end = '2027-05-17';

  // Pengajuan pertama: ambil seluruh 2 unit yang tersisa
  const pengajuan1 = await createPeminjaman({
    idInventaris: targetInv,
    startDate: start,
    endDate: end,
    jumlahPinjam: 2,
    keperluan: 'Pengajuan 1 menghabiskan stok',
  });
  assert.ok(pengajuan1.idPeminjaman);

  // Pengajuan kedua: balapan untuk slot yang sama (stok sudah 0)
  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: targetInv,
        startDate: start,
        endDate: end,
        jumlahPinjam: 1,
        keperluan: 'Pengajuan 2 berebut kuota',
      });
    },
    (err) => {
      assert.equal(err.status, 409, 'status harus 409 Conflict');
      assert.equal(err.code, 'KUOTA_HABIS');
      assert.ok(err.conflictDate, 'ada conflictDate');
      assert.match(err.message, /Kuota barang tidak mencukupi pada tanggal/);
      assert.match(err.message, /sisa 0 unit dari pengajuan 1 unit/);
      assert.ok(err.errors?.tanggal, 'error dipetakan ke kunci errors.tanggal');
      return true;
    }
  );
});

/* -------------------------------------------------------------------------- */
/*  4. PERSISTENSI KE STORE & MENAHAN KUOTA LANGSUNG                          */
/* -------------------------------------------------------------------------- */

test('createPeminjaman: booking baru tersimpan di store dan langsung menahan kuota pada kalender', async () => {
  _setMockCurrentUserOverride(mockUsers[0]);

  const start = '2027-06-20';
  const end = '2027-06-22';

  const res = await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: start,
    endDate: end,
    jumlahPinjam: 2,
    keperluan: 'Uji persistensi dan kalender',
  });

  // 1. Cek persistensi di store
  const storedPeminjaman = store.load('data:peminjaman');
  assert.ok(Array.isArray(storedPeminjaman));
  assert.ok(storedPeminjaman.some((p) => p.idPeminjaman === res.idPeminjaman));

  // 2. Cek getPeminjamanAktif melihat booking baru
  const aktif = await getPeminjamanAktif('inv-1');
  const matchBooking = aktif.find((b) => b.startDate === start && b.endDate === end);
  assert.ok(matchBooking, 'booking baru harus ditemukan di getPeminjamanAktif');
  assert.equal(matchBooking.jumlahPinjam, 2);

  // 3. Kalender (buildMonthModel) langsung melihat tanggal tersebut terkunci (disabled)
  const model = buildMonthModel({
    year: 2027,
    month: 6,
    today: '2027-01-01',
    jumlahPinjam: 1,
    totalBarang: 2,
    bookings: aktif,
  });

  let day20 = null;
  for (const week of model.weeks) {
    for (const d of week) {
      if (d.iso === '2027-06-20') day20 = d;
    }
  }

  assert.ok(day20, 'tanggal 2027-06-20 harus ada di grid kalender');
  assert.equal(day20.disabled, true, 'tanggal yang sudah dibooking penuh harus terkunci di kalender');
});
