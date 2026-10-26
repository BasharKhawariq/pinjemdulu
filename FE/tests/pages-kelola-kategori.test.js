import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderKelolaKategoriContent,
  renderTabs,
  renderFormModal,
  renderConfirmModal,
  renderDeleteModal,
  renderFeedbackModal,
  renderKategoriTableContent,
  renderKategoriSkeleton,
  HANDLED_KATEGORI_ACTIONS,
} from '../js/pages/kelola-kategori.js';

const FORBIDDEN_ESCAPED_TAGS = [
  '&lt;svg',
  '&lt;button',
  '&lt;div',
  '&lt;p',
  '&lt;span',
  '&lt;a ',
  '&lt;path',
  '&lt;input',
  '&lt;label',
  '&lt;td',
  '&lt;tr',
  '&lt;table',
  '&lt;thead',
  '&lt;tbody',
  '&lt;th',
  '&lt;dialog',
  '&amp;lt;',
];

function assertNoEscapedMarkup(output, componentName) {
  for (const token of FORBIDDEN_ESCAPED_TAGS) {
    assert.equal(
      output.includes(token),
      false,
      `${componentName} tidak boleh memuat fragmen markup ter-escape '${token}'`
    );
  }
}

const MOCK_ITEMS = [
  { idKategori: 'kat-1', namaKategori: 'Elektronik', totalBarang: 25 },
  { idKategori: 'kat-2', namaKategori: 'Audio & Visual', totalBarang: 7 },
  { idKategori: 'kat-3', namaKategori: 'Dokumentasi', totalBarang: 0 },
];

/* ========================================================================== */
/* 1. Render Seluruh Keadaan Halaman & Anti Escape Ganda                      */
/* ========================================================================== */

test('renderKelolaKategoriContent: state ada data merender tabel, tabs, dan pagination', () => {
  const htmlObj = renderKelolaKategoriContent({
    items: MOCK_ITEMS,
    total: 3,
    totalPages: 1,
    halaman: 1,
    perPage: 10,
    cari: '',
    loading: false,
    error: null,
  });

  const html = htmlObj.toString();
  assert.ok(html.includes('Kelola Inventaris'));
  assert.ok(html.includes('List Kategori'));
  assert.ok(html.includes('Tambah Kategori'));
  assert.ok(html.includes('Elektronik'));
  assert.ok(html.includes('Audio &amp; Visual'));
  assert.ok(html.includes('Dokumentasi'));
  assert.ok(html.includes('25'));
  assert.ok(html.includes('7'));
  assert.ok(!html.includes('undefined'));

  assertNoEscapedMarkup(html, 'renderKelolaKategoriContent (data)');
});

test('renderKelolaKategoriContent: state loading skeleton tanpa escape ganda', () => {
  const html = renderKelolaKategoriContent({ loading: true }).toString();
  assert.ok(html.includes('animate-pulse'));
  assert.ok(!html.includes('undefined'));

  assertNoEscapedMarkup(html, 'renderKelolaKategoriContent (loading)');
});

test('renderKelolaKategoriContent: state kosong alami dan kosong pencarian', () => {
  // Kosong alami
  const emptyHtml = renderKelolaKategoriContent({
    items: [],
    total: 0,
    totalPages: 0,
    cari: '',
    loading: false,
  }).toString();
  assert.ok(emptyHtml.includes('Belum ada kategori'));
  assert.ok(emptyHtml.includes('data-action="open-tambah-dialog"'));
  assertNoEscapedMarkup(emptyHtml, 'renderKelolaKategoriContent (empty)');

  // Kosong hasil cari
  const emptySearchHtml = renderKelolaKategoriContent({
    items: [],
    total: 0,
    totalPages: 0,
    cari: 'robotik',
    loading: false,
  }).toString();
  assert.ok(emptySearchHtml.includes('Tidak ada kategori ditemukan'));
  assert.ok(emptySearchHtml.includes('robotik'));
  assert.ok(emptySearchHtml.includes('data-action="reset-search"'));
  assertNoEscapedMarkup(emptySearchHtml, 'renderKelolaKategoriContent (search empty)');
});

