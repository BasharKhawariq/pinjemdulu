/**
 * status-chip.js — Komponen chip status bersama untuk PinjemDulu.
 */
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { escapeHtml } from './html.js';

/**
 * Mendapatkan kelas warna chip berdasarkan status transaksi.
 * @param {string} status
 * @returns {string}
 */
export function statusChipClass(status) {
  const s = String(status || '').toLowerCase().trim();
  if (
    s === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ||
    s === 'menunggu_pengembalian' ||
    s === 'menunggu'
  ) {
    return 'bg-amber-100 text-amber-800';
  }
  if (
    s === STATUS_PEMINJAMAN.DIKEMBALIKAN ||
    s === 'selesai' ||
    s === 'dikembalikan'
  ) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (
    s === STATUS_PEMINJAMAN.DISETUJUI ||
    s === 'disetujui'
  ) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (
    s === STATUS_PEMINJAMAN.TERLAMBAT ||
    s === 'terlambat'
  ) {
    return 'bg-rose-100 text-rose-800';
  }
  if (
    s === STATUS_PEMINJAMAN.DITOLAK ||
    s === 'ditolak'
  ) {
    return 'bg-rose-100 text-rose-800';
  }
  if (
    s === STATUS_PEMINJAMAN.DIAJUKAN ||
    s === 'diajukan' ||
    s === 'menunggu_persetujuan'
  ) {
    return 'bg-blue-100 text-blue-700';
  }
  if (
    s === STATUS_PEMINJAMAN.DIPINJAM ||
    s === 'dipinjam' ||
    s === 'sedang dipinjam' ||
    s === 'sedang_dipinjam'
  ) {
    return 'bg-purple-100 text-purple-700';
  }
  return 'bg-zinc-100 text-zinc-700';
}

/**
 * Format teks tampilan status.
 * @param {string} status
 * @returns {string}
 */
export function formatStatusLabel(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === STATUS_PEMINJAMAN.DIAJUKAN || s === 'diajukan' || s === 'menunggu_persetujuan') return 'Diajukan';
  if (s === STATUS_PEMINJAMAN.DISETUJUI || s === 'disetujui') return 'Disetujui';
  if (s === STATUS_PEMINJAMAN.DIPINJAM || s === 'dipinjam' || s === 'sedang dipinjam' || s === 'sedang_dipinjam') return 'Dipinjam';
  if (s === STATUS_PEMINJAMAN.DITOLAK || s === 'ditolak') return 'Ditolak';
  if (s === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || s === 'menunggu_pengembalian' || s === 'menunggu') return 'Menunggu';
  if (s === STATUS_PEMINJAMAN.DIKEMBALIKAN || s === 'selesai' || s === 'dikembalikan') return 'Dikembalikan';
  if (s === STATUS_PEMINJAMAN.TERLAMBAT || s === 'terlambat') return 'Terlambat';
  return status || '—';
}

/**
 * Render elemen chip status HTML.
 * @param {object} props
 * @param {string} props.status
 * @param {string} [props.label]
 * @param {string} [props.className]
 * @returns {string}
 */
export function renderStatusChip(arg) {
  const isObj = typeof arg === 'object' && arg !== null;
  const status = isObj ? arg.status : arg;
  const label = isObj ? arg.label : undefined;
  const className = (isObj ? arg.className : '') || '';
  const text = label || formatStatusLabel(status);
  const cls = statusChipClass(status);
  return `<span class="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-medium ${cls} ${className}">${escapeHtml(text)}</span>`;
}
