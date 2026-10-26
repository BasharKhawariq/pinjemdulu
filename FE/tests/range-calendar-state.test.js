import test from 'node:test';
import assert from 'node:assert/strict';
import { initCalendarState, reduceCalendarAction } from '../js/lib/range-calendar-state.js';
import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';

const ctx = {
  bookings: [],
  totalBarang: 2,
  today: '2026-10-01',
};

test('initCalendarState menginisialisasi state dengan benar', () => {
  const state = initCalendarState({ today: '2026-10-01' });
  assert.equal(state.bulanTampil.year, 2026);
  assert.equal(state.bulanTampil.month, 10);
  assert.equal(state.mulai, null);
  assert.equal(state.selesai, null);
  assert.equal(state.fokusTanggal, '2026-10-01');
  assert.equal(state.terbuka, false);
  assert.equal(state.jumlah, 1);
});

test('buka dan tutup mengubah status terbuka', () => {
  let state = initCalendarState({ today: '2026-10-01' });
  
  const resBuka = reduceCalendarAction(state, { type: 'buka' }, ctx);
  assert.equal(resBuka.state.terbuka, true);
  assert.equal(resBuka.state.fokusTanggal, '2026-10-01');

  const resTutup = reduceCalendarAction(resBuka.state, { type: 'tutup' }, ctx);
  assert.equal(resTutup.state.terbuka, false);
});

test('navigasi bulan mengubah bulanTampil', () => {
  let state = initCalendarState({ today: '2026-10-01' });
  
  const next = reduceCalendarAction(state, { type: 'bulan-berikutnya' }, ctx);
  assert.deepEqual(next.state.bulanTampil, { year: 2026, month: 11 });

  const prev = reduceCalendarAction(next.state, { type: 'bulan-sebelumnya' }, ctx);
  assert.deepEqual(prev.state.bulanTampil, { year: 2026, month: 10 });

  // Pindah tahun
  const jan = { ...state, bulanTampil: { year: 2027, month: 1 } };
  const prevYear = reduceCalendarAction(jan, { type: 'bulan-sebelumnya' }, ctx);
  assert.deepEqual(prevYear.state.bulanTampil, { year: 2026, month: 12 });

  const dec = { ...state, bulanTampil: { year: 2026, month: 12 } };
  const nextYear = reduceCalendarAction(dec, { type: 'bulan-berikutnya' }, ctx);
  assert.deepEqual(nextYear.state.bulanTampil, { year: 2027, month: 1 });
});

test('pilih-tanggal mengelola rentang mulai dan selesai', () => {
  let state = initCalendarState({ today: '2026-10-01' });
  
  // Pilih mulai (H+2)
  const step1 = reduceCalendarAction(state, { type: 'pilih-tanggal', payload: '2026-10-03' }, ctx);
  assert.equal(step1.accepted, true);
  assert.equal(step1.state.mulai, '2026-10-03');
  assert.equal(step1.state.selesai, null);

  // Pilih selesai (sama dengan mulai)
  const step2 = reduceCalendarAction(step1.state, { type: 'pilih-tanggal', payload: '2026-10-03' }, ctx);
  assert.equal(step2.accepted, true);
  assert.equal(step2.state.mulai, '2026-10-03');
  assert.equal(step2.state.selesai, '2026-10-03');

  // Klik tanggal lain setelah done -> mulai baru
  const step3 = reduceCalendarAction(step2.state, { type: 'pilih-tanggal', payload: '2026-10-05' }, ctx);
  assert.equal(step3.state.mulai, '2026-10-05');
  assert.equal(step3.state.selesai, null);

  // Pilih sebelum mulai -> reset mulai
  const step4 = reduceCalendarAction(step3.state, { type: 'pilih-tanggal', payload: '2026-10-04' }, ctx);
  assert.equal(step4.state.mulai, '2026-10-04');
  assert.equal(step4.state.selesai, null);
});

test('reset-pilihan mengosongkan rentang', () => {
  let state = { ...initCalendarState({ today: '2026-10-01' }), mulai: '2026-10-03', selesai: '2026-10-05' };
  const res = reduceCalendarAction(state, { type: 'reset-pilihan' }, ctx);
  assert.equal(res.state.mulai, null);
  assert.equal(res.state.selesai, null);
});

test('fokus-pindah mengubah fokusTanggal dan sinkron bulan', () => {
  let state = initCalendarState({ today: '2026-10-01' });
  
  const res = reduceCalendarAction(state, { type: 'fokus-pindah', payload: 'ArrowDown' }, ctx);
  assert.equal(res.state.fokusTanggal, '2026-10-08');

  // Pindah ke bulan lain
  const res2 = reduceCalendarAction(state, { type: 'fokus-pindah', payload: 'PageDown' }, ctx);
  assert.equal(res2.state.fokusTanggal, '2026-11-01');
  assert.deepEqual(res2.state.bulanTampil, { year: 2026, month: 11 });
});

test('jumlah-berubah memvalidasi ulang rentang', () => {
  const ctxWithBooking = {
    ...ctx,
    totalBarang: 2,
    bookings: [
      { mulai: '2026-10-10', selesai: '2026-10-12', jumlahPinjam: 1, status: STATUS_PEMINJAMAN.DIPINJAM }
    ]
  };
  
  let state = { 
    ...initCalendarState({ today: '2026-10-01' }), 
    mulai: '2026-10-09', 
    selesai: '2026-10-11',
    jumlah: 1
  };

  // Ubah jumlah jadi 2 -> bentrok karena ada booking lain (total 2)
  // Tanggal 10-11 butuh 2 + 1 = 3 > total 2.
  const res = reduceCalendarAction(state, { type: 'jumlah-berubah', payload: 2 }, ctxWithBooking);
  assert.equal(res.accepted, false);
  assert.equal(res.state.mulai, null);
  assert.equal(res.state.selesai, null);
  assert.equal(res.state.jumlah, 2);

  // Jika baru pilih mulai, dan jumlah berubah jadi tidak valid
  let stateMulai = { ...initCalendarState({ today: '2026-10-01' }), mulai: '2026-10-10', jumlah: 1 };
  const resMulai = reduceCalendarAction(stateMulai, { type: 'jumlah-berubah', payload: 2 }, ctxWithBooking);
  assert.equal(resMulai.accepted, false);
  assert.equal(resMulai.state.mulai, null);
});

test('terapkan menutup dialog jika valid', () => {
  let stateValid = { ...initCalendarState({ today: '2026-10-01' }), mulai: '2026-10-03', selesai: '2026-10-05', terbuka: true };
  const res1 = reduceCalendarAction(stateValid, { type: 'terapkan' }, ctx);
  assert.equal(res1.accepted, true);
  assert.equal(res1.state.terbuka, false);

  let stateInvalid = { ...initCalendarState({ today: '2026-10-01' }), mulai: '2026-10-03', selesai: null, terbuka: true };
  const res2 = reduceCalendarAction(stateInvalid, { type: 'terapkan' }, ctx);
  assert.equal(res2.accepted, false);
  assert.equal(res2.state.terbuka, true);
});
