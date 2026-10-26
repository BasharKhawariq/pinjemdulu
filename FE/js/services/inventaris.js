/**
 * Service INVENTARIS sisi peminjam dan umum dengan persistensi store.js.
 */

import {
  mockInventaris,
  getMockPeminjamanAktifById,
} from '../data/inventaris.js';
import { mockKategori } from '../data/kategori.js';
import * as store from '../state/store.js';
import { delay } from './client.js';
import { ROLES } from '../lib/constants.js';
import { filterKelolaInventaris, paginateKelola } from '../lib/kelola-inventaris.js';
import {
  validateInventarisInput,
  getMinTotalBarang,
  hasActiveBookings,
} from '../lib/inventaris-form.js';
import { normalizeKondisi } from '../lib/kondisi.js';
import { isDeskripsiKosong } from '../lib/deskripsi.js';

const INVENTARIS_STORE_KEY = 'data:inventaris';

function throwNotFound(pesan = 'Barang tidak ditemukan.') {
  const err = new Error(pesan);
  err.status = 404;
  err.statusCode = 404;
  err.response = { status: 404, data: { message: pesan } };
  throw err;
}

const DEFAULTS = Object.freeze({
  page: 1,
  limit: 8,
});

/**
 * Ambil daftar inventaris dengan filter nama, multi-kategori, multi-OKI, dan paginasi.
 *
 * @param {{ search?: string, idKategori?: Array<string>, idOrganisasi?: Array<string>, page?: number, limit?: number }} param0
 * @returns {Promise<{ data: Array<object>, meta: { page: number, limit: number, total: number } }>}
 */
export async function getInventarisList({
  search = '',
  idKategori = [],
  idOrganisasi = [],
  page = DEFAULTS.page,
  limit = DEFAULTS.limit,
} = {}) {
  await delay(100);
  // Filter barang rusak (tidak muncul di katalog)
  let arr = mockInventaris.filter((it) => normalizeKondisi(it.kondisi) !== 'rusak');

  // Filter pencarian nama barang (case-insensitive)
  const q = typeof search === 'string' ? search.trim().toLowerCase() : '';
  if (q) {
    arr = arr.filter((it) => (it.namaBarang || '').toLowerCase().includes(q));
  }

  // Filter kategori (multi-pilih OR)
  const cats = Array.isArray(idKategori)
    ? idKategori.filter((x) => typeof x === 'string' && x.length > 0)
    : [];
  if (cats.length > 0) {
    const set = new Set(cats);
    arr = arr.filter((it) => set.has(it.idKategori));
  }

  // Filter organisasi / OKI (multi-pilih OR)
  const okis = Array.isArray(idOrganisasi)
    ? idOrganisasi.filter((x) => typeof x === 'string' && x.length > 0)
    : [];
  if (okis.length > 0) {
    const set = new Set(okis);
    arr = arr.filter((it) => set.has(it.idOrganisasi));
  }

  // Paginasi
  const total = arr.length;
  const pageNum = Number.isFinite(+page) && +page >= 1 ? Math.floor(+page) : 1;
  const limNum = Number.isFinite(+limit) && +limit >= 1 ? Math.floor(+limit) : DEFAULTS.limit;
  const start = (pageNum - 1) * limNum;
  const end = start + limNum;
  const sliced = start >= total ? [] : arr.slice(start, end);

  // Simpan snapshot ke store
  store.save(INVENTARIS_STORE_KEY, mockInventaris);

  return {
    data: sliced,
    meta: { page: pageNum, limit: limNum, total },
  };
}

/**
 * Ambil detail satu barang berdasarkan idInventaris.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getInventarisById(id) {
  await delay(80);
  const inv = mockInventaris.find((it) => String(it.idInventaris) === String(id));
  if (!inv) {
    throwNotFound('Barang tidak ditemukan.');
  }
  return inv;
}

/**
 * Ambil daftar peminjaman aktif terkait satu barang.
 *
 * @param {string} id
 * @returns {Promise<Array<object>>}
 */
export async function getPeminjamanAktif(id) {
  await delay(80);
  const inv = mockInventaris.find((it) => String(it.idInventaris) === String(id));
  if (!inv) {
    throwNotFound('Barang tidak ditemukan.');
  }
  return getMockPeminjamanAktifById(id);
}

/**
 * Ambil daftar inventaris milik OKI yang dikelola oleh PJ (403 untuk non-PJ).
 *
 * @param {object} user
 * @param {{ cari?: string, q?: string, kategoriIds?: Array<string>|string, kondisi?: string, status?: string, page?: number, perPage?: number }} params
 * @returns {Promise<{ data: Array<object>, meta: { page: number, perPage: number, total: number, totalPages: number } }>}
 */
