import test from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';
import { getDayStatus } from '../js/lib/date-rules.js';
import { getPhase, reduceRangeSelection, isRangeStillValid } from '../js/lib/range-selection.js';

const ctx = {
  bookings: [],
  totalBarang: 2,
  jumlahPinjam: 1,
  today: '2026-10-01',
};

function reduce(state, date, overrides = {}) {
  return reduceRangeSelection(state, date, {
    ...ctx,
    ...overrides,
    options: {
      totalBarang: overrides.totalBarang ?? ctx.totalBarang,
      jumlah: overrides.jumlahPinjam ?? ctx.jumlahPinjam,
      today: overrides.today ?? ctx.today,
    },
  });
}

test('getPhase membedakan start, end, dan done', () => {
  assert.equal(getPhase({ start: null, end: null }), 'start');
  assert.equal(getPhase({ start: '2026-10-03', end: null }), 'end');
  assert.equal(getPhase({ start: '2026-10-03', end: '2026-10-03' }), 'done');
});

test('pemilihan mulai tepat H+2 lalu rentang satu hari', () => {
  const first = reduce({ start: null, end: null }, '2026-10-03');
  assert.deepEqual(first, {
    state: { start: '2026-10-03', end: null },
    accepted: true,
    reason: '',
  });
  const same = reduce(first.state, '2026-10-03');
  assert.equal(same.accepted, true);
  assert.deepEqual(same.state, { start: '2026-10-03', end: '2026-10-03' });
});

test('tanggal sebelum H+2 ditolak', () => {
  const result = reduce({ start: null, end: null }, '2026-10-02');
  assert.equal(result.accepted, false);
  assert.match(result.reason, /tersedia/);
});

test('klik sebelum mulai yang valid mengulang tanggal mulai', () => {
  const result = reduce({ start: '2026-10-10', end: null }, '2026-10-05');
  assert.equal(result.accepted, true);
  assert.deepEqual(result.state, { start: '2026-10-05', end: null });
});

test('klik di luar batas akhir ditolak', () => {
  const booking = {
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-10',
    selesai: '2026-10-12',
    jumlahPinjam: 1,
  };
  const result = reduce({ start: '2026-10-03', end: null }, '2026-10-10', {
    bookings: [booking],
    totalBarang: 1,
  });
  assert.equal(result.accepted, false);
  assert.match(result.reason, /bentrok/);
});

test('jumlah unit lebih besar dari kuota menolak mulai', () => {
  const result = reduce({ start: null, end: null }, '2026-10-03', {
    totalBarang: 2,
    jumlahPinjam: 3,
  });
  assert.equal(result.accepted, false);
});

test('status buffer persiapan dan pengecekan berbagi hari tetap deterministik', () => {
  const bookings = [
    {
      status: STATUS_PEMINJAMAN.DIPINJAM,
      mulai: '2026-10-10',
      selesai: '2026-10-12',
      jumlahPinjam: 1,
    },
    {
      status: STATUS_PEMINJAMAN.DIPINJAM,
      mulai: '2026-10-14',
      selesai: '2026-10-16',
      jumlahPinjam: 1,
    },
  ];
  const status = getDayStatus('2026-10-13', {
    bookings,
    totalBarang: 2,
    jumlahPinjam: 1,
    today: '2026-10-01',
  });
  assert.equal(status.status, 'buffer_prep');
  assert.equal(status.sisa, 1);
});

test('getDayStatus mencakup past, full, check, out_of_range, dan free', () => {
  const booking = {
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-10',
    selesai: '2026-10-12',
    jumlahPinjam: 1,
  };
  const base = { bookings: [booking], totalBarang: 2, jumlahPinjam: 1, today: '2026-10-01' };
  assert.equal(getDayStatus('2026-10-02', base).status, 'past');
  assert.equal(getDayStatus('2026-10-10', { ...base, totalBarang: 1 }).status, 'full');
  assert.equal(getDayStatus('2026-10-13', base).status, 'buffer_check');
  assert.equal(
    getDayStatus('2026-10-10', {
      ...base,
      totalBarang: 1,
      phase: 'end',
      start: '2026-10-03',
    }).status,
    'out_of_range'
  );
  assert.equal(getDayStatus('2026-10-05', base).status, 'free');
  for (const date of ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']) {
    const status = getDayStatus(date, base);
    assert.equal(status.status === 'free', true);
  }
});

test('isRangeStillValid: valid jika null/parsial atau kuota masih cukup', () => {
  assert.equal(isRangeStillValid(null, ctx), true);
  assert.equal(isRangeStillValid({ startDate: null, endDate: null }, ctx), true);
  assert.equal(isRangeStillValid({ startDate: '2026-10-03', endDate: null }, ctx), true);

  // Kuota 2, pinjam 1 -> valid
  assert.equal(
    isRangeStillValid(
      { startDate: '2026-10-03', endDate: '2026-10-05' },
      { ...ctx, totalBarang: 2, jumlahPinjam: 1 }
    ),
    true
  );

  // Kuota 2, pinjam 3 -> tidak valid
  assert.equal(
    isRangeStillValid(
      { startDate: '2026-10-03', endDate: '2026-10-05' },
      { ...ctx, totalBarang: 2, jumlahPinjam: 3 }
    ),
    false
  );
});
