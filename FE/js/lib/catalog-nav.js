/**
 * Helper navigasi katalog inventaris.
 * Digunakan untuk mempertahankan parameter query (filter, pencarian, halaman)
 * saat kembali dari halaman detail inventaris ke katalog.
 */

export const CATALOG_QUERY_KEY = 'pd:v1:katalog-query';

/**
 * Membangun URL katalog inventaris dengan query string filter tersimpan.
 * Mengembalikan `basePath` saja jika query kosong, tidak valid, atau hanya '?'.
 * Menormalkan awalan '?' sehingga URL yang dihasilkan selalu valid dan konsisten.
 *
 * @param {string} basePath Path dasar halaman katalog (mis. '/peminjam/inventaris')
 * @param {string|null|undefined} queryString Parameter query (dengan atau tanpa '?')
 * @returns {string} URL lengkap katalog inventaris
 */
export function buildKatalogUrl(basePath, queryString) {
  const base = typeof basePath === 'string' ? basePath : '';

  if (typeof queryString !== 'string') {
    return base;
  }

  const trimmed = queryString.trim();
  if (!trimmed) {
    return base;
  }

  const cleanQuery = trimmed.replace(/^\?+/, '');
  if (!cleanQuery) {
    return base;
  }

  return `${base}?${cleanQuery}`;
}