export async function getInventarisKelola(user, params = {}) {
  await delay(80);

  const role = user?.role;
  const isPJ = role === ROLES.PENANGGUNG_JAWAB || role === 'admin';
  if (!user || !isPJ) {
    const err = new Error('Akses ditolak. Hanya Penanggung Jawab yang dapat mengelola inventaris.');
    err.status = 403;
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    err.response = { status: 403, data: { message: err.message, code: 'FORBIDDEN' } };
    throw err;
  }

  const myOki = user?.organisasi?.idOrganisasi || user?.idOrganisasi || null;
  const myOkiNama = user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || null;

  let arr = mockInventaris.filter((it) => {
    if (myOki && String(it.idOrganisasi) === String(myOki)) return true;
    if (myOkiNama && it.namaOrganisasi && it.namaOrganisasi.toLowerCase() === myOkiNama.toLowerCase()) return true;
    if (myOki && it.namaOrganisasi && it.namaOrganisasi.toLowerCase() === String(myOki).toLowerCase()) return true;
    return false;
  });

  arr = filterKelolaInventaris(arr, params);

  const paginated = paginateKelola(
    arr,
    params.page || 1,
    params.perPage || 10
  );

  return {
    data: paginated.items,
    meta: {
      page: paginated.page,
      perPage: paginated.perPage,
      total: paginated.total,
      totalPages: paginated.totalPages,
    },
  };
}

function ambilIdOrganisasiUser(user) {
  return user?.organisasi?.idOrganisasi || user?.idOrganisasi || null;
}

function ambilNamaOrganisasiUser(user) {
  return user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || null;
}

function throwError({ status = 400, code = 'ERROR', message = 'Terjadi kesalahan.', errors = {} }) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  err.code = code;
  err.errors = errors;
  err.response = { status, data: { code, message, errors } };
  throw err;
}

/**
 * Tambah inventaris baru (PJ).
 * @param {object} user
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createInventaris(user, payload) {
  await delay(100);

  const role = user?.role;
  const isPJ = role === ROLES.PENANGGUNG_JAWAB || role === 'admin';
  if (!user || !isPJ) {
    throwError({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Hanya Penanggung Jawab yang dapat menambah inventaris.',
    });
  }

  const val = validateInventarisInput(payload);
  if (!val.isValid) {
    throwError({
      status: 422,
      code: 'VALIDASI_GAGAL',
      message: 'Validasi form inventaris gagal.',
      errors: val.errors,
    });
  }

  const myOki = ambilIdOrganisasiUser(user) || 'oki-1';
  const myOkiNama = ambilNamaOrganisasiUser(user) || 'BEM FT';

  const kat = mockKategori.find((k) => k.idKategori === payload.idKategori);
  const namaKat = kat?.namaKategori || 'Lainnya';

  const idInventaris = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const total = Number(payload.totalBarang !== undefined ? payload.totalBarang : payload.jumlahUnit) || 1;
  const deskripsi = isDeskripsiKosong(payload.deskripsi)
    ? (payload.deskripsiBarang || '').trim()
    : String(payload.deskripsi).trim();

  const baru = {
    idInventaris,
    idKategori: payload.idKategori,
    namaKategori: namaKat,
    idOrganisasi: myOki,
    namaOrganisasi: myOkiNama,
    namaBarang: payload.namaBarang.trim(),
    lokasi: payload.lokasi || 'Sekretariat',
    totalBarang: total,
    sisaHariIni: total,
    kondisi: normalizeKondisi(payload.kondisi) || 'baik',
    deskripsiBarang: deskripsi,
    thumbnail: payload.thumbnail || null,
  };

  mockInventaris.unshift(baru);
  try {
    store.save(INVENTARIS_STORE_KEY, mockInventaris);
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 'QUOTA_EXCEEDED') {
      mockInventaris.shift();
      throwError({
        status: 507,
        code: 'PENYIMPANAN_PENUH',
        message: err.message,
        errors: {
          umum: err.message,
        },
      });
    }
    throw err;
  }

  return { ...baru };
}

/**
 * Perbarui data inventaris (PJ).
 * @param {object} user
 * @param {string} idInventaris
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateInventaris(user, idInventaris, payload) {
  await delay(100);

  const role = user?.role;
  const isPJ = role === ROLES.PENANGGUNG_JAWAB || role === 'admin';
  if (!user || !isPJ) {
    throwError({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Hanya Penanggung Jawab yang dapat mengubah inventaris.',
    });
  }

  const inv = mockInventaris.find((it) => String(it.idInventaris) === String(idInventaris));
  if (!inv) {
    throwNotFound('Inventaris tidak ditemukan.');
  }

  const myOki = ambilIdOrganisasiUser(user);
  const myOkiNama = ambilNamaOrganisasiUser(user);
  if (myOki && inv.idOrganisasi && String(inv.idOrganisasi) !== String(myOki)) {
    if (!myOkiNama || !inv.namaOrganisasi || inv.namaOrganisasi.toLowerCase() !== myOkiNama.toLowerCase()) {
      throwError({
        status: 403,
        code: 'BUKAN_OKI_ANDA',
        message: 'Anda tidak dapat mengelola inventaris milik organisasi lain.',
        errors: {
          umum: `Barang ini dikelola oleh ${inv.namaOrganisasi}, bukan OKI Anda.`,
        },
      });
    }
  }

  const bookingsAktif = getMockPeminjamanAktifById(idInventaris).map((b) => ({
    ...b,
    idInventaris,
  }));
  const today = new Date().toISOString().slice(0, 10);
  const minTotal = getMinTotalBarang(idInventaris, bookingsAktif, today);

  const val = validateInventarisInput(payload, { minTotal });
  if (!val.isValid) {
    const jumlahInput = Number(payload.totalBarang !== undefined ? payload.totalBarang : payload.jumlahUnit);
    const code = val.errors?.totalBarang && jumlahInput < minTotal
      ? 'JUMLAH_KURANG_DARI_TERPAKAI'
      : 'VALIDASI_GAGAL';
    throwError({
      status: code === 'JUMLAH_KURANG_DARI_TERPAKAI' ? 409 : 422,
      code,
      message: val.errors?.totalBarang || 'Validasi form inventaris gagal.',
      errors: val.errors,
    });
  }

  const kat = mockKategori.find((k) => k.idKategori === payload.idKategori);
  const namaKat = kat?.namaKategori || inv.namaKategori;
  const total = Number(payload.totalBarang !== undefined ? payload.totalBarang : payload.jumlahUnit) || inv.totalBarang;
  const deskripsi = payload.deskripsi !== undefined
    ? (isDeskripsiKosong(payload.deskripsi) ? '' : String(payload.deskripsi).trim())
    : (payload.deskripsiBarang !== undefined ? String(payload.deskripsiBarang).trim() : inv.deskripsiBarang);

  inv.namaBarang = payload.namaBarang.trim();
  inv.idKategori = payload.idKategori;
  inv.namaKategori = namaKat;
  inv.totalBarang = total;
  inv.kondisi = normalizeKondisi(payload.kondisi) || inv.kondisi;
  inv.deskripsiBarang = deskripsi;

  if (payload.thumbnail !== undefined) {
    inv.thumbnail = payload.thumbnail;
  }
  if (payload.lokasi) {
    inv.lokasi = payload.lokasi;
  }

  try {
    store.save(INVENTARIS_STORE_KEY, mockInventaris);
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 'QUOTA_EXCEEDED') {
      throwError({
        status: 507,
        code: 'PENYIMPANAN_PENUH',
        message: err.message,
        errors: {
          umum: err.message,
        },
      });
    }
    throw err;
  }

  return { ...inv };
}

/**
 * Hapus inventaris (PJ).
 * @param {object} user
 * @param {string} idInventaris
 * @returns {Promise<{ ok: boolean, idInventaris: string }>}
 */
