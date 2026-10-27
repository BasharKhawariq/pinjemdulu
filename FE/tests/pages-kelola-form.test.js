import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderFormPageContent,
  renderConfirmSubmitModal,
  renderConfirmCancelModal,
  renderFeedbackModal as renderFormFeedbackModal,
  renderFormSkeleton,
  HANDLED_FORM_ACTIONS,
} from '../js/pages/kelola-inventaris-form.js';
import {
  renderDeleteModal,
  renderFeedbackModal as renderKelolaFeedbackModal,
} from '../js/pages/kelola-inventaris.js';

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
  '&lt;select',
  '&lt;textarea',
  '&lt;img',
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

const MOCK_KATEGORI = [
  { idKategori: 'kat-1', namaKategori: 'Elektronik' },
  { idKategori: 'kat-2', namaKategori: 'Audio & Visual' },
  { idKategori: 'kat-3', namaKategori: 'Perlengkapan' },
];

/* ========================================================================== */
/* 1. renderFormPageContent (Halaman Terpisah Form Tambah & Ubah)              */
/* ========================================================================== */

test('renderFormPageContent: render mode tambah dengan field default tanpa escape ganda', () => {
  const htmlObj = renderFormPageContent({
    mode: 'tambah',
    formData: {
      namaBarang: '',
      totalBarang: 1,
      idKategori: 'kat-1',
      kondisi: 'baik',
      deskripsi: '',
      thumbnail: '',
    },
    formErrors: {},
    kategoriList: MOCK_KATEGORI,
    kategoriQuery: '',
    isKategoriDropdownOpen: false,
    isSubmitting: false,
    namaOrganisasi: 'BEM Polinema',
  });

  const html = htmlObj.toString();
  assert.ok(html.includes('Tambah Barang'));
  assert.ok(html.includes('Kembali ke Kelola Inventaris'));
  assert.ok(html.includes('Nama Barang'));
  assert.ok(html.includes('Jumlah Unit'));
  assert.ok(html.includes('Kategori'));
  assert.ok(html.includes('BEM Polinema'));
  assert.ok(html.includes('value="kat-1" selected'));
  assert.match(html, /value="baik"[^>]*checked/);
  assert.ok(html.includes('Seret file ke sini, atau'));
  assert.ok(html.includes('data-action="submit-form"'));

  assertNoEscapedMarkup(html, 'renderFormPageContent (tambah)');
});

test('renderFormPageContent: render mode edit terisi nilai barang dan preview foto', () => {
  const htmlObj = renderFormPageContent({
    mode: 'edit',
    formData: {
      idInventaris: 'inv-1',
      namaBarang: 'Proyektor Epson EB-X500',
      totalBarang: 5,
      idKategori: 'kat-1',
      kondisi: 'rusak',
      deskripsi: 'Proyektor ruang rapat gedung utama',
      thumbnail: 'data:image/jpeg;base64,mockphotodata',
      minTotal: 3,
    },
    formErrors: {},
    kategoriList: MOCK_KATEGORI,
    kategoriQuery: '',
    isKategoriDropdownOpen: false,
    isSubmitting: false,
    namaOrganisasi: 'BEM Polinema',
  });

  const html = htmlObj.toString();
  assert.ok(html.includes('Ubah Barang'));
  assert.ok(html.includes('Proyektor Epson EB-X500'));
  assert.ok(html.includes('value="5"'));
  assert.ok(html.includes('min="3"'));
  assert.ok(html.includes('Minimal 3 unit (kuota peminjaman aktif)'));
  assert.match(html, /value="rusak"[^>]*checked/);
  assert.ok(html.includes('Proyektor ruang rapat gedung utama'));
  assert.ok(html.includes('id="foto-preview-img"'));
  assert.ok(html.includes('data-action="remove-foto"'));
  assert.ok(html.includes('Simpan Perubahan'));
  assert.equal(html.includes('Kembali ke Kelola Inventaris'), false);

  assertNoEscapedMarkup(html, 'renderFormPageContent (edit)');
});

