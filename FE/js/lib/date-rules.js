/**
 * Aturan tanggal dan kuota peminjaman inventaris — berbasis kuota.
 *
 * Model KUOTA (berbeda dari model bentrok range sederhana):
 *
 * 1. Setiap booking punya:
 *    - HARI PAKAI  = [mulai, selesai] (rentang tertutup). Untuk status
 *      `Terlambat`, hari pakai diperpanjang SAMPAI `today`.
 *    - HARI PERSIAPAN = `bufferStartDate` (jika ada) atau `mulai - 1`.
 *    - HARI PENGECEKAN = `bufferEndDate` (jika ada) atau `selesai + 1`.
 *      Untuk status `Terlambat`, hari pengecekan = `today + 1`.
 *    - KEDUA hari buffer digabung jadi rentang `[bufferStart, bufferEnd]`.
 *      Rentang ini hanya berisi PERSIAPAN atau PENGECEKAN; HARI PAKAI tidak
 *      masuk (jadi misal start=20, buffer hanya tanggal 19; end=30, buffer
 *      hanya tanggal 31).
 *    - `jumlahPinjam`: banyaknya unit barang yang dipegang booking ini
 *      (default = 1 untuk booking yang tidak menyertakan field).
 *
 * 2. Hanya booking dengan status di `STATUS_MENAHAN_BARANG` yang dihitung.
 *    Booking `Ditolak` atau `Dikembalikan` diabaikan.
 *
 * 3. Rumus `terpakai(d)` untuk satu tanggal d:
 *        A = Σ jumlahPinjam dari booking yang HARI PAKAI-nya mencakup d.
 *        B = MAX jumlahPinjam dari booking yang d hanya berada di buffer
 *            (bukan di hari pakai booking itu sendiri).
 *        terpakai(d) = A + B
 *
 *    Konsekuensi:
 *    - Dua (atau lebih) booking yang buffer-nya bertemu di hari yang sama
 *      TETAPI keduanya tidak memakai barang di hari itu — barangnya boleh
 *      "dibagikan" di hari itu (hanya MAX yang diambil), sehingga
 *      persiapan A dan pengecekan B bisa berbagi hari yang sama.
 *    - Buffer booking TIDAK boleh jatuh di hari pakai booking lain
 *      (karena B adalah MAX, ditambahkan ke A yang sudah memblokir).
 *
 * 4. Pengajuan baru (s, e, q = jumlah) dinyatakan VALID jika untuk SEMUA
 *    tanggal d di rentang `[s − 1, e + 1]`, nilai terpakai(d) setelah
 *    pengajuan baru ikut dihitung MASIH ≤ `totalBarang`, dengan aturan:
 *    - Jika d ∈ [s, e]       → q ditambahkan ke A (hari pakai).
 *    - Jika d = s − 1 atau d = e + 1 dan d ∉ [s, e] → q ikut dihitung
 *      di MAX (hanya buffer).
 *
 *    Catatan: jumlah default adalah 1 (satu barang per pengajuan) untuk
 *    pemanggil yang tidak mengisi.
 *
 * Semua fungsi bersifat MURNI. Tanggal dalam string "YYYY-MM-DD" atau
 * objek Date. Tidak ada dependensi eksternal selain konstanta lokal.
 */

import { STATUS_PEMINJAMAN, STATUS_MENAHAN_BARANG } from './constants.js';

/**
 * Batas horizon maksimum pemindaian kalender ke depan (dalam hari).
 * Mencegah loop sinkron berlebihan / tidak berbatas.
 */
export const MAX_HORIZON_DAYS = 366;

/* -------------------------------------------------------------------------- */
/*                               HELPER INTERNAL                              */
/* -------------------------------------------------------------------------- */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Normalisasi input tanggal ke objek Date dengan jam 00:00:00.000 lokal.
 * Menerima string "YYYY-MM-DD" atau objek Date.
 * @param {string|Date} value
 * @returns {Date}
 */
