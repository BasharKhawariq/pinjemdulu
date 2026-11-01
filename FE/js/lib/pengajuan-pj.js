/**
 * pengajuan-pj.js — Logika murni halaman Pengajuan PJ (peminjam).
 * Tanpa akses DOM/storage agar mudah diuji.
 */
import { STATUS_REQUEST_PJ } from './constants.js';

export const MAKS_UKURAN_LAMPIRAN = 2 * 1024 * 1024; // 2 MB
export const EKSTENSI_LAMPIRAN = ['jpg', 'jpeg', 'png', 'pdf'];

export const TAB_PENGAJUAN_PJ = [
  { key: STATUS_REQUEST_PJ.MENUNGGU, label: 'Menunggu' },
  { key: STATUS_REQUEST_PJ.DISETUJUI, label: 'Disetujui' },
  { key: STATUS_REQUEST_PJ.DITOLAK, label: 'Ditolak' },
];

/**
 * Validasi berkas lampiran surat.
 * @param {{ name?: string, size?: number }|null|undefined} file
 * @returns {string} pesan galat, atau '' bila valid
 */
export function validateLampiran(file) {
  if (!file || !file.name) return 'Lampiran surat wajib diunggah.';
  const ext = String(file.name).split('.').pop().toLowerCase();
  if (!EKSTENSI_LAMPIRAN.includes(ext)) return 'Format lampiran harus JPG, PNG, atau PDF.';
  if (!(Number(file.size) > 0)) return 'Lampiran surat tidak boleh kosong.';
  if (Number(file.size) > MAKS_UKURAN_LAMPIRAN) return 'Ukuran lampiran maksimal 2MB.';
  return '';
}

/** Filter pengajuan milik NIM tertentu pada tab status tertentu. */
export function filterPengajuanPj(rows, { nim, status } = {}) {
  return (rows || []).filter((row) => {
    if (nim && String(row.pemohon?.nim) !== String(nim)) return false;
    return !status || String(row.status).toLowerCase() === status;
  });
}

/** Nama organisasi yang ditampilkan untuk pemohon. */
export function namaOrganisasiPemohon(pemohon, organisasi = null) {
  return (
    organisasi?.namaOrganisasi ||
    pemohon?.displayOrganization ||
    pemohon?.organisasi?.namaOrganisasi ||
    '—'
  );
}
