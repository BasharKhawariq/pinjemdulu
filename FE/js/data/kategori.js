/**
 * Data mock KATEGORI inventaris.
 * Bentuk sesuai kontrak API: { idKategori, namaKategori }.
 * 5 kategori sesuai Task 4.
 */

const INITIAL_KATEGORI = [
  { idKategori: 'kat-1', namaKategori: 'Elektronik' },
  { idKategori: 'kat-2', namaKategori: 'Audio' },
  { idKategori: 'kat-3', namaKategori: 'Furnitur' },
  { idKategori: 'kat-4', namaKategori: 'Dokumentasi' },
  { idKategori: 'kat-5', namaKategori: 'Alat Musik' },
];

const _kategoriData = [...INITIAL_KATEGORI];

export const mockKategori = _kategoriData;

/**
 * Tambah kategori ke store mock.
 * @param {{ idKategori: string, namaKategori: string }} item
 */
export function addMockKategori(item) {
  _kategoriData.push(item);
  return item;
}

/**
 * Reset state kategori mock ke daftar awal (untuk isolasi pengujian).
 */
export function resetMockKategori() {
  _kategoriData.length = 0;
  _kategoriData.push(...INITIAL_KATEGORI.map((k) => ({ ...k })));
}
