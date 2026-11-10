import test from 'node:test';
import assert from 'node:assert/strict';

import { setMockEnabled } from '../js/services/client.js';
import { login } from '../js/services/auth.js';
import { logout } from '../js/state/session.js';
import {
  getInventarisList,
  getInventarisById,
  getKalenderInventaris,
  cekJadwalInventaris,
} from '../js/services/inventaris.js';
import { getPeminjaman, createPeminjaman } from '../js/services/peminjaman.js';
import { getPengembalian } from '../js/services/pengembalian.js';
import { getRequestPjSaya } from '../js/services/request-pj.js';

test('Integrasi Real API Peminjam (Fase 3)', async (t) => {
  // Aktifkan mode real API
  setMockEnabled(false);

  t.after(() => {
    logout();
    setMockEnabled(null);
  });

  await t.test('1. Login sebagai peminjam BEM (NIM 2441720013)', async () => {
    const res = await login('2441720013', '2441720013');
    assert.ok(res.token, 'Token JWT harus dikembalikan');
    assert.equal(res.user.nim, '2441720013');
    assert.equal(res.user.role.toLowerCase(), 'peminjam');
    assert.equal(res.user.isPj, false);
    assert.equal(res.user.organisasi.singkatan, 'BEM');
  });

  let sampleItem = null;

  await t.test('2. Katalog Inventaris: GET /api/inventaris', async () => {
    const catalog = await getInventarisList({ limit: 5 });
    assert.ok(catalog.data && catalog.data.length > 0, 'Harus ada barang di katalog');
    assert.ok(catalog.meta, 'Metadata pagination harus ada');
    assert.ok(catalog.meta.total > 0, 'Total barang harus > 0');

    sampleItem = catalog.data[0];
    assert.ok(sampleItem.idInventaris, 'idInventaris harus ada');
    assert.ok(sampleItem.namaBarang, 'namaBarang harus ada');
    assert.notEqual(sampleItem.namaOrganisasi, 'BEM', 'Barang OKI sendiri tidak boleh muncul di katalog');
  });

  await t.test('3. Detail Inventaris: GET /api/inventaris/{id}', async () => {
    assert.ok(sampleItem, 'Item harus tersedia dari tes sebelumnya');
    const detail = await getInventarisById(sampleItem.idInventaris);
    assert.equal(detail.idInventaris, sampleItem.idInventaris);
    assert.equal(detail.namaBarang, sampleItem.namaBarang);
    assert.ok(Array.isArray(detail.jadwal), 'Jadwal peminjaman harus berupa array');
  });

  await t.test('4. Kalender Ketersediaan: GET /api/inventaris/{id}/kalender', async () => {
    assert.ok(sampleItem, 'Item harus tersedia dari tes sebelumnya');
    const cal = await getKalenderInventaris(sampleItem.idInventaris);
    assert.ok(Array.isArray(cal.data), 'Data kalender harus berupa array');
    assert.ok(cal.data.length >= 100, 'Data kalender default memuat minimal 100 hari');
    assert.ok(cal.meta.tanggalMulaiPalingCepat, 'Meta tanggal mulai paling cepat (H+2) harus ada');
  });

  await t.test('5. Cek Jadwal Inventaris: GET /api/inventaris/{id}/cek', async () => {
    assert.ok(sampleItem, 'Item harus tersedia dari tes sebelumnya');
    const cek = await cekJadwalInventaris(sampleItem.idInventaris, '2026-11-20', '2026-11-22');
    assert.equal(cek.idInventaris, sampleItem.idInventaris);
    assert.equal(typeof cek.maksUnitTersedia, 'number');
    assert.equal(typeof cek.jadwalBerdekatan, 'boolean');
  });

  await t.test('6. Pengajuan Saya (Peminjaman): GET /api/pengajuan-saya/peminjaman', async () => {
    const loans = await getPeminjaman();
    assert.ok(Array.isArray(loans), 'Daftar peminjaman harus array');
    if (loans.length > 0) {
      const first = loans[0];
      assert.ok(first.idPeminjaman, 'idPeminjaman harus ada');
      assert.ok(first.startDate, 'startDate harus terpetakan dari tglMulai');
      assert.ok(first.endDate, 'endDate harus terpetakan dari tglSelesai');
      assert.ok(first.inventaris?.namaBarang, 'inventaris.namaBarang harus terpetakan');
      assert.ok(first.barang?.namaBarang, 'barang.namaBarang harus terpetakan');
    }
  });

  await t.test('7. Pengajuan Saya (Pengembalian): GET /api/pengajuan-saya/pengembalian', async () => {
    const returns = await getPengembalian();
    assert.ok(Array.isArray(returns), 'Daftar pengembalian harus array');
    if (returns.length > 0) {
      const first = returns[0];
      assert.ok(first.id, 'id pengembalian harus ada');
      assert.ok(first.namaBarang, 'namaBarang harus ada');
      assert.ok(first.organisasi, 'organisasi harus ada');
    }
  });

  await t.test('8. Pengajuan PJ Saya: GET /api/pengajuan-pj', async () => {
    const pjList = await getRequestPjSaya('2441720013');
    assert.ok(Array.isArray(pjList), 'Daftar pengajuan PJ harus array');
    if (pjList.length > 0) {
      const first = pjList[0];
      assert.ok(first.id, 'id pengajuan harus ada');
      assert.equal(first.pemohon.nim, '2441720013');
      assert.ok(first.status, 'status pengajuan harus ada');
    }
  });

  await t.test('9. Validasi Pengajuan Peminjaman: POST /api/peminjaman', async () => {
    assert.ok(sampleItem, 'Item harus tersedia dari tes sebelumnya');
    // Uji validasi gagal bila keperluan kosong
    await assert.rejects(
      async () => {
        await createPeminjaman({
          idInventaris: sampleItem.idInventaris,
          startDate: '2026-12-01',
          endDate: '2026-12-02',
          jumlahPinjam: 1,
          keperluan: '',
        });
      },
      (err) => {
        assert.equal(err.status, 422);
        return true;
      }
    );
  });
});