function parseDate(value) {
  if (value instanceof Date) {
    const d = new Date(value.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof value === 'string') {
    const m = value.match(ISO_DATE_RE);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]) - 1;
      const day = Number(m[3]);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }
  return new Date(NaN);
}

/**
 * Format Date menjadi "YYYY-MM-DD" (zona waktu lokal).
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tambah / kurangi sejumlah hari dari Date.
 * @param {Date} date
 * @param {number} n
 * @returns {Date}
 */
function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Komparasi tanggal. Negatif jika a < b, nol jika sama, positif jika a > b.
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
function cmpDates(a, b) {
  return a.getTime() - b.getTime();
}

/**
 * Apakah `x` berada di antara `lo` dan `hi` (inklusif kedua ujung).
 * @param {Date} x
 * @param {Date} lo
 * @param {Date} hi
 * @returns {boolean}
 */
function isInRange(x, lo, hi) {
  return cmpDates(x, lo) >= 0 && cmpDates(x, hi) <= 0;
}

/**
 * Ambil `jumlahPinjam` dari booking, default 1 jika field tidak ada / tidak
 * bilangan positif.
 * @param {object} b
 * @returns {number}
 */
function qtyOf(b) {
  const v = Number(b?.jumlahPinjam);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 1;
}

/* -------------------------------------------------------------------------- */
/*                  STATUS BOOKING & PERHITUNGAN RANGE AKTIF                  */
/* -------------------------------------------------------------------------- */

/**
 * Apakah booking ini termasuk "menahan barang" (ikut menghabiskan kuota).
 * @param {object} booking
 * @returns {boolean}
 */
export function isBookingMenahan(booking) {
  const s = booking?.status;
  if (!s) return false;
  return STATUS_MENAHAN_BARANG.includes(s);
}

/**
 * Diberikan satu booking (dan hari referensi `today`), kembalikan rentang
 * efektif yang dipakai untuk perhitungan kuota.
 *
 * Perubahan status `Terlambat`:
 *   - Hari pakai = [mulai, max(selesai, today)]
 *   - Pengecekan = max(selesai + 1, today + 1)
 *
 * @param {object} b        Booking (punya mulai, selesai, status).
 * @param {Date}   today    Tanggal referensi (sudah dinormalisasi).
 * @returns {{ pakaiFrom:Date, pakaiTo:Date, bufFrom:Date, bufTo:Date }}
 */
function getEffectiveRanges(b, today) {
  const mulai = parseDate(b.startDate || b.mulai);
  let selesai = parseDate(b.endDate || b.selesai);
  const terlambat = b.status === STATUS_PEMINJAMAN.TERLAMBAT;

  if (terlambat && cmpDates(selesai, today) < 0) {
    selesai = new Date(today.getTime());
  }

  let bufFrom;
  if (b.bufferStartDate) {
    bufFrom = parseDate(b.bufferStartDate);
  } else {
    bufFrom = addDays(mulai, -1);
  }

  let bufTo;
  if (b.bufferEndDate) {
    bufTo = parseDate(b.bufferEndDate);
  } else {
    bufTo = addDays(selesai, 1);
  }
  if (terlambat && cmpDates(bufTo, addDays(today, 1)) < 0) {
    bufTo = addDays(today, 1);
  }

  return { pakaiFrom: mulai, pakaiTo: selesai, bufFrom, bufTo };
}

/* -------------------------------------------------------------------------- */
/*                               FUNGSI PUBLIK                                */
/* -------------------------------------------------------------------------- */

/**
 * Tanggal mulai PALING AWAL yang bisa diajukan user (hari H + 2).
 * H+1 = hari persiapan OKI, H+2 = earliest tanggal pakai.
 *
 * @param {string|Date} today
 * @returns {string} "YYYY-MM-DD"
 */
export function getEarliestStartDate(today) {
  const t = parseDate(today);
  if (Number.isNaN(t.getTime())) throw new Error('today tidak valid');
  return formatDate(addDays(t, 2));
}

