/**
 * kelola-kategori.js — Halaman Kelola Kategori PJ (V4b).
 * Desain dan alur dialog mengikuti acuan AddCategoryDesign.png.
 * Bebas efek samping di level atas, aman untuk SSR / unit test node:test.
 */

import { html, raw } from '../ui/html.js';
import {
  buttonClass,
  inputClass,
  labelClass,
  alertClass,
  skeletonClass,
} from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import {
  getKategoriDenganJumlah,
  createKategori,
  updateKategori,
  deleteKategori,
} from '../services/kategori.js';
import {
  filterKategori,
  paginateKategori,
  buildPageList,
  KELOLA_KATEGORI_DEFAULTS,
} from '../lib/kelola-kategori.js';
import {
  validateNamaKategori,
  normalizeNamaKategori,
  MAKS_PANJANG_KATEGORI,
} from '../lib/kategori-validation.js';
import {
  createInitialKategoriState,
  kategoriStateReducer,
} from '../lib/kelola-kategori-state.js';

import { renderKelolaTabs } from '../ui/kelola-tabs.js';
export const renderTabs = renderKelolaTabs;

export const HANDLED_KATEGORI_ACTIONS = [
  'open-tambah-dialog',
  'open-edit-dialog',
  'open-delete-dialog',
  'close-form-dialog',
  'submit-form-dialog',
  'back-to-form',
  'confirm-submit-kategori',
  'close-delete-dialog',
  'confirm-delete-kategori',
  'close-feedback-dialog',
  'change-page',
  'clear-search',
  'reset-search',
  'retry-fetch',
];

