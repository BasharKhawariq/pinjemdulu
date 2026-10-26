/**
 * Service PEMINJAMAN dengan penegakan aturan bisnis & kuota sesuai kontrak API.
 */

import {
  mockPeminjaman,
  addMockPeminjaman,
  resetMockPeminjaman,
  getNextPeminjamanId,
} from '../data/peminjaman.js';
import {
  mockInventaris,
  addMockBooking,
  getMockPeminjamanAktifById,
  resetMockInventarisAndBookings,
  getMockToday,
} from '../data/inventaris.js';
import { mockUsers } from '../data/users.js';
import { STATUS_PEMINJAMAN, ROLES } from '../lib/constants.js';
import {
  getEarliestStartDate,
  isRangeAvailable,
  getMaxEndDate,
  getCommittedQuota,
  simulateQuotaWith,
} from '../lib/date-rules.js';
import { dateToISO, isoToDate, formatTanggal } from '../lib/format.js';
import { normalizeKondisi } from '../lib/kondisi.js';
import * as store from '../state/store.js';
import { getCurrentUser } from '../state/session.js';
import { delay } from './client.js';

const PEMINJAMAN_STORE_KEY = 'data:peminjaman';

function shiftDateStr(isoString, offsetDays) {
  const d = isoToDate(isoString);
  if (!d) return isoString;
  d.setDate(d.getDate() + offsetDays);
  return dateToISO(d);
}

let _mockCurrentUserOverride = null;

export function _setMockCurrentUserOverride(user) {
  _mockCurrentUserOverride = user;
}

function getActiveUser() {
  if (_mockCurrentUserOverride === false || _mockCurrentUserOverride === 'UNAUTHENTICATED') {
    return null;
  }
  if (_mockCurrentUserOverride) {
    return _mockCurrentUserOverride;
  }
  const cur = getCurrentUser();
  if (cur) return cur;
  if (typeof window === 'undefined') {
    return mockUsers[0];
  }
  return null;
}

/**
 * Reset seluruh state mock peminjaman dan inventaris (untuk test).
 */
export function _resetPeminjamanMockState(todayOverride = null) {
  resetMockPeminjaman();
  resetMockInventarisAndBookings(todayOverride);
  _mockCurrentUserOverride = null;
  store.save(PEMINJAMAN_STORE_KEY, [...mockPeminjaman]);
  store.save('data:inventaris', [...mockInventaris]);
}

/**
 * Dapatkan string tanggal acuan "hari ini" (ISO YYYY-MM-DD).
 */
export function getSystemToday() {
  return getMockToday();
}

/**
 * Daftar peminjaman.
 */
export async function getPeminjaman(params = {}) {
  await delay(80);
  return [...mockPeminjaman];
}

/**
 * Daftar peminjaman yang berkaitan dengan satu barang.
 */
export async function getPeminjamanByBarang(barangId) {
  await delay(80);
  return mockPeminjaman.filter(
    (p) =>
      p?.barang?.id === barangId ||
      p?.barang?.idInventaris === barangId ||
      p?.inventaris?.idInventaris === barangId
  );
}

/**
 * Ajukan peminjaman baru.
 */
