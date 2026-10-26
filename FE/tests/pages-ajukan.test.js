import test from 'node:test';
import assert from 'node:assert/strict';

import * as AjukanPage from '../js/pages/ajukan.js';
import { mockInventaris, getMockPeminjamanAktifById, setMockToday } from '../js/data/inventaris.js';
import { mockUsers } from '../js/data/users.js';
import { ROLES, STATUS_PEMINJAMAN } from '../js/lib/constants.js';
import {
  mapServiceErrorsToForm,
  formatRentangTanggal,
  getAjukanGate,
  hitungRingkasan,
} from '../js/lib/ajukan-page.js';
import { INITIAL_AJUKAN_STATE, reduceAjukanAction } from '../js/lib/ajukan-state.js';
import { createPeminjaman, _resetPeminjamanMockState, _setMockCurrentUserOverride } from '../js/services/peminjaman.js';
import { getPeminjamanAktif } from '../js/services/inventaris.js';
import { buildMonthModel } from '../js/lib/calendar-model.js';
import { initCalendarState, reduceCalendarAction } from '../js/lib/range-calendar-state.js';

const FORBIDDEN_ESCAPED_TAGS = [
  '&lt;svg',
  '&lt;button',
  '&lt;div',
  '&lt;p',
  '&lt;span',
  '&lt;a ',
  '&lt;input',
  '&lt;label',
  '&lt;textarea',
  '&lt;td',
  '&lt;tr',
  '&amp;lt;',
];

