/**
 * Service KATEGORI dengan persistensi store.js (V4a).
 * Mendukung getKategori, getKategoriDenganJumlah, createKategori, updateKategori, deleteKategori.
 */

import { mockKategori, resetMockKategori } from '../data/kategori.js';
import { mockInventaris } from '../data/inventaris.js';
import {
  validateNamaKategori,
  normalizeNamaKategori,
} from '../lib/kategori-validation.js';
import { hitungPenggunaan, sortKategori } from '../lib/kelola-kategori.js';
import { ROLES } from '../lib/constants.js';
import * as store from '../state/store.js';
import { delay } from './client.js';

const KATEGORI_STORE_KEY = 'data:kategori';
const INVENTARIS_STORE_KEY = 'data:inventaris';

function throwError({ status = 400, code = 'ERROR', message = 'Terjadi galat.', errors = {} }) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  err.code = code;
  err.errors = errors;
  err.response = { status, data: { code, message, errors } };
  throw err;
}

function checkPJRole(user) {
  if (!user) {
    throwError({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Pengguna tidak terautentikasi.',
    });
  }
  const role = user.role;
  const isPJ = role === ROLES.PENANGGUNG_JAWAB || role === 'admin';
  if (!isPJ) {
    throwError({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Hanya Penanggung Jawab yang dapat mengelola kategori.',
    });
  }
}

function getInventarisItems() {
  return store.load(INVENTARIS_STORE_KEY, () => mockInventaris);
}

/**
 * Reset state kategori ke data awal mock.
 */
export function _resetKategoriMock() {
  resetMockKategori();
  store.save(
    KATEGORI_STORE_KEY,
    mockKategori.map((k) => ({ ...k }))
  );
}

/**
 * Ambil daftar kategori sederhana.
 * @returns {Promise<Array<{idKategori:string, namaKategori:string}>>}
 */
export async function getKategori() {
  await delay(60);
  const list = store.load(KATEGORI_STORE_KEY, () => mockKategori.map((k) => ({ ...k })));
  return list.map((k) => ({
    idKategori: k.idKategori,
    namaKategori: k.namaKategori,
  }));
}

/**
 * Ambil daftar kategori lengkap beserta jumlah barang yang memakainya dari SELURUH OKI.
 * Diurutkan secara alfabetis (A-Z).
 *
 * @returns {Promise<Array<{ idKategori: string, namaKategori: string, totalBarang: number }>>}
 */
export async function getKategoriDenganJumlah() {
  await delay(60);
  const kategories = store.load(KATEGORI_STORE_KEY, () => mockKategori.map((k) => ({ ...k })));
  const inventarisList = getInventarisItems();

  const withCount = kategories.map((k) => {
    const totalBarang = hitungPenggunaan(k.idKategori, inventarisList);
    return {
      idKategori: k.idKategori,
      namaKategori: k.namaKategori,
      totalBarang,
    };
  });

  return sortKategori(withCount, { arah: 'asc', kriteria: 'nama' });
}

/**
 * Buat kategori inventaris baru (PJ).
 * Mendukung signature:
 * - createKategori(user, nama)
 * - createKategori(nama) [kompatibilitas mundur form combobox]
 *
 * @param {object|string} userOrNama
 * @param {string} [namaOptional]
 * @returns {Promise<{idKategori: string, namaKategori: string}>}
 */
