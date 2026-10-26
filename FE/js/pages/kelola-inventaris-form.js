/**
 * kelola-inventaris-form.js — Halaman Formulir Tambah & Ubah Inventaris PJ (R2).
 * Halaman terpisah penuh sesuai rancangan FormAddInventaris.png dan acuan Next.js.
 */

import { html, raw } from '../ui/html.js';
import {
  buttonClass,
  inputClass,
  labelClass,
  selectClass,
  textareaClass,
  alertClass,
  skeletonClass,
} from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import {
  getInventarisById,
  createInventaris,
  updateInventaris,
} from '../services/inventaris.js';
import { getKategori, createKategori } from '../services/kategori.js';
import {
  filterKategoriOptions,
  shouldShowCreateRow,
  normalizeKategoriName,
} from '../lib/kategori-combobox.js';
import {
  validateInventarisInput,
  validateFotoFile,
  isFormDirty,
  getMinTotalBarang,
} from '../lib/inventaris-form.js';
import { normalizeKondisi } from '../lib/kondisi.js';
import { KONDISI_BARANG } from '../lib/constants.js';
import { getInitials } from '../lib/navigation.js';

export const HANDLED_FORM_ACTIONS = [
  'back-to-list',
  'cancel-form',
  'close-cancel-dialog',
  'confirm-discard',
  'submit-form',
  'open-submit-dialog',
  'close-submit-dialog',
  'confirm-submit',
  'remove-foto',
  'select-kategori-item',
  'create-kategori-item',
  'toggle-kategori-dropdown',
  'close-feedback-dialog',
];

/**
 * Batas maksimal ukuran string Data URI foto (~250 KB).
 */
export const MAKS_FOTO_DATA_URI_BYTES = 250 * 1024;

/**
 * Kompres gambar ke format Base64 JPEG melalui HTML5 Canvas.
 * Membatasi dimensi maksimal 800px, kualitas awal 0.8, dan batas data URI ~250 KB.
 * @param {File} file
 * @param {number} [maxDimension=800]
 * @param {number} [quality=0.8]
 * @param {number} [maxBytes=256000]
 * @returns {Promise<string>}
 */