/**
 * Hitung rentang buffer dari suatu pengajuan (tanggal mulai, tanggal selesai)
 * SEBELUM di-mix dengan data booking lain.
 *
 * Ini hanya wrapper sederhana: mengembalikan `{ from: startDate−1,
 * to: endDate+1 }`. Jika pemanggil punya field eksplisit
 * `bufferStartDate / bufferEndDate`, diharapkan yang dikirim ke fungsi
 * validasi range lah yang sudah "termasuk buffer" (artinya lewat parameter
 * ini pemanggil bisa memperkirakan luas buffer sebelum submit).
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {{ from:string, to:string }}
 */
export function getBufferRange(startDate, endDate) {
  const s = parseDate(startDate);
  const e = parseDate(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    throw new Error('tanggal tidak valid');
  }
  return { from: formatDate(addDays(s, -1)), to: formatDate(addDays(e, 1)) };
}

/**
 * Hitung kuota yang TERPAKAI pada satu tanggal `date` (tanpa pengajuan baru).
 * Lihat komentar header untuk rumus `terpakai(d)`.
 *
 * @param {string|Date} date
 * @param {Array<object>} bookings
 * @param {string|Date} today
 * @returns {number} bilangan bulat ≥ 0
 */
export function getCommittedQuota(date, bookings, today) {
  const d = parseDate(date);
  const t = parseDate(today);
  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return 0;
  if (!Array.isArray(bookings)) return 0;

  let sumPakai = 0;
  let maxBufferOnly = 0;

  for (const b of bookings) {
    if (!isBookingMenahan(b)) continue;
    const { pakaiFrom, pakaiTo, bufFrom, bufTo } = getEffectiveRanges(b, t);
    const q = qtyOf(b);
    const diPakai = isInRange(d, pakaiFrom, pakaiTo);
    const diBuffer = isInRange(d, bufFrom, bufTo);
    if (diPakai) {
      sumPakai += q;
    } else if (diBuffer) {
      if (q > maxBufferOnly) maxBufferOnly = q;
    }
  }

  return sumPakai + maxBufferOnly;
}

/**
 * Helper: simulasi `terpakai(d)` JIKA pengajuan baru ikut dimasukkan.
 *
 * `newRange` = `{ start, end, qty }` pengajuan baru.
 *
 * @param {Date} d
 * @param {Array<object>} bookings
 * @param {Date} today
 * @param {{ start:Date, end:Date, qty:number }} newRange
 * @returns {number}
 */
export function simulateQuotaWith(d, bookings, today, newRange) {
  const dObj = parseDate(d);
  const tObj = parseDate(today);
  const start = parseDate(newRange?.start);
  const end = parseDate(newRange?.end);
  const qty = Number(newRange?.qty ?? 1) || 1;

  let sumPakai = 0;
  let maxBufferOnly = 0;

  // --- perhitungan booking existing ---
  for (const b of bookings) {
    if (!isBookingMenahan(b)) continue;
    const { pakaiFrom, pakaiTo, bufFrom, bufTo } = getEffectiveRanges(b, tObj);
    const q = qtyOf(b);
    const diPakai = isInRange(dObj, pakaiFrom, pakaiTo);
    const diBuffer = isInRange(dObj, bufFrom, bufTo);
    if (diPakai) sumPakai += q;
    else if (diBuffer) {
      if (q > maxBufferOnly) maxBufferOnly = q;
    }
  }

  // --- tambahkan pengajuan baru ---
  const baruPakai = isInRange(dObj, start, end);
  const baruHanyaBuffer =
    !baruPakai &&
    (cmpDates(dObj, addDays(start, -1)) === 0 || cmpDates(dObj, addDays(end, 1)) === 0);

  if (baruPakai) {
    sumPakai += qty;
  } else if (baruHanyaBuffer) {
    if (qty > maxBufferOnly) maxBufferOnly = qty;
  }

  return sumPakai + maxBufferOnly;
}

