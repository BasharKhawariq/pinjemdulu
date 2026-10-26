import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateNamaBarang,
  validateJumlahUnit,
  validateKategori,
  validateKondisi,
  validateFotoFile,
  validateInventarisInput,
  isFormDirty,
  MAKS_FOTO_BYTES,
} from '../js/lib/inventaris-form-validation.js';
import { KONDISI_BARANG } from '../js/lib/constants.js';

describe('inventaris-form-validation pure functions', () => {
  describe('validateNamaBarang', () => {
    it('wajib diisi dan trim', () => {
      assert.equal(validateNamaBarang(''), 'Nama barang wajib diisi.');
      assert.equal(validateNamaBarang('   '), 'Nama barang wajib diisi.');
      assert.equal(validateNamaBarang(null), 'Nama barang wajib diisi.');
    });

    it('maksimal 100 karakter', () => {
      const longName = 'a'.repeat(101);
      assert.equal(validateNamaBarang(longName), 'Nama barang maksimal 100 karakter.');
      assert.equal(validateNamaBarang('a'.repeat(100)), null);
    });

    it('valid untuk nama wajar', () => {
      assert.equal(validateNamaBarang('Proyektor Epson EB-X500'), null);
    });
  });

  describe('validateJumlahUnit', () => {
    it('wajib diisi', () => {
      assert.equal(validateJumlahUnit(''), 'Jumlah unit wajib diisi.');
      assert.equal(validateJumlahUnit(null), 'Jumlah unit wajib diisi.');
    });

    it('harus bilangan bulat 1-999', () => {
      assert.equal(
        validateJumlahUnit(0),
        'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.'
      );
      assert.equal(
        validateJumlahUnit(-5),
        'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.'
      );
      assert.equal(
        validateJumlahUnit(1000),
        'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.'
      );
      assert.equal(
        validateJumlahUnit(2.5),
        'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.'
      );
      assert.equal(validateJumlahUnit(1), null);
      assert.equal(validateJumlahUnit(999), null);
    });

    it('pada edit: tidak boleh kurang dari minTotal', () => {
      const err = validateJumlahUnit(2, 4);
      assert.equal(
        err,
        'Jumlah tidak boleh kurang dari 4 unit karena masih dipakai peminjaman aktif atau terjadwal.'
      );
      assert.equal(validateJumlahUnit(4, 4), null);
      assert.equal(validateJumlahUnit(5, 4), null);
    });
  });

  describe('validateKategori', () => {
    it('wajib dipilih', () => {
      assert.equal(validateKategori(''), 'Kategori wajib dipilih.');
      assert.equal(validateKategori(null), 'Kategori wajib dipilih.');
      assert.equal(validateKategori('kat-1'), null);
    });
  });

  describe('validateKondisi', () => {
    it('wajib dipilih dan bernilai valid', () => {
      assert.equal(validateKondisi(''), 'Kondisi barang wajib dipilih.');
      assert.equal(validateKondisi('baik'), null);
      assert.equal(validateKondisi('rusak'), null);
      assert.equal(validateKondisi('rusak_berat'), null);
      assert.equal(KONDISI_BARANG.RUSAK, 'rusak');
      assert.equal(validateKondisi(KONDISI_BARANG.RUSAK), null);
      assert.equal(validateKondisi('invalid'), 'Kondisi barang tidak valid.');
    });
  });

  describe('validateFotoFile', () => {
    it('null/undefined dianggap valid (opsional)', () => {
      assert.equal(validateFotoFile(null), null);
      assert.equal(validateFotoFile(undefined), null);
    });

    it('menolak format selain JPG dan PNG', () => {
      assert.equal(
        validateFotoFile({ type: 'image/gif', size: 5000 }),
        'File harus berformat JPG atau PNG.'
      );
      assert.equal(
        validateFotoFile({ type: 'application/pdf', size: 5000 }),
        'File harus berformat JPG atau PNG.'
      );
    });

    it('menolak ukuran lebih dari 2 MB', () => {
      assert.equal(
        validateFotoFile({ type: 'image/jpeg', size: MAKS_FOTO_BYTES + 1 }),
        'Ukuran file maksimal 2 MB.'
      );
      assert.equal(validateFotoFile({ type: 'image/png', size: MAKS_FOTO_BYTES }), null);
    });
  });

  describe('validateInventarisInput', () => {
    it('memvalidasi semua bidang sekaligus', () => {
      const res = validateInventarisInput({
        namaBarang: '',
        totalBarang: 0,
        idKategori: '',
        kondisi: '',
      });
      assert.equal(res.isValid, false);
      assert.ok(res.errors.namaBarang);
      assert.ok(res.errors.totalBarang);
      assert.ok(res.errors.idKategori);
      assert.ok(res.errors.kondisi);
    });

    it('mengembalikan isValid: true jika semua bidang valid', () => {
      const res = validateInventarisInput({
        namaBarang: 'Kabel HDMI',
        totalBarang: 5,
        idKategori: 'kat-1',
        kondisi: 'baik',
        deskripsi: '<p>Kabel 2 meter</p>',
      });
      assert.equal(res.isValid, true);
      assert.deepEqual(res.errors, {});
    });

    it('menggunakan minimum totalBarang dari opsi edit', () => {
      const res = validateInventarisInput(
        {
          namaBarang: 'Kabel HDMI',
          totalBarang: 2,
          idKategori: 'kat-1',
          kondisi: 'baik',
        },
        { minTotal: 4 }
      );
      assert.equal(res.isValid, false);
      assert.equal(
        res.errors.totalBarang,
        'Jumlah tidak boleh kurang dari 4 unit karena masih dipakai peminjaman aktif atau terjadwal.'
      );
    });
  });

  describe('isFormDirty', () => {
    const init = {
      namaBarang: 'Kabel HDMI',
      totalBarang: 5,
      idKategori: 'kat-1',
      kondisi: 'baik',
      deskripsi: '<p>Kabel 2 meter</p>',
    };

    it('false jika tidak ada perubahan', () => {
      assert.equal(isFormDirty({ ...init }, { ...init }), false);
    });

    it('true jika nama berubah', () => {
      assert.equal(isFormDirty({ ...init, namaBarang: 'Kabel VGA' }, init), true);
    });

    it('true jika jumlah unit berubah', () => {
      assert.equal(isFormDirty({ ...init, totalBarang: 10 }, init), true);
    });

    it('mengabaikan perbedaan tag HTML kosong pada deskripsi', () => {
      const current = { ...init, deskripsi: '<p></p>' };
      const initial = { ...init, deskripsi: '' };
      assert.equal(isFormDirty(current, initial), false);
    });
  });
});
