import { mockPengembalian } from '../data/pengembalian.js';
import { mockPeminjaman } from '../data/peminjaman.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import * as store from '../state/store.js';
import { getCurrentUser } from '../state/session.js';
import { delay } from './client.js';

export async function getPengembalian() {
  await delay(50);
  return mockPengembalian;
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
  await delay(50);
  const row = mockPeminjaman.find((item) => String(item.id) === String(id) || String(item.idPeminjaman) === String(id));
  if (!row) throw buatGalat(404, 'PEMINJAMAN_TIDAK_DITEMUKAN', 'Data peminjaman tidak ditemukan.');
  const user = getCurrentUser();
  const ownerNim = row.pengguna?.nim || row.peminjam?.nim || null;
  if (user?.nim && ownerNim && String(user.nim) !== String(ownerNim)) {
    throw buatGalat(403, 'BUKAN_PEMILIK', 'Anda tidak berhak mengajukan pengembalian ini.');
  }
  if (row.status !== STATUS_PEMINJAMAN.DIPINJAM) {
    throw buatGalat(409, 'BUKAN_SEDANG_DIPINJAM', 'Hanya barang yang sedang dipinjam yang dapat diajukan pengembaliannya.');
  }
  row.status = STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN;
  try { store.save('data:peminjaman', mockPeminjaman); } catch (error) { if (!store.isQuotaExceededError(error)) throw error; }
  return row;
}

/** Perbarui status konfirmasi pengembalian pada data mock untuk demo PJ. */
export async function updateMockPengembalianStatus(id, status) {
  await delay(50);
  const allowed = [STATUS_PEMINJAMAN.DIKEMBALIKAN, STATUS_PEMINJAMAN.TERLAMBAT];
  if (!allowed.includes(status)) throw new Error('Status pengembalian tidak didukung.');
  const row = mockPeminjaman.find((item) => String(item.id) === String(id) || String(item.idPeminjaman) === String(id));
  if (!row) throw new Error('Data pengembalian tidak ditemukan.');
  if (row.status !== STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN) {
    throw new Error('Hanya pengembalian yang menunggu konfirmasi yang dapat diproses.');
  }
  row.status = status;
  if (status === STATUS_PEMINJAMAN.DIKEMBALIKAN) row.tanggalPengembalian = new Date().toISOString().slice(0, 10);
  try { store.save('data:peminjaman', mockPeminjaman); } catch (error) { if (!store.isQuotaExceededError(error)) throw error; }
  return row;
}