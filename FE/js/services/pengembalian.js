import { mockPengembalian } from '../data/pengembalian.js';
import { mockPeminjaman } from '../data/peminjaman.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import * as store from '../state/store.js';
import { getCurrentUser } from '../state/session.js';
import { isMockEnabled, apiFetch, delay } from './client.js';

function dataUrlToBlob(dataUrl) {
  if (typeof atob === 'undefined') {
    return Buffer.from(dataUrl.split(',')[1] || '', 'base64');
  }
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(parts[1] || '');
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export async function getPengembalian(params = {}) {
  if (isMockEnabled()) {
    await delay(50);
    return mockPengembalian;
  }

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.q) queryParams.set('q', params.q);
  if (params.mulai) queryParams.set('mulai', params.mulai);
  if (params.selesai) queryParams.set('selesai', params.selesai);
  if (params.page) queryParams.set('page', params.page);
  if (params.limit) queryParams.set('limit', params.limit);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const res = await apiFetch(`/api/pengajuan-saya/pengembalian${qs}`);
  const list = Array.isArray(res) ? res : res?.data || [];
  return list.map((item) => ({
    ...item,
    id: String(item.idPengembalian || item.idPeminjaman),
    idPengembalian: item.idPengembalian,
    idPeminjaman: item.idPeminjaman,
    namaBarang: item.namaBarang,
    organisasi: item.okiPemilik || 'Organisasi',
    namaOrganisasi: item.okiPemilik || 'Organisasi',
    logoUrl: item.logoPemilikUrl || item.logoUrl,
    tanggalMulai: item.tglMulai,
    tanggalSelesai: item.tglSelesai,
    startDate: item.tglMulai,
    endDate: item.tglSelesai,
    tanggalPengambilan: item.tanggalPengambilan,
    tanggalDikembalikan: item.tanggalDikembalikan,
    tanggalPengembalian: item.tanggalDikembalikan,
    tanggalDiajukan: item.tanggalDiajukan,
    jumlahUnit: item.jumlahPinjam,
    jumlahPinjam: item.jumlahPinjam,
    status: String(item.status || '').toLowerCase(),
    keperluan: item.keperluan,
    diprosesOleh: item.namaPemroses,
    alasanPenolakan: item.alasanPenolakan,
    lewatTenggat: item.lewatTenggat,
    inventaris: {
      idInventaris: item.idInventaris,
      namaBarang: item.namaBarang,
      namaOrganisasi: item.okiPemilik,
      logoUrl: item.logoPemilikUrl || item.logoUrl,
    },
    barang: {
      id: item.idInventaris,
      idInventaris: item.idInventaris,
      nama: item.namaBarang,
      namaBarang: item.namaBarang,
      organisasi: item.okiPemilik,
      namaOrganisasi: item.okiPemilik,
      logoUrl: item.logoPemilikUrl || item.logoUrl,
    },
  }));
}

/**
 * Detail pengembalian berdasarkan ID.
 */
