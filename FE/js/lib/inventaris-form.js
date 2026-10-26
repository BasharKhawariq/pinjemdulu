/**
 * inventaris-form.js — Validasi formulir inventaris PJ & fungsi murni terkait kuota.
 * Acuan: _sumber/src/lib/inventaris-form-validation.js & _sumber/src/lib/inventaris-kelola.js
 */

import { getDeskripsiLength, isDeskripsiKosong } from './deskripsi.js';
import { normalizeKondisi } from './kondisi.js';
import { STATUS_MENAHAN_BARANG, KONDISI_BARANG } from './constants.js';
import { getCommittedQuota, MAX_HORIZON_DAYS } from './date-rules.js';

export const MAKS_FOTO_BYTES = 2 * 1024 * 1024; // 2 MB
export const FOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

/**
 * Tambah sejumlah hari ke tanggal ISO string (YYYY-MM-DD).
 * @param {string} iso
 * @param {number} n
 * @returns {string}
 */
export function addDaysToISO(iso, n) {
  if (!iso || typeof iso !== 'string') return '';
  const parts = iso.split('-').map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return '';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Validasi nama barang inventaris.
 * Wajib diisi, maksimal 100 karakter.
 * @param {string} nama
 * @returns {string|null} Pesan galat atau null jika valid
 */
export function validateNamaBarang(nama) {
  if (typeof nama !== 'string' || nama.trim().length === 0) {
    return 'Nama barang wajib diisi.';
  }
  const trimmed = nama.trim();
  if (trimmed.length > 100) {
    return 'Nama barang maksimal 100 karakter.';
  }
  return null;
}

/**
 * Validasi jumlah unit inventaris.
 * Bilangan bulat positif 1 - 999.
 * Pada mode edit: tidak boleh kurang dari minTotal (kuota booking aktif).
 * @param {any} jumlah
 * @param {number} [minTotal=1]
 * @returns {string|null} Pesan galat atau null jika valid
 */
export function validateJumlahUnit(jumlah, minTotal = 1) {
  if (jumlah === '' || jumlah === null || jumlah === undefined) {
    return 'Jumlah unit wajib diisi.';
  }

  const num = Number(jumlah);
  if (!Number.isInteger(num) || num < 1 || num > 999) {
    return 'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.';
  }

  const min = Math.max(1, Number(minTotal) || 1);
  if (num < min) {
    return `Jumlah tidak boleh kurang dari ${min} unit karena masih dipakai peminjaman aktif atau terjadwal.`;
  }

  return null;
}

/**
 * Validasi kategori inventaris.
 * @param {string} idKategori
 * @returns {string|null}
 */
export function validateKategori(idKategori) {
  if (!idKategori || typeof idKategori !== 'string' || idKategori.trim().length === 0) {
    return 'Kategori wajib dipilih.';
  }
  return null;
}

/**
 * Validasi kondisi barang.
 * @param {string} kondisi
 * @returns {string|null}
 */
export function validateKondisi(kondisi) {
  if (!kondisi || typeof kondisi !== 'string') {
    return 'Kondisi barang wajib dipilih.';
  }
  if (!normalizeKondisi(kondisi)) {
    return 'Kondisi barang tidak valid.';
  }
  return null;
}

/**
 * Validasi berkas foto barang.
 * Opsional (null/undefined dianggap valid).
 * Bila ada: wajib JPG atau PNG, maksimal 2 MB.
 * @param {{ size?: number, type?: string }|null} file
 * @returns {string|null}
 */
export function validateFotoFile(file) {
  if (!file) return null;

  if (file.type && !FOTO_MIME_TYPES.includes(file.type.toLowerCase())) {
    return 'File harus berformat JPG atau PNG.';
  }

  if (typeof file.size === 'number' && file.size > MAKS_FOTO_BYTES) {
    return 'Ukuran file maksimal 2 MB.';
  }

  return null;
}

/**
 * Validasi input form inventaris secara menyeluruh.
 * @param {object} values
 * @param {object} [options]
 * @param {number} [options.minTotal=1]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateInventarisInput(values = {}, options = {}) {
  const errors = {};
  const { minTotal = 1 } = options;

  const errNama = validateNamaBarang(values.namaBarang);
  if (errNama) errors.namaBarang = errNama;

  const jumlahVal = values.totalBarang !== undefined ? values.totalBarang : values.jumlahUnit;
  const errJumlah = validateJumlahUnit(jumlahVal, minTotal);
  if (errJumlah) errors.totalBarang = errJumlah;

  const errKat = validateKategori(values.idKategori);
  if (errKat) errors.idKategori = errKat;

  const errKondisi = validateKondisi(values.kondisi);
  if (errKondisi) errors.kondisi = errKondisi;

  const deskVal = values.deskripsi !== undefined ? values.deskripsi : values.deskripsiBarang;
  if (deskVal) {
    const len = getDeskripsiLength(deskVal);
    if (len > 2000) {
      errors.deskripsi = `Deskripsi maksimal 2000 karakter (saat ini ${len} karakter).`;
    }
  }

  if (values.fotoFile) {
    const errFoto = validateFotoFile(values.fotoFile);
    if (errFoto) errors.fotoFile = errFoto;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Periksa apakah form telah diubah dibanding nilai awal.
 * @param {object} current
 * @param {object} initial
 * @returns {boolean}
 */
export function isFormDirty(current = {}, initial = {}) {
  const cNama = typeof current.namaBarang === 'string' ? current.namaBarang.trim() : '';
  const iNama = typeof initial.namaBarang === 'string' ? initial.namaBarang.trim() : '';
  if (cNama !== iNama) return true;

  const cJml = Number(current.totalBarang !== undefined ? current.totalBarang : current.jumlahUnit) || 0;
  const iJml = Number(initial.totalBarang !== undefined ? initial.totalBarang : initial.jumlahUnit) || 0;
  if (cJml !== iJml) return true;

  const cKat = current.idKategori || '';
  const iKat = initial.idKategori || '';
  if (cKat !== iKat) return true;

  const cKondisi = current.kondisi || '';
  const iKondisi = initial.kondisi || '';
  if (cKondisi !== iKondisi) return true;

  if (current.fotoFile) return true;
  if (current.fotoRemoved) return true;

  const cDeskRaw = current.deskripsi !== undefined ? current.deskripsi : current.deskripsiBarang;
  const iDeskRaw = initial.deskripsi !== undefined ? initial.deskripsi : initial.deskripsiBarang;
  const cDesk = isDeskripsiKosong(cDeskRaw) ? '' : (cDeskRaw || '').trim();
  const iDesk = isDeskripsiKosong(iDeskRaw) ? '' : (iDeskRaw || '').trim();
  if (cDesk !== iDesk) return true;

  return false;
}

/**
 * Periksa apakah inventaris memiliki peminjaman aktif/menahan kuota.
 * @param {string} idInventaris
 * @param {Array<{idInventaris?: string, status?: string}>} bookings
 * @returns {boolean}
 */
export function hasActiveBookings(idInventaris, bookings = []) {
  if (typeof idInventaris !== 'string' || idInventaris.length === 0) return false;
  if (!Array.isArray(bookings) || bookings.length === 0) return false;
  const menahan = new Set(Array.isArray(STATUS_MENAHAN_BARANG) ? STATUS_MENAHAN_BARANG : []);
  for (const b of bookings) {
    if (!b) continue;
    if (b.idInventaris !== idInventaris) continue;
    if (menahan.has(b.status)) return true;
  }
  return false;
}

/**
 * Hitung jumlah unit minimum inventaris yang tidak boleh dikurangi
 * karena sudah terikat peminjaman aktif atau terjadwal.
 * Menggunakan rumus kuota getCommittedQuota dari date-rules.js.
 * @param {string} idInventaris
 * @param {Array<object>} bookings
 * @param {string|Date} [today]
 * @returns {number}
 */
export function getMinTotalBarang(idInventaris, bookings = [], today) {
  if (!Array.isArray(bookings) || bookings.length === 0) return 0;

  const menahan = new Set(Array.isArray(STATUS_MENAHAN_BARANG) ? STATUS_MENAHAN_BARANG : []);
  const bs = bookings.filter((b) => {
    if (!b) return false;
    if (typeof idInventaris === 'string' && idInventaris.length > 0) {
      if (b.idInventaris !== idInventaris) return false;
    }
    return menahan.has(b.status);
  });

  if (bs.length === 0) return 0;

  const tStr = typeof today === 'string'
    ? today.slice(0, 10)
    : today instanceof Date
      ? today.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  let peak = 0;
  for (let i = 0; i < MAX_HORIZON_DAYS; i++) {
    const iso = addDaysToISO(tStr, i);
    if (!iso) continue;
    const terpakai = getCommittedQuota(iso, bs, tStr);
    if (terpakai > peak) peak = terpakai;
  }
  return peak;
}
