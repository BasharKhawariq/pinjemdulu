/**
 * katalog.js — Logika murni filter, pencarian, dan paginasi katalog inventaris.
 * Murni tanpa dependensi DOM, cocok untuk pengujian node:test.
 */

import { normalizeKondisi } from './kondisi.js';

export const KATALOG_DEFAULTS = Object.freeze({
  PAGE: 1,
  LIMIT: 8,
});

/**
 * Filter daftar inventaris berdasarkan kata kunci nama, daftar kategori (OR), dan daftar OKI (OR).
 * Antar jenis filter berlaku logika AND.
 *
 * @param {Array<object>} items
 * @param {{ cari?: string, kategoriIds?: Array<string>, okiIds?: Array<string> }} options
 * @returns {Array<object>}
 */
export function filterInventaris(items = [], { cari = '', kategoriIds = [], okiIds = [] } = {}) {
  if (!Array.isArray(items)) return [];

  // 0. Filter barang rusak (tidak muncul di katalog)
  let result = items.filter((item) => normalizeKondisi(item?.kondisi) !== 'rusak');

  // 1. Pencarian teks pada nama barang (case-insensitive, abaikan spasi tepi)
  const q = typeof cari === 'string' ? cari.trim().toLowerCase() : '';
  if (q) {
    result = result.filter((item) => {
      const nama = typeof item?.namaBarang === 'string' ? item.namaBarang.toLowerCase() : '';
      return nama.includes(q);
    });
  }

  // 2. Filter Kategori (multi-pilih: item harus masuk salah satu kategori yang dipilih)
  const cats = Array.isArray(kategoriIds)
    ? kategoriIds.filter((k) => typeof k === 'string' && k.trim().length > 0)
    : [];
  if (cats.length > 0) {
    const catSet = new Set(cats);
    result = result.filter((item) => {
      const idKat = item?.idKategori || item?.kategori?.idKategori || '';
      return catSet.has(idKat);
    });
  }

  // 3. Filter OKI / Organisasi (multi-pilih: item harus masuk salah satu OKI yang dipilih)
  const okis = Array.isArray(okiIds)
    ? okiIds.filter((o) => typeof o === 'string' && o.trim().length > 0)
    : [];
  if (okis.length > 0) {
    const okiSet = new Set(okis);
    result = result.filter((item) => {
      const idOki = item?.idOrganisasi || item?.organisasi?.idOrganisasi || '';
      return okiSet.has(idOki);
    });
  }

  return result;
}

/**
 * Paginasi daftar item inventaris dengan normalisasi nomor halaman.
 *
 * @param {Array<object>} items
 * @param {number|string} [halaman=1]
 * @param {number|string} [perHalaman=8]
 * @returns {{ items: Array<object>, halaman: number, totalHalaman: number, total: number, perHalaman: number }}
 */
export function paginate(items = [], halaman = KATALOG_DEFAULTS.PAGE, perHalaman = KATALOG_DEFAULTS.LIMIT) {
  const safeItems = Array.isArray(items) ? items : [];
  const total = safeItems.length;

  const lim = Number.isInteger(+perHalaman) && +perHalaman > 0 ? Math.floor(+perHalaman) : KATALOG_DEFAULTS.LIMIT;
  const totalHalaman = Math.max(1, Math.ceil(total / lim));

  let pageNum = Number.isInteger(+halaman) && +halaman > 0 ? Math.floor(+halaman) : 1;
  if (pageNum > totalHalaman) {
    pageNum = totalHalaman;
  }
  if (pageNum < 1) {
    pageNum = 1;
  }

  const start = (pageNum - 1) * lim;
  const sliced = safeItems.slice(start, start + lim);

  return {
    items: sliced,
    halaman: pageNum,
    totalHalaman,
    total,
    perHalaman: lim,
  };
}

/**
 * Membangun array nomor halaman dengan elipsis ('…') sesuai acuan Pagination Next.js.
 * Menampilkan halaman pertama, halaman terakhir, dan halaman di sekitar halaman aktif.
 *
 * @param {number} halaman
 * @param {number} totalHalaman
 * @returns {Array<number|string>}
 */
