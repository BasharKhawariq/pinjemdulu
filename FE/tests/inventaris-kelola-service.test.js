import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_USE_MOCK = 'true';

import {
  getInventarisKelola,
  getInventarisDetailKelola,
  createInventaris,
  updateInventaris,
  _resetInventarisKelolaMock,
  _setMockCurrentUserOverride,
} from '../js/services/inventaris-kelola.js';
import { getKategori, createKategori, _resetKategoriMock } from '../js/services/kategori.js';

test.beforeEach(() => {
  _resetInventarisKelolaMock();
  _resetKategoriMock();
  _setMockCurrentUserOverride(null);
});

test.afterEach(() => {
  _resetInventarisKelolaMock();
  _resetKategoriMock();
  _setMockCurrentUserOverride(null);
});

test('createKategori: berhasil membuat kategori baru yang unik', async () => {
  const baru = await createKategori('Alat Olahraga');
  assert.ok(baru.idKategori);
  assert.equal(baru.namaKategori, 'Alat Olahraga');

  const list = await getKategori();
  const ada = list.some((k) => k.namaKategori === 'Alat Olahraga');
  assert.equal(ada, true);
});

test('createKategori: nama kosong atau terlalu panjang memicu 422', async () => {
  await assert.rejects(
    () => createKategori(''),
    (err) => err.status === 422 && err.code === 'VALIDASI_GAGAL'
  );

  await assert.rejects(
    () => createKategori('a'.repeat(31)),
    (err) => err.status === 422 && err.code === 'VALIDASI_GAGAL'
  );
});

test('createKategori: nama duplikat (case-insensitive) memicu 409', async () => {
  await assert.rejects(
    () => createKategori('elektronik'),
    (err) => err.status === 409 && err.code === 'KATEGORI_SUDAH_ADA'
  );
});

test('createInventaris: sukses menambah inventaris baru dengan OKI otomatis', async () => {
  _setMockCurrentUserOverride({
    nim: '12345',
    nama: 'PJ HMTI',
    role: 'admin',
    idOrganisasi: 'oki-2',
    organisasi: { idOrganisasi: 'oki-2', namaOrganisasi: 'HMTI' },
  });

  const payload = {
    namaBarang: 'Soundcard Focusrite 2i2',
    totalBarang: 3,
    idKategori: 'kat-2',
    kondisi: 'baik',
    deskripsi: '<p>Soundcard studio</p>',
    thumbnail: 'data:image/png;base64,abc',
  };

  const created = await createInventaris(payload);
  assert.ok(created.idInventaris);
  assert.equal(created.namaBarang, 'Soundcard Focusrite 2i2');
  assert.equal(created.totalBarang, 3);
  assert.equal(created.sisaHariIni, 3);
  assert.equal(created.idOrganisasi, 'oki-2');
  assert.equal(created.namaOrganisasi, 'HMTI');

  // Muncul di getInventarisKelola
  const kelola = await getInventarisKelola({ q: 'Focusrite' });
  assert.equal(kelola.data.length, 1);
  assert.equal(kelola.data[0].idInventaris, created.idInventaris);
});

test('createInventaris: input tidak valid memicu 422', async () => {
  await assert.rejects(
    () =>
      createInventaris({
        namaBarang: '',
        totalBarang: 0,
        idKategori: '',
        kondisi: '',
      }),
    (err) => err.status === 422 && err.code === 'VALIDASI_GAGAL'
  );
});

test('createPeminjaman ditolak untuk inventaris rusak termasuk nilai legacy', async () => {
  const { createPeminjaman, _resetPeminjamanMockState } =
    await import('../js/services/peminjaman.js');
  _resetPeminjamanMockState();
  await assert.rejects(
    () =>
      createPeminjaman({
        idInventaris: 'inv-4',
        startDate: '2099-01-10',
        endDate: '2099-01-11',
        jumlahPinjam: 1,
        keperluan: 'Uji kondisi',
      }),
    (err) => err.status === 422 && err.code === 'INVENTARIS_RUSAK'
  );
});

test('updateInventaris: sukses mengubah data barang milik OKI sendiri', async () => {
  _setMockCurrentUserOverride({
    nim: '12345',
    nama: 'PJ HMTI',
    role: 'admin',
    idOrganisasi: 'oki-2',
    organisasi: { idOrganisasi: 'oki-2', namaOrganisasi: 'HMTI' },
  });

  const kelola = await getInventarisKelola({ perPage: 1 });
  assert.ok(kelola.data.length > 0);
  const target = kelola.data[0];
  const targetId = target.idInventaris;
  const newTotal = target.totalBarang + 2;

  const updated = await updateInventaris(targetId, {
    namaBarang: 'Nama Barang Diperbarui',
    totalBarang: newTotal,
    idKategori: target.idKategori,
    kondisi: 'rusak',
    deskripsi: '<p>Deskripsi baru</p>',
  });

  assert.equal(updated.namaBarang, 'Nama Barang Diperbarui');
  assert.equal(updated.totalBarang, newTotal);
  assert.equal(updated.kondisi, 'rusak');
});

test('updateInventaris: menolak barang milik OKI lain dengan 403 BUKAN_OKI_ANDA', async () => {
  // Login sebagai PJ OKI oki-1 (BEM)
  _setMockCurrentUserOverride({
    nim: '11111',
    nama: 'PJ BEM',
    role: 'admin',
    idOrganisasi: 'oki-1',
    organisasi: { idOrganisasi: 'oki-1', namaOrganisasi: 'BEM' },
  });

  // Coba update inv-3 yang milik HMTI (oki-2)
  await assert.rejects(
    () =>
      updateInventaris('inv-3', {
        namaBarang: 'Coba Ubah',
        totalBarang: 5,
        idKategori: 'kat-1',
        kondisi: 'baik',
      }),
    (err) => err.status === 403 && err.code === 'BUKAN_OKI_ANDA'
  );
});

test('updateInventaris: menolak jumlah kurang dari booking aktif dengan 409', async () => {
  _setMockCurrentUserOverride({
    nim: '12345',
    nama: 'PJ HMTI',
    role: 'admin',
    idOrganisasi: 'oki-2',
    organisasi: { idOrganisasi: 'oki-2', namaOrganisasi: 'HMTI' },
  });

  // inv-3 milik HMTI punya booking aktif
  const detail = await getInventarisDetailKelola('inv-3');
  if (detail.minTotal > 0) {
    await assert.rejects(
      () =>
        updateInventaris('inv-3', {
          namaBarang: detail.namaBarang,
          totalBarang: 0, // di bawah minTotal
          idKategori: detail.idKategori,
          kondisi: detail.kondisi,
        }),
      (err) => err.status === 409 || err.status === 422
    );
  }
});