test('renderFormPageContent: render pesan error validasi input dan alert umum', () => {
  const htmlObj = renderFormPageContent({
    mode: 'tambah',
    formData: {},
    formErrors: {
      umum: 'Terjadi kesalahan validasi data.',
      namaBarang: 'Nama barang wajib diisi.',
      totalBarang: 'Jumlah unit minimal 1.',
      idKategori: 'Kategori wajib dipilih.',
      fotoFile: 'Ukuran foto melebihi 2 MB.',
    },
    kategoriList: MOCK_KATEGORI,
    isSubmitting: false,
    namaOrganisasi: 'HMTI',
  });

  const html = htmlObj.toString();
  assert.ok(html.includes('Terjadi kesalahan validasi data.'));
  assert.ok(html.includes('Nama barang wajib diisi.'));
  assert.ok(html.includes('Jumlah unit minimal 1.'));
  assert.ok(html.includes('Kategori wajib dipilih.'));
  assert.ok(html.includes('Ukuran foto melebihi 2 MB.'));

  assertNoEscapedMarkup(html, 'renderFormPageContent (errors)');
});

test('renderFormPageContent: state isSubmitting menonaktifkan tombol dan menampilkan Menyimpan...', () => {
  const htmlObj = renderFormPageContent({
    mode: 'tambah',
    formData: {},
    formErrors: {},
    kategoriList: MOCK_KATEGORI,
    isSubmitting: true,
  });

  const html = htmlObj.toString();
  assert.ok(html.includes('Menyimpan...'));
  assert.ok(html.includes('disabled'));

  assertNoEscapedMarkup(html, 'renderFormPageContent (submitting)');
});

test('renderFormPageContent: menangani state loading skeleton, notFound, dan forbidden', () => {
  // 1. Loading
  const skeletonHtml = renderFormPageContent({ loading: true }).toString();
  assert.ok(skeletonHtml.includes('animate-pulse'));
  assertNoEscapedMarkup(skeletonHtml, 'renderFormPageContent (loading)');

  // 2. Not Found
  const notFoundHtml = renderFormPageContent({ notFound: true }).toString();
  assert.ok(notFoundHtml.includes('Barang Tidak Ditemukan'));
  assert.ok(notFoundHtml.includes('href="#/kelola/inventaris"'));
  assertNoEscapedMarkup(notFoundHtml, 'renderFormPageContent (notFound)');

  // 3. Forbidden
  const forbiddenHtml = renderFormPageContent({
    forbidden: true,
    forbiddenMessage: 'Barang ini milik organisasi lain.',
  }).toString();
  assert.ok(forbiddenHtml.includes('Akses Ditolak'));
  assert.ok(forbiddenHtml.includes('Barang ini milik organisasi lain.'));
  assertNoEscapedMarkup(forbiddenHtml, 'renderFormPageContent (forbidden)');
});