export async function compressImageToDataUrl(file, maxDimension = 800, quality = 0.8, maxBytes = MAKS_FOTO_DATA_URI_BYTES) {
  if (typeof FileReader === 'undefined' || typeof Image === 'undefined') {
    return 'data:image/jpeg;base64,mockcanvasphotodata';
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Kualitas awal 0.8
        let q = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', q);

        // Batas data URI ~250 KB (base64 string length ≈ maxBytes * 1.37)
        const maxStringLen = Math.round(maxBytes * 1.37);
        if (dataUrl.length > maxStringLen) {
          q = 0.6;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        if (dataUrl.length > maxStringLen) {
          q = 0.4;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        if (dataUrl.length > maxStringLen) {
          // Perkecil dimensi jika masih melebihi batas
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = Math.round(width * 0.7);
          scaledCanvas.height = Math.round(height * 0.7);
          const scaledCtx = scaledCanvas.getContext('2d');
          if (scaledCtx) {
            scaledCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);
            dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.5);
          }
        }

        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Render skeleton halaman form saat memuat data.
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFormSkeleton() {
  return html`
    <div class="space-y-6 max-w-5xl mx-auto">
      <div class="${skeletonClass('h-9 w-32 rounded-xl')}"></div>
      <div class="space-y-2">
        <div class="${skeletonClass('h-8 w-64 rounded-xl')}"></div>
        <div class="${skeletonClass('h-4 w-96 rounded')}"></div>
      </div>
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-7 space-y-5">
            <div class="${skeletonClass('h-10 w-full rounded-xl')}"></div>
            <div class="${skeletonClass('h-10 w-full rounded-xl')}"></div>
            <div class="${skeletonClass('h-10 w-full rounded-xl')}"></div>
            <div class="${skeletonClass('h-28 w-full rounded-xl')}"></div>
          </div>
          <div class="lg:col-span-5">
            <div class="${skeletonClass('h-60 w-full rounded-2xl')}"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render modal dialog konfirmasi sebelum menambah atau menyimpan perubahan inventaris.
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderConfirmSubmitModal({ mode = 'tambah', formData = {}, isSubmitting = false } = {}) {
  const isTambah = mode === 'tambah';
  const title = isTambah ? 'Tambahkan Inventaris?' : 'Simpan Perubahan?';
  const desc = isTambah
    ? 'Periksa kembali data inventaris yang akan ditambahkan.'
    : 'Periksa kembali perubahan data inventaris yang akan disimpan.';
  const submitText = isSubmitting
    ? 'Menyimpan...'
    : isTambah
      ? 'Kirim'
      : 'Simpan';
  const kondisiText = formData.kondisi === 'rusak' ? 'Rusak' : 'Baik';

  return html`
    <dialog
      id="dialog-confirm-submit"
      aria-labelledby="dialog-submit-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div class="flex flex-col p-6 text-center items-center">
        <!-- Icon HelpCircle -->
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          ${renderIcon('HelpCircle', 'h-7 w-7')}
        </div>

        <h2 id="dialog-submit-title" class="text-lg font-bold text-foreground">${title}</h2>
        <p class="mt-1.5 text-sm text-muted-foreground">${desc}</p>

        <!-- Kotak Ringkasan Data -->
        <div class="mt-4 w-full rounded-xl bg-muted/30 p-3 text-left text-xs space-y-1.5 border border-border">
          <p><strong class="font-medium text-foreground">Nama:</strong> ${formData.namaBarang || '-'}</p>
          <p><strong class="font-medium text-foreground">Jumlah:</strong> ${formData.totalBarang || 1} unit</p>
          <p><strong class="font-medium text-foreground">Kondisi:</strong> ${kondisiText}</p>
        </div>

        <!-- Tombol Aksi -->
        <div class="mt-6 flex w-full items-center justify-center gap-3">
          <button
            type="button"
            data-action="close-submit-dialog"
            class="${buttonClass({ variant: 'outline', size: 'default', className: 'flex-1 rounded-xl' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            Kembali
          </button>
          <button
            type="button"
            data-action="confirm-submit"
            class="${buttonClass({ variant: 'default', size: 'default', className: 'flex-1 rounded-xl' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            ${submitText}
          </button>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Render modal dialog konfirmasi buang perubahan.
 * @param {object} [props]
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderConfirmCancelModal({ mode = 'tambah' } = {}) {
  const isTambah = mode === 'tambah';
  const title = isTambah ? 'Batal Tambah Inventaris?' : 'Batal Edit Inventaris?';

  return html`
    <dialog
      id="dialog-confirm-cancel"
      aria-labelledby="dialog-cancel-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div class="flex flex-col p-6 text-center items-center">
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          ${renderIcon('AlertCircle', 'h-7 w-7')}
        </div>
        <h2 id="dialog-cancel-title" class="text-lg font-bold text-foreground">${title}</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Apakah anda yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.
        </p>
        <div class="mt-6 flex w-full items-center justify-center gap-3">
          <button
            type="button"
            data-action="close-cancel-dialog"
            class="${buttonClass({ variant: 'outline', size: 'default', className: 'flex-1' })}"
          >
            Kembali
          </button>
          <button
            type="button"
            data-action="confirm-discard"
            class="${buttonClass({ variant: 'destructive', size: 'default', className: 'flex-1' })}"
          >
            Batalkan
          </button>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Render modal dialog notifikasi feedback sukses/galat.
 * @param {object|null} feedback
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFeedbackModal(feedback) {
  if (!feedback) {
    return html`
      <dialog id="dialog-form-feedback" aria-labelledby="dialog-form-feedback-title" class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
        <div class="p-6"><h2 id="dialog-form-feedback-title" class="sr-only">Notifikasi</h2></div>
      </dialog>
    `;
  }

  const isSuccess = feedback.type === 'success';
  return html`
    <dialog
      id="dialog-form-feedback"
      aria-labelledby="dialog-form-feedback-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div class="flex flex-col p-6 text-center items-center">
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
          isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }">
          ${renderIcon(isSuccess ? 'CheckCircle2' : 'AlertCircle', 'h-7 w-7')}
        </div>
        <h2 id="dialog-form-feedback-title" class="text-lg font-bold text-foreground">${feedback.title}</h2>
        <p class="mt-2 text-sm text-muted-foreground">${feedback.message}</p>
        <div class="mt-6 flex w-full items-center justify-center">
          <button
            type="button"
            data-action="close-feedback-dialog"
            class="${buttonClass({ variant: 'default', size: 'default', className: 'w-full' })}"
          >
            Kembali ke Kelola Inventaris
          </button>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Render konten utama halaman formulir tambah/ubah inventaris.
 * @param {object} state
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFormPageContent(state = {}) {
  const {
    mode = 'tambah',
    formData = {},
    formErrors = {},
    kategoriList = [],
    kategoriQuery = '',
    isKategoriDropdownOpen = false,
    isSubmitting = false,
    namaOrganisasi = 'OKI Anda',
    loading = false,
    notFound = false,
    forbidden = false,
    forbiddenMessage = '',
    feedback = null,
  } = state;

  if (loading) {
    return renderFormSkeleton();
  }

  if (notFound) {
    return html`
      <div class="max-w-xl mx-auto my-12 text-center p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          ${renderIcon('AlertCircle', 'h-7 w-7')}
        </div>
        <h1 class="text-xl font-bold text-foreground">Barang Tidak Ditemukan</h1>
        <p class="text-sm text-muted-foreground">Barang inventaris yang ingin Anda ubah tidak ada atau telah dihapus.</p>
        <div class="pt-2">
          <a href="#/kelola/inventaris" class="${buttonClass({ variant: 'default', size: 'default' })}">
            Kembali ke Kelola Inventaris
          </a>
        </div>
      </div>
    `;
  }

  if (forbidden) {
    return html`
      <div class="max-w-xl mx-auto my-12 text-center p-8 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          ${renderIcon('ShieldAlert', 'h-7 w-7')}
        </div>
        <h1 class="text-xl font-bold text-foreground">Akses Ditolak</h1>
        <p class="text-sm text-muted-foreground">${forbiddenMessage || 'Anda tidak dapat mengelola inventaris milik organisasi lain.'}</p>
        <div class="pt-2">
          <a href="#/kelola/inventaris" class="${buttonClass({ variant: 'default', size: 'default' })}">
            Kembali ke Kelola Inventaris
          </a>
        </div>
      </div>
    `;
  }

  const isEdit = mode === 'edit';
  const pageTitle = isEdit ? 'Ubah Barang' : 'Tambah Barang';
  const pageDesc = isEdit
    ? 'Perbarui detail informasi barang inventaris organisasi Anda.'
    : 'Isi detail informasi barang inventaris yang akan ditambahkan ke sistem.';
  const submitText = isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Barang';
  const minTotal = formData.minTotal || 1;
  const initials = getInitials(namaOrganisasi).slice(0, 2);

  // Filter opsi kategori untuk combobox
  const filteredKategori = filterKategoriOptions(kategoriList, kategoriQuery);
  const showCreateKategori = shouldShowCreateRow(kategoriQuery, kategoriList);
  const selectedKat = kategoriList.find((k) => String(k.idKategori) === String(formData.idKategori));

  return html`
    <div class="space-y-6 max-w-5xl mx-auto" id="kelola-form-root">
      <!-- Tombol Kembali Atas -->
      <div>
        <a
          href="#/kelola/inventaris"
          data-action="back-to-list"
          class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background group-hover:bg-accent transition-colors">
            ${renderIcon('ArrowLeft', 'h-4 w-4')}
          </span>
          <span>Kembali ke Kelola Inventaris</span>
        </a>
      </div>

      <!-- Header Halaman -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">${pageTitle}</h1>
        <p class="mt-1 text-sm text-muted-foreground">${pageDesc}</p>
      </div>

      <!-- Card Form Utama -->
      <div class="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm">
        <form id="form-inventaris-detail" onsubmit="return false;" novalidate class="space-y-8">
          ${formErrors.umum ? html`
            <div class="${alertClass('destructive')}" role="alert">
              ${formErrors.umum}
            </div>
          ` : raw('')}

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Kolom Kiri: Input Data Utama (7 cols) -->
            <div class="lg:col-span-7 space-y-6">
              <!-- Field 1: Nama Barang -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label for="form-input-nama" class="${labelClass()}">
                    Nama Barang <span class="text-rose-500">*</span>
                  </label>
                  <span class="text-xs text-muted-foreground" id="nama-char-count">
                    ${(formData.namaBarang || '').length}/100
                  </span>
                </div>
                <input
                  id="form-input-nama"
                  name="namaBarang"
                  type="text"
                  maxlength="100"
                  placeholder="Masukkan nama barang"
                  value="${formData.namaBarang || ''}"
                  class="${inputClass({ error: Boolean(formErrors.namaBarang) })}"
                  aria-invalid="${Boolean(formErrors.namaBarang)}"
                  aria-describedby="${formErrors.namaBarang ? 'error-nama-barang' : 'nama-char-count'}"
                  required
                />
                ${formErrors.namaBarang ? html`
                  <p id="error-nama-barang" class="text-xs text-rose-500" role="alert">${formErrors.namaBarang}</p>
                ` : raw('')}
              </div>

              <!-- Field 2: Jumlah Unit -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label for="form-input-jumlah" class="${labelClass()}">
                    Jumlah Unit <span class="text-rose-500">*</span>
                  </label>
                  ${isEdit && minTotal > 1 ? html`
                    <span class="text-xs text-muted-foreground">
                      Minimal ${minTotal} unit (kuota peminjaman aktif)
                    </span>
                  ` : raw('')}
                </div>
                <input
                  id="form-input-jumlah"
                  name="totalBarang"
                  type="number"
                  min="${minTotal}"
                  max="999"
                  step="1"
                  value="${formData.totalBarang !== undefined ? formData.totalBarang : 1}"
                  class="${inputClass({ error: Boolean(formErrors.totalBarang) })}"
                  aria-invalid="${Boolean(formErrors.totalBarang)}"
                  aria-describedby="${formErrors.totalBarang ? 'error-total-barang' : ''}"
                  required
                />
                ${formErrors.totalBarang ? html`
                  <p id="error-total-barang" class="text-xs text-rose-500" role="alert">${formErrors.totalBarang}</p>
                ` : raw('')}
              </div>

              <!-- Field 3: Kategori (Combobox / Select Interaktif) -->
              <div class="space-y-2 relative" id="kategori-combobox-wrapper">
                <label for="kategori-select-trigger" class="${labelClass()}">
                  Kategori <span class="text-rose-500">*</span>
                </label>

                <!-- Hidden select untuk form submit standar -->
                <select
                  id="form-select-kategori"
                  name="idKategori"
                  class="sr-only"
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <option value="">Pilih kategori...</option>
                  ${raw(kategoriList.map((k) => `
                    <option value="${k.idKategori}" ${formData.idKategori === k.idKategori ? 'selected' : ''}>
                      ${k.namaKategori}
                    </option>
                  `).join(''))}
                </select>

                <!-- Trigger Tombol Combobox -->
                <button
                  type="button"
                  id="kategori-select-trigger"
                  data-action="toggle-kategori-dropdown"
                  aria-expanded="${isKategoriDropdownOpen}"
                  aria-haspopup="listbox"
                  class="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    formErrors.idKategori ? 'border-rose-500 focus:ring-rose-500' : ''
                  }"
                >
                  <span class="${selectedKat ? 'font-medium text-foreground' : 'text-muted-foreground'}">
                    ${selectedKat ? selectedKat.namaKategori : 'Pilih kategori...'}
                  </span>
                  ${renderIcon('ChevronDown', 'h-4 w-4 text-muted-foreground shrink-0')}
                </button>

                <!-- Dropdown Popover Combobox -->
                ${isKategoriDropdownOpen ? html`
                  <div
                    id="kategori-combobox-dropdown"
                    class="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-64 overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-xl animate-in fade-in-0 zoom-in-95"
                    role="listbox"
                  >
                    <!-- Input Cari di Dropdown -->
                    <div class="sticky top-0 bg-popover pb-2">
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ${renderIcon('Search', 'h-3.5 w-3.5')}
                        </span>
                        <input
                          id="kategori-search-input"
                          type="text"
                          placeholder="Cari atau tambah kategori..."
                          value="${kategoriQuery}"
                          class="${inputClass('pl-8 h-9 text-xs')}"
                        />
                      </div>
                    </div>

                    <!-- List Opsi -->
                    <div class="space-y-1">
                      ${filteredKategori.length === 0 && !showCreateKategori ? html`
                        <div class="py-3 px-3 text-xs text-center text-muted-foreground">
                          Kategori tidak ditemukan.
                        </div>
                      ` : raw(
                        filteredKategori.map((k) => `
                          <button
                            type="button"
                            data-action="select-kategori-item"
                            data-id="${k.idKategori}"
                            role="option"
                            aria-selected="${formData.idKategori === k.idKategori}"
                            class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition hover:bg-accent hover:text-accent-foreground ${
                              formData.idKategori === k.idKategori ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground'
                            }"
                          >
                            <span>${k.namaKategori}</span>
                            ${formData.idKategori === k.idKategori ? `<span class="text-primary font-bold">✓</span>` : ''}
                          </button>
                        `).join('')
                      )}

                      ${showCreateKategori ? html`
                        <div class="border-t border-border mt-1 pt-1">
                          <button
                            type="button"
                            data-action="create-kategori-item"
                            data-name="${normalizeKategoriName(kategoriQuery)}"
                            class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-left font-medium text-primary hover:bg-primary/10 transition"
                          >
                            ${renderIcon('Plus', 'h-3.5 w-3.5')}
                            <span>Buat kategori "<strong>${normalizeKategoriName(kategoriQuery)}</strong>"</span>
                          </button>
                        </div>
                      ` : raw('')}
                    </div>
                  </div>
                ` : raw('')}

                ${formErrors.idKategori ? html`
                  <p class="text-xs text-rose-500" role="alert">${formErrors.idKategori}</p>
                ` : raw('')}
              </div>

              <!-- Field 4: Pemilik Inventaris (Terkunci OKI PJ) -->
              <div class="space-y-2">
                <label class="${labelClass()}">Pemilik Inventaris</label>
                <div
                  class="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 text-sm text-foreground/80 cursor-not-allowed select-none"
                  title="Pemilik inventaris otomatis ditetapkan sebagai OKI Anda"
                >
                  <div class="flex items-center gap-2">
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      ${initials}
                    </span>
                    <span class="font-medium">${namaOrganisasi}</span>
                  </div>
                  ${renderIcon('Lock', 'h-4 w-4 text-muted-foreground opacity-60')}
                </div>
                <p class="text-xs text-muted-foreground">
                  Otomatis ditetapkan sesuai organisasi kepengurusan Anda (hanya dapat mengelola barang OKI sendiri).
                </p>
              </div>

              <!-- Field 5: Kondisi Barang (Radio Horizontal) -->
              <div class="space-y-2.5">
                <span class="${labelClass()}">
                  Kondisi <span class="text-rose-500">*</span>
                </span>
                <div class="flex items-center gap-6 pt-1">
                  <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
                    <input
                      type="radio"
                      name="kondisi"
                      value="baik"
                      ${formData.kondisi === 'rusak' ? '' : 'checked'}
                      class="h-4 w-4 text-primary focus:ring-primary accent-primary"
                    />
                    <span>Baik</span>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
                    <input
                      type="radio"
                      name="kondisi"
                      value="rusak"
                      ${formData.kondisi === 'rusak' ? 'checked' : ''}
                      class="h-4 w-4 text-primary focus:ring-primary accent-primary"
                    />
                    <span>Rusak</span>
                  </label>
                </div>
                ${formErrors.kondisi ? html`
                  <p class="text-xs text-rose-500" role="alert">${formErrors.kondisi}</p>
                ` : raw('')}
              </div>

              <!-- Field 6: Deskripsi Barang -->
              <div class="space-y-2">
                <label for="form-input-deskripsi" class="${labelClass()}">Deskripsi</label>
                <textarea
                  id="form-input-deskripsi"
                  name="deskripsi"
                  rows="4"
                  placeholder="Masukkan deskripsi barang, spesifikasi teknis, atau kelengkapan..."
                  class="${textareaClass()}"
                >${formData.deskripsi || formData.deskripsiBarang || ''}</textarea>
                ${formErrors.deskripsi ? html`
                  <p class="text-xs text-rose-500" role="alert">${formErrors.deskripsi}</p>
                ` : raw('')}
              </div>
            </div>

            <!-- Kolom Kanan: Foto Barang (Dropzone & Preview) (5 cols) -->
            <div class="lg:col-span-5 space-y-3">
              <label class="${labelClass()}">Foto Barang</label>

              <!-- Input file tersembunyi -->
              <input
                id="form-foto-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                class="sr-only"
              />

              ${formData.thumbnail ? html`
                <!-- Preview Foto Terpilih -->
                <div class="space-y-3 rounded-2xl border border-border p-4 bg-background">
                  <div class="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/20 border border-border">
                    <img
                      id="foto-preview-img"
                      src="${formData.thumbnail}"
                      alt="Pratinjau foto barang"
                      class="h-full w-full object-contain p-1"
                    />
                    <button
                      type="button"
                      data-action="remove-foto"
                      aria-label="Hapus foto"
                      title="Hapus foto"
                      class="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition"
                    >
                      ${renderIcon('X', 'h-4 w-4')}
                    </button>
                  </div>
                  <div class="flex items-center justify-between gap-2 pt-1">
                    <span class="text-xs text-muted-foreground truncate">Foto siap disimpan</span>
                    <button
                      type="button"
                      id="btn-trigger-change-foto"
                      class="${buttonClass({ variant: 'outline', size: 'sm', className: 'text-xs gap-1.5' })}"
                    >
                      ${renderIcon('Upload', 'h-3.5 w-3.5')}
                      <span>Ganti Foto</span>
                    </button>
                  </div>
                </div>
              ` : html`
                <!-- Dropzone Unggah Foto -->
                <div
                  id="foto-dropzone"
                  role="button"
                  tabindex="0"
                  aria-label="Unggah foto barang"
                  class="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition hover:border-primary/50 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary ${
                    formErrors.fotoFile ? 'border-rose-500 bg-rose-50/20' : ''
                  }"
                >
                  <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
                    ${renderIcon('Folder', 'h-7 w-7')}
                  </div>
                  <p class="text-sm text-foreground">
                    Seret file ke sini, atau <span class="font-semibold text-primary underline">Pilih File</span>
                  </p>
                  <p class="mt-1.5 text-xs text-muted-foreground max-w-xs">
                    File harus berformat JPG atau PNG dengan ukuran maksimal 2 MB.
                  </p>
                </div>
              `}

              ${formErrors.fotoFile ? html`
                <p class="text-xs text-rose-500" role="alert">${formErrors.fotoFile}</p>
              ` : raw('')}
            </div>
          </div>

          <!-- Baris Tombol Aksi Bawah -->
          <div class="mt-8 flex items-center justify-end gap-3 border-t border-border pt-6">
            <button
              type="button"
              data-action="cancel-form"
              class="${buttonClass({ variant: 'outline', size: 'default' })}"
              ${isSubmitting ? 'disabled' : ''}
            >
              Batal
            </button>
            <button
              type="button"
              data-action="submit-form"
              class="${buttonClass({ variant: 'default', size: 'default' })}"
              ${isSubmitting ? 'disabled' : ''}
            >
              ${submitText}
            </button>
          </div>
        </form>
      </div>

      <!-- Dialog Konfirmasi Tambah / Simpan Perubahan -->
      ${renderConfirmSubmitModal({ mode, formData, isSubmitting })}

      <!-- Dialog Konfirmasi Buang Perubahan -->
      ${renderConfirmCancelModal({ mode })}

      <!-- Dialog Feedback Status -->
      ${renderFeedbackModal(feedback)}
    </div>
  `;
}

/**
 * State modul halaman form inventaris.
 */
let pageState = {
  mode: 'tambah',
  initialValues: {},
  formData: {
    idInventaris: '',
    namaBarang: '',
    totalBarang: 1,
    idKategori: '',
    kondisi: 'baik',
    deskripsi: '',
    thumbnail: '',
    minTotal: 1,
  },
  formErrors: {},
  kategoriList: [],
  kategoriQuery: '',
  isKategoriDropdownOpen: false,
  isSubmitting: false,
  namaOrganisasi: 'OKI Anda',
  loading: false,
  notFound: false,
  forbidden: false,
  forbiddenMessage: '',
  feedback: null,
};

let currentContainer = null;
let currentUser = null;

function updateUI() {
  if (!currentContainer) return;
  currentContainer.innerHTML = renderFormPageContent(pageState);
}

/**
 * Ambil nilai input saat ini dari elemen form di DOM.
 */
function readCurrentFormInputs() {
  const nama = document.getElementById('form-input-nama')?.value;
  const jumlah = document.getElementById('form-input-jumlah')?.value;
  const kategori = document.getElementById('form-select-kategori')?.value;
  const kondisi = document.querySelector('input[name="kondisi"]:checked')?.value || 'baik';
  const deskripsi = document.getElementById('form-input-deskripsi')?.value;

  return {
    namaBarang: typeof nama === 'string' ? nama : pageState.formData.namaBarang,
    totalBarang: jumlah !== undefined && jumlah !== '' ? Number(jumlah) : pageState.formData.totalBarang,
    idKategori: kategori || pageState.formData.idKategori,
    kondisi: normalizeKondisi(kondisi),
    deskripsi: deskripsi !== undefined ? deskripsi : pageState.formData.deskripsi,
    thumbnail: pageState.formData.thumbnail || '',
  };
}

function checkIsDirty() {
  const current = readCurrentFormInputs();
  return isFormDirty(current, pageState.initialValues);
}

function openSubmitConfirmDialog() {
  const dlg = document.getElementById('dialog-confirm-submit');
  if (dlg && typeof dlg.showModal === 'function') {
    if (!dlg.open) dlg.showModal();
    const cancelBtn = dlg.querySelector('[data-action="close-submit-dialog"]');
    cancelBtn?.focus();
  }
}

function closeSubmitConfirmDialog() {
  const dlg = document.getElementById('dialog-confirm-submit');
  if (dlg && typeof dlg.close === 'function' && dlg.open) {
    dlg.close();
  }
}

function openCancelConfirmDialog() {
  const dlg = document.getElementById('dialog-confirm-cancel');
  if (dlg && typeof dlg.showModal === 'function') {
    if (!dlg.open) dlg.showModal();
    const cancelBtn = dlg.querySelector('[data-action="close-cancel-dialog"]');
    cancelBtn?.focus();
  }
}

function closeCancelConfirmDialog() {
  const dlg = document.getElementById('dialog-confirm-cancel');
  if (dlg && typeof dlg.close === 'function' && dlg.open) {
    dlg.close();
  }
}

function openFeedbackDialog(type, title, message) {
  pageState.feedback = { type, title, message };
  updateUI();

  const dlg = document.getElementById('dialog-form-feedback');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
    const btn = dlg.querySelector('[data-action="close-feedback-dialog"]');
    btn?.focus();
  }
}

function closeFeedbackDialog() {
  const dlg = document.getElementById('dialog-form-feedback');
  if (dlg && typeof dlg.close === 'function') {
    dlg.close();
  }
  pageState.feedback = null;
  if (typeof window !== 'undefined') {
    window.location.hash = '#/kelola/inventaris';
  }
}

async function handleFotoFileSelected(file) {
  if (!file) return;

  const errFoto = validateFotoFile(file);
  if (errFoto) {
    pageState.formErrors = { ...pageState.formErrors, fotoFile: errFoto };
    updateUI();
    return;
  }

  try {
    const dataUrl = await compressImageToDataUrl(file);
    pageState.formData.thumbnail = dataUrl;
    delete pageState.formErrors.fotoFile;
    updateUI();
  } catch {
    pageState.formErrors = { ...pageState.formErrors, fotoFile: 'Gagal memproses gambar.' };
    updateUI();
  }
}

async function handleDocumentClick(e) {
  // Backdrop click close native dialog
  if (e.target && e.target.nodeName === 'DIALOG') {
    if (e.target.id === 'dialog-confirm-submit') closeSubmitConfirmDialog();
    if (e.target.id === 'dialog-confirm-cancel') closeCancelConfirmDialog();
    if (e.target.id === 'dialog-form-feedback') closeFeedbackDialog();
    return;
  }

  // Klik di luar dropdown kategori menutup dropdown
  if (pageState.isKategoriDropdownOpen) {
    const comboboxWrapper = e.target.closest('#kategori-combobox-wrapper');
    if (!comboboxWrapper) {
      pageState.isKategoriDropdownOpen = false;
      updateUI();
    }
  }

  // Klik dropzone atau tombol ganti foto memicu input file
  const dropzone = e.target.closest('#foto-dropzone');
  const btnChangeFoto = e.target.closest('#btn-trigger-change-foto');
  if ((dropzone || btnChangeFoto) && !e.target.closest('[data-action="remove-foto"]')) {
    const fileInput = document.getElementById('form-foto-input');
    fileInput?.click();
    return;
  }

  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.getAttribute('data-action');

  if (action === 'back-to-list' || action === 'cancel-form') {
    e.preventDefault();
    if (checkIsDirty()) {
      openCancelConfirmDialog();
    } else {
      if (typeof window !== 'undefined') {
        window.location.hash = '#/kelola/inventaris';
      }
    }
  } else if (action === 'close-cancel-dialog') {
    closeCancelConfirmDialog();
  } else if (action === 'confirm-discard') {
    closeCancelConfirmDialog();
    if (typeof window !== 'undefined') {
      window.location.hash = '#/kelola/inventaris';
    }
  } else if (action === 'toggle-kategori-dropdown') {
    pageState.isKategoriDropdownOpen = !pageState.isKategoriDropdownOpen;
    updateUI();
    if (pageState.isKategoriDropdownOpen) {
      setTimeout(() => {
        document.getElementById('kategori-search-input')?.focus();
      }, 50);
    }
  } else if (action === 'select-kategori-item') {
    const katId = actionEl.getAttribute('data-id');
    pageState.formData.idKategori = katId;
    delete pageState.formErrors.idKategori;
    pageState.isKategoriDropdownOpen = false;
    updateUI();
  } else if (action === 'create-kategori-item') {
    const newName = actionEl.getAttribute('data-name');
    if (newName) {
      try {
        const created = await createKategori(newName);
        pageState.kategoriList.push(created);
        pageState.formData.idKategori = created.idKategori;
        delete pageState.formErrors.idKategori;
        pageState.kategoriQuery = '';
        pageState.isKategoriDropdownOpen = false;
        updateUI();
      } catch (err) {
        pageState.formErrors = { ...pageState.formErrors, idKategori: err.message };
        updateUI();
      }
    }
  } else if (action === 'remove-foto') {
    pageState.formData.thumbnail = '';
    const fileInput = document.getElementById('form-foto-input');
    if (fileInput) fileInput.value = '';
    updateUI();
  } else if (action === 'close-feedback-dialog') {
    closeFeedbackDialog();
  } else if (action === 'close-submit-dialog') {
    closeSubmitConfirmDialog();
  } else if (action === 'confirm-submit') {
    await executeSubmitForm();
  } else if (action === 'submit-form') {
    const currentValues = readCurrentFormInputs();
    pageState.formData = { ...pageState.formData, ...currentValues };

    const validation = validateInventarisInput(currentValues, {
      minTotal: pageState.formData.minTotal || 1,
    });

    if (!validation.isValid) {
      pageState.formErrors = validation.errors;
      updateUI();
      // Scroll ke field galat pertama
      const firstErrorField = Object.keys(validation.errors)[0];
      const el = document.querySelector(`[name="${firstErrorField}"]`);
      el?.focus();
      return;
    }

    // Input valid -> Buka popup dialog konfirmasi tambah/edit
    updateUI();
    openSubmitConfirmDialog();
  }
}

async function executeSubmitForm() {
  const currentValues = readCurrentFormInputs();
  pageState.formData = { ...pageState.formData, ...currentValues };

  pageState.isSubmitting = true;
  // Perbarui UI dialog agar menampilkan status "Menyimpan..."
  const submitDlg = document.getElementById('dialog-confirm-submit');
  if (submitDlg) {
    submitDlg.outerHTML = renderConfirmSubmitModal({
      mode: pageState.mode,
      formData: pageState.formData,
      isSubmitting: true,
    }).toString();
    const newDlg = document.getElementById('dialog-confirm-submit');
    newDlg?.showModal?.();
  }

  try {
    if (pageState.mode === 'edit') {
      await updateInventaris(currentUser, pageState.formData.idInventaris, currentValues);
      closeSubmitConfirmDialog();
      openFeedbackDialog(
        'success',
        'Inventaris berhasil diperbarui!',
        'Perubahan pada barang inventaris berhasil disimpan.'
      );
    } else {
      await createInventaris(currentUser, currentValues);
      closeSubmitConfirmDialog();
      openFeedbackDialog(
        'success',
        'Inventaris berhasil ditambahkan!',
        'Barang baru sudah masuk ke daftar inventaris OKI Anda.'
      );
    }
  } catch (err) {
    closeSubmitConfirmDialog();
    pageState.formErrors = { umum: err.message, ...(err.errors || {}) };
    updateUI();
  } finally {
    pageState.isSubmitting = false;
  }
}

function handleDocumentKeyDown(e) {
  if (e.key === 'Escape') {
    const submitDlg = document.getElementById('dialog-confirm-submit');
    if (submitDlg && submitDlg.open) {
      closeSubmitConfirmDialog();
      return;
    }
    const cancelDlg = document.getElementById('dialog-confirm-cancel');
    if (cancelDlg && cancelDlg.open) {
      closeCancelConfirmDialog();
      return;
    }
    const feedDlg = document.getElementById('dialog-form-feedback');
    if (feedDlg && feedDlg.open) {
      closeFeedbackDialog();
      return;
    }
    if (pageState.isKategoriDropdownOpen) {
      pageState.isKategoriDropdownOpen = false;
      updateUI();
    }
  }
}

function handleDocumentInput(e) {
  if (e.target && e.target.id === 'form-input-nama') {
    const len = e.target.value.length;
    const counter = document.getElementById('nama-char-count');
    if (counter) counter.textContent = `${len}/100`;
  }
  if (e.target && e.target.id === 'kategori-search-input') {
    pageState.kategoriQuery = e.target.value;
    updateUI();
    const inp = document.getElementById('kategori-search-input');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }
}

/**
 * Render modul untuk test runner.
 * @param {object} state
 * @returns {string}
 */
export function render(state = {}) {
  return renderFormPageContent({
    ...pageState,
    ...state,
  }).toString();
}

/**
 * Mount halaman form tambah/ubah ke DOM.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
export async function mount(container, ctx = {}) {
  currentContainer = container;
  currentUser = ctx.user || null;

  const mode = ctx.route === 'kelola-inventaris-ubah' ? 'edit' : 'tambah';
  const idInventaris = ctx.params?.id || null;

  pageState = {
    mode,
    initialValues: {},
    formData: {
      idInventaris: idInventaris || '',
      namaBarang: '',
      totalBarang: 1,
      idKategori: '',
      kondisi: 'baik',
      deskripsi: '',
      thumbnail: '',
      minTotal: 1,
    },
    formErrors: {},
    kategoriList: [],
    kategoriQuery: '',
    isKategoriDropdownOpen: false,
    isSubmitting: false,
    namaOrganisasi: currentUser?.organisasi?.namaOrganisasi || currentUser?.namaOrganisasi || 'OKI Anda',
    loading: mode === 'edit',
    notFound: false,
    forbidden: false,
    forbiddenMessage: '',
    feedback: null,
  };

  updateUI();

  // Ambil daftar kategori
  try {
    pageState.kategoriList = await getKategori();
  } catch {
    pageState.kategoriList = [];
  }

  // Jika mode edit, muat data inventaris
  if (mode === 'edit' && idInventaris) {
    try {
      const inv = await getInventarisById(idInventaris);
      if (!inv) {
        pageState.notFound = true;
        pageState.loading = false;
        updateUI();
        return;
      }

      // Validasi kepemilikan OKI
      const myOki = currentUser?.organisasi?.idOrganisasi || currentUser?.idOrganisasi;
      const myOkiNama = currentUser?.organisasi?.namaOrganisasi || currentUser?.namaOrganisasi;
      if (myOki && inv.idOrganisasi && String(inv.idOrganisasi) !== String(myOki)) {
        if (!myOkiNama || !inv.namaOrganisasi || inv.namaOrganisasi.toLowerCase() !== myOkiNama.toLowerCase()) {
          pageState.forbidden = true;
          pageState.forbiddenMessage = `Barang ini dikelola oleh ${inv.namaOrganisasi}, bukan OKI Anda.`;
          pageState.loading = false;
          updateUI();
          return;
        }
      }

      const initialData = {
        idInventaris: inv.idInventaris,
        namaBarang: inv.namaBarang,
        totalBarang: inv.totalBarang,
        idKategori: inv.idKategori,
        kondisi: normalizeKondisi(inv.kondisi) || 'baik',
        deskripsi: inv.deskripsiBarang || '',
        thumbnail: inv.thumbnail || '',
        minTotal: 1,
      };

      pageState.formData = { ...initialData };
      pageState.initialValues = { ...initialData };
      pageState.loading = false;
    } catch {
      pageState.notFound = true;
      pageState.loading = false;
    }
  } else {
    // Mode tambah default
    pageState.formData.idKategori = pageState.kategoriList[0]?.idKategori || '';
    pageState.initialValues = { ...pageState.formData };
  }

  updateUI();

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeyDown);
  document.addEventListener('input', handleDocumentInput);

  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'form-foto-input') {
      const file = e.target.files?.[0];
      if (file) handleFotoFileSelected(file);
    }
  });
}

/**
 * Unmount halaman form.
 */
export function unmount() {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeyDown);
  document.removeEventListener('input', handleDocumentInput);

  currentContainer = null;
  currentUser = null;
}
