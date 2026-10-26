/**
 * ajukan-page.js — Logika pembantu halaman ajukan peminjaman.
 * Berisi aturan gerbang (gate) dan perhitungan ringkasan pengajuan.
 */

import { normalizeKondisi } from './kondisi.js';
import { ROLES } from './constants.js';
import { formatTanggal, isoToDate } from './format.js';
import { getBufferRange, getMaxUnitsForRange } from './date-rules.js';

/**
 * Tentukan apakah pengguna boleh mengakses form pengajuan barang ini.
 * @param {object} user
 * @param {object} inventaris
 * @returns {{ canAjukan: boolean, reason?: string }}
 */
export function getAjukanGate(user, inventaris) {
  if (!inventaris) return { canAjukan: false, reason: 'Barang tidak ditemukan.' };

  // 1. Kondisi rusak
  if (normalizeKondisi(inventaris.kondisi) === 'rusak') {
    return { canAjukan: false, reason: 'Barang dalam kondisi rusak tidak dapat dipinjam.' };
  }

  // 2. PJ meminjam barang OKI sendiri
  const isPJ = user?.role === ROLES.PENANGGUNG_JAWAB;
  const userOkiId = user?.organisasi?.idOrganisasi || user?.idOrganisasi || null;
  const itemOkiId = inventaris?.idOrganisasi || inventaris?.organisasi?.idOrganisasi || null;

  if (isPJ && userOkiId && itemOkiId && String(userOkiId) === String(itemOkiId)) {
    return { canAjukan: false, reason: 'Barang milik OKI Anda tidak dapat dipinjam.' };
  }

  return { canAjukan: true };
}

/**
 * Hitung ringkasan data pengajuan untuk ditampilkan di UI.
 * @param {string|null} mulai ISO
 * @param {string|null} selesai ISO
 * @returns {object|null}
 */
export function hitungRingkasan(mulai, selesai) {
  if (!mulai || !selesai) return null;

  const s = isoToDate(mulai);
  const e = isoToDate(selesai);
  if (!s || !e) return null;

  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const buffer = getBufferRange(mulai, selesai);

  return {
    mulai: formatTanggal(mulai),
    selesai: formatTanggal(selesai),
    lama: diffDays,
    persiapan: formatTanggal(buffer.from),
    pengecekan: formatTanggal(buffer.to),
  };
}

/**
 * Hitung jumlah maksimum yang diperbolehkan untuk rentang terpilih.
 * @param {object} params
 * @returns {number}
 */
export function getMaxJumlah(startDate, endDate, { bookings, totalBarang, today }) {
  if (!startDate || !endDate) return totalBarang;
  return getMaxUnitsForRange(startDate, endDate, { bookings, totalBarang, today });
}

/**
 * Petakan galat tanggal/kuota/jumlah dari layanan ke kunci form tunggal.
 * @param {object} serviceErrors
 * @returns {object}
 */
export function mapServiceErrorsToForm(serviceErrors = {}) {
  const formErrors = {};
  if (serviceErrors.jumlahPinjam || serviceErrors.jumlah) {
    formErrors.jumlah = serviceErrors.jumlahPinjam || serviceErrors.jumlah;
  }
  if (serviceErrors.keperluan) {
    formErrors.keperluan = serviceErrors.keperluan;
  }
  if (serviceErrors.tanggal || serviceErrors.startDate || serviceErrors.endDate) {
    formErrors.tanggal =
      serviceErrors.tanggal || serviceErrors.startDate || serviceErrors.endDate;
  }
  return formErrors;
}

/**
 * Format rentang tanggal ke dalam satu teks ringkas.
 * @param {string|null} startDate
 * @param {string|null} endDate
 * @returns {string}
 */
export function formatRentangTanggal(startDate, endDate) {
  if (!startDate || !endDate) return '';
  if (startDate === endDate) return formatTanggal(startDate);
  return `${formatTanggal(startDate)} – ${formatTanggal(endDate)}`;
}
