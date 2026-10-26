import test from 'node:test';
import assert from 'node:assert/strict';

// Aktifkan mode mock agar service memakai data/mock/.
process.env.NEXT_PUBLIC_USE_MOCK = 'true';

import {
  createPeminjaman,
  getPeminjaman,
  _resetPeminjamanMockState,
  _setMockCurrentUserOverride,
} from '../js/services/peminjaman.js';
import { getPeminjamanAktif, getInventarisById } from '../js/services/inventaris.js';
import { setMockToday, getMockToday } from '../js/data/inventaris.js';
import { mockUsers } from '../js/data/users.js';
import { STATUS_PEMINJAMAN, ROLES } from '../js/lib/constants.js';
import { getEarliestStartDate, isRangeAvailable } from '../js/lib/date-rules.js';

test.beforeEach(() => {
  _resetPeminjamanMockState();
  _setMockCurrentUserOverride(null);
});

test.afterEach(() => {
  _resetPeminjamanMockState();
  _setMockCurrentUserOverride(null);
});

/* -------------------------------------------------------------------------- */
/*                                1. PENGAJUAN VALID                          */
/* -------------------------------------------------------------------------- */

test('createPeminjaman — pengajuan valid menghasilkan objek Peminjaman sesuai kontrak', async () => {
  const today = getMockToday();
  const earliest = getEarliestStartDate(today);
  // Mulai 10 hari setelah earliest agar jauh dari jadwal mock awal
  const start = '2027-02-10';
  const end = '2027-02-12';

  const res = await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: start,
    endDate: end,
    jumlahPinjam: 1,
    keperluan: 'Workshop Robotika FT',
  });

  assert.ok(res, 'hasil peminjaman ada');
  assert.equal(res.status, STATUS_PEMINJAMAN.DIAJUKAN);
  assert.equal(res.startDate, start);
  assert.equal(res.endDate, end);
  assert.equal(res.bufferStartDate, '2027-02-09', 'bufferStartDate = start - 1 hari');
  assert.equal(res.bufferEndDate, '2027-02-13', 'bufferEndDate = end + 1 hari');
  assert.equal(res.jumlahPinjam, 1);
  assert.equal(res.keperluan, 'Workshop Robotika FT');
  assert.ok(res.tanggalPengajuan, 'tanggalPengajuan ada');
  assert.ok(res.pengguna?.nim, 'pengguna.nim ada');
  assert.ok(res.pengguna?.nama, 'pengguna.nama ada');
  assert.equal(res.inventaris?.idInventaris, 'inv-1');
  assert.ok(res.inventaris?.namaBarang);
  assert.ok(res.inventaris?.namaOrganisasi);
  assert.ok(res.inventaris?.thumbnail);
});

/* -------------------------------------------------------------------------- */
/*                                2. ERROR VALIDASI                           */
/* -------------------------------------------------------------------------- */

test('createPeminjaman — melanggar aturan H+2 melempar 422 dengan errors.startDate', async () => {
  const today = getMockToday();
  // Tanggal hari ini atau H+1 (kurang dari H+2)
  const invalidStart = today;

  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: invalidStart,
        endDate: '2027-02-12',
        jumlahPinjam: 1,
        keperluan: 'Kegiatan mendadak',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.ok(err.errors?.startDate, 'ada errors.startDate');
      assert.match(err.errors.startDate, /Tanggal mulai paling awal/);
      return true;
    }
  );
});

test('createPeminjaman — tanggal selesai sebelum tanggal mulai melempar 422 dengan errors.endDate', async () => {
  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: '2027-03-10',
        endDate: '2027-03-05',
        jumlahPinjam: 1,
        keperluan: 'Terbalik tanggal',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.ok(err.errors?.endDate, 'ada errors.endDate');
      assert.match(err.errors.endDate, /tidak boleh sebelum tanggal mulai/);
      return true;
    }
  );
});

test('createPeminjaman — keperluan kosong melempar 422 dengan errors.keperluan', async () => {
  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: '2027-03-10',
        endDate: '2027-03-12',
        jumlahPinjam: 1,
        keperluan: '   ',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.ok(err.errors?.keperluan, 'ada errors.keperluan');
      assert.match(err.errors.keperluan, /wajib diisi/);
      return true;
    }
  );
});