/**
 * Render skeleton loading untuk tabel kategori.
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKategoriSkeleton() {
  return html`
    <div class="space-y-4 animate-pulse">
      <div class="overflow-hidden rounded-xl border border-border bg-background/50">
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th scope="col" class="px-3 py-3 w-12 text-center">No</th>
                <th scope="col" class="px-3 py-3 min-w-[200px]">Nama Kategori</th>
                <th scope="col" class="px-3 py-3 min-w-[140px] text-center">Total Barang Per Kategori</th>
                <th scope="col" class="px-3 py-3 min-w-[160px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border text-sm">
              ${raw(
                Array.from({ length: 5 })
                  .map(
                    () => `
                <tr>
                  <td class="px-3 py-3"><div class="h-4 w-6 rounded bg-muted animate-pulse mx-auto"></div></td>
                  <td class="px-3 py-3"><div class="h-4 w-3/4 rounded bg-muted animate-pulse"></div></td>
                  <td class="px-3 py-3"><div class="h-4 w-12 rounded bg-muted animate-pulse mx-auto"></div></td>
                  <td class="px-3 py-3"><div class="h-8 w-16 rounded-xl bg-muted animate-pulse mx-auto"></div></td>
                </tr>
              `
                  )
                  .join('')
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render modal dialog formulir tambah / edit kategori.
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFormModal({ dialog, editItem, inputNama = '', inputError = null, isSubmitting = false } = {}) {
  const isOpen = dialog === 'tambah' || dialog === 'edit';
  const isEdit = dialog === 'edit';
  const title = isEdit ? 'Edit Kategori' : 'Tambah Kategori';
  const submitText = isEdit ? 'Edit' : 'Tambah';
  const charCount = typeof inputNama === 'string' ? inputNama.length : 0;

  return html`
    <dialog
      id="dialog-form-kategori"
      aria-labelledby="dialog-form-kategori-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      ${isOpen ? 'open' : ''}
    >
      <form id="form-kategori" class="p-6" onsubmit="return false;">
        <div class="flex items-center justify-between pb-3 border-b border-border">
          <h2 id="dialog-form-kategori-title" class="text-lg font-bold text-foreground">${title}</h2>
          <button
            type="button"
            data-action="close-form-dialog"
            aria-label="Tutup form kategori"
            class="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
          >
            ${renderIcon('X', 'h-5 w-5')}
          </button>
        </div>

        <div class="mt-4 space-y-2">
          <div class="flex items-center justify-between">
            <label for="input-kategori-nama" class="${labelClass()}">Nama Kategori</label>
            <span class="text-xs text-muted-foreground" id="char-counter">${charCount}/${MAKS_PANJANG_KATEGORI}</span>
          </div>
          <input
            id="input-kategori-nama"
            name="namaKategori"
            type="text"
            maxlength="${MAKS_PANJANG_KATEGORI}"
            placeholder="Masukkan nama kategori"
            value="${inputNama}"
            class="${inputClass(inputError ? 'border-destructive focus-visible:ring-destructive/20' : '')}"
            aria-invalid="${inputError ? 'true' : 'false'}"
            aria-describedby="${inputError ? 'kategori-error-msg' : ''}"
            ${isSubmitting ? 'disabled' : ''}
          />
          ${inputError
            ? html`<p id="kategori-error-msg" class="text-xs text-destructive font-medium">${inputError}</p>`
            : ''}
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            data-action="close-form-dialog"
            class="${buttonClass({ variant: 'outline', size: 'default' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            Batal
          </button>
          <button
            type="button"
            data-action="submit-form-dialog"
            class="${buttonClass({ variant: 'default', size: 'default' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            ${submitText}
          </button>
        </div>
      </form>
    </dialog>
  `;
}

/**
 * Render modal dialog konfirmasi kirim / simpan kategori.
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderConfirmModal({ dialog, editItem, inputNama = '', isSubmitting = false } = {}) {
  const isOpen = dialog === 'confirm-tambah' || dialog === 'confirm-edit';
  const isEdit = dialog === 'confirm-edit';
  const title = isEdit ? 'Edit nama kategori?' : 'Tambah kategori?';
  const desc = isEdit
    ? 'Nama kategori akan diperbarui di semua barang.'
    : 'Periksa kembali data pengajuan yang akan anda kirim';
  const submitText = isSubmitting ? 'Menyimpan...' : isEdit ? 'Edit' : 'Tambah';

  return html`
    <dialog
      id="dialog-confirm-kategori"
      aria-labelledby="dialog-confirm-kategori-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      ${isOpen ? 'open' : ''}
    >
      <div class="flex flex-col p-6 text-center items-center">
        <!-- Icon Send / Pesawat Kertas -->
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          ${renderIcon('Send', 'h-7 w-7')}
        </div>

        <h2 id="dialog-confirm-kategori-title" class="text-lg font-bold text-foreground">${title}</h2>
        <p class="mt-1.5 text-sm text-muted-foreground">${desc}</p>

        <div class="mt-4 w-full rounded-xl bg-muted/30 p-3 text-left text-xs border border-border">
          <p><strong class="font-medium text-foreground">Nama Kategori:</strong> ${inputNama || '-'}</p>
        </div>

        <div class="mt-6 flex w-full items-center justify-center gap-3">
          <button
            type="button"
            data-action="back-to-form"
            class="${buttonClass({ variant: 'outline', size: 'default', className: 'flex-1 rounded-xl' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            Kembali
          </button>
          <button
            type="button"
            data-action="confirm-submit-kategori"
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
 * Render modal dialog konfirmasi hapus kategori.
 * @param {object|null} deleteItem
 * @param {boolean} [isSubmitting=false]
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderDeleteModal(deleteItem, isSubmitting = false) {
  const isOpen = Boolean(deleteItem);
  const nama = deleteItem?.namaKategori || '';
  const idKategori = deleteItem?.idKategori || '';

  return html`
    <dialog
      id="dialog-delete-kategori"
      aria-labelledby="dialog-delete-kategori-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      ${isOpen ? 'open' : ''}
    >
      <div class="flex flex-col p-6 text-center items-center">
        <!-- Icon Trash Merah -->
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          ${renderIcon('Trash2', 'h-7 w-7')}
        </div>

        <h2 id="dialog-delete-kategori-title" class="text-lg font-bold text-foreground">Hapus kategori?</h2>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Apakah anda yakin ingin menghapus kategori <strong>${nama}</strong>?
        </p>

        <div class="mt-6 flex w-full items-center justify-center gap-3">
          <button
            type="button"
            data-action="close-delete-dialog"
            class="${buttonClass({ variant: 'outline', size: 'default', className: 'flex-1 rounded-xl' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            Kembali
          </button>
          <button
            type="button"
            data-action="confirm-delete-kategori"
            data-id="${idKategori}"
            class="${buttonClass({ variant: 'destructive', size: 'default', className: 'flex-1 rounded-xl' })}"
            ${isSubmitting ? 'disabled' : ''}
          >
            ${isSubmitting ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Render modal dialog feedback hasil aksi (sukses atau gagal).
 * @param {object|null} feedback
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFeedbackModal(feedback) {
  const isOpen = Boolean(feedback);
  const isError = feedback?.type === 'error';
  const isDipakai = feedback?.subType === 'kategori_dipakai';
  const title = feedback?.title || '';
  const message = feedback?.message || '';

  const iconName = isDipakai ? 'Frown' : isError ? 'AlertTriangle' : 'CheckCircle2';
  const iconColor = isDipakai || isError ? 'text-destructive bg-destructive/10' : 'text-emerald-600 bg-emerald-50';

  return html`
    <dialog
      id="dialog-feedback-kategori"
      aria-labelledby="dialog-feedback-kategori-title"
      class="fixed inset-0 m-auto z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      ${isOpen ? 'open' : ''}
    >
      <div class="flex flex-col p-6 text-center items-center">
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconColor}">
          ${renderIcon(iconName, 'h-7 w-7')}
        </div>

        <h2 id="dialog-feedback-kategori-title" class="text-lg font-bold text-foreground">${title}</h2>
        <p class="mt-1.5 text-sm text-muted-foreground">${message}</p>

        <div class="mt-6 flex w-full items-center justify-center">
          <button
            type="button"
            data-action="close-feedback-dialog"
            class="${buttonClass({ variant: 'default', size: 'default', className: 'w-full rounded-xl' })}"
          >
            Kembali
          </button>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Render tabel data kategori dan kontrol pencarian.
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKategoriTableContent({
  items = [],
  page = 1,
  perPage = 10,
  total = 0,
  totalPages = 1,
  cari = '',
  loading = false,
  error = null,
} = {}) {
  if (loading) {
    return renderKategoriSkeleton();
  }

  if (error) {
    return html`
      <div class="${alertClass({ variant: 'destructive', className: 'my-6' })}">
        ${renderIcon('AlertCircle', 'h-5 w-5')}
        <div>
          <h4 class="font-semibold text-sm">Gagal memuat kategori</h4>
          <p class="text-xs text-muted-foreground mt-0.5">${error}</p>
        </div>
        <button
          type="button"
          data-action="retry-fetch"
          class="${buttonClass({ variant: 'outline', size: 'sm', className: 'ml-auto' })}"
        >
          Coba Lagi
        </button>
      </div>
    `;
  }

  const adaCari = Boolean(cari && cari.trim());

  if (items.length === 0) {
    if (adaCari) {
      return html`
        <div class="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-card">
          <div class="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
            ${renderIcon('Search', 'h-6 w-6')}
          </div>
          <h3 class="text-base font-semibold text-foreground">Tidak ada kategori ditemukan</h3>
          <p class="text-xs text-muted-foreground mt-1 max-w-sm">
            Tidak ditemukan kategori dengan kata kunci <strong>"${cari}"</strong>.
          </p>
          <button
            type="button"
            data-action="reset-search"
            class="${buttonClass({ variant: 'outline', size: 'sm', className: 'mt-4' })}"
          >
            Reset Pencarian
          </button>
        </div>
      `;
    }

    return html`
      <div class="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-card">
        <div class="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
          ${renderIcon('FolderTree', 'h-6 w-6')}
        </div>
        <h3 class="text-base font-semibold text-foreground">Belum ada kategori</h3>
        <p class="text-xs text-muted-foreground mt-1 max-w-sm">
          Mulai dengan menambahkan kategori baru untuk barang inventaris Anda.
        </p>
        <button
          type="button"
          data-action="open-tambah-dialog"
          class="${buttonClass({ variant: 'default', size: 'sm', className: 'mt-4' })}"
        >
          ${renderIcon('Plus', 'h-4 w-4 mr-1.5')}
          Tambah Kategori
        </button>
      </div>
    `;
  }

  const startNo = (page - 1) * perPage;
  const pageList = buildPageList(page, totalPages);

  return html`
    <div class="space-y-4">
      <!-- Tabel Pembungkus Overflow 360px safe -->
      <div class="overflow-hidden rounded-xl border border-border bg-background/50">
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th scope="col" class="px-3 py-3 w-12 text-center">No</th>
                <th scope="col" class="px-3 py-3 min-w-[200px]">Nama Kategori</th>
                <th scope="col" class="px-3 py-3 min-w-[140px] text-center">Total Barang Per Kategori</th>
                <th scope="col" class="px-3 py-3 min-w-[160px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border text-sm">
              ${items.map((kat, idx) => {
                const no = startNo + idx + 1;
                const totalBarang = Number(kat.totalBarang || 0);
                const isDipakai = totalBarang > 0;

                return html`
                  <tr class="transition hover:bg-muted/20">
                    <td class="px-3 py-3 text-center text-muted-foreground align-middle">${no}</td>
                    <td class="px-3 py-3 font-medium text-foreground align-middle">${kat.namaKategori}</td>
                    <td class="px-3 py-3 text-center align-middle">
                      <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                        ${totalBarang}
                      </span>
                    </td>
                    <td class="px-3 py-3 align-middle">
                      <div class="flex items-center justify-center gap-1" role="group" aria-label="Aksi kategori ${kat.namaKategori}">
                        <button
                          type="button"
                          data-action="open-edit-dialog"
                          data-id="${kat.idKategori}"
                          data-nama="${kat.namaKategori}"
                          aria-label="Ubah kategori ${kat.namaKategori}"
                          title="Ubah ${kat.namaKategori}"
                          class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          ${renderIcon('Pencil', 'h-4 w-4')}
                        </button>

                        ${isDipakai
                          ? html`
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                aria-label="Hapus kategori ${kat.namaKategori} nonaktif karena masih digunakan"
                                title="Kategori masih digunakan"
                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/40 cursor-not-allowed opacity-50"
                              >
                                ${renderIcon('Trash2', 'h-4 w-4')}
                              </button>
                              <span class="text-xs text-muted-foreground ml-1 whitespace-nowrap">Dipakai ${totalBarang} barang</span>
                            `
                          : html`
                              <button
                                type="button"
                                data-action="open-delete-dialog"
                                data-id="${kat.idKategori}"
                                data-nama="${kat.namaKategori}"
                                data-count="${totalBarang}"
                                aria-label="Hapus kategori ${kat.namaKategori}"
                                title="Hapus ${kat.namaKategori}"
                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-destructive transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                ${renderIcon('Trash2', 'h-4 w-4')}
                              </button>
                            `}
                      </div>
                    </td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer Paginasi -->
      ${totalPages > 1
        ? html`
            <nav class="mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:justify-end" aria-label="Navigasi Halaman Kategori">
              <button
                type="button"
                data-action="change-page"
                data-page="${page - 1}"
                ${page <= 1 ? raw('disabled aria-disabled="true"') : ''}
                class="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-input bg-background px-3 text-xs font-medium transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                aria-label="Halaman sebelumnya"
              >
                ${renderIcon('ChevronLeft', 'h-4 w-4')}
                <span>Sebelumnya</span>
              </button>

              <div class="flex items-center gap-1">
                ${pageList.map((p) => {
                  if (p === '…' || p === '...') {
                    return html`<span class="inline-flex h-9 w-9 items-center justify-center text-xs text-muted-foreground">…</span>`;
                  }
                  const isCurrent = p === page;
                  return html`
                    <button
                      type="button"
                      data-action="change-page"
                      data-page="${p}"
                      aria-current="${isCurrent ? 'page' : 'false'}"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-medium transition ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'border border-input bg-background text-foreground hover:bg-accent'
                      }"
                    >
                      ${p}
                    </button>
                  `;
                })}
              </div>

              <button
                type="button"
                data-action="change-page"
                data-page="${page + 1}"
                ${page >= totalPages ? raw('disabled aria-disabled="true"') : ''}
                class="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-input bg-background px-3 text-xs font-medium transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                aria-label="Halaman berikutnya"
              >
                <span>Berikutnya</span>
                ${renderIcon('ChevronRight', 'h-4 w-4')}
              </button>
            </nav>
          `
        : ''}
    </div>
  `;
}

/**
 * Render keseluruhan halaman Kelola Kategori.
 * @param {object} state
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKelolaKategoriContent(state = {}) {
  const {
    cari = '',
    halaman = 1,
    perPage = 10,
    dialog = null,
    editItem = null,
    deleteItem = null,
    inputNama = '',
    inputError = null,
    isSubmitting = false,
    feedback = null,
    items = [],
    total = 0,
    totalPages = 1,
    loading = false,
    error = null,
  } = state;

  return html`
    <div class="space-y-6" id="kelola-kategori-root">
      <!-- Header Halaman -->
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Kelola Inventaris</h1>
        <p class="text-sm text-muted-foreground">
          Kelola Kategori Inventaris OKI Anda.
        </p>
      </div>

      <!-- Tab Navigasi [Inventaris] [Kategori] -->
      ${renderTabs('kategori')}

      <!-- Card Kontainer List Kategori -->
      <div class="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <!-- Toolbar Atas: Judul Card + Cari + Tambah -->
        <div class="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-foreground">List Kategori</h2>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Kolom Pencarian -->
            <div id="kelola-search-wrapper" class="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                ${renderIcon('Search', 'h-4 w-4')}
              </span>
              <input
                id="input-cari-kategori"
                type="search"
                placeholder="Cari kategori"
                value="${cari}"
                class="${inputClass('pl-9 pr-8 h-10')}"
                aria-label="Cari kategori"
              />
              ${cari
                ? html`
                    <button
                      type="button"
                      data-action="clear-search"
                      aria-label="Bersihkan pencarian"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground inline-flex h-5 w-5 items-center justify-center rounded"
                    >
                      ${renderIcon('X', 'h-3.5 w-3.5')}
                    </button>
                  `
                : ''}
            </div>

            <!-- Tombol Tambah Kategori -->
            <button
              type="button"
              data-action="open-tambah-dialog"
              class="${buttonClass({ variant: 'default', size: 'default', className: 'h-10 gap-1.5' })}"
            >
              ${renderIcon('Plus', 'h-4 w-4')}
              <span>Tambah Kategori</span>
            </button>
          </div>
        </div>

        <!-- Tabel Kategori (diperbarui parsial saat mencari / paginasi) -->
        <div id="kategori-table-container">
          ${renderKategoriTableContent({
            items,
            page: halaman,
            perPage,
            total,
            totalPages,
            cari,
            loading,
            error,
          })}
        </div>
      </div>

      <!-- Modal-modal Dialog -->
      ${renderFormModal({ dialog, editItem, inputNama, inputError, isSubmitting })}
      ${renderConfirmModal({ dialog, editItem, inputNama, isSubmitting })}
      ${renderDeleteModal(deleteItem, isSubmitting)}
      ${renderFeedbackModal(feedback)}
    </div>
  `;
}

/**
 * Render fungsi publik untuk router.
 * @param {object} ctx
 * @returns {string}
 */