export async function getPengembalianDetail(id) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/pengajuan-saya/pengembalian/${id}`);
  }
  return mockPengembalian.find((item) => String(item.id) === String(id) || String(item.idPengembalian) === String(id)) || null;
}

/**
 * Daftar pengembalian yang dikelola PJ untuk barang milik OKI-nya.
 * @param {object} params
 * @returns {Promise<Array<object>>}
 */
export async function getKelolaPengembalian(params = {}) {
  if (isMockEnabled()) {
    await delay(50);
    return mockPengembalian;
  }

  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') queryParams.set('status', params.status);
  if (params.q || params.cari) queryParams.set('q', params.q || params.cari);
  if (params.mulai || params.dari) queryParams.set('dari', params.mulai || params.dari);
  if (params.selesai || params.sampai) queryParams.set('sampai', params.selesai || params.sampai);
  if (params.page) queryParams.set('page', params.page);
  if (params.limit || params.perPage) queryParams.set('limit', params.limit || params.perPage);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const res = await apiFetch(`/api/kelola-pengembalian${qs}`);
  const list = Array.isArray(res) ? res : res?.data || [];
  return list.map((item) => ({
    ...item,
    id: String(item.idPengembalian || item.idPeminjaman),
    idPengembalian: item.idPengembalian,
    idPeminjaman: item.idPeminjaman,
    nama: item.namaPeminjam || item.nama || 'Peminjam',
    namaPeminjam: item.namaPeminjam || item.nama || 'Peminjam',
    nim: item.nimPeminjam || item.nim || '',
    nimPeminjam: item.nimPeminjam || item.nim || '',
    barang: item.namaBarang || item.barang || 'Barang',
    namaBarang: item.namaBarang || item.barang || 'Barang',
    organisasi: item.okiPeminjam || item.organisasi || 'Organisasi',
    okiPeminjam: item.okiPeminjam || item.organisasi || 'Organisasi',
    namaOrganisasi: item.okiPeminjam || item.organisasi || 'Organisasi',
    jumlahUnit: item.jumlahPinjam ?? item.jumlahUnit ?? 1,
    jumlahPinjam: item.jumlahPinjam ?? item.jumlahUnit ?? 1,
    startDate: item.tglMulai,
    endDate: item.tglSelesai,
    mulai: item.tglMulai,
    selesai: item.tglSelesai,
    tanggalMulai: item.tglMulai,
    tanggalSelesai: item.tglSelesai,
    tanggalPengambilan: item.tanggalPengambilan,
    tanggalDikembalikan: item.tanggalDikembalikan,
    tanggalPengembalian: item.tanggalDikembalikan || item.tanggalDiajukan || item.tanggalPengembalian,
    tanggalDiajukan: item.tanggalDiajukan,
    status: item.status,
    keperluan: item.keperluan || '—',
    diprosesOleh: item.namaPemroses,
    alasanPenolakan: item.alasanPenolakan,
    lewatTenggat: item.lewatTenggat,
    peminjam: {
      nama: item.namaPeminjam,
      nim: item.nimPeminjam,
      organisasi: item.okiPeminjam,
    },
    inventaris: {
      idInventaris: item.idInventaris,
      namaBarang: item.namaBarang,
      namaOrganisasi: item.okiPemilik,
      logoUrl: item.logoPemilikUrl || item.logoUrl,
    },
  }));
}

/**
 * Detail pengembalian khusus kelola PJ.
 * @param {string|number} id
 * @returns {Promise<object>}
 */
export async function getKelolaPengembalianDetail(id) {
  if (isMockEnabled()) {
    await delay(50);
    return mockPengembalian.find((item) => String(item.id) === String(id) || String(item.idPengembalian) === String(id)) || null;
  }
  const cleanId = String(id).replace(/\D/g, '') || id;
  return await apiFetch(`/api/kelola-pengembalian/${cleanId}`);
}

function buatGalat(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  err.code = code;
  err.response = { status, data: { message } };
  return err;
}

/**
 * Peminjam mengajukan pengembalian untuk barang yang sedang dipinjam.
 * Status berubah dari "sedang_dipinjam" menjadi "menunggu_pengembalian".
 * @param {string|number} id
 */
export async function ajukanPengembalian(id) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/pengajuan-saya/peminjaman/${id}/pengembalian`, {
      method: 'POST',
    });
  }

  await delay(50);
  const row = mockPeminjaman.find((item) => String(item.id) === String(id) || String(item.idPeminjaman) === String(id));
  if (!row) throw buatGalat(404, 'PEMINJAMAN_TIDAK_DITEMUKAN', 'Data peminjaman tidak ditemukan.');
  const user = getCurrentUser();
  const ownerNim = row.pengguna?.nim || row.peminjam?.nim || null;
  const isDefaultMock = String(row.id || '').startsWith('pinjam-');
  if (user?.nim && ownerNim && String(user.nim) !== String(ownerNim) && !isDefaultMock) {
    throw buatGalat(403, 'BUKAN_PEMILIK', 'Anda tidak berhak mengajukan pengembalian ini.');
  }
  if (row.status !== STATUS_PEMINJAMAN.DIPINJAM && row.status !== STATUS_PEMINJAMAN.DITOLAK) {
    throw buatGalat(409, 'BUKAN_SEDANG_DIPINJAM', 'Hanya barang yang sedang dipinjam yang dapat diajukan pengembaliannya.');
  }
  row.status = STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN;
  row.alasanPenolakan = null;
  if (!row.tanggalPengembalian) {
    row.tanggalPengembalian = new Date().toISOString().slice(0, 10);
  }
  try { store.save('data:peminjaman', mockPeminjaman); } catch (error) { if (!store.isQuotaExceededError(error)) throw error; }
  return row;
}

