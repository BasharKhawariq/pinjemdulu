import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_PEMINJAMAN,
  STATUS_PEMINJAMAN_VARIANT,
  STATUS_MENAHAN_BARANG,
  LABEL_STATUS_PEMINJAMAN,
  getStatusLabel,
  BADGE_VARIANT_DEFAULT,
} from '../js/lib/constants.js';

const SEMUA_STATUS = Object.values(STATUS_PEMINJAMAN);

/* -------------------------------------------------------------------------- */
/*                           Nilai enum STATUS_PEMINJAMAN                     */
/* -------------------------------------------------------------------------- */

test('STATUS_PEMINJAMAN nilai — SEMUA snake_case sesuai kontrak API', () => {
  assert.equal(STATUS_PEMINJAMAN.DIAJUKAN, 'menunggu_persetujuan');
  assert.equal(STATUS_PEMINJAMAN.DISETUJUI, 'disetujui');
  assert.equal(STATUS_PEMINJAMAN.DITOLAK, 'ditolak');
  assert.equal(STATUS_PEMINJAMAN.DIPINJAM, 'sedang_dipinjam');
  assert.equal(STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN, 'menunggu_pengembalian');
  assert.equal(STATUS_PEMINJAMAN.DIKEMBALIKAN, 'selesai');
  assert.equal(STATUS_PEMINJAMAN.TERLAMBAT, 'terlambat');
});

test('STATUS_MENAHAN_BARANG — 5 status sesuai kontrak', () => {
  const expected = [
    STATUS_PEMINJAMAN.DIAJUKAN,
    STATUS_PEMINJAMAN.DISETUJUI,
    STATUS_PEMINJAMAN.DIPINJAM,
    STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
  ];
  assert.deepEqual(STATUS_MENAHAN_BARANG.slice().sort(), expected.slice().sort());
  assert.ok(!STATUS_MENAHAN_BARANG.includes(STATUS_PEMINJAMAN.DITOLAK));
  assert.ok(!STATUS_MENAHAN_BARANG.includes(STATUS_PEMINJAMAN.DIKEMBALIKAN));
});

/* -------------------------------------------------------------------------- */
/*                                 Variant Badge                              */
/* -------------------------------------------------------------------------- */

test('STATUS_PEMINJAMAN_VARIANT — setiap status punya varian', () => {
  for (const s of SEMUA_STATUS) {
    assert.ok(
      typeof STATUS_PEMINJAMAN_VARIANT[s] === 'string' && STATUS_PEMINJAMAN_VARIANT[s] !== '',
      `status ${s} harus punya variant`
    );
  }
});

test('STATUS_PEMINJAMAN_VARIANT — pemetaan warna sesuai spesifikasi', () => {
  assert.equal(STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.DIAJUKAN], 'info');
  assert.equal(STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.DISETUJUI], 'success');
  assert.equal(STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.DITOLAK], 'danger');
  assert.equal(STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.DIPINJAM], 'warning');
  assert.equal(
    STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN],
    'warning'
  );
  assert.equal(STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.DIKEMBALIKAN], 'success');
  assert.equal(STATUS_PEMINJAMAN_VARIANT[STATUS_PEMINJAMAN.TERLAMBAT], 'danger');
});

/* -------------------------------------------------------------------------- */
/*                           getStatusLabel — konteks                         */
/* -------------------------------------------------------------------------- */

test('getStatusLabel(konteks=PEMINJAMAN) — hanya 4 label sesuai tab Peminjaman', () => {
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DIAJUKAN, 'peminjaman'),
    LABEL_STATUS_PEMINJAMAN.DIAJUKAN
  );
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DISETUJUI, 'peminjaman'),
    LABEL_STATUS_PEMINJAMAN.DISETUJUI
  );
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DIPINJAM, 'peminjaman'),
    LABEL_STATUS_PEMINJAMAN.DIPINJAM
  );
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DITOLAK, 'peminjaman'),
    LABEL_STATUS_PEMINJAMAN.DITOLAK
  );
});

test('getStatusLabel(konteks=PENGEMBALIAN) — 3 label sesuai tab Pengembalian', () => {
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN, 'pengembalian'),
    LABEL_STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN
  );
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DIKEMBALIKAN, 'pengembalian'),
    LABEL_STATUS_PEMINJAMAN.DIKEMBALIKAN
  );
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.TERLAMBAT, 'pengembalian'),
    LABEL_STATUS_PEMINJAMAN.TERLAMBAT
  );
});

test('getStatusLabel — status lintas konteks: kembalikan label umum (TIDAK throw)', () => {
  // Status milik Pengembalian ditampilkan di konteks Peminjaman: pakai label umum.
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN, 'peminjaman'),
    'Menunggu Pengembalian'
  );
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.TERLAMBAT, 'peminjaman'),
    LABEL_STATUS_PEMINJAMAN.TERLAMBAT
  );
  // Status milik Peminjaman ditampilkan di konteks Pengembalian.
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DISETUJUI, 'pengembalian'),
    LABEL_STATUS_PEMINJAMAN.DISETUJUI
  );
});

test('getStatusLabel — unknown status tidak melempar: fallback BADGE_VARIANT_DEFAULT tidak trigger, tapi label dikembalikan apa adanya', () => {
  assert.equal(getStatusLabel('status_asing', 'peminjaman'), 'status_asing');
});

test('getStatusLabel — konteks default = peminjaman', () => {
  assert.equal(
    getStatusLabel(STATUS_PEMINJAMAN.DIAJUKAN),
    getStatusLabel(STATUS_PEMINJAMAN.DIAJUKAN, 'peminjaman')
  );
});
