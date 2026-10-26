import { mockPengembalian } from '../data/pengembalian.js';
import { mockPeminjaman } from '../data/peminjaman.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import * as store from '../state/store.js';
import { delay } from './client.js';

export async function getPengembalian() {
  await delay(50);
  return mockPengembalian;
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
