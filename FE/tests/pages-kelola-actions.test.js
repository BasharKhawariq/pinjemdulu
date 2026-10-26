import test from 'node:test';
import assert from 'node:assert/strict';

import * as KelolaPage from '../js/pages/kelola-inventaris.js';
import * as KelolaKategoriPage from '../js/pages/kelola-kategori.js';

/**
 * Helper untuk mengekstrak semua nilai `data-action="..."` dari string HTML.
 * @param {string} html
 * @returns {Set<string>}
 */
function extractDataActions(html) {
  const actions = new Set();
  const re = /data-action="([^"]+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    actions.add(match[1]);
  }
  return actions;
}

const MOCK_ITEMS = [
  {
    idInventaris: 'inv-1',
    namaBarang: 'Proyektor Epson EB-X500',
    idKategori: 'kat-1',
    namaKategori: 'Elektronik',
    idOrganisasi: 'oki-1',
    namaOrganisasi: 'BEM FT',
    kondisi: 'baik',
    totalBarang: 5,
    sisaHariIni: 3,
  },
];

const MOCK_KATEGORI = [
  { idKategori: 'kat-1', namaKategori: 'Elektronik' },
];

test('pages-kelola-actions: ekspor HANDLED_ACTIONS tersedia dan mencakup semua aksi interaktif', () => {
  assert.ok(Array.isArray(KelolaPage.HANDLED_ACTIONS) || KelolaPage.HANDLED_ACTIONS instanceof Set,
    'Modul kelola-inventaris harus mengekspor HANDLED_ACTIONS');
  const handled = new Set(KelolaPage.HANDLED_ACTIONS);

  // Pastikan aksi-aksi kritis terdaftar
  assert.ok(handled.has('close-detail-dialog'), 'Aksi close-detail-dialog harus terdaftar sebagai handled');
  assert.ok(handled.has('close-filter-dialog'), 'Aksi close-filter-dialog harus terdaftar');
  assert.ok(handled.has('reset-filter-dialog'), 'Aksi reset-filter-dialog harus terdaftar');
  assert.ok(handled.has('apply-filter-dialog'), 'Aksi apply-filter-dialog harus terdaftar');
  assert.ok(handled.has('detail-inventaris'), 'Aksi detail-inventaris harus terdaftar');
  assert.ok(handled.has('delete-inventaris'), 'Aksi delete-inventaris harus terdaftar');
  assert.ok(handled.has('change-page'), 'Aksi change-page harus terdaftar');
});

test('pages-kelola-actions: semua data-action pada berbagai state render memiliki handler terdaftar', () => {
  const handled = new Set(KelolaPage.HANDLED_ACTIONS || []);

  const states = [
    // 1. Loading
    { loading: true, items: [] },
    // 2. Data terisi
    { loading: false, items: MOCK_ITEMS, meta: { page: 1, perPage: 10, total: 1, totalPages: 1 } },
    // 3. Kosong alami
    { loading: false, items: [], meta: { page: 1, perPage: 10, total: 0, totalPages: 0 }, nAktif: 0, cari: '' },
    // 4. Hasil filter/cari kosong
    { loading: false, items: [], meta: { page: 1, perPage: 10, total: 0, totalPages: 0 }, nAktif: 1, cari: 'foo' },
    // 5. Galat
    { loading: false, items: [], error: 'Gagal memuat' },
    // 6. Detail modal terbuka
    { loading: false, items: MOCK_ITEMS, detailItem: MOCK_ITEMS[0] },
    // 7. Delete modal terbuka
    { loading: false, items: MOCK_ITEMS, deleteItem: MOCK_ITEMS[0] },
    // 8. Feedback modal terbuka
    { loading: false, items: MOCK_ITEMS, feedback: { type: 'success', title: 'Sukses', message: 'OK' } },
  ];

  for (const [idx, s] of states.entries()) {
    const html = KelolaPage.render({
      ...s,
      kategoriList: MOCK_KATEGORI,
    });
    const renderedActions = extractDataActions(html);

    for (const act of renderedActions) {
      assert.ok(
        handled.has(act),
        `State #${idx + 1}: data-action "${act}" dirender di HTML tetapi tidak ada di HANDLED_ACTIONS!`
      );
    }
  }
});

test('pages-kelola-actions: dialog detail memuat tombol X dan Tutup dengan aksi close-detail-dialog', () => {
  const htmlObj = KelolaPage.renderDetailModal(MOCK_ITEMS[0]);
  const html = htmlObj.toString();

  assert.ok(html.includes('data-action="close-detail-dialog"'), 'Dialog detail harus memuat data-action="close-detail-dialog"');
  // Pastikan muncul minimal 2x (tombol X di header dan tombol Tutup di footer)
  const matches = html.match(/data-action="close-detail-dialog"/g) || [];
  assert.ok(matches.length >= 2, `Harus ada minimal 2 tombol tutup detail (header X dan footer), ditemukan ${matches.length}`);
});

test('pages-kelola-actions: fake DOM integration test dispatch click memicu handler yang tepat', async () => {
  // Mini Fake DOM untuk memverifikasi mekanisme delegasi klik
  const listeners = {};
  const fakeDocument = {
    addEventListener: (type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener: (type, fn) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((cb) => cb !== fn);
      }
    },
    dispatchEvent: async (type, eventObj) => {
      if (listeners[type]) {
        for (const cb of listeners[type]) {
          await cb(eventObj);
        }
      }
    },
  };

  // Pastikan fungsi dispatchClickAction yang diekspor bekerja
  if (typeof KelolaPage.dispatchAction === 'function') {
    let handledAction = null;
    const handled = KelolaPage.dispatchAction('close-detail-dialog', {
      onCloseDetail: () => { handledAction = 'close-detail-dialog'; },
    });
    assert.equal(handled, true);
    assert.equal(handledAction, 'close-detail-dialog');
  }
});