export function render(ctx = {}) {
  const initial = createInitialKategoriState();
  return renderKelolaKategoriContent({
    ...initial,
    loading: true,
  }).toString();
}

/* ========================================================================== */
/* State & Runtime Controller untuk Mount                                     */
/* ========================================================================== */

let currentContainer = null;
let currentUser = null;
let allKategoriData = [];
let pageState = createInitialKategoriState();
let debounceTimer = null;
let lastTriggerEl = null;

async function loadData() {
  pageState = { ...pageState, loading: true, error: null };
  updateTableOnly();

  try {
    const list = await getKategoriDenganJumlah();
    allKategoriData = Array.isArray(list) ? list : [];
    pageState.loading = false;
  } catch (err) {
    pageState.loading = false;
    pageState.error = err.message || 'Gagal memuat kategori.';
  }

  updateTableOnly();
}

function computeViewData() {
  const filtered = filterKategori(allKategoriData, { cari: pageState.cari });
  const paginated = paginateKategori(filtered, pageState.halaman, pageState.perPage);

  // Koreksi halaman jika halaman aktif melebihi totalPages
  if (paginated.totalPages > 0 && pageState.halaman > paginated.totalPages) {
    pageState.halaman = paginated.totalPages;
    const rePaginated = paginateKategori(filtered, pageState.halaman, pageState.perPage);
    return {
      items: rePaginated.items,
      total: rePaginated.total,
      totalPages: rePaginated.totalPages,
    };
  }

  return {
    items: paginated.items,
    total: paginated.total,
    totalPages: paginated.totalPages,
  };
}

