import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getKategori,
  getKategoriDenganJumlah,
  createKategori,
  updateKategori,
  deleteKategori,
  _resetKategoriMock,
} from '../js/services/kategori.js';
import { getInventarisById } from '../js/services/inventaris.js';
import { ROLES } from '../js/lib/constants.js';

const MOCK_PJ = {
  idPengguna: 'user-pj-1',
  nama: 'Maitri Sakti',
  role: ROLES.PENANGGUNG_JAWAB,
  idOrganisasi: 'oki-1',
};

const MOCK_PEMINJAM = {
  idPengguna: 'user-pem-1',
  nama: 'Ahmad Fauzi',
  role: ROLES.PEMINJAM,
};

test.beforeEach(() => {
  _resetKategoriMock();
});

/* ========================================================================== */
/* 1. Akses Read: getKategori & getKategoriDenganJumlah                      */
/* ========================================================================== */

test('getKategori: mengembalikan daftar kategori terdaftar', async () => {
  const list = await getKategori();
  assert.ok(Array.isArray(list));
  assert.ok(list.length > 0);
  assert.ok(list.some((k) => k.namaKategori === 'Elektronik'));
});

test('getKategoriDenganJumlah: mengembalikan kategori dengan hitungan barang terurut alfabetis', async () => {
  const list = await getKategoriDenganJumlah();
  assert.ok(Array.isArray(list));
  assert.ok(list.length > 0);

  // Periksa apakah setiap elemen memiliki totalBarang (angka >= 0)
  for (const k of list) {
    assert.equal(typeof k.totalBarang, 'number');
    assert.ok(k.totalBarang >= 0);
  }

  // Periksa urutan alfabetis
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i].namaKategori;
    const b = list[i + 1].namaKategori;
    assert.ok(a.localeCompare(b, 'id', { sensitivity: 'base' }) <= 0);
  }
});

/* ========================================================================== */
/* 2. createKategori                                                          */
/* ========================================================================== */

test('createKategori: menolak non-PJ dengan 403 Forbidden', async () => {
  await assert.rejects(
    async () => {
      await createKategori(MOCK_PEMINJAM, 'Perangkat Baru');
    },
    (err) => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('createKategori: menolak nama kosong atau > 30 karakter dengan 422', async () => {
  // Kosong
  await assert.rejects(
    async () => {
      await createKategori(MOCK_PJ, '   ');
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.ok(err.errors.namaKategori);
      return true;
    }
  );

  // Lebih dari 30 karakter
  await assert.rejects(
    async () => {
      await createKategori(MOCK_PJ, 'Kategori Yang Sangat Amat Panjang Melebihi Batas Tiga Puluh Karakter');
    },
    (err) => {
      assert.equal(err.status, 422);
      return true;
    }
  );
});

test('createKategori: menolak nama duplikat case-insensitive dengan 409', async () => {
  await assert.rejects(
    async () => {
      await createKategori(MOCK_PJ, 'elektronik');
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'KATEGORI_SUDAH_ADA');
      return true;
    }
  );
});

test('createKategori: berhasil menambahkan kategori baru', async () => {
  const baru = await createKategori(MOCK_PJ, 'Robotika & AI');
  assert.ok(baru.idKategori);
  assert.equal(baru.namaKategori, 'Robotika & AI');

  const list = await getKategori();
  assert.ok(list.some((k) => k.idKategori === baru.idKategori));
});

/* ========================================================================== */
/* 3. updateKategori                                                          */
/* ========================================================================== */

test('updateKategori: menolak non-PJ dengan 403 Forbidden', async () => {
  await assert.rejects(
    async () => {
      await updateKategori(MOCK_PEMINJAM, 'kat-1', 'Nama Baru');
    },
    (err) => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('updateKategori: menolak id tidak ditemukan dengan 404', async () => {
  await assert.rejects(
    async () => {
      await updateKategori(MOCK_PJ, 'kat-tidak-ada', 'Nama Baru');
    },
    (err) => {
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test('updateKategori: menolak duplikat nama kategori lain dengan 409', async () => {
  // Ubah kat-2 menjadi 'Elektronik' (nama milik kat-1)
  await assert.rejects(
    async () => {
      await updateKategori(MOCK_PJ, 'kat-2', 'elektronik');
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'KATEGORI_SUDAH_ADA');
      return true;
    }
  );
});

test('updateKategori: mengizinkan perubahan huruf besar-kecil diri sendiri dan sinkronisasi ke barang', async () => {
  // kat-1 awal: 'Elektronik'
  const updated = await updateKategori(MOCK_PJ, 'kat-1', 'ELEKTRONIK');
  assert.equal(updated.namaKategori, 'ELEKTRONIK');

  // Pastikan nama baru tercermin di daftar kategori
  const list = await getKategori();
  const kat1 = list.find((k) => k.idKategori === 'kat-1');
  assert.equal(kat1?.namaKategori, 'ELEKTRONIK');

  // Pastikan nama baru tercermin di barang inventaris terkait (inv-1 memakai kat-1)
  const barang = await getInventarisById('inv-1');
  assert.equal(barang.namaKategori, 'ELEKTRONIK');
});

/* ========================================================================== */
/* 4. deleteKategori                                                          */
/* ========================================================================== */

test('deleteKategori: menolak non-PJ dengan 403 Forbidden', async () => {
  await assert.rejects(
    async () => {
      await deleteKategori(MOCK_PEMINJAM, 'kat-1');
    },
    (err) => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('deleteKategori: menolak kategori yang masih dipakai barang dengan 409', async () => {
  // kat-1 dipakai oleh barang inventaris
  await assert.rejects(
    async () => {
      await deleteKategori(MOCK_PJ, 'kat-1');
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'KATEGORI_DIPAKAI');
      assert.match(err.message, /masih digunakan oleh \d+ barang/i);
      return true;
    }
  );
});

test('deleteKategori: sukses menghapus kategori yang tidak terpakai', async () => {
  // Buat kategori baru yang belum dipakai barang
  const baru = await createKategori(MOCK_PJ, 'Kategori Uji Hapus');
  assert.ok(baru.idKategori);

  const res = await deleteKategori(MOCK_PJ, baru.idKategori);
  assert.equal(res.success, true);
  assert.equal(res.idKategori, baru.idKategori);

  const list = await getKategori();
  assert.equal(list.some((k) => k.idKategori === baru.idKategori), false);
});
