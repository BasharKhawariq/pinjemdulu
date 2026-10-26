/**
 * calendar-model.js — Logika murni pembentukan model data kalender peminjaman.
 *
 * Murni tanpa DOM/window, aman diuji di lingkungan Node.js.
 * Memakai perhitungan tanggal lokal (format.js) agar bebas pergeseran zona waktu.
 */

import {
  getDayStatus,
  getMaxEndDate,
  getEarliestStartDate,
  MAX_HORIZON_DAYS,
} from './date-rules.js';
import { getPhase } from './range-selection.js';
import { formatTanggal, dateToISO, isoToDate } from './format.js';

export const NAMA_HARI = Object.freeze(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);

export const NAMA_BULAN = Object.freeze([
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]);

function isKabisat(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function getDaysInMonth(year, month1Based) {
  const days = [31, isKabisat(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month1Based - 1];
}

/**
 * Bangun model data kalender untuk 1 bulan kalender (grid mingguan).
 *
 * @param {object} params
 * @param {number} params.year Tahun (mis. 2026)
 * @param {number} params.month Bulan 1-12 (atau 0 untuk Januari)
 * @param {string} params.today Tanggal acuan sistem ISO (YYYY-MM-DD)
 * @param {'start'|'end'|'done'} [params.phase] Fase pemilihan tanggal
 * @param {string|null} [params.start] Tanggal mulai ISO yang sedang dipilih
 * @param {string|null} [params.end] Tanggal kembali ISO yang sedang dipilih
 * @param {number} [params.jumlahPinjam=1] Jumlah unit yang diajukan
 * @param {number} [params.totalBarang=1] Total ketersediaan fisik barang
 * @param {Array<object>} [params.bookings=[]] Daftar peminjaman aktif
 * @returns {{ label: string, weeks: Array<Array<object>> }}
 */
export function buildMonthModel({
  year,
  month,
  today,
  phase,
  start = null,
  end = null,
  jumlahPinjam = 1,
  totalBarang = 1,
  bookings = [],
}) {
  // Normalisasi bulan (1-based: 1 = Jan ... 12 = Des, toleransi 0 = Jan)
  const m = month === 0 ? 1 : Number(month) || 1;
  const y = Number(year) || 2026;
  const q = Number(jumlahPinjam) || 1;
  const total = Number(totalBarang) || 1;
  const activeBookings = Array.isArray(bookings) ? bookings : [];

  const currentPhase = phase || getPhase({ start, end });
  const label = `${NAMA_BULAN[m - 1]} ${y}`;

  // Hitung maxEndDate SEKALI saja jika dalam fase memilih tanggal kembali
  let maxEndDate = null;
  if (currentPhase === 'end' && start) {
    maxEndDate = getMaxEndDate(start, activeBookings, {
      totalBarang: total,
      jumlah: q,
      today,
    });
  }

  const selectionCtx = {
    bookings: activeBookings,
    totalBarang: total,
    jumlahPinjam: q,
    jumlah: q,
    today,
    phase: currentPhase,
    start,
    maxEndDate,
  };

  // Tentukan hari pertama bulan ini
  const firstDayOfMonth = new Date(y, m - 1, 1);
  // Di JavaScript: 0 = Min, 1 = Sen, ..., 6 = Sab.
  // Kalender kita minggu dimulai SENIN (Sen = offset 0, ..., Min = offset 6).
  const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;

  // Tanggal awal grid (bisa mundur ke bulan sebelumnya)
  const gridStartDate = new Date(y, m - 1, 1 - mondayOffset);

  // Jumlah hari dalam bulan ini
  const daysInThisMonth = getDaysInMonth(y, m);
  const lastDayOfMonth = new Date(y, m - 1, daysInThisMonth);
  // Hari dalam pekan untuk tanggal terakhir (0 = Sen ... 6 = Min)
  const lastDayWeekIdx = (lastDayOfMonth.getDay() + 6) % 7;
  const paddingEnd = (6 - lastDayWeekIdx) % 7;

  // Total hari yang masuk dalam grid kalender bulan ini
  const totalGridDays = mondayOffset + daysInThisMonth + paddingEnd;

  // Pre-calculate statusMap SEKALI untuk seluruh hari di grid
  const statusMap = new Map();
  const currentDate = new Date(gridStartDate.getTime());

  for (let i = 0; i < totalGridDays; i++) {
    const iso = dateToISO(currentDate);
    if (iso) {
      statusMap.set(iso, getDayStatus(iso, selectionCtx));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Bentuk array minggu-minggu
  const weeks = [];
  let currentWeek = [];
  const walkDate = new Date(gridStartDate.getTime());

  for (let i = 0; i < totalGridDays; i++) {
    const iso = dateToISO(walkDate);
    const inMonth = walkDate.getFullYear() === y && walkDate.getMonth() === m - 1;
    const day = walkDate.getDate();

    const dayStat = statusMap.get(iso) || {
      status: 'out_of_range',
      reason: 'Di luar jangkauan',
      sisa: 0,
      disabled: true,
    };

    const isStart = Boolean(start && iso === start);
    const isEnd = Boolean(end && iso === end);
    const inRange = Boolean(start && end && iso >= start && iso <= end);

    currentWeek.push({
      iso,
      inMonth,
      day,
      status: dayStat.status,
      reason: dayStat.reason,
      sisa: dayStat.sisa,
      disabled: Boolean(dayStat.disabled),
      isStart,
      isEnd,
      inRange,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    walkDate.setDate(walkDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return {
    label,
    weeks,
  };
}

/**
 * Hasilkan teks status aria-live kalender sesuai fase seleksi.
 *
 * @param {object} params
 * @param {'start'|'end'|'done'} [params.phase]
 * @param {string|null} [params.start]
 * @param {string|null} [params.end]
 * @param {string|number|null} [params.maxEnd]
 * @param {string|null} [params.earliest]
 * @param {'start'|'end'|null} [params.openedFrom]
 * @returns {string}
 */
export function getCalendarStatusText({
  start,
  end,
  maxEnd,
  earliest,
  openedFrom = null,
}) {
  if (!start) {
    if (openedFrom === 'end') {
      return 'Pilih tanggal mulai terlebih dahulu';
    }
    const earliestStr = earliest ? formatTanggal(earliest) : '-';
    return `Pilih tanggal mulai. Paling cepat ${earliestStr}.`;
  }

  if (start && !end) {
    if (maxEnd && maxEnd !== Infinity) {
      return `Mulai ${formatTanggal(start)}. Pilih tanggal kembali (paling lambat ${formatTanggal(maxEnd)}).`;
    }
    return `Mulai ${formatTanggal(start)}. Pilih tanggal kembali.`;
  }

  if (start && end) {
    const startDateObj = isoToDate(start);
    const prepDate = startDateObj
      ? new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate() - 1)
      : null;
    const prepDateStr = prepDate ? formatTanggal(dateToISO(prepDate)) : '-';
    return `Pinjam ${formatTanggal(start)} - ${formatTanggal(end)}. Barang disiapkan ${prepDateStr}.`;
  }

  return '';
}

/**
 * Pindahkan tanggal fokus dengan tombol keyboard (aksesibilitas grid WAI-ARIA).
 *
 * @param {string} iso Tanggal ISO aktif (YYYY-MM-DD)
 * @param {string} key Nilai event.key (ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Home, End, PageUp, PageDown)
 * @returns {string} Tanggal ISO baru
 */
export function moveFocusDate(iso, key) {
  const d = isoToDate(iso);
  if (!d) return iso;

  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-based
  const day = d.getDate();

  switch (key) {
    case 'ArrowLeft': {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      return dateToISO(next) || iso;
    }
    case 'ArrowRight': {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      return dateToISO(next) || iso;
    }
    case 'ArrowUp': {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
      return dateToISO(next) || iso;
    }
    case 'ArrowDown': {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      return dateToISO(next) || iso;
    }
    case 'Home': {
      // Pindah ke hari Senin dalam pekan yang sama
      const dayOffset = (d.getDay() + 6) % 7;
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOffset);
      return dateToISO(monday) || iso;
    }
    case 'End': {
      // Pindah ke hari Minggu dalam pekan yang sama
      const dayOffset = (d.getDay() + 6) % 7;
      const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - dayOffset));
      return dateToISO(sunday) || iso;
    }
    case 'PageUp': {
      // Mundur 1 bulan, jaga tanggal hari tetap sama jika muat di bulan lalu
      let prevM = m - 1;
      let prevY = y;
      if (prevM < 1) {
        prevM = 12;
        prevY -= 1;
      }
      const maxDays = getDaysInMonth(prevY, prevM);
      const clampedDay = Math.min(day, maxDays);
      const prevDate = new Date(prevY, prevM - 1, clampedDay);
      return dateToISO(prevDate) || iso;
    }
    case 'PageDown': {
      // Maju 1 bulan, jaga tanggal hari tetap sama jika muat di bulan depan
      let nextM = m + 1;
      let nextY = y;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      const maxDays = getDaysInMonth(nextY, nextM);
      const clampedDay = Math.min(day, maxDays);
      const nextDate = new Date(nextY, nextM - 1, clampedDay);
      return dateToISO(nextDate) || iso;
    }
    default:
      return iso;
  }
}
