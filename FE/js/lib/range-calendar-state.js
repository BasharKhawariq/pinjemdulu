/**
 * range-calendar-state.js — Logika murni state management kalender rentang.
 * Bebas efek samping dan DOM, cocok untuk pengujian node:test.
 */

import { isoToDate, dateToISO } from './format.js';
import { moveFocusDate } from './calendar-model.js';
import {
  getPhase,
  reduceRangeSelection,
  createRangeSelectionContext,
  isRangeStillValid,
} from './range-selection.js';

/**
 * @typedef {object} CalendarState
 * @property {{ year: number, month: number }} bulanTampil Bulan yang sedang ditampilkan di UI
 * @property {string|null} mulai Tanggal mulai terpilih (ISO)
 * @property {string|null} selesai Tanggal selesai terpilih (ISO)
 * @property {string} fokusTanggal Tanggal yang sedang difokuskan (untuk navigasi keyboard)
 * @property {boolean} terbuka Status apakah dialog kalender terbuka
 * @property {number} jumlah Jumlah unit yang diajukan
 */

/**
 * Inisialisasi state awal kalender.
 *
 * @param {object} params
 * @param {string} params.today Tanggal hari ini (ISO)
 * @param {string|null} [params.mulai=null] Pilihan mulai awal
 * @param {string|null} [params.selesai=null] Pilihan selesai awal
 * @param {number} [params.jumlah=1] Jumlah unit awal
 * @returns {CalendarState}
 */
export function initCalendarState({ today, mulai = null, selesai = null, jumlah = 1 }) {
  const d = isoToDate(mulai || today);
  return {
    bulanTampil: {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    },
    mulai,
    selesai,
    fokusTanggal: mulai || today,
    terbuka: false,
    jumlah,
  };
}

/**
 * Reducer murni untuk memproses aksi pada kalender.
 *
 * @param {CalendarState} state
 * @param {{ type: string, payload?: any }} action
 * @param {object} ctx Konteks data (bookings, totalBarang, today)
 * @returns {{ state: CalendarState, accepted: boolean, reason: string }}
 */
export function reduceCalendarAction(state, action, ctx) {
  const { type, payload } = action;
  let nextState = { ...state };
  let accepted = true;
  let reason = '';

  switch (type) {
    case 'buka': {
      nextState.terbuka = true;
      // Saat dibuka, pastikan fokus ada di tanggal mulai atau hari ini
      nextState.fokusTanggal = state.mulai || ctx.today;
      const d = isoToDate(nextState.fokusTanggal);
      nextState.bulanTampil = { year: d.getFullYear(), month: d.getMonth() + 1 };
      break;
    }

    case 'tutup': {
      nextState.terbuka = false;
      break;
    }

    case 'bulan-sebelumnya': {
      let { year, month } = state.bulanTampil;
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      nextState.bulanTampil = { year, month };
      break;
    }

    case 'bulan-berikutnya': {
      let { year, month } = state.bulanTampil;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      nextState.bulanTampil = { year, month };
      break;
    }

    case 'pilih-tanggal': {
      const clickedISO = payload;
      // Gunakan logika seleksi rentang yang sudah ada
      const selectionCtx = createRangeSelectionContext({
        bookings: ctx.bookings,
        totalBarang: ctx.totalBarang,
        jumlahPinjam: state.jumlah,
        today: ctx.today,
      });

      const currentSelection = { start: state.mulai, end: state.selesai };
      const res = reduceRangeSelection(currentSelection, clickedISO, selectionCtx);

      if (res.accepted) {
        nextState.mulai = res.state.start;
        nextState.selesai = res.state.end;
        nextState.fokusTanggal = clickedISO;
      } else {
        accepted = false;
        reason = res.reason;
      }
      break;
    }

    case 'reset-pilihan': {
      nextState.mulai = null;
      nextState.selesai = null;
      break;
    }

    case 'fokus-pindah': {
      const key = payload;
      const nextFocus = moveFocusDate(state.fokusTanggal, key);
      nextState.fokusTanggal = nextFocus;

      // Sinkronkan bulan tampil jika fokus pindah ke bulan lain
      const d = isoToDate(nextFocus);
      nextState.bulanTampil = { year: d.getFullYear(), month: d.getMonth() + 1 };
      break;
    }

    case 'jumlah-berubah': {
      const newJumlah = Number(payload) || 1;
      nextState.jumlah = newJumlah;

      // Jika sudah ada rentang, validasi ulang apakah masih muat dengan jumlah baru
      if (state.mulai && state.selesai) {
        const stillValid = isRangeStillValid(
          { startDate: state.mulai, endDate: state.selesai },
          {
            bookings: ctx.bookings,
            totalBarang: ctx.totalBarang,
            jumlah: newJumlah,
            today: ctx.today,
          }
        );

        if (!stillValid) {
          // Jika tidak valid, kosongkan pilihan (sesuai instruksi: "tetapkan satu perilaku dan uji")
          nextState.mulai = null;
          nextState.selesai = null;
          reason = 'Rentang pilihan tidak tersedia untuk jumlah unit ini';
          accepted = false;
        }
      } else if (state.mulai) {
        // Jika baru pilih mulai, cek apakah mulai masih valid
        const selectionCtx = createRangeSelectionContext({
          bookings: ctx.bookings,
          totalBarang: ctx.totalBarang,
          jumlahPinjam: newJumlah,
          today: ctx.today,
        });
        const res = reduceRangeSelection({ start: null, end: null }, state.mulai, selectionCtx);
        if (!res.accepted) {
          nextState.mulai = null;
          reason = 'Tanggal mulai tidak tersedia untuk jumlah unit ini';
          accepted = false;
        }
      }
      break;
    }

    case 'terapkan': {
      // Tombol terapkan hanya aktif jika mulai DAN selesai sudah terpilih
      if (!state.mulai || !state.selesai) {
        accepted = false;
        reason = 'Pilih tanggal dikembalikan terlebih dahulu';
      } else {
        nextState.terbuka = false;
      }
      break;
    }

    default:
      break;
  }

  return { state: nextState, accepted, reason };
}
