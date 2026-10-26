/**
 * Normalisasi nilai kondisi inventaris ke model kanonik dua nilai.
 *
 * Nilai rusak_ringan/rusak_berat tetap dikenali untuk membaca data lama,
 * tetapi seluruh pembaca dan penulis aplikasi menggunakan nilai `rusak`.
 *
 * @param {unknown} value
 * @returns {'baik'|'rusak'|null}
 */
export function normalizeKondisi(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'baik') return 'baik';
  if (normalized === 'rusak' || normalized === 'rusak_ringan' || normalized === 'rusak_berat') {
    return 'rusak';
  }
  return null;
}
