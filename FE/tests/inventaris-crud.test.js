import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInventaris,
  updateInventaris,
  deleteInventaris,
  getInventarisById,
} from '../js/services/inventaris.js';
import { mockInventaris } from '../js/data/inventaris.js';
import { ROLES } from '../js/lib/constants.js';

const userPjBem = {
  id: 'usr-pj-1',
  nama: 'Siti Rahma',
  role: ROLES.PENANGGUNG_JAWAB,
  idOrganisasi: 'oki-1',
  organisasi: { idOrganisasi: 'oki-1', namaOrganisasi: 'BEM FT' },
};

const userPjHmti = {
  id: 'usr-pj-2',
  nama: 'Budi Santoso',
  role: ROLES.PENANGGUNG_JAWAB,
  idOrganisasi: 'oki-2',
  organisasi: { idOrganisasi: 'oki-2', namaOrganisasi: 'HMTI' },
};

const userPeminjam = {
  id: 'usr-pem-1',
  nama: 'Maitri Sakti',
  role: ROLES.PEMINJAM,
  idOrganisasi: 'oki-1',
};

test('inventaris-crud: createInventaris menolak non-PJ dengan 403', async () => {
  await assert.rejects(
    async () => {
      await createInventaris(userPeminjam, {
        namaBarang: 'Laptop ASUS',
        totalBarang: 1,
        idKategori: 'kat-1',
        kondisi: 'baik',
      });
    },
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'FORBIDDEN');
      return true;
    }
  );
});

test('inventaris-crud: createInventaris menolak input tidak valid dengan 422', async () => {
  await assert.rejects(
    async () => {
      await createInventaris(userPjBem, {
        namaBarang: '',
        totalBarang: 0,
        idKategori: '',
        kondisi: '',
      });
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.equal(err.code, 'VALIDASI_GAGAL');
      assert.ok(err.errors.namaBarang);
      assert.ok(err.errors.totalBarang);
      return true;
    }
  );
});

test('inventaris-crud: createInventaris sukses menambah barang dengan OKI milik PJ', async () => {
  const result = await createInventaris(userPjBem, {
    namaBarang: 'Sound System Yamaha DXR15',
    totalBarang: 2,
    idKategori: 'kat-2',
    kondisi: 'baik',
    deskripsi: 'Sound system aktif 15 inch',
  });

  assert.ok(result.idInventaris.startsWith('inv-'));
  assert.equal(result.namaBarang, 'Sound System Yamaha DXR15');
  assert.equal(result.idOrganisasi, 'oki-1');
  assert.equal(result.namaOrganisasi, 'BEM FT');
  assert.equal(result.totalBarang, 2);

  const found = await getInventarisById(result.idInventaris);
  assert.equal(found.namaBarang, 'Sound System Yamaha DXR15');
});

test('inventaris-crud: updateInventaris menolak non-PJ dan barang tidak ada', async () => {
  await assert.rejects(
    async () => {
      await updateInventaris(userPeminjam, 'inv-1', {
        namaBarang: 'Ubah Nama',
        totalBarang: 1,
        idKategori: 'kat-1',
        kondisi: 'baik',
      });
    },
    (err) => err.status === 403
  );

  await assert.rejects(
    async () => {
      await updateInventaris(userPjBem, 'inv-non-existent-999', {
        namaBarang: 'Ubah Nama',
        totalBarang: 1,
        idKategori: 'kat-1',
        kondisi: 'baik',
      });
    },
    (err) => err.status === 404
  );
});

test('inventaris-crud: updateInventaris menolak modifikasi barang OKI lain dengan 403', async () => {
  // inv-1 milik BEM FT (oki-1). userPjHmti (oki-2) mencoba mengedit
  await assert.rejects(
    async () => {
      await updateInventaris(userPjHmti, 'inv-1', {
        namaBarang: 'Proyektor Bajakan',
        totalBarang: 1,
        idKategori: 'kat-1',
        kondisi: 'baik',
      });
    },
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, 'BUKAN_OKI_ANDA');
      return true;
    }
  );
});

