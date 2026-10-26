/**
 * kelola-inventaris.js — Logika murni untuk halaman Kelola Inventaris PJ (V3).
 * Bebas efek samping dan DOM, cocok untuk runner node:test.
 */

import { normalizeKondisi } from './kondisi.js';
import { paginate as paginateKatalog, buildPageList } from './katalog.js';
export { buildPageList };

export const KELOLA_DEFAULTS = Object.freeze({
  PAGE: 1,
  PER_PAGE: 10,
});

/**
 * Filter daftar inventaris untuk Kelola Inventaris (PJ).
 *
 * @param {Array<object>} items
 * @param {{
 *   cari?: string,
 *   q?: string,
 *   kategoriIds?: Array<string>|string|null,
 *   kategori?: string|null,
 *   kondisi?: string|null,
 *   status?: 'tersedia'|'dipinjam'|string|null
 * }} options
 * @returns {Array<object>}
 */
export function filterKelolaInventaris(items = [], options = {}) {
  if (!Array.isArray(items)) return [];

  const {
    cari = '',
    q = '',
    kategoriIds = [],
    kategori = null,
    kondisi = null,
    status = null,
  } = options;

  const keyword = typeof cari === 'string' && cari.trim().length > 0
    ? cari.trim().toLowerCase()
    : typeof q === 'string' && q.trim().length > 0
      ? q.trim().toLowerCase()
      : '';

  // Normalisasi kategori: bisa berupa array kategoriIds atau single string kategori/kategoriIds
  let catList = [];
  if (Array.isArray(options.kategoriIds) && options.kategoriIds.length > 0) {
    catList = options.kategoriIds.filter((k) => typeof k === 'string' && k.trim().length > 0);
  } else if (typeof options.kategoriIds === 'string' && options.kategoriIds.trim().length > 0) {
    catList = [options.kategoriIds.trim()];
  } else if (typeof options.kategori === 'string' && options.kategori.trim().length > 0) {
    catList = [options.kategori.trim()];
  }
  const catSet = catList.length > 0 ? new Set(catList) : null;

  // Kondisi
  const normalizedKondisi = normalizeKondisi(kondisi);
  const isKondisiInvalid = typeof kondisi === 'string' && kondisi.trim().length > 0 && !normalizedKondisi;

  // Status
  const statusClean = typeof status === 'string' && (status === 'tersedia' || status === 'dipinjam')
    ? status
    : null;

  return items.filter((item) => {
    if (!item) return false;
    if (isKondisiInvalid) return false;

    // 1. Cari Nama Barang
    if (keyword) {
      const nama = typeof item.namaBarang === 'string' ? item.namaBarang.toLowerCase() : '';
      if (!nama.includes(keyword)) return false;
    }

    // 2. Kategori (multi-pilih OR)
    if (catSet) {
      const idKat = item.idKategori || '';
      const namaKat = item.namaKategori || '';
      if (!catSet.has(idKat) && !catSet.has(namaKat)) {
        return false;
      }
    }

    // 3. Kondisi (baik / rusak)
    if (normalizedKondisi) {
      if (normalizeKondisi(item.kondisi) !== normalizedKondisi) {
        return false;
      }
    }

    // 4. Status (tersedia / dipinjam)
    if (statusClean) {
      const sisa = Number(item.sisaHariIni ?? item.totalBarang ?? 0) || 0;
      const sekarangTersedia = sisa > 0;
      if (statusClean === 'tersedia' && !sekarangTersedia) return false;
      if (statusClean === 'dipinjam' && sekarangTersedia) return false;
    }

    return true;
  });
}

/**
 * Hitung jumlah filter yang sedang aktif (0..3).
 * @param {{ kategori?: string|null, kategoriIds?: Array<string>|string|null, kondisi?: string|null, status?: string|null }} param0
 * @returns {number}
 */
export function countActiveFilters({ kategori, kategoriIds, kondisi, status } = {}) {
  let count = 0;

  const hasCat =
    (Array.isArray(kategoriIds) && kategoriIds.length > 0) ||
    (typeof kategoriIds === 'string' && kategoriIds.trim().length > 0) ||
    (typeof kategori === 'string' && kategori.trim().length > 0);
  if (hasCat) count++;

  if (typeof kondisi === 'string' && kondisi.trim().length > 0) count++;
  if (typeof status === 'string' && status.trim().length > 0) count++;

  return count;
}

/**
 * Urutan default kelola inventaris.
 * @param {Array<object>} items
 * @returns {Array<object>}
 */
export function sortKelola(items = []) {
  if (!Array.isArray(items)) return [];
  return [...items];
}

/**
 * Paginasi untuk kelola inventaris (10 per halaman).
 *
 * @param {Array<object>} items
 * @param {number|string} [page=1]
 * @param {number|string} [perPage=10]
 * @returns {{ items: Array<object>, page: number, totalPages: number, total: number, perPage: number }}
 */
export function paginateKelola(items = [], page = KELOLA_DEFAULTS.PAGE, perPage = KELOLA_DEFAULTS.PER_PAGE) {
  const res = paginateKatalog(items, page, perPage);
  return {
    items: res.items,
    page: res.halaman,
    totalPages: res.totalHalaman,
    total: res.total,
    perPage: res.perHalaman,
  };
}

// Re-export filterInventaris & paginate untuk kompatibilitas
export const filterInventaris = filterKelolaInventaris;
export const paginate = paginateKelola;