function assertNoEscapedMarkup(output, componentName = 'AjukanPage') {
  for (const token of FORBIDDEN_ESCAPED_TAGS) {
    assert.equal(
      output.includes(token),
      false,
      `${componentName} tidak boleh memuat fragmen markup ter-escape '${token}'`
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  1. RENDER SEMUA KEADAAN (FORM, GERBANG TERTUTUP, LOADING, ERROR, SUKSES)  */
/* -------------------------------------------------------------------------- */

test('pages-ajukan: render loading skeleton', () => {
  const html = AjukanPage.render({ loading: true }).toString();
  assert.ok(html.includes('animate-pulse'));
  assert.equal(html.includes('form-ajukan'), false);
  assertNoEscapedMarkup(html);
  assert.equal(html.includes('undefined'), false);
});

test('pages-ajukan: render error pemuatan dengan tombol coba lagi', () => {
  const html = AjukanPage.render({
    error: 'Gagal memuat inventaris dari server',
    catalogQuery: 'kategori=elektronik',
  }).toString();

  assert.ok(html.includes('Gagal Memuat Data'));
  assert.ok(html.includes('Gagal memuat inventaris dari server'));
  assert.ok(html.includes('data-action="coba-lagi"'));
  assert.ok(html.includes('kategori=elektronik'));
  assertNoEscapedMarkup(html);
  assert.equal(html.includes('undefined'), false);
});

test('pages-ajukan: render gerbang tertutup untuk barang rusak (tanpa form)', () => {
  const itemRusak = {
    idInventaris: 'inv-rusak',
    namaBarang: 'Kamera Rusak',
    kondisi: 'rusak',
    idOrganisasi: 'oki-1',
  };
  const gate = getAjukanGate(mockUsers[0], itemRusak);
  assert.equal(gate.canAjukan, false);

  const html = AjukanPage.render({
    item: itemRusak,
    user: mockUsers[0],
    gate,
  }).toString();

  assert.ok(html.includes('Pengajuan Tidak Tersedia'));
  assert.ok(html.includes('Barang dalam kondisi rusak tidak dapat dipinjam.'));
  assert.equal(html.includes('id="form-ajukan"'), false, 'form tidak boleh dirender');
  assert.equal(html.includes('id="input-jumlah"'), false);
  assert.ok(html.includes('data-action="kembali-detail"'));
  assertNoEscapedMarkup(html);
  assert.equal(html.includes('undefined'), false);
});

test('pages-ajukan: render gerbang tertutup untuk PJ meminjam barang OKI sendiri (tanpa form)', () => {
  const pjBem = mockUsers[1]; // PJ BEM (oki-1)
  const itemBem = {
    idInventaris: 'inv-1',
    namaBarang: 'Proyektor BEM',
    kondisi: 'baik',
    idOrganisasi: 'oki-1',
  };
  const gate = getAjukanGate(pjBem, itemBem);
  assert.equal(gate.canAjukan, false);

  const html = AjukanPage.render({
    item: itemBem,
    user: pjBem,
    gate,
  }).toString();

  assert.ok(html.includes('Pengajuan Tidak Tersedia'));
  assert.ok(html.includes('Barang milik OKI Anda tidak dapat dipinjam.'));
  assert.ok(html.includes('#/kelola/inventaris'), 'ada tautan ke kelola inventaris');
  assert.equal(html.includes('id="form-ajukan"'), false);
  assertNoEscapedMarkup(html);
  assert.equal(html.includes('undefined'), false);
});

test('pages-ajukan: render gerbang terbuka untuk peminjam normal dan PJ OKI lain', () => {
  const item = {
    idInventaris: 'inv-2',
    namaBarang: 'Mic Wireless',
    kondisi: 'baik',
    totalBarang: 4,
    namaOrganisasi: 'BEM',
  };
  const gate = getAjukanGate(mockUsers[0], item);
  assert.equal(gate.canAjukan, true);

  const html = AjukanPage.render({
    item,
    user: mockUsers[0],
    gate,
    today: '2026-10-09',
  }).toString();

  assert.ok(html.includes('Ajukan Peminjaman'));
  assert.ok(html.includes('Pengajuan Peminjaman'));
  assert.ok(html.includes('Nama Lengkap'));
  assert.ok(html.includes('NIM'));
  assert.ok(html.includes('OKI Peminjam'));
  assert.ok(html.includes('Barang Dipinjam'));
  assert.ok(html.includes('Mic Wireless'));
  assert.ok(html.includes('Total ketersediaan fisik:'));
  assert.ok(html.includes('id="form-ajukan"'));
  assert.ok(html.includes('id="input-jumlah"'));
  assert.ok(html.includes('Keperluan Peminjaman Barang'));
  assert.ok(html.includes('id="input-keperluan"'));
  assert.ok(html.includes('id="tanggal-peminjaman-trigger"'));
  assertNoEscapedMarkup(html);
  assert.equal(html.includes('undefined'), false);
});

/* -------------------------------------------------------------------------- */
/*  2. TEPAT SATU PEMICU TANGGAL (TIDAK ADA DUA INPUT TANGGAL TERPISAH)       */
/* -------------------------------------------------------------------------- */

test('pages-ajukan: TEPAT SATU pemicu tanggal rentang dan tidak ada dua input tanggal di form', () => {
  const item = {
    idInventaris: 'inv-1',
    namaBarang: 'Proyektor',
    kondisi: 'baik',
    totalBarang: 2,
  };
  const html = AjukanPage.render({
    item,
    user: mockUsers[0],
    gate: { canAjukan: true },
  }).toString();

  // Cari elemen pemicu tanggal
  const triggerMatches = [...html.matchAll(/id="tanggal-peminjaman-trigger"/g)];
  assert.equal(triggerMatches.length, 1, 'Harus ada TEPAT SATU elemen pemicu tanggal');

  // Pastikan TIDAK ADA input tanggal terpisah
  assert.equal(html.includes('type="date"'), false, 'Tidak boleh ada input type="date"');
  assert.equal(html.includes('name="startDate"'), false);
  assert.equal(html.includes('name="endDate"'), false);
  assert.equal(html.includes('id="startDate"'), false);
  assert.equal(html.includes('id="endDate"'), false);
  assert.equal(html.includes('id="input-start-date"'), false);
  assert.equal(html.includes('id="input-end-date"'), false);

  // Periksa atribut aksesibilitas pemicu
  assert.ok(html.includes('aria-haspopup="dialog"'));
  assert.ok(html.includes('data-action="open-calendar"'));
});

/* -------------------------------------------------------------------------- */
/*  3. TEKS RENTANG & TOMBOL HAPUS TANGGAL                                    */
/* -------------------------------------------------------------------------- */

test('pages-ajukan: teks rentang benar untuk kosong, satu hari, dan multi-hari', () => {
  const item = { idInventaris: 'inv-1', namaBarang: 'Item', kondisi: 'baik', totalBarang: 2 };
  const baseProps = { item, user: mockUsers[0], gate: { canAjukan: true } };

  // 1. Kosong
  const htmlKosong = AjukanPage.render({
    ...baseProps,
    formState: { ...INITIAL_AJUKAN_STATE, startDate: null, endDate: null },
  }).toString();
  assert.ok(htmlKosong.includes('Pilih Tanggal'));
  assert.equal(htmlKosong.includes('data-action="hapus-tanggal"'), false, 'tombol hapus tanggal tidak muncul saat kosong');

  // 2. Satu hari
  const htmlSatuHari = AjukanPage.render({
    ...baseProps,
    formState: { ...INITIAL_AJUKAN_STATE, startDate: '2026-10-20', endDate: '2026-10-20' },
  }).toString();
  assert.ok(htmlSatuHari.includes('20 Okt 2026'));
  assert.equal(htmlSatuHari.includes('20 Okt 2026 – 20 Okt 2026'), false, 'satu hari tidak perlu tanda pisah rentang');
  assert.ok(htmlSatuHari.includes('data-action="hapus-tanggal"'), 'tombol hapus tanggal muncul');

  // 3. Multi-hari
  const htmlMultiHari = AjukanPage.render({
    ...baseProps,
    formState: { ...INITIAL_AJUKAN_STATE, startDate: '2026-10-20', endDate: '2026-10-30' },
  }).toString();
  assert.ok(htmlMultiHari.includes('20 Okt 2026 – 30 Okt 2026'));
  assert.ok(htmlMultiHari.includes('data-action="hapus-tanggal"'));
});

/* -------------------------------------------------------------------------- */
/*  4. PEMETAAN GALAT TANGGAL TUNGGAL (mapServiceErrorsToForm)                 */
/* -------------------------------------------------------------------------- */

test('pages-ajukan: mapServiceErrorsToForm memetakan startDate, endDate, dan 409 kuota ke errors.tanggal', () => {
  // Dari startDate
  const errStart = mapServiceErrorsToForm({ startDate: 'Paling cepat H+2' });
  assert.deepEqual(errStart, { tanggal: 'Paling cepat H+2' });

  // Dari endDate
  const errEnd = mapServiceErrorsToForm({ endDate: 'Melewati batas maksimal' });
  assert.deepEqual(errEnd, { tanggal: 'Melewati batas maksimal' });

  // Dari kuota (balapan 409)
  const errKuota = mapServiceErrorsToForm({ tanggal: 'Kuota pada tanggal 15 Okt habis' });
  assert.deepEqual(errKuota, { tanggal: 'Kuota pada tanggal 15 Okt habis' });

  // Galat gabungan (jumlah + tanggal + keperluan)
  const errGabung = mapServiceErrorsToForm({
    jumlahPinjam: 'Jumlah tidak valid',
    startDate: 'Tanggal salah',
    keperluan: 'Keperluan wajib',
  });
  assert.equal(errGabung.jumlah, 'Jumlah tidak valid');
  assert.equal(errGabung.tanggal, 'Tanggal salah');
  assert.equal(errGabung.keperluan, 'Keperluan wajib');
});

test('pages-ajukan: render menampilkan SATU pesan galat tanggal di bawah field pemicu', () => {
  const item = { idInventaris: 'inv-1', namaBarang: 'Item', kondisi: 'baik', totalBarang: 2 };
  const html = AjukanPage.render({
    item,
    user: mockUsers[0],
    gate: { canAjukan: true },
    formState: {
      ...INITIAL_AJUKAN_STATE,
      errors: {
        tanggal: 'Rentang tanggal ini sudah penuh dipesan.',
      },
    },
  }).toString();

  assert.ok(html.includes('Rentang tanggal ini sudah penuh dipesan.'));
  assert.ok(html.includes('id="error-tanggal"'));
  assert.ok(html.includes('aria-invalid="true"'));
  // Pastikan hanya satu pesan error tanggal
  const matches = [...html.matchAll(/id="error-tanggal"/g)];
  assert.equal(matches.length, 1);
});

/* -------------------------------------------------------------------------- */
/*  5. KEAMANAN DATA & ESCAPE TEST                                            */
/* -------------------------------------------------------------------------- */

test('pages-ajukan: perlindungan XSS dan bebas escape ganda', () => {
  const itemBerbahaya = {
    idInventaris: 'inv-xss',
    namaBarang: '<script>alert("XSS")</script>',
    kondisi: 'baik',
    totalBarang: 2,
    namaOrganisasi: '<b>BEM</b>',
  };

  const html = AjukanPage.render({
    item: itemBerbahaya,
    user: mockUsers[0],
    gate: { canAjukan: true },
    formState: {
      ...INITIAL_AJUKAN_STATE,
      keperluan: '<img src=x onerror=alert(1)>',
    },
  }).toString();

  // Harus ter-escape di teks
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'));
  assert.equal(html.includes('<img src=x'), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));

  // Bebas escape ganda pada markup sistem
  assertNoEscapedMarkup(html);
  assert.equal(html.includes('undefined'), false);
});

/* -------------------------------------------------------------------------- */
/*  6. KONSISTENSI DATA-ACTION DI HALAMAN AJUKAN                              */
/* -------------------------------------------------------------------------- */

test('pages-ajukan: test konsistensi data-action (kembali, pemicu tanggal, hapus, batal, kirim, dialog)', () => {
  const item = { idInventaris: 'inv-1', namaBarang: 'Item', kondisi: 'baik', totalBarang: 2 };
  const html = AjukanPage.render({
    item,
    user: mockUsers[0],
    gate: { canAjukan: true },
    formState: {
      ...INITIAL_AJUKAN_STATE,
      startDate: '2026-10-20',
      endDate: '2026-10-22',
    },
  }).toString();

  const matches = [...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
  const actionSet = new Set(matches);

  const expectedActions = [
    'kembali-detail',
    'open-calendar',
    'hapus-tanggal',
    'batal',
    'kirim',
    'tutup-dialog-konfirmasi',
    'konfirmasi-kirim',
    'tutup-dialog-batal',
    'konfirmasi-batal',
    'ke-detail-sukses',
  ];

  for (const act of expectedActions) {
    assert.ok(actionSet.has(act), `Halaman ajukan harus merender elemen dengan data-action="${act}"`);
  }

  // Verifikasi teks dalam modal dialog konfirmasi & batal
  assert.ok(html.includes('Kirim Pengajuan?'));
  assert.ok(html.includes('Periksa kembali data pengajuan yang akan anda kirim'));
  assert.ok(html.includes('Batal Mengajukan'));
  assert.ok(html.includes('Apakah anda yakin ingin membatalkan pengajuan?'));
  assert.ok(html.includes('Pengajuan Berhasil Dikirim!'));
  assert.ok(html.includes('Anda telah berhasil mengirimkan pengajuan peminjaman'));
});

/* -------------------------------------------------------------------------- */
/*  7. INTEGRASI MURNI-LOGIKA: KALENDER -> VALIDASI -> LAYANAN -> TERKUNCI    */
/* -------------------------------------------------------------------------- */

test('pages-ajukan integrasi: pilih tanggal di model kalender -> validasi -> kirim layanan -> terkunci di kalender berikutnya', async () => {
  const today = '2026-10-09';
  _resetPeminjamanMockState(today);
  setMockToday(today);

  const peminjam = mockUsers[0];
  _setMockCurrentUserOverride(peminjam);

  const invTarget = mockInventaris.find((it) => it.idInventaris === 'inv-1');
  assert.ok(invTarget);
  assert.equal(invTarget.totalBarang, 2);

  // 1. Inisialisasi state kalender
  let calState = initCalendarState({ today, jumlah: 2 });
  const initialBookings = await getPeminjamanAktif('inv-1');

  // 2. Pilih tanggal di kalender: 2026-10-15 s/d 2026-10-17
  const res1 = reduceCalendarAction(calState, { type: 'pilih-tanggal', payload: '2026-10-15' }, {
    today,
    totalBarang: invTarget.totalBarang,
    bookings: initialBookings,
  });
  assert.equal(res1.accepted, true);

  const res2 = reduceCalendarAction(res1.state, { type: 'pilih-tanggal', payload: '2026-10-17' }, {
    today,
    totalBarang: invTarget.totalBarang,
    bookings: initialBookings,
  });
  assert.equal(res2.accepted, true);
  assert.equal(res2.state.mulai, '2026-10-15');
  assert.equal(res2.state.selesai, '2026-10-17');

  // 3. Terapkan tanggal ke form state
  let formState = reduceAjukanAction(INITIAL_AJUKAN_STATE, {
    type: 'terapkan-tanggal',
    payload: { startDate: res2.state.mulai, endDate: res2.state.selesai },
  });
  formState = reduceAjukanAction(formState, { type: 'ubah-jumlah', payload: 2 });
  formState = reduceAjukanAction(formState, { type: 'ubah-keperluan', payload: 'Uji integrasi alur' });

  assert.equal(formState.startDate, '2026-10-15');
  assert.equal(formState.endDate, '2026-10-17');
  assert.equal(formState.jumlah, 2);

  // 4. Kirim ke layanan
  const peminjamanBaru = await createPeminjaman({
    idInventaris: 'inv-1',
    startDate: formState.startDate,
    endDate: formState.endDate,
    jumlahPinjam: formState.jumlah,
    keperluan: formState.keperluan,
  });
  assert.ok(peminjamanBaru.idPeminjaman);

  // 5. Verifikasi booking baru masuk ke getPeminjamanAktif
  const updatedBookings = await getPeminjamanAktif('inv-1');
  const found = updatedBookings.find((b) => b.startDate === '2026-10-15' && b.endDate === '2026-10-17');
  assert.ok(found, 'booking baru harus muncul di getPeminjamanAktif');
  assert.equal(found.jumlahPinjam, 2);

  // 6. Sekarang buat model kalender baru untuk inv-1 pada q=1: tanggal 15-17 Okt kini TERKUNCI (disabled)
  const nextModel = buildMonthModel({
    year: 2026,
    month: 10,
    today,
    jumlahPinjam: 1,
    totalBarang: invTarget.totalBarang,
    bookings: updatedBookings,
  });

  const oktDays = new Map();
  for (const week of nextModel.weeks) {
    for (const d of week) {
      if (d.inMonth) oktDays.set(d.iso, d);
    }
  }

  // 15, 16, 17 Okt harus berstatus booked / full dan disabled
  for (const tgl of ['2026-10-15', '2026-10-16', '2026-10-17']) {
    const dayObj = oktDays.get(tgl);
    assert.ok(dayObj, `hari ${tgl} harus ada di kalender`);
    assert.equal(dayObj.disabled, true, `hari ${tgl} kini harus terkunci`);
  }
});