/**
 * Validasi apakah `date` bisa dijadikan tanggal MULAI peminjaman.
 *
 * Alasan disabled:
 *   - `date < earliestStartDate(today)`
 *   - `jumlah > totalBarang` (bahkan sendirian saja muat tidak)
 *   - Pengajuan minimal sehari `(start = end = date)`: ada satu d di
 *     `[date−1, date+1]` yang setelah simulasi melebihi `totalBarang`.
 *
 * @param {string|Date} date
 * @param {Array<object>} bookings
 * @param {{ totalBarang:number, jumlah?:number, today:string|Date }} opt
 * @returns {boolean}
 */
export function isStartDateDisabled(date, bookings, opt) {
  const t = parseDate(opt?.today);
  const d = parseDate(date);
  const totalBarang = Number(opt?.totalBarang);
  const jumlah = Number(opt?.jumlah ?? 1) || 1;

  if (Number.isNaN(d.getTime()) || Number.isNaN(t.getTime())) return true;
  if (!Number.isFinite(totalBarang) || totalBarang <= 0) return true;
  if (jumlah > totalBarang) return true;

  const earliest = parseDate(getEarliestStartDate(t));
  if (cmpDates(d, earliest) < 0) return true;

  const start = d;
  const end = d;
  const lo = addDays(start, -1);
  const hi = addDays(end, 1);

  const activeBookings = Array.isArray(bookings) ? bookings.filter(isBookingMenahan) : [];
  if (activeBookings.length === 0) {
    return false;
  }

  const overlappingBookings = activeBookings.filter((b) => {
    const { bufFrom, bufTo } = getEffectiveRanges(b, t);
    return cmpDates(bufTo, lo) >= 0 && cmpDates(bufFrom, hi) <= 0;
  });

  if (overlappingBookings.length === 0) {
    return false;
  }

  for (let x = new Date(lo.getTime()); cmpDates(x, hi) <= 0; x = addDays(x, 1)) {
    const used = simulateQuotaWith(x, overlappingBookings, t, { start, end, qty: jumlah });
    if (used > totalBarang) return true;
  }
  return false;
}

/**
 * Apakah suatu tanggal dapat dijadikan tanggal MULAI peminjaman.
 * Mendukung pemanggilan posisional:
 *   canStartOn(bookings, totalBarang, jumlah, startISO, todayISO)
 * maupun signature objek opsi:
 *   canStartOn(date, bookings, { totalBarang, jumlah, today })
 *
 * @param {Array<object>|string|Date} arg1
 * @param {number|Array<object>} arg2
 * @param {number|object} arg3
 * @param {string|Date} [arg4]
 * @param {string|Date} [arg5]
 * @returns {boolean}
 */
export function canStartOn(arg1, arg2, arg3, arg4, arg5) {
  if (Array.isArray(arg1)) {
    const bookings = arg1;
    const totalBarang = arg2;
    const jumlah = arg3;
    const date = arg4;
    const today = arg5;
    return !isStartDateDisabled(date, bookings, { totalBarang, jumlah, today });
  }

  const date = arg1;
  const bookings = arg2;
  const opt = arg3;
  return !isStartDateDisabled(date, bookings, opt);
}

/**
 * Classificeert een kalenderdag met vaste prioriteit: verleden, buiten bereik,
 * volle quota, buffer en vrij. Zo blijft de tooltip deterministisch.
 *
 * @param {string} dayISO
 * @param {{bookings?: Array<object>, totalBarang:number, jumlahPinjam?:number,
 *   jumlah?:number, today:string|Date, phase?:'start'|'end'|'done',
 *   start?:string|null}} ctx
 * @returns {{status:string, reason:string, sisa:number}}
 */
