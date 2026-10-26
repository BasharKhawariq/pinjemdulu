/**
 * Service KELOLA INVENTARIS sisi PJ dengan penegakan guard BUKAN_OKI_ANDA, MASIH_DIPINJAM,
 * dan JUMLAH_KURANG_DARI_TERPAKAI.
 */

import {
  mockInventaris,
  getMockPeminjamanAktifById,
  deleteMockInventarisById,
  addMockInventaris,
  updateMockInventaris,
  resetMockInventarisAndBookings,
} from '../data/inventaris.js';
import { mockKategori } from '../data/kategori.js';
import { mockUsers } from '../data/users.js';
import {
  filterInventaris,
  paginate,
  hasActiveBookings,
  getMinTotalBarang,
} from '../lib/inventaris-kelola.js';
import { validateInventarisInput } from '../lib/inventaris-form-validation.js';
import { isDeskripsiKosong } from '../lib/deskripsi.js';
import { normalizeKondisi } from '../lib/kondisi.js';
import { getCurrentUser } from '../state/session.js';
import { delay } from './client.js';

let _mockCurrentUserOverride = null;

export function _setMockCurrentUserOverride(user) {
  _mockCurrentUserOverride = user;
}

function getActiveUser() {
  if (_mockCurrentUserOverride) return _mockCurrentUserOverride;
  return getCurrentUser() || mockUsers[0];
}

export function _resetInventarisKelolaMock() {
  resetMockInventarisAndBookings();
  _mockCurrentUserOverride = null;
}

function throwError({ status, code, message, errors = {} }) {
  const err = new Error(message || 'Terjadi galat.');
  err.status = status;
  err.statusCode = status;
  err.code = code;
  err.errors = errors;
  err.response = { status, data: { message, code, errors } };
  throw err;
}

function ambilIdOrganisasiUser(user) {
  return user?.organisasi?.idOrganisasi ?? user?.idOrganisasi ?? null;
}

const DEFAULT_KELOLA = Object.freeze({
  page: 1,
  perPage: 10,
});

/**
 * Ambil daftar inventaris MILIK OKI user yang sedang login.
 */
export async function getInventarisKelola(params = {}) {
  await delay(100);
  const user = getActiveUser();
  const myOki = ambilIdOrganisasiUser(user);

  let arr = myOki
    ? mockInventaris.filter((it) => it.idOrganisasi === myOki)
    : [...mockInventaris];

  const { q, kategori, kondisi, status } = params;
  arr = filterInventaris(arr, { q, kategori, kondisi, status });

  const total = arr.length;
  const paginated = paginate(
    arr,
    params.page || DEFAULT_KELOLA.page,
    params.perPage || DEFAULT_KELOLA.perPage
  );

  return {
    data: paginated.items,
    meta: {
      page: paginated.page,
      perPage: Number(params?.perPage) || DEFAULT_KELOLA.perPage,
      total,
      totalPages: paginated.totalPages,
    },
  };
}

/**
 * Ambil detail inventaris untuk diedit oleh PJ.
 */
export async function getInventarisDetailKelola(idInventaris) {
  await delay(80);
  const user = getActiveUser();
  const myOki = ambilIdOrganisasiUser(user);
  const inv = mockInventaris.find((it) => it.idInventaris === idInventaris);

  if (!inv) {
    throwError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Inventaris tidak ditemukan.',
    });
  }

  if (myOki && inv.idOrganisasi !== myOki) {
    throwError({
      status: 403,
      code: 'BUKAN_OKI_ANDA',
      message: 'Anda tidak dapat mengelola inventaris milik organisasi lain.',
      errors: {
        umum: 'Barang ini dikelola oleh ' + inv.namaOrganisasi + ', bukan OKI Anda.',
      },
    });
  }

  const bookingsAktif = getMockPeminjamanAktifById(idInventaris).map((b) => ({
    ...b,
    idInventaris,
  }));
  const today = new Date().toISOString().slice(0, 10);
  const minTotal = getMinTotalBarang(idInventaris, bookingsAktif, today);

  return {
    ...inv,
    minTotal,
  };
}

/**
 * Tambah inventaris baru.
 */