export async function createPeminjaman({
  idInventaris,
  startDate,
  endDate,
  jumlahPinjam,
  keperluan,
}) {
  // 0. Autentikasi: wajib login
  const user = getActiveUser();
  if (!user) {
    const err = new Error('Anda harus masuk (login) terlebih dahulu.');
    err.status = 401;
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    err.response = {
      status: 401,
      data: { message: err.message, code: 'UNAUTHORIZED' },
    };
    throw err;
  }

  // 1. Cek inventaris
  const inv = mockInventaris.find((it) => String(it.idInventaris) === String(idInventaris));
  if (!inv) {
    const err = new Error('Inventaris tidak ditemukan.');
    err.status = 404;
    err.statusCode = 404;
    err.response = { status: 404, data: { message: 'Inventaris tidak ditemukan.' } };
    throw err;
  }

  if (normalizeKondisi(inv.kondisi) === 'rusak') {
    const err = new Error('Barang dalam kondisi rusak tidak dapat dipinjam.');
    err.status = 422;
    err.statusCode = 422;
    err.code = 'INVENTARIS_RUSAK';
    err.response = {
      status: 422,
      data: {
        code: 'INVENTARIS_RUSAK',
        message: err.message,
        errors: { umum: err.message },
      },
    };
    throw err;
  }

  // 2. Hak akses: PJ tidak boleh meminjam barang milik OKI SENDIRI
  if (user && user.role === ROLES.PENANGGUNG_JAWAB) {
    const idOkiUser = user?.organisasi?.idOrganisasi || user?.idOrganisasi || null;
    const idOkiBarang = inv?.idOrganisasi || null;
    if (idOkiUser && idOkiBarang && String(idOkiUser) === String(idOkiBarang)) {
      const errs = {
        umum: 'Barang milik OKI Anda tidak dapat dipinjam. Kelola lewat menu Pengelolaan.',
      };
      const err = new Error('OKI_SENDIRI: PJ tidak boleh meminjam barang milik OKI sendiri.');
      err.status = 422;
      err.statusCode = 422;
      err.code = 'OKI_SENDIRI';
      err.errors = errs;
      err.response = {
        status: 422,
        data: {
          message: 'OKI_SENDIRI',
          errors: errs,
          code: 'OKI_SENDIRI',
        },
      };
      throw err;
    }
  }

  // 3. Validasi field
  const errors = {};
  const today = getSystemToday();

  // Keperluan
  if (!keperluan || typeof keperluan !== 'string' || !keperluan.trim()) {
    errors.keperluan = 'Keperluan peminjaman wajib diisi.';
  }

  // Jumlah pinjam
  const qty = Number(jumlahPinjam);
  if (!Number.isInteger(qty) || qty <= 0) {
    errors.jumlahPinjam = 'Jumlah pinjam harus berupa bilangan bulat positif.';
  } else if (qty > inv.totalBarang) {
    errors.jumlahPinjam = `Jumlah pinjam (${qty}) melebihi total barang (${inv.totalBarang}).`;
  }

  // Tanggal mulai (H+2)
  const earliest = getEarliestStartDate(today);
  if (!startDate) {
    errors.startDate = 'Tanggal mulai wajib diisi.';
  } else if (isoToDate(startDate) === null) {
    errors.startDate = 'Format tanggal mulai tidak valid.';
  } else if (startDate < earliest) {
    errors.startDate = `Tanggal mulai paling awal ${earliest}`;
  }

  // Tanggal selesai
  if (!endDate) {
    errors.endDate = 'Tanggal selesai wajib diisi.';
  } else if (isoToDate(endDate) === null) {
    errors.endDate = 'Format tanggal selesai tidak valid.';
  } else if (startDate && isoToDate(startDate) !== null && endDate < startDate) {
    errors.endDate = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  }

  // 4. Validasi aturan tanggal & kuota
  if (!errors.startDate && !errors.endDate && !errors.jumlahPinjam) {
    const bookings = getMockPeminjamanAktifById(inv.idInventaris);

    const maxEnd = getMaxEndDate(startDate, bookings, {
      totalBarang: inv.totalBarang,
      jumlah: qty,
      today,
    });

    if (maxEnd !== null && maxEnd !== Infinity && endDate > maxEnd) {
      errors.endDate = `Tanggal selesai melewati batas maksimal yang tersedia (${maxEnd})`;
    }

    const rangeCheck = isRangeAvailable(startDate, endDate, bookings, {
      totalBarang: inv.totalBarang,
      jumlah: qty,
      today,
    });

    if (!rangeCheck.ok) {
      const sDate = isoToDate(startDate);
      const eDate = isoToDate(endDate);
      const tDate = isoToDate(today);
      const lo = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate() - 1);
      const hi = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate() + 1);

      let conflictDay = null;
      let sisaPadaHari = 0;

      for (let x = new Date(lo.getTime()); x <= hi; x.setDate(x.getDate() + 1)) {
        const committed = getCommittedQuota(x, bookings, tDate);
        const after = simulateQuotaWith(x, bookings, tDate, {
          start: sDate,
          end: eDate,
          qty,
        });
        if (after > inv.totalBarang) {
          sisaPadaHari = Math.max(0, inv.totalBarang - committed);
          conflictDay = dateToISO(x);
          break;
        }
      }

      const dayDisplay = conflictDay ? formatTanggal(conflictDay) : startDate;
      const pesanGalat = `Kuota barang tidak mencukupi pada tanggal ${dayDisplay} (sisa ${sisaPadaHari} unit dari pengajuan ${qty} unit).`;

      const err = new Error(pesanGalat);
      err.status = 409;
      err.statusCode = 409;
      err.code = 'KUOTA_HABIS';
      err.conflictDate = conflictDay || startDate;
      err.errors = {
        tanggal: pesanGalat,
        startDate: pesanGalat,
        endDate: pesanGalat,
        jumlahPinjam: pesanGalat,
        umum: pesanGalat,
      };
      err.response = {
        status: 409,
        data: {
          message: pesanGalat,
          code: 'KUOTA_HABIS',
          conflictDate: conflictDay || startDate,
          errors: err.errors,
        },
      };
      throw err;
    }
  }

  if (Object.keys(errors).length > 0) {
    const err = new Error('Validasi gagal.');
    err.status = 422;
    err.statusCode = 422;
    err.errors = errors;
    err.response = { status: 422, data: { message: 'Validasi gagal.', errors } };
    throw err;
  }

  // 5. Bangun objek peminjaman
  const bufferStartDate = shiftDateStr(startDate, -1);
  const bufferEndDate = shiftDateStr(endDate, 1);
  const idPeminjaman = getNextPeminjamanId();

  const peminjamanBaru = {
    idPeminjaman,
    id: `pinjam-${idPeminjaman}`,
    pengguna: {
      nim: user.nim || '254107020789',
      nama: user.nama || 'Maitri Sakti',
    },
    peminjam: user,
    inventaris: {
      idInventaris: inv.idInventaris,
      namaBarang: inv.namaBarang,
      namaOrganisasi: inv.namaOrganisasi || 'BEM',
      thumbnail: inv.thumbnail,
      idOrganisasi: inv.idOrganisasi,
      kategori: inv.kategori || inv.namaKategori,
    },
    barang: {
      id: inv.idInventaris,
      idInventaris: inv.idInventaris,
      nama: inv.namaBarang,
      namaBarang: inv.namaBarang,
      organisasi: inv.namaOrganisasi || 'BEM',
      gambar: inv.thumbnail,
      kategori: inv.kategori || inv.namaKategori,
    },
    tanggalPengajuan: new Date().toISOString(),
    startDate,
    endDate,
    bufferStartDate,
    bufferEndDate,
    tanggalPengembalian: null,
    status: STATUS_PEMINJAMAN.DIAJUKAN,
    alasanPenolakan: null,
    keperluan: keperluan.trim(),
    jumlahPinjam: qty,
    kondisiSebelum: null,
    deskripsiSebelum: null,
    kondisiSesudah: null,
    deskripsiSesudah: null,
    sanksi: null,
  };

  addMockPeminjaman(peminjamanBaru);
  // Simpan booking ke inventaris
  const bookingEntry = {
    startDate,
    endDate,
    bufferStartDate,
    bufferEndDate,
    jumlahPinjam: qty,
    status: STATUS_PEMINJAMAN.DIAJUKAN,
    keperluan: keperluan.trim(),
    namaOrganisasi: user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || 'BEM',
  };

  addMockBooking(inv.idInventaris, bookingEntry);

  try {
    store.save(PEMINJAMAN_STORE_KEY, mockPeminjaman);
    store.save('data:inventaris', mockInventaris);
  } catch (err) {
    if (store.isQuotaExceededError(err)) {
      const quotaErr = new Error('Penyimpanan browser penuh. Tidak dapat menyimpan pengajuan peminjaman.');
      quotaErr.status = 507;
      quotaErr.statusCode = 507;
      quotaErr.code = 'STORAGE_FULL';
      throw quotaErr;
    }
    throw err;
  }

  return peminjamanBaru;
}


/**
 * Perbarui status peminjaman pada store mock (khusus simulasi frontend).
 * @param {string|number} id
 * @param {string} status
 */
export async function updateMockPeminjamanStatus(id, status) {
  await delay(80);
  const allowed = [STATUS_PEMINJAMAN.DISETUJUI, STATUS_PEMINJAMAN.DITOLAK];
  if (!allowed.includes(status)) throw new Error('Status tujuan tidak didukung.');
  const row = mockPeminjaman.find((item) => String(item.id) === String(id) || String(item.idPeminjaman) === String(id));
  if (!row) throw new Error('Data peminjaman tidak ditemukan.');
  if (!(row.status === STATUS_PEMINJAMAN.DIAJUKAN || String(row.status).toLowerCase() === 'diajukan')) {
    throw new Error('Hanya pengajuan berstatus Diajukan yang dapat diproses.');
  }
  row.status = status;
  try {
    store.save(PEMINJAMAN_STORE_KEY, mockPeminjaman);
  } catch (error) {
    // Penyimpanan lokal bersifat tambahan untuk demo; perubahan store memory tetap berlaku.
    if (!store.isQuotaExceededError(error)) throw error;
  }
  return row;
}
