/**
 * kelola-kategori.js — Logika murni daftar, pencarian, pengurutan, dan paginasi kategori (V4a).
 * Fungsi murni, bebas DOM dan efek samping, aman untuk unit test node:test.
 */

import { paginate as paginateKatalog, buildPageList } from './katalog.js';
export { buildPageList };

export const KELOLA_KATEGORI_DEFAULTS = Object.freeze({
  PAGE: 1,
  PER_PAGE: 10,
});

/**
 * Filter daftar kategori berdasarkan kata kunci pencarian nama.
 * Pencarian cocok sebagian, case-insensitive, dan mengabaikan spasi di tepi.
 *
 * @param {Array<{ idKategori: string, namaKategori: string, totalBarang?: number }>} items
 * @param {{ cari?: string }} [options]
 * @returns {Array<object>}
 */
export function filterKategori(items = [], { cari = '' } = {}) {
  if (!Array.isArray(items)) return [];

  const q = typeof cari === 'string' ? cari.trim().toLowerCase() : '';
  if (!q) {
    return [...items];
  }

  return items.filter((k) => {
    const nama = typeof k?.namaKategori === 'string' ? k.namaKategori.toLowerCase() : '';
    return nama.includes(q);
  });
}

/**
 * Urutkan daftar kategori.
 * Default: menurut abjad nama kategori secara menaik (A-Z).
 *
 * @param {Array<object>} items
 * @param {{ arah?: 'asc'|'desc', kriteria?: 'nama'|'total' }} [options]
 * @returns {Array<object>}
 */
export function sortKategori(items = [], { arah = 'asc', kriteria = 'nama' } = {}) {
  if (!Array.isArray(items)) return [];
  const hasil = [...items];

  hasil.sort((a, b) => {
    if (kriteria === 'total') {
      const totA = Number(a?.totalBarang || 0);
      const totB = Number(b?.totalBarang || 0);
      return arah === 'desc' ? totB - totA : totA - totB;
    }

    // Default urutan abjad nama
    const namaA = String(a?.namaKategori || '');
    const namaB = String(b?.namaKategori || '');
    const cmp = namaA.localeCompare(namaB, 'id', { sensitivity: 'base' });
    return arah === 'desc' ? -cmp : cmp;
  });

  return hasil;
}

/**
 * Hitung jumlah barang inventaris yang menggunakan kategori tertentu.
 * Menghitung seluruh barang di daftar inventaris yang memiliki idKategori cocok.
 *
 * @param {string} kategoriId
 * @param {Array<{ idKategori?: string }>} [inventarisList]
 * @returns {number}
 */
export function hitungPenggunaan(kategoriId, inventarisList = []) {
  if (!kategoriId || !Array.isArray(inventarisList)) return 0;
  const targetId = String(kategoriId);

  return inventarisList.reduce((acc, item) => {
    if (item && String(item.idKategori) === targetId) {
      return acc + 1;
    }
    return acc;
  }, 0);
}

/**
 * Paginasi daftar kategori (default 10 item per halaman).
 *
 * @param {Array<object>} items
 * @param {number|string} [page=1]
 * @param {number|string} [perPage=10]
 * @returns {{ items: Array<object>, page: number, totalPages: number, total: number, perPage: number }}
 */
export function paginateKategori(
  items = [],
  page = KELOLA_KATEGORI_DEFAULTS.PAGE,
  perPage = KELOLA_KATEGORI_DEFAULTS.PER_PAGE
) {
  const res = paginateKatalog(items, page, perPage);
  return {
    items: res.items,
    page: res.halaman,
    totalPages: res.totalHalaman,
    total: res.total,
    perPage: res.perHalaman,
  };
}