export async function createInventaris(payload) {
  const val = validateInventarisInput(payload);
  if (!val.isValid) {
    throwError({
      status: 422,
      code: 'VALIDASI_GAGAL',
      message: 'Validasi form inventaris gagal.',
      errors: val.errors,
    });
  }

  await delay(100);
  const user = getActiveUser();
  const myOki = ambilIdOrganisasiUser(user) || 'oki-2';
  const namaOki = user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || 'HMTI';

  const kat = mockKategori.find((k) => k.idKategori === payload.idKategori);
  const namaKat = kat?.namaKategori || 'Lainnya';

  const idInventaris = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const total = Number(payload.totalBarang) || 1;
  const deskripsi = isDeskripsiKosong(payload.deskripsi) ? '' : payload.deskripsi.trim();

  const baru = {
    idInventaris,
    idKategori: payload.idKategori,
    namaKategori: namaKat,
    idOrganisasi: myOki,
    namaOrganisasi: namaOki,
    namaBarang: payload.namaBarang.trim(),
    lokasi: payload.lokasi || 'Sekretariat',
    totalBarang: total,
    sisaHariIni: total,
    kondisi: normalizeKondisi(payload.kondisi),
    deskripsiBarang: deskripsi,
    thumbnail: payload.thumbnail || null,
  };

  addMockInventaris(baru);
  return { ...baru };
}

/**
 * Perbarui data inventaris.
 */
export async function updateInventaris(idInventaris, payload) {
  await delay(100);
  const user = getActiveUser();
  const myOki = ambilIdOrganisasiUser(user);
  const inv = mockInventaris.find((it) => it.idInventaris === idInventaris);

  if (!inv) {
    throwError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Inventaris tidak ditemukan.',
    });
  }

  if (myOki && inv.idOrganisasi !== myOki) {
    throwError({
      status: 403,
      code: 'BUKAN_OKI_ANDA',
      message: 'Anda tidak dapat mengelola inventaris milik organisasi lain.',
      errors: {
        umum: 'Barang ini dikelola oleh ' + inv.namaOrganisasi + ', bukan OKI Anda.',
      },
    });
  }

  const bookingsAktif = getMockPeminjamanAktifById(idInventaris).map((b) => ({
    ...b,
    idInventaris,
  }));
  const today = new Date().toISOString().slice(0, 10);
  const minTotal = getMinTotalBarang(idInventaris, bookingsAktif, today);

  const val = validateInventarisInput(payload, { minTotal });
  if (!val.isValid) {
    const code =
      val.errors?.totalBarang && Number(payload.totalBarang) < minTotal
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
  const total = Number(payload.totalBarang) || inv.totalBarang;
  const deskripsi = isDeskripsiKosong(payload.deskripsi) ? '' : payload.deskripsi.trim();

  const updates = {
    namaBarang: payload.namaBarang.trim(),
    idKategori: payload.idKategori,
    namaKategori: namaKat,
    totalBarang: total,
    kondisi: normalizeKondisi(payload.kondisi),
    deskripsiBarang: deskripsi,
  };

  if (payload.thumbnail !== undefined) {
    updates.thumbnail = payload.thumbnail;
  }
  if (payload.lokasi) {
    updates.lokasi = payload.lokasi;
  }

  const updated = updateMockInventaris(idInventaris, updates);
  return { ...updated };
}

/**
 * Hapus inventaris (hanya bila milik OKI sendiri dan tidak sedang dipinjam).
 */
export async function deleteInventaris(idInventaris) {
  await delay(100);
  const user = getActiveUser();
  const myOki = ambilIdOrganisasiUser(user);
  const inv = mockInventaris.find((it) => it.idInventaris === idInventaris);

  if (!inv) {
    throwError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Inventaris tidak ditemukan.',
    });
  }

  if (myOki && inv.idOrganisasi !== myOki) {
    throwError({
      status: 403,
      code: 'BUKAN_OKI_ANDA',
      message: 'Anda tidak dapat mengelola inventaris milik organisasi lain.',
      errors: {
        umum: 'Barang ini dikelola oleh ' + inv.namaOrganisasi + ', bukan OKI Anda.',
      },
    });
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
        umum: 'Barang masih memiliki peminjaman yang aktif, menunggu persetujuan, atau menunggu pengembalian.',
      },
    });
  }

  deleteMockInventarisById(idInventaris);
  return { ok: true, idInventaris };
}