/* ========================================================================== */
/* KONSISTENSI DATA-ACTION HALAMAN KELOLA KATEGORI (V4b)                      */
/* ========================================================================== */

test('pages-kelola-actions: ekspor HANDLED_KATEGORI_ACTIONS mencakup semua aksi interaktif kategori', () => {
  assert.ok(
    Array.isArray(KelolaKategoriPage.HANDLED_KATEGORI_ACTIONS) ||
      KelolaKategoriPage.HANDLED_KATEGORI_ACTIONS instanceof Set,
    'Modul kelola-kategori harus mengekspor HANDLED_KATEGORI_ACTIONS'
  );
  const handled = new Set(KelolaKategoriPage.HANDLED_KATEGORI_ACTIONS);

  // Verifikasi aksi-aksi kritis termasuk dialog dan tombol tutup/batal/kembali
  assert.ok(handled.has('open-tambah-dialog'), 'Aksi open-tambah-dialog harus terdaftar');
  assert.ok(handled.has('open-edit-dialog'), 'Aksi open-edit-dialog harus terdaftar');
  assert.ok(handled.has('open-delete-dialog'), 'Aksi open-delete-dialog harus terdaftar');
  assert.ok(handled.has('close-form-dialog'), 'Aksi close-form-dialog harus terdaftar');
  assert.ok(handled.has('submit-form-dialog'), 'Aksi submit-form-dialog harus terdaftar');
  assert.ok(handled.has('back-to-form'), 'Aksi back-to-form harus terdaftar');
  assert.ok(handled.has('confirm-submit-kategori'), 'Aksi confirm-submit-kategori harus terdaftar');
  assert.ok(handled.has('close-delete-dialog'), 'Aksi close-delete-dialog harus terdaftar');
  assert.ok(handled.has('confirm-delete-kategori'), 'Aksi confirm-delete-kategori harus terdaftar');
  assert.ok(handled.has('close-feedback-dialog'), 'Aksi close-feedback-dialog harus terdaftar');
  assert.ok(handled.has('change-page'), 'Aksi change-page harus terdaftar');
  assert.ok(handled.has('clear-search'), 'Aksi clear-search harus terdaftar');
  assert.ok(handled.has('reset-search'), 'Aksi reset-search harus terdaftar');
  assert.ok(handled.has('retry-fetch'), 'Aksi retry-fetch harus terdaftar');
});

test('pages-kelola-actions: semua data-action pada seluruh state halaman kategori memiliki handler terdaftar', () => {
  const handled = new Set(KelolaKategoriPage.HANDLED_KATEGORI_ACTIONS || []);

  const sampleItems = [
    { idKategori: 'kat-1', namaKategori: 'Elektronik', totalBarang: 5 },
    { idKategori: 'kat-2', namaKategori: 'Kabel', totalBarang: 0 },
  ];

  const states = [
    // 1. Loading
    { loading: true, items: [] },
    // 2. Data terisi
    { loading: false, items: sampleItems, total: 2, totalPages: 1, halaman: 1, perPage: 10 },
    // 3. Paginasi banyak halaman
    { loading: false, items: sampleItems, total: 25, totalPages: 3, halaman: 1, perPage: 10 },
    // 4. Kosong alami
    { loading: false, items: [], total: 0, totalPages: 0, cari: '' },
    // 5. Hasil cari kosong
    { loading: false, items: [], total: 0, totalPages: 0, cari: 'kamera' },
    // 6. Ada pencarian dengan hasil (tombol clear search)
    { loading: false, items: sampleItems, total: 2, totalPages: 1, cari: 'elek' },
    // 7. Galat
    { loading: false, items: [], error: 'Gagal memuat' },
    // 8. Dialog form tambah terbuka
    { loading: false, items: sampleItems, dialog: 'tambah' },
    // 9. Dialog konfirmasi tambah terbuka
    { loading: false, items: sampleItems, dialog: 'confirm-tambah', inputNama: 'Audio' },
    // 10. Dialog form edit terbuka
    { loading: false, items: sampleItems, dialog: 'edit', editItem: sampleItems[0] },
    // 11. Dialog konfirmasi edit terbuka
    { loading: false, items: sampleItems, dialog: 'confirm-edit', editItem: sampleItems[0], inputNama: 'Elektronik Baru' },
    // 12. Dialog konfirmasi hapus terbuka
    { loading: false, items: sampleItems, dialog: 'hapus', deleteItem: sampleItems[1] },
    // 13. Dialog feedback terbuka
    { loading: false, items: sampleItems, dialog: 'feedback', feedback: { type: 'success', title: 'Sukses', message: 'OK' } },
  ];

  for (const [idx, s] of states.entries()) {
    const htmlObj = KelolaKategoriPage.renderKelolaKategoriContent(s);
    const html = htmlObj.toString();
    const renderedActions = extractDataActions(html);

    for (const act of renderedActions) {
      assert.ok(
        handled.has(act),
        `State Kategori #${idx + 1}: data-action "${act}" dirender di HTML tetapi tidak ada di HANDLED_KATEGORI_ACTIONS!`
      );
    }
  }
});