function updateTableOnly() {
  if (!currentContainer) return;
  const tableCont = currentContainer.querySelector('#kategori-table-container');
  if (!tableCont) return;

  const view = computeViewData();
  tableCont.innerHTML = renderKategoriTableContent({
    items: view.items,
    page: pageState.halaman,
    perPage: pageState.perPage,
    total: view.total,
    totalPages: view.totalPages,
    cari: pageState.cari,
    loading: pageState.loading,
    error: pageState.error,
  }).toString();
}

function updateUI() {
  if (!currentContainer) return;
  updateTableOnly();

  // Mutakhirkan modal form
  const formDlg = currentContainer.querySelector('#dialog-form-kategori');
  if (formDlg) {
    formDlg.outerHTML = renderFormModal({
      dialog: pageState.dialog,
      editItem: pageState.editItem,
      inputNama: pageState.inputNama,
      inputError: pageState.inputError,
      isSubmitting: pageState.isSubmitting,
    }).toString();
  }

  // Mutakhirkan modal confirm
  const confirmDlg = currentContainer.querySelector('#dialog-confirm-kategori');
  if (confirmDlg) {
    confirmDlg.outerHTML = renderConfirmModal({
      dialog: pageState.dialog,
      editItem: pageState.editItem,
      inputNama: pageState.inputNama,
      isSubmitting: pageState.isSubmitting,
    }).toString();
  }

  // Mutakhirkan modal delete
  const deleteDlg = currentContainer.querySelector('#dialog-delete-kategori');
  if (deleteDlg) {
    deleteDlg.outerHTML = renderDeleteModal(pageState.deleteItem, pageState.isSubmitting).toString();
  }

  // Mutakhirkan modal feedback
  const feedbackDlg = currentContainer.querySelector('#dialog-feedback-kategori');
  if (feedbackDlg) {
    feedbackDlg.outerHTML = renderFeedbackModal(pageState.feedback).toString();
  }
}

