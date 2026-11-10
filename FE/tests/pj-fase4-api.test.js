import test from 'node:test';
import assert from 'node:assert/strict';

import { setMockEnabled } from '../js/services/client.js';
import { login } from '../js/services/auth.js';
import { logout } from '../js/state/session.js';
import {
  getKelolaPeminjaman,
  getKelolaPeminjamanDetail,
  getDashboardPjStats,
} from '../js/services/peminjaman.js';
import {
  getKelolaPengembalian,
  getKelolaPengembalianDetail,
} from '../js/services/pengembalian.js';
import {
  getKategoriDenganJumlah,
  createKategori,
  updateKategori,
  deleteKategori,
} from '../js/services/kategori.js';
import {
  getUsers,
  addMockUser,
  updateMockUser,
} from '../js/services/users.js';
import { getRequestPj } from '../js/services/request-pj.js';

test('Integrasi Real API Fase 4: Alur Penanggung Jawab (PJ Dimas Saputra)', async (t) => {
  // Aktifkan mode real API backend localhost:8000
  setMockEnabled(false);

  let pjUser = null;

  t.after(() => {
    logout();
    setMockEnabled(null);
  });

  await t.test('1. Login sebagai PJ THEATRISIC (NIM 2441720003)', async () => {
    const res = await login('2441720003', '2441720003');
    assert.ok(res.token, 'Token JWT harus ada');
    assert.equal(res.user.nim, '2441720003');
    assert.equal(res.user.isPj, true);
    assert.equal(res.user.organisasi?.singkatan, 'THEATRISIC');
    pjUser = res.user;
  });

  await t.test('2. Dashboard PJ Stats: GET /api/dashboard-pj', async () => {
    const stats = await getDashboardPjStats();
    assert.ok(stats, 'Stats dashboard PJ harus dikembalikan');
    assert.equal(typeof stats.pengajuan, 'number');
    assert.equal(typeof stats.rusak, 'number');
    assert.equal(typeof stats.tersedia, 'number');
    assert.equal(typeof stats.terlambat, 'number');
    assert.equal(typeof stats.totalUnit, 'number');
    assert.equal(typeof stats.persetujuanPj, 'number');
  });

  let peminjamanList = [];
  await t.test('3. Kelola Peminjaman: GET /api/kelola-peminjaman', async () => {
    peminjamanList = await getKelolaPeminjaman();
    assert.ok(Array.isArray(peminjamanList), 'Harus mengembalikan daftar peminjaman');
    if (peminjamanList.length > 0) {
      const item = peminjamanList[0];
      assert.ok(item.idPeminjaman, 'idPeminjaman harus ada');
      assert.ok(item.namaBarang, 'namaBarang harus ada');
      assert.ok(item.namaPeminjam || item.nama, 'nama peminjam harus ada');

      const detail = await getKelolaPeminjamanDetail(item.idPeminjaman);
      assert.ok(detail, 'Detail peminjaman harus ada');
      assert.equal(detail.idPeminjaman, item.idPeminjaman);
    }
  });

  let pengembalianList = [];
  await t.test('4. Kelola Pengembalian: GET /api/kelola-pengembalian', async () => {
    pengembalianList = await getKelolaPengembalian();
    assert.ok(Array.isArray(pengembalianList), 'Harus mengembalikan daftar pengembalian');
    if (pengembalianList.length > 0) {
      const item = pengembalianList[0];
      assert.ok(item.idPeminjaman, 'idPeminjaman harus ada');
      assert.ok(item.namaBarang, 'namaBarang harus ada');

      if (item.idPengembalian) {
        const detail = await getKelolaPengembalianDetail(item.idPengembalian);
        assert.ok(detail, 'Detail pengembalian harus ada');
      }
    }
  });

  let idKategoriBaru = null;
  const testKategoriNama = `Kategori Uji ${Date.now() % 100000}`;
  const testKategoriUbah = `${testKategoriNama} Rev`;

  await t.test('5. Kelola Kategori CRUD: GET, POST, PUT, DELETE /api/kelola-kategori', async () => {
    const listAwal = await getKategoriDenganJumlah();
    assert.ok(Array.isArray(listAwal), 'Daftar kategori harus array');
    assert.ok(listAwal.length > 0, 'Harus ada kategori awal di DB');

    // Buat kategori baru
    const created = await createKategori(pjUser, testKategoriNama);
    assert.ok(created.idKategori, 'idKategori baru harus dikembalikan');
    idKategoriBaru = created.idKategori;

    // Perbarui kategori
    const updated = await updateKategori(pjUser, idKategoriBaru, testKategoriUbah);
    assert.ok(updated, 'Kategori harus berhasil diubah');

    // Hapus kategori yang baru dibuat (karena belum dipakai barang)
    const deleted = await deleteKategori(pjUser, idKategoriBaru);
    assert.ok(deleted.success, 'Kategori harus berhasil dihapus');
  });

  const testNim = `99${String(Date.now()).slice(-8)}`;
  await t.test('6. Kelola Pengguna: GET, POST, PUT /api/kelola-pengguna', async () => {
    const users = await getUsers();
    assert.ok(Array.isArray(users), 'Daftar pengguna harus array');
    assert.ok(users.some((u) => u.nim === '2441720003'), 'PJ THEATRISIC harus ada dalam daftar pengguna organisasinya');

    // Tambah pengguna peminjam baru ke organisasi THEATRISIC
    const createdUser = await addMockUser({
      nim: testNim,
      nama: 'Mahasiswa Anggota Uji',
      role: 'Peminjam',
    });
    assert.ok(createdUser, 'Pengguna baru berhasil ditambahkan');

    // Nonaktifkan status akun
    const statusRes = await updateMockUser(testNim, { statusAkun: false });
    assert.ok(statusRes, 'Status akun berhasil dinonaktifkan');

    // Aktifkan kembali
    await updateMockUser(testNim, { statusAkun: true });

    // Ubah nama pengguna
    const editRes = await updateMockUser(testNim, { nama: 'Mahasiswa Anggota Uji (Rev)' });
    assert.ok(editRes, 'Data pengguna berhasil diubah');
  });

  await t.test('7. Kelola Pengajuan PJ: GET /api/kelola-pengajuan-pj', async () => {
    const pjReqList = await getRequestPj();
    assert.ok(Array.isArray(pjReqList), 'Daftar pengajuan PJ harus array');
  });
});

