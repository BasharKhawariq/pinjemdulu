import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_USE_MOCK = 'true';

import { getPeminjaman, _resetPeminjamanMockState } from '../js/services/peminjaman.js';
import { ajukanPengembalian } from '../js/services/pengembalian.js';
import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';

test.beforeEach(() => _resetPeminjamanMockState());
test.afterEach(() => _resetPeminjamanMockState());

async function findByStatus(status) {
  const all = await getPeminjaman();
  return all.find((row) => row.status === status);
}

test('ajukanPengembalian: barang sedang dipinjam berubah menjadi menunggu pengembalian', async () => {
  const row = await findByStatus(STATUS_PEMINJAMAN.DIPINJAM);
  assert.ok(row, 'data mock harus punya peminjaman berstatus sedang dipinjam');
  const result = await ajukanPengembalian(row.id);
  assert.equal(result.status, STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN);
});

test('ajukanPengembalian: ditolak 409 bila status bukan sedang dipinjam', async () => {
  const row = await findByStatus(STATUS_PEMINJAMAN.DIAJUKAN);
  await assert.rejects(() => ajukanPengembalian(row.id), (err) => err.status === 409 && err.code === 'BUKAN_SEDANG_DIPINJAM');
});

test('ajukanPengembalian: ditolak 409 bila diajukan dua kali', async () => {
  const row = await findByStatus(STATUS_PEMINJAMAN.DIPINJAM);
  await ajukanPengembalian(row.id);
  await assert.rejects(() => ajukanPengembalian(row.id), (err) => err.status === 409);
});

test('ajukanPengembalian: ditolak 404 bila data tidak ada', async () => {
  await assert.rejects(() => ajukanPengembalian('tidak-ada'), (err) => err.status === 404 && err.code === 'PEMINJAMAN_TIDAK_DITEMUKAN');
});