test('renderKelolaKategoriContent: state error menampilkan tombol coba lagi', () => {
  const errorHtml = renderKelolaKategoriContent({
    items: [],
    error: 'Koneksi database bermasalah.',
  }).toString();
  assert.ok(errorHtml.includes('Gagal memuat kategori'));
  assert.ok(errorHtml.includes('Koneksi database bermasalah.'));
  assert.ok(errorHtml.includes('data-action="retry-fetch"'));
  assertNoEscapedMarkup(errorHtml, 'renderKelolaKategoriContent (error)');
});

/* ========================================================================== */
/* 2. Tombol Hapus Nonaktif & Teks Alasan Terlihat                           */
/* ========================================================================== */

test('renderKategoriTableContent: kategori terpakai tombol hapus disabled dan teks alasan terlihat', () => {
  const htmlObj = renderKategoriTableContent({
    items: [
      { idKategori: 'kat-1', namaKategori: 'Elektronik', totalBarang: 5 },
      { idKategori: 'kat-2', namaKategori: 'Kabel', totalBarang: 0 },
    ],
    page: 1,
    perPage: 10,
    total: 2,
    totalPages: 1,
  });

  const html = htmlObj.toString();
  // kat-1 terpakai 5 barang -> harus ada teks terlihat 'Dipakai 5 barang' dan tombol disabled
  assert.ok(html.includes('Dipakai 5 barang'));
  assert.ok(html.includes('disabled'));
  assert.ok(html.includes('aria-disabled="true"'));

  // kat-2 tidak terpakai (0 barang) -> tombol hapus aktif data-action="open-delete-dialog"
  assert.ok(html.includes('data-action="open-delete-dialog"'));
  assert.ok(html.includes('data-id="kat-2"'));

  assertNoEscapedMarkup(html, 'renderKategoriTableContent (delete button)');
});

/* ========================================================================== */
/* 3. Modal Form, Konfirmasi, Hapus, dan Feedback                             */
/* ========================================================================== */

test('renderFormModal: render modal tambah dan edit dengan penghitung karakter dan pesan galat', () => {
  // Tambah
  const tambahHtml = renderFormModal({
    dialog: 'tambah',
    inputNama: 'Proyektor',
    inputError: null,
  }).toString();
  assert.ok(tambahHtml.includes('Tambah Kategori'));
  assert.ok(tambahHtml.includes('id="input-kategori-nama"'));
  assert.ok(tambahHtml.includes('9/30'));
  assert.ok(tambahHtml.includes('data-action="close-form-dialog"'));
  assert.ok(tambahHtml.includes('data-action="submit-form-dialog"'));
  assertNoEscapedMarkup(tambahHtml, 'renderFormModal (tambah)');

  // Edit dengan error
  const editHtml = renderFormModal({
    dialog: 'edit',
    editItem: { idKategori: 'kat-1', namaKategori: 'Elektronik' },
    inputNama: 'Elektronik',
    inputError: 'Kategori dengan nama tersebut sudah ada.',
  }).toString();
  assert.ok(editHtml.includes('Edit Kategori'));
  assert.ok(editHtml.includes('Kategori dengan nama tersebut sudah ada.'));
  assert.ok(editHtml.includes('aria-invalid="true"'));
  assert.ok(editHtml.includes('border-destructive'));
  assertNoEscapedMarkup(editHtml, 'renderFormModal (edit error)');
});

