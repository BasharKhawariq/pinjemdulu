import {
  canStartOn,
  getMaxEndDate,
  isEndDateDisabled,
  isRangeStillValid,
  getMaxUnitsForRange,
} from './date-rules.js';
import { isoToDate } from './format.js';

export { isRangeStillValid, getMaxUnitsForRange };

export function getPhase(state) {
  if (!state?.start) return 'start';
  if (!state.end) return 'end';
  return 'done';
}

function isStartValid(iso, ctx) {
  return canStartOn(ctx.bookings, ctx.totalBarang, ctx.jumlahPinjam, iso, ctx.today);
}

function isEndValid(iso, start, ctx) {
  const max =
    ctx.maxEndDate !== undefined
      ? ctx.maxEndDate
      : (ctx.getMaxEndDate || getMaxEndDate)(start, ctx.bookings, ctx.options);
  if (max !== null && max !== Infinity && iso > max) return false;
  return !(ctx.isEndDateDisabled || isEndDateDisabled)(iso, start, ctx.bookings, ctx.options);
}

function result(state, accepted, reason = '') {
  return { state, accepted, reason };
}

export function reduceRangeSelection(current, clickedISO, ctx) {
  const state = { start: current?.start || null, end: current?.end || null };
  if (!isoToDate(clickedISO)) return result(state, false, 'Tanggal tidak valid');

  const phase = getPhase(state);
  if (phase === 'start' || phase === 'done') {
    if (!isStartValid(clickedISO, ctx)) {
      return result(state, false, 'Tanggal tidak tersedia untuk mulai peminjaman');
    }
    return result({ start: clickedISO, end: null }, true);
  }

  if (isEndValid(clickedISO, state.start, ctx)) {
    return result({ start: state.start, end: clickedISO }, true);
  }

  if (clickedISO < state.start && isStartValid(clickedISO, ctx)) {
    return result({ start: clickedISO, end: null }, true);
  }

  const max =
    ctx.maxEndDate !== undefined
      ? ctx.maxEndDate
      : (ctx.getMaxEndDate || getMaxEndDate)(state.start, ctx.bookings, ctx.options);
  if (clickedISO < state.start) return result(state, false, 'Tanggal mulai baru tidak tersedia');
  if (max !== null && max !== Infinity && clickedISO > max) {
    return result(state, false, `Melewati batas: bentrok dengan peminjaman berikutnya (${max})`);
  }
  return result(state, false, 'Tanggal kembali tidak tersedia');
}

export function createRangeSelectionContext({
  bookings,
  totalBarang,
  jumlahPinjam,
  today,
  maxEndDate,
}) {
  const options = { totalBarang, jumlah: jumlahPinjam, today };
  return {
    bookings,
    totalBarang,
    jumlahPinjam,
    today,
    maxEndDate,
    options,
    getMaxEndDate,
    isEndDateDisabled,
  };
}