export function getDayStatus(dayISO, ctx = {}) {
  const total = Number(ctx.totalBarang);
  const jumlah = Number(ctx.jumlahPinjam ?? ctx.jumlah ?? 1) || 1;
  const bookings = Array.isArray(ctx.bookings) ? ctx.bookings : [];
  const today = ctx.today;
  const committed = getCommittedQuota(dayISO, bookings, today);
  const sisa = Math.max(0, total - committed);
  if (dayISO < getEarliestStartDate(today)) {
    return { status: 'past', reason: 'Kurang dari H+2', sisa, disabled: true };
  }
  if (ctx.phase === 'end' && ctx.start) {
    if (dayISO < ctx.start) {
      return {
        status: 'out_of_range',
        reason: 'Tanggal kembali tidak boleh sebelum tanggal mulai',
        sisa,
        disabled: true,
      };
    }
    const max =
      ctx.maxEndDate !== undefined
        ? ctx.maxEndDate
        : getMaxEndDate(ctx.start, bookings, { totalBarang: total, jumlah, today });
    if (max === null || (max !== Infinity && dayISO > max)) {
      return {
        status: 'out_of_range',
        reason: 'Melewati batas: bentrok dengan peminjaman berikutnya',
        sisa,
        disabled: true,
      };
    }
  }
  const day = parseDate(dayISO);
  const bufferPrep = [];
  const bufferCheck = [];
  for (const booking of bookings) {
    if (!isBookingMenahan(booking)) continue;
    const ranges = getEffectiveRanges(booking, parseDate(today));
    if (dayISO === formatDate(addDays(ranges.pakaiFrom, -1))) bufferPrep.push(booking);
    if (dayISO === formatDate(addDays(ranges.pakaiTo, 1))) bufferCheck.push(booking);
  }
  const options = { totalBarang: total, jumlah, today };
  const unavailable =
    ctx.phase === 'end' && ctx.start
      ? isEndDateDisabled(dayISO, ctx.start, bookings, options)
      : isStartDateDisabled(dayISO, bookings, options);

  if (unavailable) {
    if (sisa > 0 && sisa < jumlah) {
      return {
        status: 'full',
        reason: `Sisa ${sisa} unit, kurang dari ${jumlah} unit yang diajukan.`,
        sisa,
        disabled: true,
      };
    }
    const bookingPakai = bookings.find((item) => {
      if (!isBookingMenahan(item)) return false;
      const ranges = getEffectiveRanges(item, parseDate(today));
      return isInRange(day, ranges.pakaiFrom, ranges.pakaiTo);
    });
    if (bookingPakai) {
      const isDiajukan =
        bookingPakai.status === STATUS_PEMINJAMAN.DIAJUKAN ||
        bookingPakai.status === 'menunggu_persetujuan';
      const reason = isDiajukan
        ? 'Sedang diajukan peminjam lain (menunggu persetujuan)'
        : `Dipinjam ${formatDate(getEffectiveRanges(bookingPakai, parseDate(today)).pakaiFrom)} - ${formatDate(getEffectiveRanges(bookingPakai, parseDate(today)).pakaiTo)}`;
      return { status: 'full', reason, sisa, disabled: true };
    }
    if (bufferPrep.length) {
      return {
        status: 'buffer_prep',
        reason: 'Hari persiapan peminjam lain',
        sisa,
        disabled: true,
      };
    }
    if (bufferCheck.length) {
      return {
        status: 'buffer_check',
        reason: 'Hari pengecekan peminjam lain',
        sisa,
        disabled: true,
      };
    }
    return { status: 'full', reason: 'Kuota atau buffer tidak tersedia', sisa, disabled: true };
  }

  if (bufferPrep.length) {
    return {
      status: 'buffer_prep',
      reason:
        sisa < total
          ? `Hari persiapan (Sisa ${sisa} dari ${total} unit)`
          : 'Hari persiapan peminjam lain',
      sisa,
      disabled: false,
    };
  }
  if (bufferCheck.length) {
    return {
      status: 'buffer_check',
      reason:
        sisa < total
          ? `Hari pengecekan (Sisa ${sisa} dari ${total} unit)`
          : 'Hari pengecekan peminjam lain',
      sisa,
      disabled: false,
    };
  }
  if (committed > 0) {
    return { status: 'partial', reason: `Sisa ${sisa} dari ${total} unit`, sisa, disabled: false };
  }
  return { status: 'free', reason: `Sisa ${sisa} unit`, sisa, disabled: false };
}

