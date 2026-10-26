/**
 * store.js — Pembungkus penyimpanan lokal (localStorage) dengan fallback ke memori
 * untuk lingkungan tanpa DOM / Node.js test runner.
 * Semua kunci diawali 'pd:v1:'.
 */

const KEY_PREFIX = 'pd:v1:';
const memoryStore = new Map();

function isLocalStorageAvailable() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const probe = '__pd_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Muat data dari penyimpanan.
 * Jika belum ada dan `seed` diberikan, simpan dan kembalikan nilai `seed`.
 *
 * @param {string} key
 * @param {any|(() => any)} [seed]
 * @returns {any}
 */
export function load(key, seed) {
  const fullKey = `${KEY_PREFIX}${key}`;

  if (isLocalStorageAvailable()) {
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw !== null) {
        return JSON.parse(raw);
      }
      if (seed !== undefined) {
        const val = typeof seed === 'function' ? seed() : seed;
        save(key, val);
        return val;
      }
    } catch {
      // jika parsing gagal, fallback
    }
  }

  if (memoryStore.has(fullKey)) {
    return memoryStore.get(fullKey);
  }

  if (seed !== undefined) {
    const val = typeof seed === 'function' ? seed() : seed;
    save(key, val);
    return val;
  }

  return null;
}

/**
 * Periksa apakah suatu galat merupakan QuotaExceededError dari penyimpanan browser.
 * @param {any} err
 * @returns {boolean}
 */
export function isQuotaExceededError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    err.number === -2147024882 ||
    (typeof err.message === 'string' && /quota/i.test(err.message))
  );
}

/**
 * Simpan data ke penyimpanan.
 *
 * @param {string} key
 * @param {any} value
 * @returns {any}
 */
export function save(key, value) {
  const fullKey = `${KEY_PREFIX}${key}`;

  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const error = new Error(
          'Penyimpanan browser penuh. Tidak dapat menyimpan data inventaris atau foto. Coba gunakan foto dengan resolusi lebih kecil atau bersihkan penyimpanan browser.'
        );
        error.name = 'QuotaExceededError';
        error.code = 'QUOTA_EXCEEDED';
        throw error;
      }
      // abaikan kesalahan non-kuota
    }
  }

  memoryStore.set(fullKey, value);
  return value;
}

/**
 * Hapus data dari penyimpanan berdasarkan kunci.
 *
 * @param {string} key
 */
export function remove(key) {
  const fullKey = `${KEY_PREFIX}${key}`;

  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // abaikan
    }
  }

  memoryStore.delete(fullKey);
}

/**
 * Reset seluruh data berawalan 'pd:v1:'.
 * Mengembalikan penyimpanan ke kondisi kosong (sehingga panggilan load berikutnya memakai seed).
 */
export function reset() {
  if (isLocalStorageAvailable()) {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_PREFIX)) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // abaikan
    }
  }

  memoryStore.clear();
}
