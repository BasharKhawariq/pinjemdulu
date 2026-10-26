import test from 'node:test';
import assert from 'node:assert/strict';

import {
  reduceAjukanForm,
  getAjukanBlock,
  INITIAL_AJUKAN_FORM_STATE,
} from '../js/lib/ajukan-form.js';
import { ROLES } from '../js/lib/constants.js';

/* -------------------------------------------------------------------------- */
/*  (1) ATURAN BLOKIR PENGAJUAN (getAjukanBlock)                              */
/* -------------------------------------------------------------------------- */

test('getAjukanBlock: barang kondisi rusak diblokir untuk semua pengguna', () => {
  const peminjam = { idPengguna: 'user-1', role: ROLES.PEMINJAM, idOrganisasi: 'oki-1' };
  const pj = { idPengguna: 'user-2', role: ROLES.PENANGGUNG_JAWAB, idOrganisasi: 'oki-2' };
  const barangRusak = { idInventaris: 'inv-x', kondisi: 'rusak', idOrganisasi: 'oki-3' };

  assert.equal(
    getAjukanBlock(peminjam, barangRusak),
    'Barang dalam kondisi rusak tidak dapat dipinjam.'
  );
  assert.equal(
    getAjukanBlock(pj, barangRusak),
    'Barang dalam kondisi rusak tidak dapat dipinjam.'
  );
});

test('getAjukanBlock: PJ tidak boleh meminjam barang milik OKI sendiri', () => {
  const pjBEM = { idPengguna: 'user-pj', role: ROLES.PENANGGUNG_JAWAB, idOrganisasi: 'oki-bem' };
  const barangBEM = { idInventaris: 'inv-1', kondisi: 'baik', idOrganisasi: 'oki-bem' };
  const barangHMTI = { idInventaris: 'inv-2', kondisi: 'baik', idOrganisasi: 'oki-hmti' };

  // PJ meminjam barang OKI sendiri -> diblokir
  assert.equal(
    getAjukanBlock(pjBEM, barangBEM),
    'Barang milik OKI Anda tidak dapat dipinjam.'
  );

  // PJ meminjam barang OKI lain -> dibolehkan (null)
  assert.equal(getAjukanBlock(pjBEM, barangHMTI), null);
});

test('getAjukanBlock: peminjam biasa bebas meminjam barang OKI manapun', () => {
  const peminjam = { idPengguna: 'user-pem', role: ROLES.PEMINJAM, idOrganisasi: 'oki-bem' };
  const barangBEM = { idInventaris: 'inv-1', kondisi: 'baik', idOrganisasi: 'oki-bem' };
  const barangHMTI = { idInventaris: 'inv-2', kondisi: 'baik', idOrganisasi: 'oki-hmti' };

  assert.equal(getAjukanBlock(peminjam, barangBEM), null);
  assert.equal(getAjukanBlock(peminjam, barangHMTI), null);
});

/* -------------------------------------------------------------------------- */
/*  (2) REDUCER FORMULIR (reduceAjukanForm)                                    */
/* -------------------------------------------------------------------------- */

test('reduceAjukanForm: setJumlah tanpa tanggal membatasi jumlah ke totalBarang', () => {
  let state = INITIAL_AJUKAN_FORM_STATE;

  state = reduceAjukanForm(state, {
    type: 'setJumlah',
    payload: 3,
    totalBarang: 5,
  });
  assert.equal(state.jumlahPinjam, 3);
  assert.equal(state.resetNote, null);

  // Melebihi totalBarang
  state = reduceAjukanForm(state, {
    type: 'setJumlah',
    payload: 10,
    totalBarang: 5,
  });
  assert.equal(state.jumlahPinjam, 5);
});