function openDialog(dialogId) {
  const dlg = currentContainer?.querySelector(`#${dialogId}`);
  if (dlg && typeof dlg.showModal === 'function' && !dlg.open) {
    dlg.showModal();
  }
}

function closeDialog(dialogId) {
  const dlg = currentContainer?.querySelector(`#${dialogId}`);
  if (dlg && typeof dlg.close === 'function' && dlg.open) {
    dlg.close();
  }
}

async function handleActionClick(action, target) {
  switch (action) {
    case 'open-tambah-dialog': {
      lastTriggerEl = target;
      pageState = kategoriStateReducer(pageState, { type: 'buka-dialog-tambah' });
      updateUI();
      openDialog('dialog-form-kategori');
      const input = currentContainer?.querySelector('#input-kategori-nama');
      input?.focus();
      break;
    }

    case 'open-edit-dialog': {
      lastTriggerEl = target;
      const id = target.getAttribute('data-id');
      const item = allKategoriData.find((k) => String(k.idKategori) === String(id)) || {
        idKategori: id,
        namaKategori: target.getAttribute('data-nama') || '',
      };
      pageState = kategoriStateReducer(pageState, { type: 'buka-dialog-edit', payload: { item } });
      updateUI();
      openDialog('dialog-form-kategori');
      const input = currentContainer?.querySelector('#input-kategori-nama');
      input?.focus();
      input?.select();
      break;
    }

    case 'close-form-dialog': {
      closeDialog('dialog-form-kategori');
      pageState = kategoriStateReducer(pageState, { type: 'tutup-dialog' });
      updateUI();
      lastTriggerEl?.focus();
      lastTriggerEl = null;
      break;
    }

    case 'submit-form-dialog': {
      const input = currentContainer?.querySelector('#input-kategori-nama');
      const rawVal = input ? input.value : pageState.inputNama;
      pageState.inputNama = rawVal;

      const idDiabaikan = pageState.editItem?.idKategori || null;
      const val = validateNamaKategori(rawVal, { daftar: allKategoriData, idDiabaikan });

      if (!val.isValid) {
        pageState = kategoriStateReducer(pageState, {
          type: 'set-input-error',
          payload: { error: val.error },
        });
        updateUI();
        const reInput = currentContainer?.querySelector('#input-kategori-nama');
        reInput?.focus();
        return;
      }

      // Valid -> Buka dialog konfirmasi kirim
      closeDialog('dialog-form-kategori');
      const nextType = pageState.dialog === 'edit' ? 'konfirmasi-edit' : 'konfirmasi-tambah';
      pageState = kategoriStateReducer(pageState, { type: nextType });
      updateUI();
      openDialog('dialog-confirm-kategori');
      break;
    }

    case 'back-to-form': {
      closeDialog('dialog-confirm-kategori');
      const returnType = pageState.dialog === 'confirm-edit' ? 'kembali-ke-form-edit' : 'kembali-ke-form-tambah';
      pageState = kategoriStateReducer(pageState, { type: returnType });
      updateUI();
      openDialog('dialog-form-kategori');
      const input = currentContainer?.querySelector('#input-kategori-nama');
      input?.focus();
      break;
    }

    case 'confirm-submit-kategori': {
      pageState.isSubmitting = true;
      updateUI();

      try {
        if (pageState.editItem) {
          await updateKategori(currentUser, pageState.editItem.idKategori, pageState.inputNama);
          closeDialog('dialog-confirm-kategori');
          pageState = kategoriStateReducer(pageState, {
            type: 'buka-feedback',
            payload: {
              feedback: {
                type: 'success',
                title: 'Kategori berhasil diperbarui!',
                message: 'Nama kategori telah berhasil diubah di sistem.',
              },
            },
          });
        } else {
          await createKategori(currentUser, pageState.inputNama);
          closeDialog('dialog-confirm-kategori');
          pageState = kategoriStateReducer(pageState, {
            type: 'buka-feedback',
            payload: {
              feedback: {
                type: 'success',
                title: 'Kategori berhasil ditambahkan!',
                message: 'Anda telah berhasil menambahkan kategori baru.',
              },
            },
          });
        }

        // Muat ulang daftar kategori dari service
        const freshList = await getKategoriDenganJumlah();
        allKategoriData = Array.isArray(freshList) ? freshList : [];
      } catch (err) {
        closeDialog('dialog-confirm-kategori');
        pageState = kategoriStateReducer(pageState, {
          type: 'buka-feedback',
          payload: {
            feedback: {
              type: 'error',
              title: 'Gagal Menyimpan Kategori',
              message: err.message || 'Terjadi kesalahan sistem saat menyimpan kategori.',
            },
          },
        });
      } finally {
        pageState.isSubmitting = false;
        updateUI();
        openDialog('dialog-feedback-kategori');
      }
      break;
    }

    case 'open-delete-dialog': {
      lastTriggerEl = target;
      const id = target.getAttribute('data-id');
      const item = allKategoriData.find((k) => String(k.idKategori) === String(id)) || {
        idKategori: id,
        namaKategori: target.getAttribute('data-nama') || '',
        totalBarang: Number(target.getAttribute('data-count') || 0),
      };

      pageState = kategoriStateReducer(pageState, { type: 'buka-dialog-hapus', payload: { item } });
      updateUI();
      openDialog('dialog-delete-kategori');
      break;
    }

    case 'close-delete-dialog': {
      closeDialog('dialog-delete-kategori');
      pageState = kategoriStateReducer(pageState, { type: 'tutup-dialog' });
      updateUI();
      lastTriggerEl?.focus();
      lastTriggerEl = null;
      break;
    }

    case 'confirm-delete-kategori': {
      if (!pageState.deleteItem) return;
      pageState.isSubmitting = true;
      updateUI();

      try {
        await deleteKategori(currentUser, pageState.deleteItem.idKategori);
        closeDialog('dialog-delete-kategori');
        pageState = kategoriStateReducer(pageState, {
          type: 'buka-feedback',
          payload: {
            feedback: {
              type: 'success',
              title: 'Kategori berhasil dihapus!',
              message: 'Anda telah berhasil menghapus kategori.',
            },
          },
        });

        const freshList = await getKategoriDenganJumlah();
        allKategoriData = Array.isArray(freshList) ? freshList : [];
      } catch (err) {
        closeDialog('dialog-delete-kategori');
        const isDipakai = err.code === 'KATEGORI_DIPAKAI';
        pageState = kategoriStateReducer(pageState, {
          type: 'buka-feedback',
          payload: {
            feedback: {
              type: 'error',
              subType: isDipakai ? 'kategori_dipakai' : 'error_umum',
              title: isDipakai ? 'Kategori Tidak Bisa Dihapus' : 'Gagal Menghapus Kategori',
              message: isDipakai
                ? 'Kategori ini masih digunakan oleh beberapa barang. Ganti kategorinya terlebih dahulu agar bisa dihapus'
                : err.message || 'Terjadi kesalahan sistem saat menghapus kategori.',
            },
          },
        });
      } finally {
        pageState.isSubmitting = false;
        updateUI();
        openDialog('dialog-feedback-kategori');
      }
      break;
    }

    case 'close-feedback-dialog': {
      closeDialog('dialog-feedback-kategori');
      pageState = kategoriStateReducer(pageState, { type: 'tutup-dialog' });
      updateUI();
      lastTriggerEl?.focus();
      lastTriggerEl = null;
      break;
    }

    case 'change-page': {
      const targetPage = Number(target.getAttribute('data-page') || 1);
      pageState = kategoriStateReducer(pageState, {
        type: 'ganti-halaman',
        payload: { halaman: targetPage },
      });
      updateTableOnly();
      break;
    }

    case 'clear-search':
    case 'reset-search': {
      pageState = kategoriStateReducer(pageState, {
        type: 'cari-berubah',
        payload: { cari: '' },
      });
      const input = currentContainer?.querySelector('#input-cari-kategori');
      if (input) input.value = '';
      updateTableOnly();
      input?.focus();
      break;
    }

    case 'retry-fetch': {
      await loadData();
      break;
    }
  }
}