export async function deleteInventaris(user, idInventaris) {
  await delay(100);

  const role = user?.role;
  const isPJ = role === ROLES.PENANGGUNG_JAWAB || role === 'admin';
  if (!user || !isPJ) {
    throwError({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Akses ditolak. Hanya Penanggung Jawab yang dapat menghapus inventaris.',
    });
  }

  const index = mockInventaris.findIndex((it) => String(it.idInventaris) === String(idInventaris));
  if (index === -1) {
    throwNotFound('Inventaris tidak ditemukan.');
  }

  const inv = mockInventaris[index];
  const myOki = ambilIdOrganisasiUser(user);
  const myOkiNama = ambilNamaOrganisasiUser(user);
  if (myOki && inv.idOrganisasi && String(inv.idOrganisasi) !== String(myOki)) {
    if (!myOkiNama || !inv.namaOrganisasi || inv.namaOrganisasi.toLowerCase() !== myOkiNama.toLowerCase()) {
      throwError({
        status: 403,
        code: 'BUKAN_OKI_ANDA',
        message: 'Anda tidak dapat mengelola inventaris milik organisasi lain.',
        errors: {
          umum: `Barang ini dikelola oleh ${inv.namaOrganisasi}, bukan OKI Anda.`,
        },
      });
    }
  }

  const bookingsAktif = getMockPeminjamanAktifById(idInventaris).map((b) => ({
    ...b,
    idInventaris,
  }));
  if (hasActiveBookings(idInventaris, bookingsAktif)) {
    throwError({
      status: 409,
      code: 'MASIH_DIPINJAM',
      message: 'Inventaris tidak dapat dihapus karena masih memiliki peminjaman aktif.',
      errors: {
        umum: 'Barang masih memiliki peminjaman yang aktif, menunggu persetujuan, atau menunggu pengembalian. Selesaikan peminjaman terlebih dahulu sebelum menghapus barang.',
      },
    });
  }

  mockInventaris.splice(index, 1);
  store.save(INVENTARIS_STORE_KEY, mockInventaris);

  return { ok: true, idInventaris };
}


