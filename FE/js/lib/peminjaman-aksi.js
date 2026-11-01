/**
 * peminjaman-aksi.js — Aturan aksi pada baris Pengajuan Saya > Peminjaman (logika murni).
 */

import { STATUS_PEMINJAMAN } from './constants.js';

function normalizeStatus(status) {
  return String(status ?? '').trim().toLowerCase().replaceAll('_', ' ');
}

/**
 * Pengembalian hanya bisa diajukan saat barang sedang dipinjam.
 * @param {string} status
 * @returns {boolean}
 */
export function canAjukanPengembalian(status) {
  const normalized = normalizeStatus(status);
  return normalized === normalizeStatus(STATUS_PEMINJAMAN.DIPINJAM) || normalized === 'dipinjam';
}

/**
 * Daftar aksi yang tampil di kolom Aksi, berurutan dari kiri ke kanan.
 * @param {string} status
 * @returns {Array<'kembali'|'detail'>}
 */
export function getRowActions(status) {
  return canAjukanPengembalian(status) ? ['kembali', 'detail'] : ['detail'];
}