async function handleDocumentClick(e) {
  // Backdrop click native dialog
  if (e.target && e.target.nodeName === 'DIALOG') {
    if (e.target.id === 'dialog-confirm-kategori') {
      await handleActionClick('back-to-form', e.target);
    } else if (e.target.id === 'dialog-form-kategori') {
      await handleActionClick('close-form-dialog', e.target);
    } else if (e.target.id === 'dialog-delete-kategori') {
      await handleActionClick('close-delete-dialog', e.target);
    } else if (e.target.id === 'dialog-feedback-kategori') {
      await handleActionClick('close-feedback-dialog', e.target);
    }
    return;
  }

  const trigger = e.target.closest('[data-action]');
  if (!trigger) return;

  const action = trigger.getAttribute('data-action');
  if (action) {
    await handleActionClick(action, trigger);
  }
}

function handleDocumentKeyDown(e) {
  if (e.key === 'Escape') {
    const confirmDlg = currentContainer?.querySelector('#dialog-confirm-kategori');
    if (confirmDlg && confirmDlg.open) {
      handleActionClick('back-to-form', confirmDlg);
      return;
    }
    const formDlg = currentContainer?.querySelector('#dialog-form-kategori');
    if (formDlg && formDlg.open) {
      handleActionClick('close-form-dialog', formDlg);
      return;
    }
    const deleteDlg = currentContainer?.querySelector('#dialog-delete-kategori');
    if (deleteDlg && deleteDlg.open) {
      handleActionClick('close-delete-dialog', deleteDlg);
      return;
    }
    const feedbackDlg = currentContainer?.querySelector('#dialog-feedback-kategori');
    if (feedbackDlg && feedbackDlg.open) {
      handleActionClick('close-feedback-dialog', feedbackDlg);
      return;
    }
  }
}

