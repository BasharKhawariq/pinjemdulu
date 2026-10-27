import test from 'node:test';
import assert from 'node:assert/strict';

import { canAjukanPengembalian, getRowActions } from '../js/lib/peminjaman-aksi.js';
import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';

test('canAjukanPengembalian: hanya true saat status sedang dipinjam', () => {
  assert.equal(canAjukanPengembalian(STATUS_PEMINJAMAN.DIPINJAM), true);
  assert.equal(canAjukanPengembalian('dipinjam'), true);
  assert.equal(canAjukanPengembalian('Sedang Dipinjam'), true);
  assert.equal(canAjukanPengembalian(STATUS_PEMINJAMAN.DIAJUKAN), false);
  assert.equal(canAjukanPengembalian(STATUS_PEMINJAMAN.DISETUJUI), false);
  assert.equal(canAjukanPengembalian(STATUS_PEMINJAMAN.DITOLAK), false);
  assert.equal(canAjukanPengembalian(STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN), false);
  assert.equal(canAjukanPengembalian(undefined), false);
});

test('getRowActions: dipinjam punya tombol kembali lalu detail, status lain hanya detail', () => {
  assert.deepEqual(getRowActions(STATUS_PEMINJAMAN.DIPINJAM), ['kembali', 'detail']);
  assert.deepEqual(getRowActions(STATUS_PEMINJAMAN.DIAJUKAN), ['detail']);
  assert.deepEqual(getRowActions(STATUS_PEMINJAMAN.DITOLAK), ['detail']);
  assert.deepEqual(getRowActions(null), ['detail']);
});