/**
 * Validasi apakah `date` bisa dijadikan tanggal SELESAI peminjaman.
 *
 * @param {string|Date} date
 * @param {string|Date} startDate
 * @param {Array<object>} bookings
 * @param {{ totalBarang:number, jumlah?:number, today:string|Date }} opt
 * @returns {boolean}
 */
export function isEndDateDisabled(date, startDate, bookings, opt) {
  const t = parseDate(opt?.today);
  const start = parseDate(startDate);
  const end = parseDate(date);
  const totalBarang = Number(opt?.totalBarang);
  const jumlah = Number(opt?.jumlah ?? 1) || 1;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(t.getTime()))
    return true;
  if (!Number.isFinite(totalBarang) || totalBarang <= 0) return true;
  if (cmpDates(end, start) < 0) return true;
  if (jumlah > totalBarang) return true;
  if (cmpDates(end, addDays(start, MAX_HORIZON_DAYS)) > 0) return true;

  const activeBookings = Array.isArray(bookings) ? bookings.filter(isBookingMenahan) : [];
  if (activeBookings.length === 0) {
    return false;
  }

  const lo = addDays(start, -1);
  const hi = addDays(end, 1);

  const overlappingBookings = activeBookings.filter((b) => {
    const { bufFrom, bufTo } = getEffectiveRanges(b, t);
    return cmpDates(bufTo, lo) >= 0 && cmpDates(bufFrom, hi) <= 0;
  });

  if (overlappingBookings.length === 0) {
    return false;
  }

  for (let x = new Date(lo.getTime()); cmpDates(x, hi) <= 0; x = addDays(x, 1)) {
    const used = simulateQuotaWith(x, overlappingBookings, t, { start, end, qty: jumlah });
    if (used > totalBarang) return true;
  }
  return false;
}

/**
 * Cari "selesai terbesar" yang valid untuk pengajuan dengan `startDate` yang
 * sudah ditentukan.
 *
 * Strategi: mulai dari `startDate`, coba perpanjang sampai menemukan hari
 * yang pertama kalinya gagal. Nilai `end` sebelumnya adalah batas maksimum.
 *
 * Nilai kembalian:
 *   - `null`       → `startDate` TIDAK VALID (jumlah > totalBarang, start <
 *                    H+2, atau input tidak valid). UI harus mencegah pemilih
 *                    selesai sebelum start diperbaiki.
 *   - `Infinity`   → tanpa batas (MAX_HORIZON_DAYS ke depan masih muat). UI
 *                    boleh memberikan batas kalender sendiri.
 *   - string tanggal → selesai terbesar yang valid (YYYY-MM-DD). Hari
 *                    setelahnya pasti gagal.
 *
 * @param {string|Date} startDate
 * @param {Array<object>} bookings
 * @param {{ totalBarang:number, jumlah?:number, today:string|Date }} opt
 * @returns {string|number|null} (tanggal | Infinity | null)
 */