test('createPeminjaman — jumlah pinjam melebihi totalBarang melempar 422 dengan errors.jumlahPinjam', async () => {
  // inv-1 memiliki totalBarang = 2
  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: '2027-03-10',
        endDate: '2027-03-12',
        jumlahPinjam: 5,
        keperluan: 'Butuh banyak',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.ok(err.errors?.jumlahPinjam, 'ada errors.jumlahPinjam');
      assert.match(err.errors.jumlahPinjam, /melebihi total barang/);
      return true;
    }
  );
});

test('createPeminjaman — kuota tidak mencukupi pada jadwal bertabrakan melempar 422', async () => {
  // inv-1 totalBarang = 2
  // Kita ajukan dulu 2 barang pada 2027-05-10..2027-05-12
  await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: '2027-05-10',
    endDate: '2027-05-12',
    jumlahPinjam: 2,
    keperluan: 'Booking pertama menghabiskan kuota',
  });

  // Pengajuan kedua di tanggal yang sama harus gagal kuota
  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: '2027-05-10',
        endDate: '2027-05-12',
        jumlahPinjam: 1,
        keperluan: 'Booking kedua bertabrakan',
      });
    },
    (err) => {
      assert.ok(err.status === 422 || err.status === 409, 'status 422 atau 409');
      assert.ok(
        err.errors?.jumlahPinjam || err.errors?.endDate,
        'ada error jumlahPinjam atau endDate'
      );
      return true;
    }
  );
});

test('createPeminjaman — idInventaris tidak ada melempar 404', async () => {
  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-tidak-ada-999',
        startDate: '2027-03-10',
        endDate: '2027-03-12',
        jumlahPinjam: 1,
        keperluan: 'Barang fiktif',
      });
    },
    (err) => {
      assert.equal(err.status, 404);
      assert.match(err.message, /tidak ditemukan/);
      return true;
    }
  );
});

/* -------------------------------------------------------------------------- */
/*                    3. DAMPAK PADA JADWAL & KETERSEDIAAN                     */
/* -------------------------------------------------------------------------- */

test('setelah pengajuan: getPeminjamanAktif memuat booking baru dan ketersediaan berubah', async () => {
  const start = '2027-06-15';
  const end = '2027-06-17';

  // Sebelum pengajuan, booking aktif pada rentang ini belum ada
  const sebelum = await getPeminjamanAktif('inv-1');
  const countSebelum = sebelum.length;

  // Lakukan pengajuan
  await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: start,
    endDate: end,
    jumlahPinjam: 2,
    keperluan: 'Uji dampak jadwal',
  });

  // Setelah pengajuan, getPeminjamanAktif bertambah 1 dan memuat tanggal tersebut
  const sesudah = await getPeminjamanAktif('inv-1');
  assert.equal(sesudah.length, countSebelum + 1);
  const baru = sesudah.find((b) => b.startDate === start && b.endDate === end);
  assert.ok(baru, 'booking baru ditemukan di getPeminjamanAktif');
  assert.equal(baru.jumlahPinjam, 2);

  // Ketersediaan pada tanggal tersebut sekarang penuh (totalBarang = 2, terpakai = 2)
  const cek = isRangeAvailable(start, end, sesudah, {
    totalBarang: 2,
    jumlah: 1,
    today: '2027-01-01',
  });
  assert.equal(cek.ok, false, 'rentang tanggal sudah tidak tersedia');
});

test('setelah pengajuan: jika booking overlap dengan hari ini, sisaHariIni berkurang', async () => {
  // Simulasi today ke tanggal pengajuan agar overlap dengan buffer/hari pakai
  setMockToday('2027-07-10');

  // inv-2 totalBarang = 3, belum ada booking pada Juli 2027
  const invSebelum = await getInventarisById('inv-2');
  assert.equal(invSebelum.sisaHariIni, 3);

  // Ajukan mulai 2027-07-12 (H+2 dari 2027-07-10) s.d. 2027-07-14 sejumlah 2 unit.
  // Buffer start jatuh di 2027-07-11.
  // Jika today digeser ke hari pakai (mis. 2027-07-12), sisaHariIni harus berkurang dari 3 menjadi 1!
  await createPeminjaman({
    idInventaris: 'inv-2',
    startDate: '2027-07-12',
    endDate: '2027-07-14',
    jumlahPinjam: 2,
    keperluan: 'Uji sisaHariIni',
  });

  setMockToday('2027-07-12');
  const invSesudah = await getInventarisById('inv-2');
  assert.equal(invSesudah.sisaHariIni, 1, 'sisaHariIni berkurang dari 3 menjadi 1');
});