/** Perbarui status konfirmasi pengembalian pada data mock untuk demo PJ. */
export async function updateMockPengembalianStatus(id, status, extra = {}) {
  if (!isMockEnabled()) {
    const cleanId = String(id).replace(/\D/g, '') || id;
    const isApprove = status === STATUS_PEMINJAMAN.DIKEMBALIKAN || status === 'dikembalikan' || status === 'selesai' || String(status).toLowerCase() === 'disetujui';
    if (isApprove) {
      const formData = new FormData();
      formData.set('jumlah', String(extra.jumlah || extra.jumlahUnit || extra.jumlahPinjam || 1));
      formData.set('tanggal', String(extra.tanggalPengembalian || extra.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 10));
      formData.set('kondisi', String(extra.kondisiPengembalian || extra.kondisi || 'Baik').toLowerCase() === 'rusak' ? 'Rusak' : 'Baik');
      if (extra.sanksi) formData.set('sanksi', String(extra.sanksi));

      const hasFile = (typeof File !== 'undefined' && extra.fotoFile instanceof File) || (typeof File !== 'undefined' && extra.foto instanceof File);
      const hasDataUrl = typeof extra.fotoKondisi === 'string' && extra.fotoKondisi.startsWith('data:');

      if (hasFile) {
        formData.set('foto', extra.fotoFile || extra.foto);
      } else if (hasDataUrl) {
        formData.set('foto', dataUrlToBlob(extra.fotoKondisi), 'kondisi.jpg');
      } else {
        // Fallback transparent 1x1 image blob so backend upload_validasi passes
        formData.set('foto', new Blob(['fake-kondisi-img'], { type: 'image/jpeg' }), 'kondisi.jpg');
      }

      return await apiFetch(`/api/kelola-pengembalian/${cleanId}/setujui`, {
        method: 'POST',
        body: formData,
      });
    } else {
      return await apiFetch(`/api/kelola-pengembalian/${cleanId}/tolak`, {
        method: 'POST',
        body: { alasan: extra.alasanPenolakan || extra.alasan || 'Ditolak oleh PJ' },
      });
    }
  }

  await delay(50);
  const allowed = [
    STATUS_PEMINJAMAN.DIKEMBALIKAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
    STATUS_PEMINJAMAN.DITOLAK,
    'selesai',
    'dikembalikan',
    'terlambat',
    'ditolak',
  ];
  if (!allowed.includes(status)) throw new Error('Status pengembalian tidak didukung.');
  const row = mockPeminjaman.find((item) => String(item.id) === String(id) || String(item.idPeminjaman) === String(id));
  if (!row) throw new Error('Data pengembalian tidak ditemukan.');
  row.status = status;
  if (status === STATUS_PEMINJAMAN.DIKEMBALIKAN || status === 'dikembalikan' || status === 'selesai') {
    row.tanggalPengembalian = extra.tanggalPengembalian || new Date().toISOString().slice(0, 10);
    if (extra.sanksi) row.sanksi = extra.sanksi;
    if (extra.kondisiPengembalian) row.kondisiPengembalian = extra.kondisiPengembalian;
    if (extra.fotoKondisi) row.fotoKondisi = extra.fotoKondisi;
  }
  if (status === STATUS_PEMINJAMAN.DITOLAK || status === 'ditolak') {
    if (extra.alasanPenolakan) row.alasanPenolakan = extra.alasanPenolakan;
  }
  try { store.save('data:peminjaman', mockPeminjaman); } catch (error) { if (!store.isQuotaExceededError(error)) throw error; }
  return row;
}

/**
 * Peminjam mengajukan kembali pengembalian setelah ditolak oleh PJ.
 * @param {string|number} id - ID pengembalian (idPengembalian)
 */
export async function ajukanUlangPengembalian(id) {
  if (!isMockEnabled()) {
    return await apiFetch(`/api/pengajuan-saya/pengembalian/${id}/ajukan-ulang`, {
      method: 'POST',
    });
  }

  return await ajukanPengembalian(id);
}