test('reduceAjukanForm: aturan (a) applyDates membatasi jumlah jika melebihi kuota rentang', () => {
  // Simulasi barang dengan total 5 unit, tetapi pada rentang tertentu hanya sisa 2 unit
  const bookings = [
    {
      startDate: '2026-10-15',
      endDate: '2026-10-18',
      jumlahPinjam: 3,
      status: 'disetujui',
    },
  ];
  const context = {
    bookings,
    totalBarang: 5,
    today: '2026-10-09',
  };

  let state = {
    ...INITIAL_AJUKAN_FORM_STATE,
    jumlahPinjam: 4, // Ingin pinjam 4 unit
  };

  state = reduceAjukanForm(state, {
    type: 'applyDates',
    payload: { startDate: '2026-10-15', endDate: '2026-10-18' },
    ...context,
  });

  // Kuota sisa pada rentang adalah 2 unit, maka jumlah unit harus diturunkan ke 2
  assert.equal(state.jumlahPinjam, 2);
  assert.equal(state.dates.startDate, '2026-10-15');
  assert.equal(state.dates.endDate, '2026-10-18');
  assert.ok(state.resetNote?.includes('Jumlah unit disesuaikan menjadi 2 unit'));
});

test('reduceAjukanForm: aturan (b) setJumlah mereset tanggal jika kuota tidak lagi cukup', () => {
  // Kuota total 4 unit. Booking 2 unit. Tersisa 2 unit pada rentang tersebut.
  const bookings = [
    {
      startDate: '2026-10-15',
      endDate: '2026-10-18',
      jumlahPinjam: 2,
      status: 'disetujui',
    },
  ];
  const context = {
    bookings,
    totalBarang: 4,
    today: '2026-10-09',
  };

  let state = {
    ...INITIAL_AJUKAN_FORM_STATE,
    jumlahPinjam: 2,
    dates: { startDate: '2026-10-15', endDate: '2026-10-18' },
  };

  // Naikkan jumlahPinjam menjadi 3 unit (melebihi sisa 2 unit yang valid untuk rentang)
  state = reduceAjukanForm(state, {
    type: 'setJumlah',
    payload: 3,
    ...context,
  });

  // Tanggal harus direset dan muncul catatan reset
  assert.equal(state.dates.startDate, null);
  assert.equal(state.dates.endDate, null);
  assert.equal(state.jumlahPinjam, 3);
  assert.equal(state.resetNote, 'Tanggal direset karena jumlah unit berubah');
});

test('reduceAjukanForm: setKeperluan memperbarui nilai dan menghapus galat', () => {
  let state = {
    ...INITIAL_AJUKAN_FORM_STATE,
    errors: { keperluan: 'Keperluan wajib diisi' },
  };

  state = reduceAjukanForm(state, {
    type: 'setKeperluan',
    payload: 'Kegiatan Seminar Nasional',
  });

  assert.equal(state.keperluan, 'Kegiatan Seminar Nasional');
  assert.equal(state.errors.keperluan, undefined);
});

test('reduceAjukanForm: aturan (c) submitError memetakan galat 422 per bidang', () => {
  let state = {
    ...INITIAL_AJUKAN_FORM_STATE,
    isSubmitting: true,
  };

  state = reduceAjukanForm(state, {
    type: 'submitError',
    error: 'Validasi pengajuan gagal',
    fieldErrors: {
      jumlahPinjam: 'Jumlah unit melebihi kuota',
      keperluan: 'Keperluan terlalu panjang',
    },
  });

  assert.equal(state.isSubmitting, false);
  assert.equal(state.generalError, 'Validasi pengajuan gagal');
  assert.equal(state.errors.jumlahPinjam, 'Jumlah unit melebihi kuota');
  assert.equal(state.errors.keperluan, 'Keperluan terlalu panjang');
});

test('reduceAjukanForm: aturan (d) submitStart mencegah pengiriman ganda', () => {
  let state = {
    ...INITIAL_AJUKAN_FORM_STATE,
    isSubmitting: true,
  };

  const newState = reduceAjukanForm(state, {
    type: 'submitStart',
  });

  // Karena sedang submitting, state tidak berubah
  assert.equal(newState, state);
  assert.equal(newState.isSubmitting, true);
});

test('reduceAjukanForm: submitSuccess menandai sukses pengiriman', () => {
  let state = {
    ...INITIAL_AJUKAN_FORM_STATE,
    isSubmitting: true,
  };

  state = reduceAjukanForm(state, {
    type: 'submitSuccess',
  });

  assert.equal(state.isSubmitting, false);
  assert.equal(state.isSuccess, true);
});