test('renderConfirmSubmitModal: render dialog konfirmasi kirim / simpan perubahan', () => {
  // Mode tambah
  const submitTambahHtml = renderConfirmSubmitModal({
    mode: 'tambah',
    formData: {
      namaBarang: 'LCD Monitor 24 Inch',
      totalBarang: 4,
      kondisi: 'baik',
    },
    isSubmitting: false,
  }).toString();

  assert.ok(submitTambahHtml.includes('id="dialog-confirm-submit"'));
  assert.ok(submitTambahHtml.includes('Tambahkan Inventaris?'));
  assert.ok(submitTambahHtml.includes('LCD Monitor 24 Inch'));
  assert.ok(submitTambahHtml.includes('Kategori:</strong>'));
  assert.ok(submitTambahHtml.includes('4 unit'));
  assert.ok(submitTambahHtml.includes('Baik'));
  assert.ok(submitTambahHtml.includes('data-action="close-submit-dialog"'));
  assert.ok(submitTambahHtml.includes('data-action="confirm-submit"'));
  assert.ok(submitTambahHtml.includes('Kirim'));
  assertNoEscapedMarkup(submitTambahHtml, 'renderConfirmSubmitModal (tambah)');

  // Mode edit
  const submitEditHtml = renderConfirmSubmitModal({
    mode: 'edit',
    formData: {
      namaBarang: 'Kabel VGA 5m',
      namaKategori: 'Kabel & Konektor',
      totalBarang: 2,
      kondisi: 'rusak',
    },
    isSubmitting: true,
  }).toString();

  assert.ok(submitEditHtml.includes('Simpan Perubahan?'));
  assert.ok(submitEditHtml.includes('Kabel VGA 5m'));
  assert.ok(submitEditHtml.includes('Kategori:</strong> Kabel &amp; Konektor'));
  assert.ok(submitEditHtml.includes('2 unit'));
  assert.ok(submitEditHtml.includes('Rusak'));
  assert.ok(submitEditHtml.includes('Menyimpan...'));
  assert.ok(submitEditHtml.includes('disabled'));
  assertNoEscapedMarkup(submitEditHtml, 'renderConfirmSubmitModal (edit)');
});

test('renderConfirmCancelModal & renderFormFeedbackModal: render modal pembatalan dan feedback', () => {
  const cancelHtml = renderConfirmCancelModal({ mode: 'tambah' }).toString();
  assert.ok(cancelHtml.includes('id="dialog-confirm-cancel"'));
  assert.ok(cancelHtml.includes('Batal Tambah Inventaris?'));
  assert.ok(cancelHtml.includes('data-action="close-cancel-dialog"'));
  assert.ok(cancelHtml.includes('data-action="confirm-discard"'));
  assertNoEscapedMarkup(cancelHtml, 'renderConfirmCancelModal (tambah)');

  const cancelEditHtml = renderConfirmCancelModal({ mode: 'edit' }).toString();
  assert.ok(cancelEditHtml.includes('Batal Edit Inventaris?'));
  assertNoEscapedMarkup(cancelEditHtml, 'renderConfirmCancelModal (edit)');

  const feedbackHtml = renderFormFeedbackModal({
    type: 'success',
    title: 'Inventaris Berhasil Ditambahkan!',
    message: 'Barang inventaris baru telah tersimpan di sistem.',
  }).toString();
  assert.ok(feedbackHtml.includes('Inventaris Berhasil Ditambahkan!'));
  assert.ok(feedbackHtml.includes('data-action="close-feedback-dialog"'));
  assertNoEscapedMarkup(feedbackHtml, 'renderFormFeedbackModal');
});

test('HANDLED_FORM_ACTIONS: mencakup semua aksi di halaman formulir', () => {
  assert.ok(Array.isArray(HANDLED_FORM_ACTIONS));
  const set = new Set(HANDLED_FORM_ACTIONS);
  assert.ok(set.has('back-to-list'));
  assert.ok(set.has('cancel-form'));
  assert.ok(set.has('close-cancel-dialog'));
  assert.ok(set.has('confirm-discard'));
  assert.ok(set.has('submit-form'));
  assert.ok(set.has('open-submit-dialog'));
  assert.ok(set.has('close-submit-dialog'));
  assert.ok(set.has('confirm-submit'));
  assert.ok(set.has('remove-foto'));
  assert.ok(set.has('close-feedback-dialog'));
});

/* ========================================================================== */
/* 2. renderDeleteModal (Dialog Hapus Halaman Kelola)                         */
/* ========================================================================== */

test('renderDeleteModal: menangani item null dengan dialog tertutup/kosong', () => {
  const htmlObj = renderDeleteModal(null);
  const html = htmlObj.toString();
  assert.ok(html.includes('id="dialog-delete-kelola"'));
  assert.ok(!html.includes('Apakah anda yakin ingin menghapus'));

  assertNoEscapedMarkup(html, 'renderDeleteModal (null)');
});