export function getMaxEndDate(startDate, bookings, opt) {
  const t = parseDate(opt?.today);
  const start = parseDate(startDate);
  const totalBarang = Number(opt?.totalBarang);
  const jumlah = Number(opt?.jumlah ?? 1) || 1;

  if (Number.isNaN(start.getTime()) || Number.isNaN(t.getTime())) return null;
  if (!Number.isFinite(totalBarang) || totalBarang <= 0) return null;
  if (jumlah > totalBarang) return null;

  if (isStartDateDisabled(start, bookings, { totalBarang, jumlah, today: t })) {
    return null;
  }

  const activeBookings = Array.isArray(bookings) ? bookings.filter(isBookingMenahan) : [];
  if (activeBookings.length === 0) {
    return Infinity;
  }

  // Filter booking yang buffer-nya setidaknya menyentuh rentang pengajuan
  const relevantBookings = activeBookings.filter((b) => {
    const { bufTo } = getEffectiveRanges(b, t);
    return cmpDates(bufTo, addDays(start, -1)) >= 0;
  });
  if (relevantBookings.length === 0) {
    return Infinity;
  }

  let end = new Date(start.getTime());
  let lastValid = null;

  // Verifikasi hari pertama (start = end)
  if (isEndDateDisabled(start, start, relevantBookings, { totalBarang, jumlah, today: t })) {
    return null;
  }
  lastValid = new Date(start.getTime());

  // Secara bertahap perpanjang end sampai batas horizon MAX_HORIZON_DAYS.
  // Optimasi inkremental: hari-hari [start-1, end-1] sudah valid di iterasi sebelumnya;
  // cukup validasi hari end (berubah ke hari pakai) dan hari end+1 (buffer baru).
  for (let i = 1; i < MAX_HORIZON_DAYS; i++) {
    end = addDays(start, i);
    const rangeOpt = { start, end, qty: jumlah };
    const usedEnd = simulateQuotaWith(end, relevantBookings, t, rangeOpt);
    if (usedEnd > totalBarang) {
      break;
    }
    const usedBuffer = simulateQuotaWith(addDays(end, 1), relevantBookings, t, rangeOpt);
    if (usedBuffer > totalBarang) {
      break;
    }
    lastValid = new Date(end.getTime());
  }

  if (!lastValid) return null;
  // Kalau sampai batas horizon masih valid → tanpa batas (return Infinity).
  if (cmpDates(lastValid, addDays(start, MAX_HORIZON_DAYS - 1)) >= 0) return Infinity;
  return formatDate(lastValid);
}

/**
 * Validasi penuh rentang `[startDate, endDate]`.
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {Array<object>} bookings
 * @param {{ totalBarang:number, jumlah?:number, today:string|Date }} opt
 * @returns {{ ok:boolean, reason?:string }}
 */
