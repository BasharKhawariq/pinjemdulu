/**
 * Fungsi murni untuk Kelola Inventaris (Task #9a).
 * TANPA dependensi React / Axios / mock.
 *
 * Fungsi disimpan terpisah agar mudah diuji node:test secara deterministik
 * dan dipakai ulang oleh service mock / non-mock serta komponen UI.
 */

import { STATUS_MENAHAN_BARANG } from './constants.js';
import { getCommittedQuota, MAX_HORIZON_DAYS } from './date-rules.js';
import { dateToISO, isoToDate } from './format.js';
import { normalizeKondisi } from './kondisi.js';

function addDaysToISO(isoStr, n) {
  const d = isoToDate(isoStr);
  if (!d) return isoStr;
  d.setDate(d.getDate() + Number(n || 0));
  return dateToISO(d) ?? isoStr;
}
function addDaysToDate(date, n) {
  if (!(date instanceof Date)) return new Date();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + Number(n || 0));
  return d;
}

/* ========================================================================== */
/* 1. filterInventaris                                                        */
/* ========================================================================== */

/**
 * Filter daftar inventaris dengan kriteria gabung (AND).
 *
 * @param {Array<object>} items     daftar inventaris (bentuk inventaris mock)
 * @param {{
 *   q?: string,
 *   kategori?: string|null,
 *   kondisi?: string|null,
 *   status?: 'tersedia'|'dipinjam'|null,
 * }} filters
 * @returns {Array<object>}
 */
export function filterInventaris(items, filters = {}) {
  if (!Array.isArray(items)) return [];
  const { q, kategori, kondisi, status } = filters;

  const qClean = typeof q === 'string' ? q.trim().toLowerCase() : '';
  const kategoriClean = typeof kategori === 'string' && kategori.length > 0 ? kategori : null;
  const kondisiClean = normalizeKondisi(kondisi);
  const kondisiInvalid = typeof kondisi === 'string' && kondisi.trim().length > 0 && !kondisiClean;
  const statusClean =
    typeof status === 'string' && (status === 'tersedia' || status === 'dipinjam') ? status : null;

  return items.filter((it) => {
    if (kondisiInvalid) return false;
    if (qClean) {
      const nama = typeof it?.namaBarang === 'string' ? it.namaBarang.toLowerCase() : '';
      if (!nama.includes(qClean)) return false;
    }
    if (kategoriClean) {
      if (it.idKategori !== kategoriClean && it.namaKategori !== kategoriClean) return false;
    }
    if (kondisiClean) {
      if (normalizeKondisi(it.kondisi) !== kondisiClean) return false;
    }
    if (statusClean) {
      const sisa = Number(it?.sisaHariIni ?? 0) || 0;
      const sekarangTersedia = sisa > 0;
      if (statusClean === 'tersedia' && !sekarangTersedia) return false;
      if (statusClean === 'dipinjam' && sekarangTersedia) return false;
    }
    return true;
  });
}

/* ========================================================================== */
/* 2. countActiveFilters                                                      */
/* ========================================================================== */

/**
 * Hitung jumlah kelompok filter yang terisi (kategori, kondisi, status).
 * Dipakai untuk badge pada tombol ikon filter.
 *
 * @param {{ kategori?: string|null, kondisi?: string|null, status?: string|null }} param0
 * @returns {number} 0..3
 */
export function countActiveFilters({ kategori, kondisi, status } = {}) {
  let n = 0;
  if (typeof kategori === 'string' && kategori.length > 0) n++;
  if (typeof kondisi === 'string' && kondisi.length > 0) n++;
  if (typeof status === 'string' && status.length > 0) n++;
  return n;
}

/* ========================================================================== */
/* 3. paginate                                                                 */
/* ========================================================================== */

/**
 * Potong array menjadi halaman, koreksi `page` ke rentang valid.
 *
 * @template T
 * @param {Array<T>} items
 * @param {number} page
 * @param {number} perPage
 * @returns {{ items: Array<T>, page: number, totalPages: number }}
 */
export function paginate(items, page = 1, perPage = 10) {
  if (!Array.isArray(items)) return { items: [], page: 1, totalPages: 0 };
  const total = items.length;
  const per = Number.isFinite(+perPage) && +perPage >= 1 ? Math.floor(+perPage) : 10;
  const totalPages = total === 0 ? 0 : Math.ceil(total / per);
  let p = Number.isFinite(+page) ? Math.floor(+page) : 1;
  if (!Number.isFinite(p) || p < 1) p = 1;
  if (totalPages > 0 && p > totalPages) p = totalPages;
  const start = (p - 1) * per;
  const end = start + per;
  return { items: items.slice(start, end), page: p, totalPages };
}

/* ========================================================================== */
/* 4. hasActiveBookings                                                        */
/* ========================================================================== */

/**
 * Apakah inventaris `idInventaris` memiliki booking yang status-nya
 * terdaftar di STATUS_MENAHAN_BARANG (dihitung ikut menahan kuota).
 *
 * @param {string} idInventaris
 * @param {Array<{idInventaris?: string, status?: string}>} bookings
 * @returns {boolean}
 */
export function hasActiveBookings(idInventaris, bookings = []) {
  if (typeof idInventaris !== 'string' || idInventaris.length === 0) return false;
  if (!Array.isArray(bookings) || bookings.length === 0) return false;
  const menahan = new Set(Array.isArray(STATUS_MENAHAN_BARANG) ? STATUS_MENAHAN_BARANG : []);
  for (const b of bookings) {
    if (b == null) continue;
    if (b.idInventaris !== idInventaris) continue;
    if (menahan.has(b.status)) return true;
  }
  return false;
}

/* ========================================================================== */
/* 5. getMinTotalBarang                                                        */
/* ========================================================================== */

/**
 * Jumlah unit minimum inventaris yang TIDAK BOLEH dikurangi di bawahnya
 * karena sudah terikat peminjaman aktif/terjadwal.
 *
 * Punca `terpakai(d)` mulai `today` sampai `today + MAX_HORIZON_DAYS - 1`
 * menggunakan `getCommittedQuota` dari date-rules.js (TIDAK menduplikasi
 * rumus kuota).
 *
 * Untuk barag tanpa booking yang menahan → 0.
 *
 * @param {string} idInventaris         (untuk konsistensi API, diabaikan di hitungan)
 * @param {Array<object>} bookings      daftar booking secara umum (tidak difilter idInventaris dulu)
 * @param {string|Date} today
 * @returns {number} bilangan bulat ≥ 0
 */
export function getMinTotalBarang(idInventaris, bookings = [], today) {
  if (!Array.isArray(bookings) || bookings.length === 0) return 0;

  // Filter booking: yang idInventaris cocok DAN status menahan.
  const menahan = new Set(Array.isArray(STATUS_MENAHAN_BARANG) ? STATUS_MENAHAN_BARANG : []);
  const bs = bookings.filter((b) => {
    if (b == null) return false;
    if (typeof idInventaris === 'string' && idInventaris.length > 0) {
      if (b.idInventaris !== idInventaris) return false;
    }
    return menahan.has(b.status);
  });

  if (bs.length === 0) return 0;

  let peak = 0;
  for (let i = 0; i < MAX_HORIZON_DAYS; i++) {
    const iso =
      typeof today === 'string' ? addDaysToISO(today, i) : dateToISO(addDaysToDate(today, i));
    if (!iso) continue;
    const terpakai = getCommittedQuota(iso, bs, today);
    if (terpakai > peak) peak = terpakai;
  }
  return peak;
}
