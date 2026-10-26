/**
 * Helper validasi form pengajuan peminjaman (fungsi murni).
 * Memvalidasi jumlah pinjam, tanggal peminjaman & pengembalian, dan keperluan.
 */

import { canStartOn, getEarliestStartDate, isRangeAvailable } from './date-rules.js';
import { isoToDate } from './format.js';

export const MAX_KEPERLUAN_LENGTH = 255;

/**
 * Validasi jumlah unit barang.
 *
 * @param {any} jumlah
 * @param {number} totalBarang
 * @returns {string|null} Pesan error atau null jika valid
 */
export function validateJumlah(jumlah, totalBarang = 1) {
  if (jumlah === '' || jumlah === null || jumlah === undefined) {
    return 'Jumlah pinjam wajib diisi.';
  }

  const num = Number(jumlah);
  if (!Number.isInteger(num) || num <= 0) {
    return 'Jumlah pinjam harus berupa bilangan bulat positif minimal 1.';
  }

  if (typeof totalBarang === 'number' && totalBarang > 0 && num > totalBarang) {
    return `Jumlah pinjam (${num}) melebihi total unit barang (${totalBarang}).`;
  }

  return null;
}

/**
 * Validasi teks keperluan peminjaman barang.
 *
 * @param {string} keperluan
 * @param {number} [maxLength=MAX_KEPERLUAN_LENGTH]
 * @returns {string|null} Pesan error atau null jika valid
 */
export function validateKeperluan(keperluan, maxLength = MAX_KEPERLUAN_LENGTH) {
  if (typeof keperluan !== 'string') {
    return 'Keperluan peminjaman wajib diisi.';
  }

  const trimmed = keperluan.trim();
  if (!trimmed) {
    return 'Keperluan peminjaman wajib diisi.';
  }

  if (trimmed.length > maxLength) {
    return `Keperluan peminjaman maksimal ${maxLength} karakter (saat ini ${trimmed.length} karakter).`;
  }

  return null;
}

/**
 * Validasi rentang tanggal peminjaman & pengembalian.
 *
 * @param {object} params
 * @param {string|null} params.startDate
 * @param {string|null} params.endDate
 * @param {string} params.today
 * @param {Array<object>} [params.bookings=[]]
 * @param {number} [params.totalBarang=1]
 * @param {number} [params.jumlah=1]
 * @returns {{ startDate?: string, endDate?: string, general?: string }|null} Object berisi error atau null
 */
export function validateTanggal({
  startDate,
  endDate,
  today,
  bookings = [],
  totalBarang = 1,
  jumlah = 1,
}) {
  const errors = {};

  const earliest = today ? getEarliestStartDate(today) : null;

  if (!startDate) {
    errors.startDate = 'Tanggal peminjaman wajib dipilih.';
  } else if (!isoToDate(startDate)) {
    errors.startDate = 'Format tanggal peminjaman tidak valid.';
  } else if (earliest && startDate < earliest) {
    errors.startDate = `Tanggal mulai paling awal adalah ${earliest} (minimal H+2 dari pengajuan).`;
  } else if (bookings && totalBarang) {
    const qty = Number(jumlah) || 1;
    if (!canStartOn(startDate, bookings, { totalBarang, jumlah: qty, today })) {
      errors.startDate = 'Tanggal peminjaman tidak tersedia karena kuota barang penuh.';
    }
  }

  if (!endDate) {
    errors.endDate = 'Tanggal pengembalian wajib dipilih.';
  } else if (!isoToDate(endDate)) {
    errors.endDate = 'Format tanggal pengembalian tidak valid.';
  } else if (startDate && isoToDate(startDate) && endDate < startDate) {
    errors.endDate = 'Tanggal pengembalian tidak boleh sebelum tanggal peminjaman.';
  }

  // Jika format dan tanggal dasar valid, validasi ketersediaan kuota rentang
  if (!errors.startDate && !errors.endDate && startDate && endDate) {
    const qty = Number(jumlah) || 1;
    const availability = isRangeAvailable(startDate, endDate, bookings, {
      totalBarang,
      jumlah: qty,
      today,
    });

    if (!availability.ok) {
      errors.endDate =
        availability.reason || 'Kuota barang tidak mencukupi untuk rentang tanggal yang dipilih.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validasi lengkap form pengajuan peminjaman.
 *
 * @param {object} payload
 * @param {any} payload.jumlahPinjam
 * @param {string|null} payload.startDate
 * @param {string|null} payload.endDate
 * @param {string} payload.keperluan
 * @param {number} payload.totalBarang
 * @param {Array<object>} payload.bookings
 * @param {string} payload.today
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validatePengajuanForm({
  jumlahPinjam,
  startDate,
  endDate,
  keperluan,
  totalBarang,
  bookings = [],
  today,
}) {
  const errors = {};

  // 1. Jumlah unit
  const errJumlah = validateJumlah(jumlahPinjam, totalBarang);
  if (errJumlah) {
    errors.jumlahPinjam = errJumlah;
  }

  // 2. Tanggal
  const errTanggal = validateTanggal({
    startDate,
    endDate,
    today,
    bookings,
    totalBarang,
    jumlah: Number(jumlahPinjam) || 1,
  });
  if (errTanggal) {
    if (errTanggal.startDate) errors.startDate = errTanggal.startDate;
    if (errTanggal.endDate) errors.endDate = errTanggal.endDate;
    if (errTanggal.general) errors.tanggal = errTanggal.general;
  }

  // 3. Keperluan
  const errKeperluan = validateKeperluan(keperluan);
  if (errKeperluan) {
    errors.keperluan = errKeperluan;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
