import test from 'node:test';
import assert from 'node:assert/strict';

import { setMockEnabled } from '../js/services/client.js';
import { login } from '../js/services/auth.js';
import { logout } from '../js/state/session.js';
import {
  getInventarisKelola,
  getInventarisKelolaDetail,
  createInventaris,
  updateInventaris,
  deleteInventaris,
} from '../js/services/inventaris.js';

test('Integrasi Real API Kelola Inventaris PJ (Dimas Saputra - THEATRISIC)', async (t) => {
  // Aktifkan mode real API
  setMockEnabled(false);

  let pjUser = null;

  t.after(() => {
    logout();
    setMockEnabled(null);
  });

  await t.test('1. Login sebagai PJ THEATRISIC (NIM 2441720003)', async () => {
    const res = await login('2441720003', '2441720003');
    assert.ok(res.token, 'Token JWT harus dikembalikan');
    assert.equal(res.user.nim, '2441720003');
    assert.equal(res.user.isPj, true);
    assert.equal(res.user.organisasi.singkatan, 'THEATRISIC');
    pjUser = res.user;
  });

  let items = [];

  await t.test('2. List Kelola Inventaris: GET /api/kelola-inventaris', async () => {
    const res = await getInventarisKelola(pjUser, { perPage: 10 });
    assert.ok(res.data && res.data.length > 0, 'Harus ada data barang inventaris THEATRISIC');
    items = res.data;
    assert.ok(res.meta, 'Meta paginasi harus ada');
    assert.equal(res.meta.total, 3, 'THEATRISIC memiliki 3 barang di database awal');

    // Pastikan item Gitar Akustik (idInventaris: 6) ada
    const gitar = items.find((x) => Number(x.idInventaris) === 6);
    assert.ok(gitar, 'Gitar Akustik (id 6) harus ditemukan');
    assert.equal(gitar.namaBarang, 'Gitar Akustik');
    assert.equal(gitar.totalBarang, 3);
  });

  await t.test('3. Detail Kelola Inventaris: GET /api/kelola-inventaris/6', async () => {
    const detail = await getInventarisKelolaDetail(6);
    assert.ok(detail, 'Detail barang harus ada');
    assert.equal(detail.idInventaris, 6);
    assert.equal(detail.namaBarang, 'Gitar Akustik');
    assert.equal(detail.idOrganisasi, 3);
    assert.equal(detail.singkatan, 'THEATRISIC');
    assert.equal(detail.totalBarang, 3);
  });

  await t.test('4. Detail Kelola Inventaris dengan ID string inv-6', async () => {
    const detail = await getInventarisKelolaDetail('inv-6');
    assert.ok(detail, 'Detail barang dengan id inv-6 harus dibersihkan dan berhasil ditemukan');
    assert.equal(detail.idInventaris, 6);
    assert.equal(detail.namaBarang, 'Gitar Akustik');
  });

  await t.test('5. Ubah data barang inventaris: PUT /api/kelola-inventaris/6', async () => {
    const updated = await updateInventaris(pjUser, 6, {
      idKategori: 2,
      totalBarang: 3,
      kondisi: 'Baik',
      deskripsi: 'Gitar akustik standar pemula untuk latihan UKM (terverifikasi)',
    });
    assert.ok(updated, 'Update harus mengembalikan data yang diperbarui');
    assert.equal(updated.deskripsi, 'Gitar akustik standar pemula untuk latihan UKM (terverifikasi)');
  });

  let createdId = null;

  await t.test('6. Tambah dan Hapus inventaris baru: POST & DELETE /api/kelola-inventaris', async () => {
    const baru = await createInventaris(pjUser, {
      namaBarang: 'Kabel Jack Gitar 5m',
      idKategori: 2,
      totalBarang: 2,
      kondisi: 'Baik',
      deskripsi: 'Kabel jack instrument noiseless',
    });
    assert.ok(baru.idInventaris, 'ID inventaris baru harus dikembalikan');
    createdId = baru.idInventaris;

    // Hapus barang yang baru dibuat
    const del = await deleteInventaris(pjUser, createdId);
    assert.ok(del.ok, 'Penghapusan harus berhasil');
  });
});