test('inventaris-crud: updateInventaris menolak jumlah unit < kuota terpakai dengan 409', async () => {
  // inv-3 milik HMTI (oki-2, total 6, ada booking aktif)
  // PJ HMTI mencoba menurunkan totalBarang menjadi 1 ketika kuota terpakai > 1
  try {
    await updateInventaris(userPjHmti, 'inv-3', {
      namaBarang: 'Kabel HDMI 2 Meter',
      totalBarang: 1,
      idKategori: 'kat-1',
      kondisi: 'baik',
    });
    assert.fail('Seharusnya gagal dengan 409');
  } catch (err) {
    assert.equal(err.status, 409);
    assert.equal(err.code, 'JUMLAH_KURANG_DARI_TERPAKAI');
    assert.ok(err.message.includes('Jumlah tidak boleh kurang dari'));
  }
});

test('inventaris-crud: updateInventaris sukses mengubah barang OKI sendiri', async () => {
  const updated = await updateInventaris(userPjBem, 'inv-1', {
    namaBarang: 'Proyektor Epson EB-X500 Updated',
    totalBarang: 2,
    idKategori: 'kat-1',
    kondisi: 'rusak',
    deskripsi: 'Lampu proyektor perlu diganti.',
  });

  assert.equal(updated.namaBarang, 'Proyektor Epson EB-X500 Updated');
  assert.equal(updated.kondisi, 'rusak');
});

test('inventaris-crud: deleteInventaris menolak penghapusan barang yang masih dipinjam dengan 409', async () => {
  // inv-3 milik HMTI memiliki peminjaman aktif
  await assert.rejects(
    async () => {
      await deleteInventaris(userPjHmti, 'inv-3');
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'MASIH_DIPINJAM');
      return true;
    }
  );
});

test('inventaris-crud: deleteInventaris menolak barang berstatus menunggu_pengembalian dengan 409', async () => {
  // inv-5 (Camera Canon) milik HMS (oki-6) memiliki booking berstatus MENUNGGU_KONFIRMASI_PENGEMBALIAN
  const userPjHms = {
    id: 'usr-pj-hms',
    nama: 'PJ HMS',
    role: ROLES.PENANGGUNG_JAWAB,
    idOrganisasi: 'oki-6',
    organisasi: { idOrganisasi: 'oki-6', namaOrganisasi: 'HMS' },
  };

  await assert.rejects(
    async () => {
      await deleteInventaris(userPjHms, 'inv-5');
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'MASIH_DIPINJAM');
      assert.ok(err.message.includes('masih memiliki peminjaman aktif'));
      return true;
    }
  );
});

test('inventaris-crud: updateInventaris menolak pengurangan kuota jika ada booking menunggu_pengembalian dengan 409', async () => {
  const userPjHms = {
    id: 'usr-pj-hms',
    nama: 'PJ HMS',
    role: ROLES.PENANGGUNG_JAWAB,
    idOrganisasi: 'oki-6',
    organisasi: { idOrganisasi: 'oki-6', namaOrganisasi: 'HMS' },
  };

  // inv-5 memiliki totalBarang 1 dan sedang dalam status menunggu_pengembalian 1 unit
  // Menurunkan totalBarang menjadi 0 atau validasi minTotal harus ditolak
  await assert.rejects(
    async () => {
      await updateInventaris(userPjHms, 'inv-5', {
        namaBarang: 'Camera Canon EOS 700D',
        totalBarang: 0,
        idKategori: 'kat-1',
        kondisi: 'baik',
      });
    },
    (err) => {
      assert.ok(err.status === 409 || err.status === 422);
      return true;
    }
  );
});

test('inventaris-crud: deleteInventaris sukses menghapus barang yang tidak ada peminjaman aktif', async () => {
  // Tambah barang baru tanpa booking
  const item = await createInventaris(userPjBem, {
    namaBarang: 'Barang Sementara Mau Dihapus',
    totalBarang: 1,
    idKategori: 'kat-1',
    kondisi: 'baik',
  });

  const del = await deleteInventaris(userPjBem, item.idInventaris);
  assert.equal(del.ok, true);
  assert.equal(del.idInventaris, item.idInventaris);

  await assert.rejects(
    async () => {
      await getInventarisById(item.idInventaris);
    },
    (err) => err.status === 404
  );
});
