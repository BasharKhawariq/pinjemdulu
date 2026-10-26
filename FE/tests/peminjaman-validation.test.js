import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateJumlah,
  validateKeperluan,
  validateTanggal,
  validatePengajuanForm,
  MAX_KEPERLUAN_LENGTH,
} from '../js/lib/peminjaman-validation.js';

test('validateJumlah — nilai kosong / null / non-integer', () => {
  assert.match(validateJumlah(''), /wajib diisi/i);
  assert.match(validateJumlah(null), /wajib diisi/i);
  assert.match(validateJumlah(undefined), /wajib diisi/i);
  assert.match(validateJumlah(0), /minimal 1/i);
  assert.match(validateJumlah(-2), /minimal 1/i);
  assert.match(validateJumlah(1.5), /bilangan bulat/i);
  assert.match(validateJumlah('abc'), /bilangan bulat/i);
});

test('validateJumlah — melebihi totalBarang', () => {
  assert.match(validateJumlah(5, 3), /melebihi total unit/i);
  assert.equal(validateJumlah(3, 3), null);
  assert.equal(validateJumlah(1, 3), null);
});

test('validateKeperluan — wajib diisi dan trim', () => {
  assert.match(validateKeperluan(''), /wajib diisi/i);
  assert.match(validateKeperluan('   '), /wajib diisi/i);
  assert.match(validateKeperluan(null), /wajib diisi/i);
  assert.equal(validateKeperluan('Untuk seminar'), null);
});

test('validateKeperluan — batasan panjang maksimal 255 karakter', () => {
  const exactly255 = 'a'.repeat(255);
  assert.equal(validateKeperluan(exactly255), null);

  const over255 = 'a'.repeat(256);
  assert.match(validateKeperluan(over255), /maksimal 255 karakter/i);
});

test('validateTanggal — startDate dan endDate wajib', () => {
  const resEmpty = validateTanggal({
    startDate: null,
    endDate: null,
    today: '2026-10-15',
  });
  assert.ok(resEmpty.startDate);
  assert.ok(resEmpty.endDate);
});

test('validateTanggal — aturan H+2', () => {
  const resPast = validateTanggal({
    startDate: '2026-10-16', // H+1
    endDate: '2026-10-18',
    today: '2026-10-15',
  });
  assert.ok(resPast.startDate);
  assert.match(resPast.startDate, /minimal H\+2/i);

  const resOk = validateTanggal({
    startDate: '2026-10-17', // H+2
    endDate: '2026-10-18',
    today: '2026-10-15',
    totalBarang: 5,
  });
  assert.equal(resOk, null);
});

test('validateTanggal — endDate sebelum startDate', () => {
  const resOrder = validateTanggal({
    startDate: '2026-10-20',
    endDate: '2026-10-18',
    today: '2026-10-15',
  });
  assert.ok(resOrder.endDate);
  assert.match(resOrder.endDate, /tidak boleh sebelum/i);
});

test('validatePengajuanForm — validasi komprehensif', () => {
  const invalidForm = validatePengajuanForm({
    jumlahPinjam: 0,
    startDate: null,
    endDate: null,
    keperluan: '',
    totalBarang: 2,
    today: '2026-10-15',
  });

  assert.equal(invalidForm.isValid, false);
  assert.ok(invalidForm.errors.jumlahPinjam);
  assert.ok(invalidForm.errors.startDate);
  assert.ok(invalidForm.errors.endDate);
  assert.ok(invalidForm.errors.keperluan);

  const validForm = validatePengajuanForm({
    jumlahPinjam: 1,
    startDate: '2026-10-18',
    endDate: '2026-10-19',
    keperluan: 'Kegiatan UKM Musik',
    totalBarang: 2,
    today: '2026-10-15',
  });

  assert.equal(validForm.isValid, true);
  assert.deepEqual(validForm.errors, {});
});
