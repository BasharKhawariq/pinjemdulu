import { mockRequestPj } from '../data/request-pj.js';
import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import { delay } from './client.js';
import { validateLampiran } from '../lib/pengajuan-pj.js';
import { getCurrentUser } from '../state/session.js';
import * as store from '../state/store.js';
import { mockOrganisasi } from '../data/organisasi.js';
import { mockUsers } from '../data/users.js';

export async function getRequestPj() {
  await delay(50);
  return [...mockRequestPj];
}

export async function updateMockRequestPjStatus(id, status, alasanPenolakan = null) {
  await delay(50);
  if (![STATUS_REQUEST_PJ.MENUNGGU, STATUS_REQUEST_PJ.DISETUJUI, STATUS_REQUEST_PJ.DITOLAK].includes(status)) {
    throw new Error('Status pengajuan PJ tidak valid.');
  }
  const row = mockRequestPj.find((item) => String(item.id) === String(id));
  if (!row) throw new Error('Pengajuan PJ tidak ditemukan.');
  row.status = status;
  if (status === STATUS_REQUEST_PJ.DITOLAK) row.alasanPenolakan = alasanPenolakan || 'Pengajuan ditolak oleh pengelola.';
  else row.alasanPenolakan = null;
  return { ...row };
}

function buatGalat(status, code, message, errors) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  err.code = code;
  if (errors) err.errors = errors;
  err.response = { status, data: { code, message, ...(errors ? { errors } : {}) } };
  return err;
}

/**
 * Daftar pengajuan PJ milik satu pengguna (terbaru di atas).
 * @param {string} nim
 */
export async function getRequestPjSaya(nim) {
  await delay(50);
  return mockRequestPj
    .filter((item) => String(item.pemohon?.nim) === String(nim))
    .map((item) => ({ ...item }));
}

/**
 * Buat pengajuan menjadi Penanggung Jawab. Pemohon diambil dari sesi login.
 * @param {{ lampiran: { name: string, size: number } }} payload
 * @param {object} [sesi] pengguna pemohon; default pengguna login
 */
export async function createRequestPj({ lampiran } = {}, sesi = getCurrentUser()) {
  await delay(50);
  // Sesi hanya menyimpan data ringkas; profil lengkap (organisasi) diambil dari data pengguna.
  const pemohon = sesi ? mockUsers.find((u) => String(u.nim) === String(sesi.nim)) || sesi : null;
  if (!pemohon) throw buatGalat(401, 'UNAUTHORIZED', 'Anda harus masuk (login) terlebih dahulu.');
  const pesan = validateLampiran(lampiran);
  if (pesan) throw buatGalat(422, 'VALIDASI_GAGAL', pesan, { lampiran: pesan });

  const organisasi =
    mockOrganisasi.find((o) => o.namaOrganisasi === pemohon.displayOrganization) ||
    pemohon.organisasi ||
    null;
  const baru = {
    id: `req-pj-${Date.now().toString(36)}-${mockRequestPj.length + 1}`,
    pemohon,
    organisasi,
    tanggalPengajuan: new Date().toISOString().slice(0, 19),
    status: STATUS_REQUEST_PJ.MENUNGGU,
    alasan: '',
    lampiran: { nama: lampiran.name, ukuran: lampiran.size },
  };
  mockRequestPj.unshift(baru);
  try { store.save('data:request-pj', mockRequestPj); } catch (error) {
    if (!store.isQuotaExceededError(error)) throw error;
  }
  return { ...baru };
}