function handleSearchInput(e) {
  if (e.target.id === 'input-cari-kategori') {
    const val = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      pageState = kategoriStateReducer(pageState, {
        type: 'cari-berubah',
        payload: { cari: val },
      });
      updateTableOnly();
    }, 300);
  } else if (e.target.id === 'input-kategori-nama') {
    const val = e.target.value;
    pageState.inputNama = val;
    const counter = currentContainer?.querySelector('#char-counter');
    if (counter) {
      counter.textContent = `${val.length}/${MAKS_PANJANG_KATEGORI}`;
    }
    if (pageState.inputError) {
      pageState.inputError = null;
      const errEl = currentContainer?.querySelector('#kategori-error-msg');
      if (errEl) errEl.remove();
      e.target.classList.remove('border-destructive');
      e.target.setAttribute('aria-invalid', 'false');
    }
  }
}

function handleFormKeyDown(e) {
  if (e.key === 'Enter' && e.target.id === 'input-kategori-nama') {
    e.preventDefault();
    handleActionClick('submit-form-dialog', e.target);
  }
}

/**
 * Mount halaman Kelola Kategori ke DOM.
 * @param {HTMLElement} appRoot
 * @param {object} [ctx]
 */
export async function mount(appRoot, ctx = {}) {
  currentContainer = appRoot;
  currentUser = ctx.user || null;
  pageState = createInitialKategoriState();

  const view = computeViewData();
  currentContainer.innerHTML = renderKelolaKategoriContent({
    ...pageState,
    items: view.items,
    total: view.total,
    totalPages: view.totalPages,
    loading: true,
  }).toString();

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeyDown);
  currentContainer.addEventListener('input', handleSearchInput);
  currentContainer.addEventListener('keydown', handleFormKeyDown);

  await loadData();
}

/**
 * Unmount halaman Kelola Kategori dan bersihkan listener.
 * @param {HTMLElement} [appRoot]
 */
export function unmount(appRoot) {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeyDown);
  if (currentContainer) {
    currentContainer.removeEventListener('input', handleSearchInput);
    currentContainer.removeEventListener('keydown', handleFormKeyDown);
  }
  clearTimeout(debounceTimer);
  currentContainer = null;
  currentUser = null;
  allKategoriData = [];
  lastTriggerEl = null;
}
