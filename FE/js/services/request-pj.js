import { mockRequestPj } from '../data/request-pj.js';
import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import { isMockEnabled, apiFetch, delay } from './client.js';
import { validateLampiran } from '../lib/pengajuan-pj.js';
import { getCurrentUser } from '../state/session.js';
import * as store from '../state/store.js';
import { mockOrganisasi } from '../data/organisasi.js';
import { mockUsers } from '../data/users.js';

export async function getRequestPj() {
  if (isMockEnabled()) {
    await delay(50);
    return [...mockRequestPj];
  }
  const user = getCurrentUser();
  const endpoint = user?.isPj || String(user?.role || '').toLowerCase().includes('jawab') || user?.role === 'admin'
    ? '/api/kelola-pengajuan-pj'
    : '/api/pengajuan-pj';
  const res = await apiFetch(endpoint);
  const list = Array.isArray(res) ? res : res?.data || [];
  return list.map((item) => ({
    ...item,
    id: String(item.idRequest || item.id),
    idRequest: item.idRequest,
    nama: item.namaPemohon || item.nama || 'Pemohon',
    namaPemohon: item.namaPemohon || item.nama || 'Pemohon',
    nim: item.nimPemohon || item.nim || '',
    nimPemohon: item.nimPemohon || item.nim || '',
    organisasi: item.okiPemohon || item.organisasi || 'Organisasi',
    okiPemohon: item.okiPemohon || item.organisasi || 'Organisasi',
    namaOrganisasi: item.okiPemohon || item.organisasi || 'Organisasi',
    pemohon: {
      nim: item.nimPemohon || item.nim,
      nama: item.namaPemohon || item.nama,
      organisasi: item.okiPemohon || item.organisasi,
    },
    tanggalPengajuan: item.tanggalRequest || item.tanggalPengajuan || item.createdAt,
    status: item.status,
    alasanPenolakan: item.alasanPenolakan,
    namaPemroses: item.namaPemroses,
    lampiranUrl: item.lampiranUrl,
    logoUrl: item.logoUrl || null,
  }));
}

export async function updateMockRequestPjStatus(id, status, alasanPenolakan = null) {
  if (!isMockEnabled()) {
    const cleanId = String(id).replace(/\D/g, '') || id;
    const isApprove = status === STATUS_REQUEST_PJ.DISETUJUI || String(status).toLowerCase() === 'disetujui';
    if (isApprove) {
      return await apiFetch(`/api/kelola-pengajuan-pj/${cleanId}/setujui`, {
        method: 'POST',
      });
    } else {
      return await apiFetch(`/api/kelola-pengajuan-pj/${cleanId}/tolak`, {
        method: 'POST',
        body: { alasan: alasanPenolakan || 'Ditolak oleh PJ' },
      });
    }
  }

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
  if (isMockEnabled()) {
    await delay(50);
    return mockRequestPj
      .filter((item) => String(item.pemohon?.nim) === String(nim))
      .map((item) => ({ ...item }));
  }

  const res = await apiFetch('/api/pengajuan-pj');
  const list = Array.isArray(res) ? res : res?.data || [];
  return list.map((item) => ({
    ...item,
    id: String(item.idRequest || item.id),
    idRequest: item.idRequest,
    pemohon: {
      nim: item.nimPemohon,
      nama: item.namaPemohon,
    },
    organisasi: {
      namaOrganisasi: item.okiPemohon,
      singkatan: item.okiPemohon,
      logoUrl: item.logoUrl,
    },
    namaOrganisasi: item.okiPemohon,
    logoUrl: item.logoUrl,
    tanggalPengajuan: item.tanggalRequest || item.tanggalPengajuan,
    status: item.status,
    alasanPenolakan: item.alasanPenolakan,
    namaPemroses: item.namaPemroses,
    tanggalDiproses: item.tanggalDiproses,
    lampiranUrl: item.lampiranUrl,
  }));
}

/**
 * Detail pengajuan PJ berdasarkan ID.
 * @param {number|string} id
 */
export async function getRequestPjDetail(id) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/pengajuan-pj/${id}`);
  }
  return mockRequestPj.find((item) => String(item.id) === String(id) || String(item.idRequest) === String(id)) || null;
}

/**
 * Buat pengajuan menjadi Penanggung Jawab. Pemohon diambil dari sesi login.
 * @param {{ lampiran: { name: string, size: number } | File | Blob }} payload
 * @param {object} [sesi] pengguna pemohon; default pengguna login
 */
export async function createRequestPj({ lampiran, lampiranFile } = {}, sesi = getCurrentUser()) {
  if (!isMockEnabled()) {
    const file = lampiran?.file || lampiranFile || lampiran;
    const formData = new FormData();
    formData.append('lampiran', file);
    return await apiFetch('/api/pengajuan-pj', {
      method: 'POST',
      body: formData,
    });
  }

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