export async function createKategori(userOrNama, namaOptional) {
  await delay(80);

  let user = null;
  let rawNama = '';

  if (typeof userOrNama === 'string') {
    rawNama = userOrNama;
  } else {
    user = userOrNama;
    rawNama = namaOptional || '';
    checkPJRole(user);
  }

  const list = store.load(KATEGORI_STORE_KEY, () => mockKategori.map((k) => ({ ...k })));

  const val = validateNamaKategori(rawNama, { daftar: list });
  if (!val.isValid) {
    if (val.error.includes('sudah ada')) {
      throwError({
        status: 409,
        code: 'KATEGORI_SUDAH_ADA',
        message: val.error,
        errors: {
          nama: val.error,
          namaKategori: val.error,
        },
      });
    }

    throwError({
      status: 422,
      code: 'VALIDASI_GAGAL',
      message: val.error,
      errors: {
        nama: val.error,
        namaKategori: val.error,
      },
    });
  }

  const idKategori = `kat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const itemBaru = { idKategori, namaKategori: val.nama };
  list.push(itemBaru);

  try {
    store.save(KATEGORI_STORE_KEY, list);
  } catch (err) {
    list.pop();
    if (err.name === 'QuotaExceededError' || err.code === 'QUOTA_EXCEEDED') {
      throwError({
        status: 507,
        code: 'PENYIMPANAN_PENUH',
        message: 'Penyimpanan lokal penuh, tidak dapat menambahkan kategori.',
      });
    }
    throw err;
  }

  return { ...itemBaru };
}

/**
 * Perbarui nama kategori inventaris (PJ).
 *
 * @param {object} user
 * @param {string} idKategori
 * @param {string} namaBaru
 * @returns {Promise<{idKategori: string, namaKategori: string}>}
 */
export async function updateKategori(user, idKategori, namaBaru) {
  await delay(80);
  checkPJRole(user);

  const list = store.load(KATEGORI_STORE_KEY, () => mockKategori.map((k) => ({ ...k })));
  const item = list.find((k) => String(k.idKategori) === String(idKategori));

  if (!item) {
    throwError({
      status: 404,
      code: 'KATEGORI_TIDAK_DITEMUKAN',
      message: 'Kategori tidak ditemukan.',
    });
  }

  const val = validateNamaKategori(namaBaru, { daftar: list, idDiabaikan: idKategori });
  if (!val.isValid) {
    if (val.error.includes('sudah ada')) {
      throwError({
        status: 409,
        code: 'KATEGORI_SUDAH_ADA',
        message: val.error,
        errors: {
          nama: val.error,
          namaKategori: val.error,
        },
      });
    }

    throwError({
      status: 422,
      code: 'VALIDASI_GAGAL',
      message: val.error,
      errors: {
        nama: val.error,
        namaKategori: val.error,
      },
    });
  }

  item.namaKategori = val.nama;

  try {
    store.save(KATEGORI_STORE_KEY, list);
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 'QUOTA_EXCEEDED') {
      throwError({
        status: 507,
        code: 'PENYIMPANAN_PENUH',
        message: 'Penyimpanan lokal penuh, tidak dapat menyimpan perubahan kategori.',
      });
    }
    throw err;
  }

  // Refleksikan perubahan nama kategori ke seluruh barang inventaris terkait
  const invList = getInventarisItems();
  let syncDiperlukan = false;
  for (const inv of invList) {
    if (String(inv.idKategori) === String(idKategori)) {
      inv.namaKategori = val.nama;
      syncDiperlukan = true;
    }
  }
  if (syncDiperlukan) {
    store.save(INVENTARIS_STORE_KEY, invList);
    for (const it of mockInventaris) {
      if (String(it.idKategori) === String(idKategori)) {
        it.namaKategori = val.nama;
      }
    }
  }

  return { idKategori: item.idKategori, namaKategori: item.namaKategori };
}

/**
 * Hapus kategori inventaris (PJ).
 * Kategori yang masih dipakai oleh barang mana pun tidak dapat dihapus.
 *
 * @param {object} user
 * @param {string} idKategori
 * @returns {Promise<{ success: boolean, idKategori: string }>}
 */
export async function deleteKategori(user, idKategori) {
  await delay(80);
  checkPJRole(user);

  const list = store.load(KATEGORI_STORE_KEY, () => mockKategori.map((k) => ({ ...k })));
  const idx = list.findIndex((k) => String(k.idKategori) === String(idKategori));

  if (idx === -1) {
    throwError({
      status: 404,
      code: 'KATEGORI_TIDAK_DITEMUKAN',
      message: 'Kategori tidak ditemukan.',
    });
  }

  // Periksa apakah kategori masih digunakan oleh barang inventaris mana pun
  const inventarisList = getInventarisItems();
  const jumlahPenggunaan = hitungPenggunaan(idKategori, inventarisList);

  if (jumlahPenggunaan > 0) {
    throwError({
      status: 409,
      code: 'KATEGORI_DIPAKAI',
      message: `Kategori ini masih digunakan oleh ${jumlahPenggunaan} barang. Ganti kategorinya terlebih dahulu agar bisa dihapus.`,
      errors: {
        umum: `Kategori ini masih digunakan oleh ${jumlahPenggunaan} barang. Ganti kategorinya terlebih dahulu agar bisa dihapus.`,
      },
    });
  }

  const [removed] = list.splice(idx, 1);
  store.save(KATEGORI_STORE_KEY, list);

  return { success: true, idKategori: removed.idKategori };
}