export function buildPageList(halaman = 1, totalHalaman = 1) {
  const max = Math.max(1, Math.floor(+totalHalaman) || 1);
  const cur = Math.max(1, Math.min(Math.floor(+halaman) || 1, max));

  if (max <= 1) return [1];

  const pages = [];
  const range = 1; // jangkauan sekitar halaman aktif (±1)
  for (let i = 1; i <= max; i++) {
    const isBoundary = i === 1 || i === max;
    const isNear = Math.abs(i - cur) <= range;
    if (isBoundary || isNear) {
      pages.push(i);
    }
  }

  const withEllipsis = [];
  let prev = 0;
  for (const p of pages) {
    if (prev > 0 && p - prev > 1) {
      withEllipsis.push('…');
    }
    withEllipsis.push(p);
    prev = p;
  }

  return withEllipsis;
}

/**
 * Tentukan status ketersediaan barang inventaris untuk ditampilkan di kartu katalog.
 *
 * @param {object} inv
 * @returns {{ isRusak: boolean, habis: boolean, label: string, variant: 'danger'|'muted' }}
 */
export function getStatusKetersediaan(inv) {
  if (!inv) {
    return { isRusak: false, habis: false, label: '0 / 0 Tersedia', variant: 'muted' };
  }

  const isRusak = normalizeKondisi(inv.kondisi) === 'rusak';
  const total = Number(inv.totalBarang) || 0;
  const sisa = Number(inv.sisaHariIni ?? total);
  const habis = sisa <= 0;

  if (isRusak) {
    return {
      isRusak: true,
      habis: true,
      label: 'Kondisi Rusak',
      variant: 'danger',
    };
  }

  if (habis) {
    return {
      isRusak: false,
      habis: true,
      label: `0 / ${total} Tersedia`,
      variant: 'danger',
    };
  }

  return {
    isRusak: false,
    habis: false,
    label: `${sisa} / ${total} Tersedia`,
    variant: 'muted',
  };
}

/**
 * Parse query string atau hash URL menjadi parameter filter katalog.
 * Mendukung format: '?q=kabel&kategori=kat-1,kat-2&oki=oki-bem&page=2'
 *
 * @param {string} rawString
 * @returns {{ cari: string, kategoriIds: Array<string>, okiIds: Array<string>, page: number }}
 */
export function parseKatalogParams(rawString = '') {
  if (!rawString || typeof rawString !== 'string') {
    return { cari: '', kategoriIds: [], okiIds: [], page: 1 };
  }

  const qIdx = rawString.indexOf('?');
  const qs = qIdx !== -1 ? rawString.slice(qIdx + 1) : rawString.startsWith('?') ? rawString.slice(1) : rawString;

  const params = new URLSearchParams(qs);
  const cari = (params.get('q') || params.get('cari') || '').trim();

  const splitCsv = (val) =>
    (val || '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

  const kategoriIds = splitCsv(params.get('kategori') || params.get('kategoriIds'));
  const okiIds = splitCsv(params.get('oki') || params.get('okiIds') || params.get('idOrganisasi'));
  const rawPage = Number(params.get('page') || params.get('hal') || 1);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  return { cari, kategoriIds, okiIds, page };
}

/**
 * Bangun query string URL dari parameter filter katalog.
 *
 * @param {{ cari?: string, kategoriIds?: Array<string>, okiIds?: Array<string>, page?: number }} filters
 * @returns {string}
 */
export function buildKatalogQueryString({ cari = '', kategoriIds = [], okiIds = [], page = 1 } = {}) {
  const params = new URLSearchParams();
  const q = String(cari || '').trim();
  if (q) params.set('q', q);

  const cats = Array.isArray(kategoriIds) ? kategoriIds.filter((x) => x && x.trim()) : [];
  if (cats.length > 0) params.set('kategori', cats.join(','));

  const okis = Array.isArray(okiIds) ? okiIds.filter((x) => x && x.trim()) : [];
  if (okis.length > 0) params.set('oki', okis.join(','));

  const p = Number(page);
  if (Number.isInteger(p) && p > 1) {
    params.set('page', String(p));
  }

  return params.toString();
}
