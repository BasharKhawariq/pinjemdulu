/**
 * detail-inventaris.js — Logika murni view model detail inventaris dan jadwal peminjaman.
 * Bebas efek samping dan DOM, cocok untuk runner node:test.
 */

import { ROLES, STATUS_MENAHAN_BARANG, LABEL_KONDISI, KONDISI_BARANG } from './constants.js';
import { normalizeKondisi } from './kondisi.js';
import { formatTanggal, formatTanggalPendek } from './format.js';

export const ALASAN_TOMBOL_AJUKAN = Object.freeze({
  INVENTARIS_RUSAK: 'Barang dalam kondisi rusak tidak dapat dipinjam.',
  OKI_SENDIRI: 'Barang milik OKI Anda tidak dapat dipinjam. Kelola lewat menu Pengelolaan.',
  STOK_HABIS: 'Stok barang saat ini tidak tersedia.',
});

/**
 * Filter dan urutkan jadwal peminjaman aktif yang menahan barang.
 *
 * @param {Array<object>} rawJadwal
 * @returns {Array<object>}
 */
export function filterAndSortJadwal(rawJadwal = []) {
  if (!Array.isArray(rawJadwal)) return [];

  // 1. Ambil hanya status yang menahan barang
  const menahanSet = new Set(STATUS_MENAHAN_BARANG);
  const filtered = rawJadwal.filter((item) => {
    if (!item || !item.status) return false;
    return menahanSet.has(item.status);
  });

  // 2. Urutkan berdasarkan startDate ascending (tanggal paling awal lebih dulu)
  filtered.sort((a, b) => {
    const dateA = String(a.startDate || '');
    const dateB = String(b.startDate || '');
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  });

  // 3. Sanitasi format tampilan dan proteksi data pribadi
  return filtered.map((j) => {
    const startShort = formatTanggalPendek(j.startDate);
    const rentangText = `${formatTanggal(j.startDate)} - ${formatTanggal(j.endDate)}`;

    return {
      id: j.id || j.idPeminjaman || '',
      startDate: j.startDate,
      endDate: j.endDate,
      bufferStartDate: j.bufferStartDate || j.startDate,
      bufferEndDate: j.bufferEndDate || j.endDate,
      jumlahPinjam: Number(j.jumlahPinjam) || 1,
      status: j.status,
      keperluan: j.keperluan || 'Kegiatan',
      namaOrganisasi: j.namaOrganisasi || (typeof j.organisasi === 'object' ? j.organisasi?.namaOrganisasi : '') || '-',
      startShort,
      rentangText,
    };
  });
}

/**
 * Tentukan status tombol "Ajukan Peminjaman" berdasarkan kondisi barang, kepemilikan OKI, dan stok.
 *
 * @param {object} inv
 * @param {object|null} user
 * @returns {{ enabled: boolean, alasan: string, code: 'INVENTARIS_RUSAK'|'OKI_SENDIRI'|'STOK_HABIS'|null }}
 */
export function getAjukanButtonStatus(inv, user = null) {
  if (!inv) {
    return { enabled: false, alasan: 'Barang tidak ditemukan.', code: null };
  }

  const kondisi = normalizeKondisi(inv.kondisi);
  const isRusak = kondisi === KONDISI_BARANG.RUSAK;

  // 1. Aturan Barang Rusak (INVENTARIS_RUSAK)
  if (isRusak) {
    return {
      enabled: false,
      alasan: ALASAN_TOMBOL_AJUKAN.INVENTARIS_RUSAK,
      code: 'INVENTARIS_RUSAK',
    };
  }

  // 2. Aturan PJ meminjam barang milik OKI sendiri (OKI_SENDIRI)
  const isPJ = user?.role === ROLES.PENANGGUNG_JAWAB;
  const idOkiUser = user?.organisasi?.idOrganisasi || user?.idOrganisasi || null;
  const idOkiBarang = inv?.idOrganisasi || (typeof inv?.organisasi === 'object' ? inv?.organisasi?.idOrganisasi : null) || null;

  if (isPJ && idOkiUser && idOkiBarang && String(idOkiUser) === String(idOkiBarang)) {
    return {
      enabled: false,
      alasan: ALASAN_TOMBOL_AJUKAN.OKI_SENDIRI,
      code: 'OKI_SENDIRI',
    };
  }

  // 3. Aturan Stok Habis (hanya berlaku jika stok master totalBarang nol)
  const total = Number(inv.totalBarang) || 0;
  if (total <= 0) {
    return {
      enabled: false,
      alasan: ALASAN_TOMBOL_AJUKAN.STOK_HABIS,
      code: 'STOK_HABIS',
    };
  }

  // Siap diajukan
  return {
    enabled: true,
    alasan: '',
    code: null,
  };
}

/**
 * Membangun view model lengkap siap tampil untuk halaman detail inventaris.
 *
 * @param {object} inventaris
 * @param {Array<object>} [jadwal=[]]
 * @param {object|null} [user=null]
 * @param {string} [today='']
 * @returns {object|null}
 */
export function getDetailViewModel(inventaris, jadwal = [], user = null, today = '') {
  if (!inventaris) return null;

  void today;

  const kondisi = normalizeKondisi(inventaris.kondisi) || 'baik';
  const isRusak = kondisi === KONDISI_BARANG.RUSAK;
  const total = Number(inventaris.totalBarang) || 0;
  const sisa = isRusak ? 0 : Number(inventaris.sisaHariIni ?? total);
  const tersedia = !isRusak && sisa > 0;

  const ajukanStatus = getAjukanButtonStatus(inventaris, user);
  const jadwalList = filterAndSortJadwal(jadwal);

  return {
    idInventaris: inventaris.idInventaris,
    namaBarang: inventaris.namaBarang || 'Barang Inventaris',
    namaKategori: inventaris.namaKategori || 'Kategori',
    namaOrganisasi: inventaris.namaOrganisasi || 'Organisasi Kampus',
    lokasi: inventaris.lokasi || 'Gedung Kemahasiswaan',
    totalBarang: total,
    sisaHariIni: sisa,
    kondisi,
    labelKondisi: LABEL_KONDISI[kondisi] || kondisi,
    isRusak,
    tersedia,
    thumbnail: inventaris.thumbnail || '',
    deskripsiBarang: inventaris.deskripsiBarang || '',
    ajukanStatus,
    jadwal: jadwalList,
  };
}