test('renderConfirmModal: render modal konfirmasi kirim / simpan', () => {
  // Konfirmasi Tambah
  const confTambahHtml = renderConfirmModal({
    dialog: 'confirm-tambah',
    inputNama: 'Sound System',
    isSubmitting: false,
  }).toString();
  assert.ok(confTambahHtml.includes('Tambah kategori?'));
  assert.ok(confTambahHtml.includes('Sound System'));
  assert.ok(confTambahHtml.includes('data-action="back-to-form"'));
  assert.ok(confTambahHtml.includes('data-action="confirm-submit-kategori"'));
  assertNoEscapedMarkup(confTambahHtml, 'renderConfirmModal (tambah)');

  // Konfirmasi Edit
  const confEditHtml = renderConfirmModal({
    dialog: 'confirm-edit',
    inputNama: 'Audio Visual',
    isSubmitting: true,
  }).toString();
  assert.ok(confEditHtml.includes('Edit nama kategori?'));
  assert.ok(confEditHtml.includes('Menyimpan...'));
  assert.ok(confEditHtml.includes('disabled'));
  assertNoEscapedMarkup(confEditHtml, 'renderConfirmModal (edit submitting)');
});

test('renderDeleteModal: render dialog konfirmasi hapus kategori', () => {
  const item = { idKategori: 'kat-9', namaKategori: 'Perlengkapan Panggung' };
  const html = renderDeleteModal(item, false).toString();

  assert.ok(html.includes('Hapus kategori?'));
  assert.ok(html.includes('Perlengkapan Panggung'));
  assert.ok(html.includes('data-action="close-delete-dialog"'));
  assert.ok(html.includes('data-action="confirm-delete-kategori"'));
  assert.ok(html.includes('data-id="kat-9"'));
  assertNoEscapedMarkup(html, 'renderDeleteModal');
});

test('renderFeedbackModal: menangani sukses, galat, dan kategori dipakai', () => {
  // Sukses
  const successHtml = renderFeedbackModal({
    type: 'success',
    title: 'Kategori berhasil ditambahkan!',
    message: 'Anda telah berhasil menambahkan kategori baru.',
  }).toString();
  assert.ok(successHtml.includes('Kategori berhasil ditambahkan!'));
  assert.ok(successHtml.includes('data-action="close-feedback-dialog"'));
  assertNoEscapedMarkup(successHtml, 'renderFeedbackModal (success)');

  // Gagal kategori dipakai (ikon Frown sedih)
  const dipakaiHtml = renderFeedbackModal({
    type: 'error',
    subType: 'kategori_dipakai',
    title: 'Kategori Tidak Bisa Dihapus',
    message: 'Kategori ini masih digunakan oleh beberapa barang.',
  }).toString();
  assert.ok(dipakaiHtml.includes('Kategori Tidak Bisa Dihapus'));
  assert.ok(dipakaiHtml.includes('Kategori ini masih digunakan oleh beberapa barang.'));
  assertNoEscapedMarkup(dipakaiHtml, 'renderFeedbackModal (dipakai)');
});

/* ========================================================================== */
/* 4. Proteksi XSS (Reverse Test)                                             */
/* ========================================================================== */

test('renderKelolaKategoriContent: input berbahaya tetap ter-escape aman', () => {
  const maliciousName = '<script>alert("xss-kat")</script>';
  const html = renderKelolaKategoriContent({
    items: [{ idKategori: 'kat-xss', namaKategori: maliciousName, totalBarang: 0 }],
    total: 1,
    totalPages: 1,
    halaman: 1,
    cari: '"><img src=x onerror=alert(1)>',
    dialog: 'edit',
    inputNama: maliciousName,
    inputError: '<b>Error XSS</b>',
  }).toString();

  assert.equal(html.includes('<script>alert("xss-kat")</script>'), false);
  assert.equal(html.includes('&lt;script&gt;alert(&quot;xss-kat&quot;)&lt;/script&gt;'), true);
  assert.equal(html.includes('"><img src=x onerror=alert(1)>'), false);
  assert.equal(html.includes('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'), true);
  assert.equal(html.includes('<b>Error XSS</b>'), false);
  assert.equal(html.includes('&lt;b&gt;Error XSS&lt;/b&gt;'), true);
});
