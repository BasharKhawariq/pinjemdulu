import { normalizeNamaKategori } from './kategori-validation.js';

/**
 * Normalisasi nama kategori: trim dan rapatkan spasi berlebih menjadi spasi tunggal.
 * Re-export dari kategori-validation.js sebagai satu sumber aturan.
 *
 * @param {string} name
 * @returns {string}
 */
export const normalizeKategoriName = normalizeNamaKategori;

/**
 * Filter opsi kategori berdasarkan teks pencarian.
 * Pencarian cocok sebagian, case-insensitive, spasi tepi diabaikan.
 *
 * @param {Array<{ idKategori: string, namaKategori: string }>} options
 * @param {string} query
 * @returns {Array<{ idKategori: string, namaKategori: string }>}
 */
export function filterKategoriOptions(options, query) {
  if (!Array.isArray(options)) return [];
  const q = normalizeKategoriName(query).toLowerCase();
  if (!q) return [...options];

  return options.filter((opt) => {
    const nama = typeof opt?.namaKategori === 'string' ? opt.namaKategori.toLowerCase() : '';
    return nama.includes(q);
  });
}

/**
 * Tentukan apakah baris "+ Buat kategori '{teks}'" perlu ditampilkan.
 * Tampil bila teks tidak kosong DAN belum ada opsi dengan nama yang cocok persis (case-insensitive).
 *
 * @param {string} query
 * @param {Array<{ idKategori?: string, namaKategori?: string }>} options
 * @returns {boolean}
 */
export function shouldShowCreateRow(query, options = []) {
  const qNorm = normalizeKategoriName(query);
  if (!qNorm) return false;

  const qLower = qNorm.toLowerCase();
  const adaPersis =
    Array.isArray(options) &&
    options.some((opt) => {
      const nama = normalizeKategoriName(opt?.namaKategori || '').toLowerCase();
      return nama === qLower;
    });

  return !adaPersis;
}

/**
 * Hitung indeks sorotan berikutnya saat tombol panah atas/bawah ditekan.
 *
 * @param {number} currentIndex
 * @param {number} totalCount
 * @param {'next'|'prev'} direction
 * @returns {number}
 */
export function moveHighlight(currentIndex, totalCount, direction = 'next') {
  if (!totalCount || totalCount <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= totalCount) {
    return direction === 'prev' ? totalCount - 1 : 0;
  }

  if (direction === 'next') {
    return (currentIndex + 1) % totalCount;
  }

  return (currentIndex - 1 + totalCount) % totalCount;
}