test('getPeminjaman — memuat daftar peminjaman mock', async () => {
  const list = await getPeminjaman();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 3, 'minimal 3 mock peminjaman awal');
});

/* -------------------------------------------------------------------------- */
/*                   4. ATURAN PJ vs BARANG MILIK OKI SENDIRI                */
/* -------------------------------------------------------------------------- */

test('createPeminjaman — PJ (admin) mengajukan barang milik OKI SENDIRI melempar 422 code OKI_SENDIRI', async () => {
  // mockUsers[1] = Siti Rahma, role PENANGGUNG_JAWAB, organisasi BEM (oki-1)
  const pjBem = mockUsers[1];
  assert.equal(pjBem.role, ROLES.PENANGGUNG_JAWAB, 'test user 1 adalah PJ');
  assert.equal(pjBem.organisasi.idOrganisasi, 'oki-1', 'PJ BEM memiliki idOrganisasi oki-1');

  // inv-1 = Proyektor Epson milik BEM (idOrganisasi = oki-1) → barang milik OKI sendiri
  _setMockCurrentUserOverride(pjBem);

  await assert.rejects(
    async () => {
      await createPeminjaman({
        idInventaris: 'inv-1',
        startDate: '2027-02-10',
        endDate: '2027-02-12',
        jumlahPinjam: 1,
        keperluan: 'PJ pinjam barang sendiri — harus ditolak',
      });
    },
    (err) => {
      assert.equal(err.status, 422, 'HTTP status 422 Unprocessable Entity');
      assert.equal(err.code, 'OKI_SENDIRI', 'error code = OKI_SENDIRI');
      assert.equal(err?.response?.data?.code, 'OKI_SENDIRI', 'response.data.code juga OKI_SENDIRI');
      assert.ok(err.errors?.umum, 'ada errors.umum');
      assert.match(err.errors.umum, /Barang milik OKI Anda tidak dapat dipinjam/);
      return true;
    }
  );
});

test('createPeminjaman — PJ (admin) mengajukan barang milik OKI LAIN sukses diterima', async () => {
  // PJ BEM (oki-1) meminjam barang milik HMTI (inv-3, organisasi oki-2)
  const pjBem = mockUsers[1];
  _setMockCurrentUserOverride(pjBem);

  const start = '2027-08-11';
  const end = '2027-08-13';
  const hasil = await createPeminjaman({
    idInventaris: 'inv-3',
    startDate: start,
    endDate: end,
    jumlahPinjam: 1,
    keperluan: 'Rapat Lintas OKI',
  });

  assert.ok(hasil, 'pengajuan diterima (hasil tidak null)');
  assert.equal(hasil.status, STATUS_PEMINJAMAN.DIAJUKAN, 'status diajukan');
  assert.equal(hasil.inventaris.idInventaris, 'inv-3', 'barang yang diajukan = inv-3');
  assert.equal(hasil.pengguna.nim, pjBem.nim, 'nim peminjam sesuai PJ BEM');
});

test('createPeminjaman — aturan OKI_SENDIRI HANYA berlaku PJ; peminjam biasa bebas pinjam manapun', async () => {
  // mockUsers[0] = Maitri Sakti, role PEMINJAM (user), organisasi BEM (oki-1)
  const peminjamBem = mockUsers[0];
  assert.equal(peminjamBem.role, ROLES.PEMINJAM, 'test user 0 adalah peminjam');
  assert.equal(peminjamBem.organisasi.idOrganisasi, 'oki-1', 'peminjam BEM oki-1');

  // Pinjam barang milik OKI sendiri (inv-1 BEM oki-1) — WAJIB SUKSES
  _setMockCurrentUserOverride(peminjamBem);

  const start = '2027-09-08';
  const end = '2027-09-10';
  const hasil = await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: start,
    endDate: end,
    jumlahPinjam: 1,
    keperluan: 'Seminar Kaderisasi BEM',
  });

  assert.ok(hasil, 'peminjam biasa boleh pinjam barang OKI sendiri');
  assert.equal(hasil.status, STATUS_PEMINJAMAN.DIAJUKAN, 'status diajukan');
  assert.equal(hasil.inventaris.idInventaris, 'inv-1', 'barang inv-1 berhasil diajukan');
});
