/**
 * Helper format tanggal. SELURUH parse dilakukan manual dari string "YYYY-MM-DD"
 * TANPA memakai `new Date(str)` agar tidak bergeser zona waktu (Date memparse
 * "YYYY-MM-DD" sebagai UTC 00:00:00, yang bisa bergeser di zona Asia/Jakarta).
 *
 * Semua fungsi bersifat murni untuk kemudahan test node:test.
 */

const BULAN = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]);

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isKabisat(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function hariPerBulan(y, m /* 1-based */) {
  const days = [31, isKabisat(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[m - 1];
}

/**
 * Parse "YYYY-MM-DD" menjadi { y, m, d } (m = 1..12). Null jika format atau
 * tanggal tidak valid.
 * @param {string} str
 */
function parseIso(str) {
  if (typeof str !== 'string') return null;
  const m = ISO_RE.exec(str.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > hariPerBulan(y, mo)) return null;
  return { y, m: mo, d };
}

/**
 * Format tanggal "YYYY-MM-DD" → "20 Sep 2026".
 * Nama bulan singkat Indonesia. Input invalid → "-".
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function formatTanggal(dateStr) {
  const parsed = parseIso(dateStr);
  if (!parsed) return '-';
  return `${String(parsed.d).padStart(2, '0')} ${BULAN[parsed.m - 1]} ${parsed.y}`;
}

/**
 * Format tanggal pendek untuk blok tanggal jadwal.
 * @param {string} dateStr
 * @returns {{ hari: string, bulan: string }}
 */
export function formatTanggalPendek(dateStr) {
  const parsed = parseIso(dateStr);
  if (!parsed) return { hari: '-', bulan: '-' };
  return {
    hari: String(parsed.d).padStart(2, '0'),
    bulan: BULAN[parsed.m - 1],
  };
}

/**
 * Konversi objek Date lokal menjadi string "YYYY-MM-DD" memakai getter lokal.
 * Mencegah pergeseran zona waktu yang disebabkan oleh toISOString().
 * Input tidak valid (bukan Date atau Invalid Date) mengembalikan null.
 *
 * @param {Date} date
 * @returns {string|null}
 */
export function dateToISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Konversi string "YYYY-MM-DD" menjadi objek Date lokal (jam 00:00:00.000).
 * Memakai constructor new Date(y, m - 1, d) agar tidak bergeser zona waktu.
 * Input tidak valid (bukan string atau tanggal tidak ada) mengembalikan null.
 *
 * @param {string} str
 * @returns {Date|null}
 */
export function isoToDate(str) {
  const parsed = parseIso(str);
  if (!parsed) return null;
  const date = new Date(parsed.y, parsed.m - 1, parsed.d, 0, 0, 0, 0);
  if (
    date.getFullYear() !== parsed.y ||
    date.getMonth() !== parsed.m - 1 ||
    date.getDate() !== parsed.d
  ) {
    return null;
  }
  return date;
}