export function isRangeAvailable(startDate, endDate, bookings, opt) {
  const t = parseDate(opt?.today);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const totalBarang = Number(opt?.totalBarang);
  const jumlah = Number(opt?.jumlah ?? 1) || 1;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(t.getTime())) {
    return { ok: false, reason: 'Format tanggal tidak valid.' };
  }
  if (!Number.isFinite(totalBarang) || totalBarang <= 0) {
    return { ok: false, reason: 'Total barang tidak valid.' };
  }
  if (cmpDates(end, start) < 0) {
    return { ok: false, reason: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' };
  }

  const earliest = parseDate(getEarliestStartDate(t));
  if (cmpDates(start, earliest) < 0) {
    return {
      ok: false,
      reason: `Tanggal mulai paling awal adalah ${formatDate(earliest)} (minimal H+2 dari hari ini).`,
    };
  }
  if (jumlah > totalBarang) {
    return {
      ok: false,
      reason: `Jumlah pinjam (${jumlah}) melebihi total barang yang tersedia (${totalBarang}).`,
    };
  }
  if (cmpDates(end, addDays(start, MAX_HORIZON_DAYS)) > 0) {
    return {
      ok: false,
      reason: `Rentang peminjaman melebihi batas horizon maksimum (${MAX_HORIZON_DAYS} hari).`,
    };
  }

  const activeBookings = Array.isArray(bookings) ? bookings.filter(isBookingMenahan) : [];
  if (activeBookings.length === 0) {
    return { ok: true };
  }

  const lo = addDays(start, -1);
  const hi = addDays(end, 1);

  const overlappingBookings = activeBookings.filter((b) => {
    const { bufFrom, bufTo } = getEffectiveRanges(b, t);
    return cmpDates(bufTo, lo) >= 0 && cmpDates(bufFrom, hi) <= 0;
  });

  if (overlappingBookings.length === 0) {
    return { ok: true };
  }

  for (let x = new Date(lo.getTime()); cmpDates(x, hi) <= 0; x = addDays(x, 1)) {
    const committed = getCommittedQuota(x, overlappingBookings, t);
    const after = simulateQuotaWith(x, overlappingBookings, t, { start, end, qty: jumlah });
    if (after > totalBarang) {
      const tersisa = Math.max(0, totalBarang - committed);
      return {
        ok: false,
        reason: `Tanggal ${formatDate(x)} melebihi kuota barang. Tersedia ${tersisa} dari ${totalBarang}, pengajuan membutuhkan ${jumlah}.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Memeriksa apakah rentang tanggal yang sudah dipilih masih valid
 * dengan konteks inventaris, kuota, atau jumlah pinjam baru.
 *
 * @param {{ startDate?: string|null, endDate?: string|null }|null} value
 * @param {{ bookings?: Array<object>, totalBarang?: number, jumlahPinjam?: number, jumlah?: number, today?: string|Date }} ctx
 * @returns {boolean}
 */
export function isRangeStillValid(value, ctx = {}) {
  if (!value?.startDate || !value?.endDate) return true;
  const jumlah = Number(ctx.jumlahPinjam ?? ctx.jumlah ?? 1) || 1;
  const totalBarang = Number(ctx.totalBarang);
  const check = isRangeAvailable(value.startDate, value.endDate, ctx.bookings || [], {
    totalBarang,
    jumlah,
    today: ctx.today,
  });
  return Boolean(check.ok);
}

/**
 * Helper internal untuk menghitung jumlah unit peminjaman aktif yang memakai tanggal d
 * sebagai HARI PAKAI (tidak termasuk hari buffer).
 *
 * @param {Date} d
 * @param {Array<object>} bookings
 * @param {Date} today
 * @returns {number}
 */
function getCommittedPakaiOnly(d, bookings, today) {
  let sum = 0;
  for (const b of bookings) {
    if (!isBookingMenahan(b)) continue;
    const { pakaiFrom, pakaiTo } = getEffectiveRanges(b, today);
    if (isInRange(d, pakaiFrom, pakaiTo)) {
      sum += qtyOf(b);
    }
  }
  return sum;
}

/**
 * Hitung jumlah unit terbesar yang masih valid untuk seluruh rentang [startISO − 1, endISO + 1].
 * Konsisten dengan aturan kuota (q valid jika dan hanya jika q <= getMaxUnitsForRange).
 *
 * @param {string|Date} startISO
 * @param {string|Date} endISO
 * @param {{ bookings?: Array<object>, totalBarang: number, today?: string|Date }} [ctx]
 * @returns {number} Jumlah unit maksimum yang tersedia (0 jika rentang tidak valid sama sekali).
 */
export function getMaxUnitsForRange(startISO, endISO, ctx = {}) {
  const t = parseDate(ctx?.today);
  const start = parseDate(startISO);
  const end = parseDate(endISO);
  const total = Number(ctx?.totalBarang);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(t.getTime())) {
    return 0;
  }
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (cmpDates(end, start) < 0) return 0;

  const earliest = parseDate(getEarliestStartDate(t));
  if (cmpDates(start, earliest) < 0) return 0;

  const activeBookings = Array.isArray(ctx?.bookings) ? ctx.bookings.filter(isBookingMenahan) : [];
  if (activeBookings.length === 0) return total;

  let maxUnits = total;
  const lo = addDays(start, -1);
  const hi = addDays(end, 1);

  const overlappingBookings = activeBookings.filter((b) => {
    const { bufFrom, bufTo } = getEffectiveRanges(b, t);
    return cmpDates(bufTo, lo) >= 0 && cmpDates(bufFrom, hi) <= 0;
  });

  if (overlappingBookings.length === 0) return total;

  for (let x = new Date(lo.getTime()); cmpDates(x, hi) <= 0; x = addDays(x, 1)) {
    const isPakai = isInRange(x, start, end);
    let limit;
    if (isPakai) {
      const committed = getCommittedQuota(x, overlappingBookings, t);
      limit = total - committed;
    } else {
      const pakaiOnly = getCommittedPakaiOnly(x, overlappingBookings, t);
      limit = total - pakaiOnly;
    }
    if (limit < maxUnits) {
      maxUnits = limit;
    }
  }

  return Math.max(0, maxUnits);
}
