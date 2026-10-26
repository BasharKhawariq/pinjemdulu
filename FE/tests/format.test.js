import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatTanggal, formatTanggalPendek, dateToISO, isoToDate } from '../js/lib/format.js';

describe('formatTanggal', () => {
  it('setiap bulan singkat Indonesia', () => {
    assert.equal(formatTanggal('2026-01-05'), '05 Jan 2026');
    assert.equal(formatTanggal('2026-02-10'), '10 Feb 2026');
    assert.equal(formatTanggal('2026-03-15'), '15 Mar 2026');
    assert.equal(formatTanggal('2026-04-20'), '20 Apr 2026');
    assert.equal(formatTanggal('2026-05-25'), '25 Mei 2026');
    assert.equal(formatTanggal('2026-06-30'), '30 Jun 2026');
    assert.equal(formatTanggal('2026-07-04'), '04 Jul 2026');
    assert.equal(formatTanggal('2026-08-09'), '09 Agu 2026');
    assert.equal(formatTanggal('2026-09-20'), '20 Sep 2026');
    assert.equal(formatTanggal('2026-10-28'), '28 Okt 2026');
    assert.equal(formatTanggal('2026-11-11'), '11 Nov 2026');
    assert.equal(formatTanggal('2026-12-31'), '31 Des 2026');
  });

  it('awal tahun dan akhir tahun', () => {
    assert.equal(formatTanggal('2024-01-01'), '01 Jan 2024');
    assert.equal(formatTanggal('2024-12-31'), '31 Des 2024');
  });

  it('tahun kabisat (29 Feb valid)', () => {
    assert.equal(formatTanggal('2024-02-29'), '29 Feb 2024');
  });

  it('input invalid mengembalikan "-"', () => {
    assert.equal(formatTanggal(''), '-');
    assert.equal(formatTanggal('bukan-tanggal'), '-');
    assert.equal(formatTanggal('2026-13-01'), '-');
    assert.equal(formatTanggal('2026-02-30'), '-');
    assert.equal(formatTanggal('2026-00-01'), '-');
    assert.equal(formatTanggal('2026-1-1'), '-');
    assert.equal(formatTanggal(null), '-');
    assert.equal(formatTanggal(undefined), '-');
    assert.equal(formatTanggal(12345), '-');
    assert.equal(formatTanggal('2023-02-29'), '-');
  });
});

describe('formatTanggalPendek', () => {
  it('mengembalikan objek { hari, bulan } singkat', () => {
    assert.deepEqual(formatTanggalPendek('2026-09-20'), { hari: '20', bulan: 'Sep' });
    assert.deepEqual(formatTanggalPendek('2026-01-05'), { hari: '05', bulan: 'Jan' });
    assert.deepEqual(formatTanggalPendek('2026-12-31'), { hari: '31', bulan: 'Des' });
    assert.deepEqual(formatTanggalPendek('2026-05-01'), { hari: '01', bulan: 'Mei' });
  });

  it('input invalid mengembalikan "-" untuk hari dan bulan', () => {
    assert.deepEqual(formatTanggalPendek(''), { hari: '-', bulan: '-' });
    assert.deepEqual(formatTanggalPendek('salah'), { hari: '-', bulan: '-' });
    assert.deepEqual(formatTanggalPendek('2026-13-01'), { hari: '-', bulan: '-' });
  });
});

describe('dateToISO & isoToDate', () => {
  it('konversi bolak-balik (roundtrip) mempertahankan nilai tanggal lokal', () => {
    const dates = [
      '2026-01-01',
      '2026-02-28',
      '2026-04-30',
      '2026-10-20',
      '2026-12-31',
      '2024-02-29', // kabisat
    ];
    for (const str of dates) {
      const d = isoToDate(str);
      assert.ok(d instanceof Date, `${str} harus menghasilkan Date`);
      assert.equal(dateToISO(d), str, `roundtrip ${str} harus sama persis`);
    }
  });

  it('awal dan akhir bulan serta tahun', () => {
    assert.equal(dateToISO(new Date(2026, 0, 1)), '2026-01-01');
    assert.equal(dateToISO(new Date(2026, 11, 31)), '2026-12-31');
    assert.equal(dateToISO(new Date(2026, 1, 1)), '2026-02-01');
    assert.equal(dateToISO(new Date(2026, 1, 28)), '2026-02-28');

    const dAwal = isoToDate('2026-01-01');
    assert.equal(dAwal.getFullYear(), 2026);
    assert.equal(dAwal.getMonth(), 0);
    assert.equal(dAwal.getDate(), 1);

    const dAkhir = isoToDate('2026-12-31');
    assert.equal(dAkhir.getFullYear(), 2026);
    assert.equal(dAkhir.getMonth(), 11);
    assert.equal(dAkhir.getDate(), 31);
  });

  it('menangani tahun kabisat (29 Februari)', () => {
    // 2024 adalah tahun kabisat
    const kabisat = isoToDate('2024-02-29');
    assert.ok(kabisat instanceof Date);
    assert.equal(dateToISO(kabisat), '2024-02-29');
    assert.equal(dateToISO(new Date(2024, 1, 29)), '2024-02-29');

    // 2023 dan 2025 bukan tahun kabisat
    assert.equal(isoToDate('2023-02-29'), null);
    assert.equal(isoToDate('2025-02-29'), null);
  });

  it('dateToISO mengembalikan null untuk input tidak valid', () => {
    assert.equal(dateToISO(null), null);
    assert.equal(dateToISO(undefined), null);
    assert.equal(dateToISO('2026-10-20'), null);
    assert.equal(dateToISO(12345), null);
    assert.equal(dateToISO(new Date(NaN)), null);
    assert.equal(dateToISO({}), null);
    assert.equal(dateToISO([]), null);
  });

  it('isoToDate mengembalikan null untuk input tidak valid', () => {
    assert.equal(isoToDate(null), null);
    assert.equal(isoToDate(undefined), null);
    assert.equal(isoToDate(''), null);
    assert.equal(isoToDate('   '), null);
    assert.equal(isoToDate('bukan-tanggal'), null);
    assert.equal(isoToDate('2026-13-01'), null);
    assert.equal(isoToDate('2026-00-10'), null);
    assert.equal(isoToDate('2026-04-31'), null); // April hanya 30 hari
    assert.equal(isoToDate('2026-02-30'), null);
    assert.equal(isoToDate(12345), null);
    assert.equal(isoToDate(new Date()), null);
    assert.equal(isoToDate({}), null);
  });
});