test('renderDeleteModal: menampilkan dialog konfirmasi dengan nama barang dan id target', () => {
  const item = {
    idInventaris: 'inv-42',
    namaBarang: 'Kamera Sony Alpha A7 III',
  };

  const htmlObj = renderDeleteModal(item, false);
  const html = htmlObj.toString();
  assert.ok(html.includes('Hapus Inventaris?'));
  assert.ok(html.includes('Kamera Sony Alpha A7 III'));
  assert.ok(html.includes('data-action="confirm-delete-inventaris"'));
  assert.ok(html.includes('data-id="inv-42"'));
  assert.ok(html.includes('data-action="close-delete-dialog"'));

  assertNoEscapedMarkup(html, 'renderDeleteModal (item)');
});

test('renderDeleteModal: state isSubmitting menonaktifkan tombol dan menampilkan Menghapus...', () => {
  const item = {
    idInventaris: 'inv-42',
    namaBarang: 'Kamera Sony Alpha A7 III',
  };

  const htmlObj = renderDeleteModal(item, true);
  const html = htmlObj.toString();
  assert.ok(html.includes('Menghapus...'));
  assert.ok(html.includes('disabled'));

  assertNoEscapedMarkup(html, 'renderDeleteModal (submitting)');
});

/* ========================================================================== */
/* 3. renderKelolaFeedbackModal                                               */
/* ========================================================================== */

test('renderKelolaFeedbackModal: menangani status sukses dan galat', () => {
  const emptyHtml = renderKelolaFeedbackModal(null).toString();
  assert.ok(emptyHtml.includes('id="dialog-feedback-kelola"'));

  const successHtml = renderKelolaFeedbackModal({
    type: 'success',
    title: 'Inventaris Berhasil Dihapus!',
    message: 'Barang telah dihapus.',
  }).toString();
  assert.ok(successHtml.includes('Inventaris Berhasil Dihapus!'));
  assert.ok(successHtml.includes('bg-emerald-50 text-emerald-600'));

  const errorHtml = renderKelolaFeedbackModal({
    type: 'error',
    title: 'Gagal Menghapus Inventaris',
    message: 'Barang tidak dapat dihapus karena masih dipinjam.',
  }).toString();
  assert.ok(errorHtml.includes('Gagal Menghapus Inventaris'));
  assert.ok(errorHtml.includes('bg-rose-50 text-rose-600'));
});

/* ========================================================================== */
/* 4. Proteksi XSS (Reverse Test)                                             */
/* ========================================================================== */

test('renderFormPageContent & renderDeleteModal: data berbahaya tetap ter-escape aman', () => {
  const maliciousName = '<script>alert("xss-nama")</script>';
  const maliciousDeskripsi = '"><img src=x onerror=alert(2)>';

  const formHtml = renderFormPageContent({
    mode: 'edit',
    formData: {
      namaBarang: maliciousName,
      deskripsi: maliciousDeskripsi,
    },
    namaOrganisasi: '<b>OKI Hack</b>',
  }).toString();

  assert.equal(formHtml.includes('<script>alert("xss-nama")</script>'), false);
  assert.equal(formHtml.includes('&lt;script&gt;alert(&quot;xss-nama&quot;)&lt;/script&gt;'), true);
  assert.equal(formHtml.includes('"><img src=x onerror=alert(2)>'), false);
  assert.equal(formHtml.includes('&quot;&gt;&lt;img src=x onerror=alert(2)&gt;'), true);
  assert.equal(formHtml.includes('<b>OKI Hack</b>'), false);
  assert.equal(formHtml.includes('&lt;b&gt;OKI Hack&lt;/b&gt;'), true);

  const deleteHtml = renderDeleteModal({
    idInventaris: 'inv-xss',
    namaBarang: maliciousName,
  }).toString();

  assert.equal(deleteHtml.includes('<script>alert("xss-nama")</script>'), false);
  assert.equal(deleteHtml.includes('&lt;script&gt;alert(&quot;xss-nama&quot;)&lt;/script&gt;'), true);
});
