import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceAjukanAction, INITIAL_AJUKAN_STATE } from '../js/lib/ajukan-state.js';

test('reduceAjukanAction mengelola input jumlah dan keperluan', () => {
  let state = INITIAL_AJUKAN_STATE;
  
  state = reduceAjukanAction(state, { type: 'ubah-jumlah', payload: 3 });
  assert.equal(state.jumlah, 3);
  assert.equal(state.isDirty, true);

  state = reduceAjukanAction(state, { type: 'ubah-keperluan', payload: 'Acara BEM' });
  assert.equal(state.keperluan, 'Acara BEM');
});

test('terapkan-tanggal dan hapus-tanggal mengelola rentang sekaligus', () => {
  let state = INITIAL_AJUKAN_STATE;
  
  state = reduceAjukanAction(state, { 
    type: 'terapkan-tanggal', 
    payload: { startDate: '2026-10-10', endDate: '2026-10-12' } 
  });
  assert.equal(state.startDate, '2026-10-10');
  assert.equal(state.endDate, '2026-10-12');

  state = reduceAjukanAction(state, { type: 'hapus-tanggal' });
  assert.equal(state.startDate, null);
  assert.equal(state.endDate, null);
});

test('kirim-sukses dan kirim-gagal mengelola status pengiriman', () => {
  let state = INITIAL_AJUKAN_STATE;
  
  state = reduceAjukanAction(state, { type: 'kirim' });
  assert.equal(state.isSubmitting, true);

  state = reduceAjukanAction(state, { 
    type: 'kirim-sukses', 
    payload: { idPeminjaman: 'P-123' } 
  });
  assert.equal(state.isSubmitting, false);
  assert.equal(state.isSuccess, true);
  assert.equal(state.idPeminjaman, 'P-123');
  assert.equal(state.isDirty, false);

  state = reduceAjukanAction(INITIAL_AJUKAN_STATE, { 
    type: 'kirim-gagal', 
    payload: { errors: { jumlah: 'Stok tidak cukup' }, generalError: 'Gagal sistem' } 
  });
  assert.equal(state.isSubmitting, false);
  assert.equal(state.errors.jumlah, 'Stok tidak cukup');
  assert.equal(state.generalError, 'Gagal sistem');
});

test('buka-dialog-konfirmasi dan tutup-dialog-konfirmasi mengelola showConfirmModal', () => {
  let state = INITIAL_AJUKAN_STATE;
  assert.equal(state.showConfirmModal, false);

  state = reduceAjukanAction(state, { type: 'buka-dialog-konfirmasi' });
  assert.equal(state.showConfirmModal, true);

  state = reduceAjukanAction(state, { type: 'tutup-dialog-konfirmasi' });
  assert.equal(state.showConfirmModal, false);
});
