/**
 * ajukan-form.js — Reducer logika formulir pengajuan peminjaman dan aturan pemblokiran.
 *
 * Murni tanpa DOM/window, aman diuji di lingkungan Node.js.
 */

import { isRangeStillValid, getMaxUnitsForRange } from './date-rules.js';
import { normalizeKondisi } from './kondisi.js';
import { ROLES } from './constants.js';

export const INITIAL_AJUKAN_FORM_STATE = Object.freeze({
  jumlahPinjam: 1,
  dates: { startDate: null, endDate: null },
  keperluan: '',
  errors: {},
  generalError: null,
  resetNote: null,
  isSubmitting: false,
  isSuccess: false,
});

/**
 * Evaluasi apakah ada aturan bisnis yang memblokir pengguna mengajukan barang ini.
 *
 * @param {object} user Pengguna aktif
 * @param {object} inventaris Detail barang inventaris
 * @returns {string|null} Alasan blokir atau null bila boleh diajukan
 */
export function getAjukanBlock(user, inventaris) {
  if (!inventaris) return null;

  // 1. Barang dalam kondisi rusak
  if (normalizeKondisi(inventaris.kondisi) === 'rusak') {
    return 'Barang dalam kondisi rusak tidak dapat dipinjam.';
  }

  // 2. PJ tidak boleh meminjam barang milik OKI-nya sendiri
  const isPJ = user?.role === ROLES.PENANGGUNG_JAWAB;
  const userOkiId = user?.organisasi?.idOrganisasi || user?.idOrganisasi || null;
  const itemOkiId = inventaris?.idOrganisasi || inventaris?.organisasi?.idOrganisasi || null;

  if (isPJ && userOkiId && itemOkiId && String(userOkiId) === String(itemOkiId)) {
    return 'Barang milik OKI Anda tidak dapat dipinjam.';
  }

  return null;
}

/**
 * Reducer murni untuk interaksi formulir pengajuan peminjaman.
 *
 * @param {typeof INITIAL_AJUKAN_FORM_STATE} state State formulir saat ini
 * @param {object} action Aksi formulir
 * @returns {typeof INITIAL_AJUKAN_FORM_STATE} State formulir baru
 */
export function reduceAjukanForm(state, action) {
  if (!action || typeof action !== 'object') {
    return state;
  }

  switch (action.type) {
    case 'setJumlah': {
      const parsedQty = Number(action.payload);
      const newQty = Math.max(1, Number.isFinite(parsedQty) ? Math.floor(parsedQty) : 1);
      const bookings = action.bookings || [];
      const totalBarang = Number(action.totalBarang) || 1;
      const today = action.today;

      // Hapus galat bidang jumlahPinjam
      const nextErrors = { ...state.errors };
      delete nextErrors.jumlahPinjam;

      // Bila rentang tanggal sudah lengkap dipilih
      if (state.dates?.startDate && state.dates?.endDate) {
        // (b) Cek apakah tanggal masih valid dengan jumlah unit baru
        const stillValid = isRangeStillValid(state.dates, {
          bookings,
          totalBarang,
          jumlahPinjam: newQty,
          today,
        });

        if (!stillValid) {
          return {
            ...state,
            jumlahPinjam: newQty,
            dates: { startDate: null, endDate: null },
            resetNote: 'Tanggal direset karena jumlah unit berubah',
            errors: nextErrors,
          };
        }

        // (a) Hitung batas atas kuota untuk rentang tanggal terpilih
        const maxUnits = getMaxUnitsForRange(state.dates.startDate, state.dates.endDate, {
          bookings,
          totalBarang,
          today,
        });

        if (newQty > maxUnits) {
          return {
            ...state,
            jumlahPinjam: maxUnits,
            resetNote: `Jumlah unit disesuaikan menjadi ${maxUnits} unit sesuai ketersediaan tanggal.`,
            errors: nextErrors,
          };
        }

        return {
          ...state,
          jumlahPinjam: newQty,
          resetNote: null,
          errors: nextErrors,
        };
      }

      // Belum ada rentang tanggal lengkap
      const clamped = Math.min(newQty, totalBarang);
      return {
        ...state,
        jumlahPinjam: clamped,
        resetNote: null,
        errors: nextErrors,
      };
    }

    case 'applyDates': {
      const dates = action.payload || { startDate: null, endDate: null };
      const startDate = dates.startDate || null;
      const endDate = dates.endDate || null;
      const bookings = action.bookings || [];
      const totalBarang = Number(action.totalBarang) || 1;
      const today = action.today;

      const nextErrors = { ...state.errors };
      delete nextErrors.startDate;
      delete nextErrors.endDate;
      delete nextErrors.tanggal;

      if (startDate && endDate) {
        // (a) Setelah rentang tanggal dipilih, batas atas jumlah = getMaxUnitsForRange
        const maxUnits = getMaxUnitsForRange(startDate, endDate, {
          bookings,
          totalBarang,
          today,
        });

        if (state.jumlahPinjam > maxUnits) {
          return {
            ...state,
            dates: { startDate, endDate },
            jumlahPinjam: maxUnits,
            resetNote: `Jumlah unit disesuaikan menjadi ${maxUnits} unit sesuai ketersediaan tanggal.`,
            errors: nextErrors,
          };
        }

        return {
          ...state,
          dates: { startDate, endDate },
          resetNote: null,
          errors: nextErrors,
        };
      }

      return {
        ...state,
        dates: { startDate, endDate },
        errors: nextErrors,
      };
    }

    case 'setKeperluan': {
      const nextErrors = { ...state.errors };
      delete nextErrors.keperluan;
      return {
        ...state,
        keperluan: action.payload !== undefined && action.payload !== null ? String(action.payload) : '',
        errors: nextErrors,
      };
    }

    case 'submitStart': {
      // (d) Cegah kirim ganda jika sedang mengirim
      if (state.isSubmitting) {
        return state;
      }
      return {
        ...state,
        isSubmitting: true,
        generalError: null,
        errors: {},
      };
    }

    case 'submitSuccess': {
      return {
        ...state,
        isSubmitting: false,
        isSuccess: true,
        generalError: null,
      };
    }

    case 'submitError': {
      // (c) Petakan galat 422 per bidang atau galat umum
      const fieldErrors = action.fieldErrors || {};
      const errorMsg = action.error || (typeof action.payload === 'string' ? action.payload : null);

      return {
        ...state,
        isSubmitting: false,
        isSuccess: false,
        errors: { ...fieldErrors },
        generalError: errorMsg,
      };
    }

    case 'resetForm': {
      return {
        ...INITIAL_AJUKAN_FORM_STATE,
      };
    }

    default:
      return state;
  }
}
