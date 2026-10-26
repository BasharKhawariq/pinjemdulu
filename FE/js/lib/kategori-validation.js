/**
 * kategori-validation.js — Validasi nama kategori (V4a).
 * SATU sumber aturan untuk halaman Kelola Kategori dan KategoriCombobox di formulir.
 * Fungsi murni, bebas efek samping DOM/storage, aman diuji di node:test.
 */

/**
 * Batas maksimal panjang karakter nama kategori.
 */
export const MAKS_PANJANG_KATEGORI = 30;

/**
 * Normalisasi nama kategori:
 * - Menghapus spasi di awal dan akhir (trim)
 * - Merapatkan spasi ganda/berlebih di tengah menjadi spasi tunggal
 * - TIDAK mengubah huruf besar-kecil yang diketik pengguna
 *
 * @param {string} nama
 * @returns {string}
 */
export function normalizeNamaKategori(nama) {
  if (typeof nama !== 'string') return '';
  return nama.trim().replace(/\s+/g, ' ');
}

/**
 * Validasi nama kategori.
 * Aturan:
 * 1. Wajib diisi (setelah dinormalisasi panjang > 0).
 * 2. Maksimum 30 karakter.
 * 3. Unik tanpa peka huruf besar-kecil di antara kategori yang ada.
 *    (Opsi idDiabaikan agar pengguna dapat mengubah kapitalisasi nama kategori yang sedang diedit).
 *
 * @param {string} nama
 * @param {{ daftar?: Array<{ idKategori?: string, namaKategori?: string }>, idDiabaikan?: string|null }} [options]
 * @returns {{ isValid: boolean, error: string|null, nama: string }}
 */
export function validateNamaKategori(nama, { daftar = [], idDiabaikan = null } = {}) {
  const clean = normalizeNamaKategori(nama);

  if (clean.length === 0) {
    return {
      isValid: false,
      error: 'Nama kategori wajib diisi.',
      nama: clean,
    };
  }

  if (clean.length > MAKS_PANJANG_KATEGORI) {
    return {
      isValid: false,
      error: `Nama kategori maksimal ${MAKS_PANJANG_KATEGORI} karakter.`,
      nama: clean,
    };
  }

  if (Array.isArray(daftar) && daftar.length > 0) {
    const cleanLower = clean.toLowerCase();
    const duplikat = daftar.some((k) => {
      if (!k) return false;
      // Abaikan kategori yang sedang diedit berdasarkan idDiabaikan
      if (idDiabaikan && String(k.idKategori) === String(idDiabaikan)) {
        return false;
      }
      return normalizeNamaKategori(k.namaKategori || '').toLowerCase() === cleanLower;
    });

    if (duplikat) {
      return {
        isValid: false,
        error: 'Kategori dengan nama tersebut sudah ada.',
        nama: clean,
      };
    }
  }

  return {
    isValid: true,
    error: null,
    nama: clean,
  };
}
