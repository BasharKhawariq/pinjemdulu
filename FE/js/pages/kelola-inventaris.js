/**
 * kelola-inventaris.js — Halaman Kelola Inventaris PJ (V3a).
 * Acuan visual: _sumber/src/app/(pj)/pj/inventaris/_components/InventarisKelolaPage.jsx
 */

import { html, raw, escapeHtml } from '../ui/html.js';
import {
  buttonClass,
  inputClass,
  badgeClass,
  skeletonClass,
  selectClass,
  textareaClass,
  labelClass,
  alertClass,
} from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderModal } from '../ui/modal.js';
import { renderFilterButton, renderFilterModal as renderBaseFilterModal } from '../ui/filter.js';
import {
  getInventarisKelola,
  createInventaris,
  updateInventaris,
  deleteInventaris,
} from '../services/inventaris.js';
import { getKategori } from '../services/kategori.js';
import { getInitials } from '../lib/navigation.js';
import {
  filterKelolaInventaris,
  countActiveFilters,
  paginateKelola,
  buildPageList,
  KELOLA_DEFAULTS,
} from '../lib/kelola-inventaris.js';
import { validateInventarisInput, validateFotoFile, MAKS_FOTO_BYTES } from '../lib/inventaris-form.js';
import { normalizeKondisi } from '../lib/kondisi.js';
import { KONDISI_BARANG, LABEL_KONDISI } from '../lib/constants.js';
import { renderKelolaTabs } from '../ui/kelola-tabs.js';

export const renderTabs = renderKelolaTabs;

/**
 * Daftar semua data-action yang didukung dan ditangani oleh modul kelola inventaris.
 */
export const HANDLED_ACTIONS = [
  'open-filter-dialog',
  'close-filter-dialog',
  'reset-filter-dialog',
  'apply-filter-dialog',
  'reset-filter-direct',
  'clear-search',
  'change-page',
  'retry-load',
  'detail-inventaris',
  'close-detail-dialog',
  'delete-inventaris',
  'close-delete-dialog',
  'confirm-delete-inventaris',
  'close-feedback-dialog',
];

/**
 * Helper dispatch aksi untuk test integrasi (DOM palsu).
 * @param {string} actionName
 * @param {object} [handlers]
 * @returns {boolean}
 */
export function dispatchAction(actionName, handlers = {}) {
  if (actionName === 'close-detail-dialog' && typeof handlers.onCloseDetail === 'function') {
    handlers.onCloseDetail();
    return true;
  }
  return HANDLED_ACTIONS.includes(actionName);
}

/**
 * Render OrganisasiBadge kecil untuk tabel.
 * @param {string} nama
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderOrganisasiBadge(nama = '') {
  if (!nama) return raw('');
  const initials = getInitials(nama).slice(0, 2);
  return html`
    <span class="inline-flex items-center gap-1.5 font-medium text-zinc-600">
      <span
        class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-white"
        aria-hidden="true"
      >
        ${initials}
      </span>
      <span class="truncate text-xs">${nama}</span>
    </span>
  `;
}

/**
 * Render KategoriBadge untuk tabel.
 * @param {string} nama
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKategoriBadge(nama = '') {
  if (!nama) return raw('-');
  return html`
    <span class="${badgeClass('info')} text-xs font-normal">
      ${nama}
    </span>
  `;
}

/**
 * Render badge kondisi barang (Baik / Rusak).
 * @param {string} kondisi
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKondisiBadge(kondisi) {
  const norm = normalizeKondisi(kondisi);
  const variant = norm === KONDISI_BARANG.BAIK ? 'success' : norm === KONDISI_BARANG.RUSAK ? 'danger' : 'secondary';
  const label = LABEL_KONDISI[norm] || norm || '-';
  return html`<span class="${badgeClass(variant)} text-xs">${label}</span>`;
}

/**
 * Render badge status ketersediaan barang.
 * @param {object} inv
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderStatusBadge(inv) {
  const sisa = Number(inv?.sisaHariIni ?? inv?.totalBarang ?? 0) || 0;
  if (sisa > 0) {
    return html`<span class="${badgeClass('success')} text-xs">Tersedia</span>`;
  }
  return html`<span class="${badgeClass('warning')} text-xs">Dipinjam</span>`;
}

/**
 * Render baris skeleton saat loading tabel.
 * @param {number} cols
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderRowSkeleton(cols = 7) {
  const cells = Array.from({ length: cols })
    .map(
      () => html`
        <td class="px-4 py-4">
          <div class="${skeletonClass('h-4 w-4/5 rounded')}"></div>
        </td>
      `
    );
  return html`<tr class="border-b border-slate-100 last:border-0">${raw(cells.join(''))}</tr>`;
}

/**
 * Render skeleton penuh untuk tabel.
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderTableSkeleton() {
  const rows = Array.from({ length: 6 })
    .map(() => renderRowSkeleton(7))
    .join('');
  return raw(rows);
}

/**
 * Render baris tunggal dalam tabel inventaris.
 * @param {object} it
 * @param {number} index
 * @param {number} page
 * @param {number} perPage
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderTableRow(it, index, page = 1, perPage = 10) {
  const no = (page - 1) * perPage + index + 1;
  const sisa = Number(it.sisaHariIni ?? it.totalBarang ?? 0);
  const total = Number(it.totalBarang ?? 0);

  return html`
    <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60" data-id="${it.idInventaris}">
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400 align-middle">${no}</td>
      <td class="min-w-[200px] px-4 py-4 align-middle">
        <div class="flex flex-col gap-1.5">
          <span class="font-medium text-slate-800 text-xs">${it.namaBarang}</span>
          ${renderOrganisasiBadge(it.namaOrganisasi)}
        </div>
      </td>
      <td class="min-w-[120px] px-4 py-4 text-xs text-slate-400 align-middle">
        ${renderKategoriBadge(it.namaKategori)}
      </td>
      <td class="whitespace-nowrap px-4 py-4 text-right tabular-nums text-xs align-middle min-w-[100px]">
        <span class="font-medium text-slate-700">${total}</span>
        <span class="ml-1 text-xs text-slate-400">(${sisa} sisa)</span>
      </td>
      <td class="whitespace-nowrap px-4 py-4 align-middle min-w-[120px]">
        ${renderKondisiBadge(it.kondisi)}
      </td>
      <td class="whitespace-nowrap px-4 py-4 align-middle min-w-[100px]">
        ${renderStatusBadge(it)}
      </td>
      <td class="whitespace-nowrap px-4 py-4 align-middle min-w-[160px]">
        <div class="flex items-center justify-center gap-1" role="group" aria-label="Aksi inventaris ${it.namaBarang}">
          <!-- Ubah (Link Halaman Terpisah) -->
          <a
            href="#/kelola/inventaris/${it.idInventaris}/ubah"
            aria-label="Ubah ${it.namaBarang}"
            title="Ubah ${it.namaBarang}"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ${renderIcon('Pencil', 'h-4 w-4')}
          </a>

          <!-- Detail -->
          <button
            type="button"
            data-action="detail-inventaris"
            data-id="${it.idInventaris}"
            aria-label="Lihat detail ${it.namaBarang}"
            title="Lihat detail ${it.namaBarang}"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ${renderIcon('Info', 'h-4 w-4')}
          </button>

          <!-- Hapus -->
          <button
            type="button"
            data-action="delete-inventaris"
            data-id="${it.idInventaris}"
            aria-label="Hapus ${it.namaBarang}"
            title="Hapus ${it.namaBarang}"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ${renderIcon('Trash2', 'h-4 w-4')}
          </button>
        </div>
      </td>
    </tr>
  `;
}

import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

/**
 * Render paginasi tabel kelola inventaris.
 * @param {number} page
 * @param {number} totalPages
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderPagination(page, totalPages) {
  const current = Math.max(1, page || 1);
  const total = Math.max(1, totalPages || 1);
  return html`
    <nav class="mt-5 flex flex-wrap items-center justify-center sm:justify-end" aria-label="Navigasi Halaman Inventaris">
      ${raw(renderSharedPagination({ currentPage: current, totalPages: total, action: 'change-page' }))}
    </nav>
  `;
}

/**
 * Render modal filter kompak dialog native.
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFilterModal({ filters = {}, kategoriList = [], countActive = 0 } = {}) {
  const curKat = filters.kategori || '';
  const curKondisi = filters.kondisi || '';
  const curStatus = filters.status || '';

  const katOptions = [
    html`<option value="" ${curKat === '' ? raw('selected') : ''}>Pilih kategori</option>`,
    ...kategoriList.map(
      (k) =>
        html`<option value="${k.idKategori}" ${curKat === k.idKategori ? raw('selected') : ''}>${k.namaKategori}</option>`
    ),
  ];

  const bodyContent = html`
    <!-- Kategori -->
    <div class="space-y-1.5">
      <label for="filter-kategori-select" class="text-sm font-medium text-foreground">Kategori</label>
      <div class="relative">
        <select id="filter-kategori-select" name="kategori" class="${selectClass('appearance-none pr-10 cursor-pointer')}">
          ${raw(katOptions.map((o) => o.toString()).join(''))}
        </select>
        <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
          ${renderIcon('ChevronDown', 'h-4 w-4')}
        </span>
      </div>
    </div>

    <!-- Kondisi -->
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-foreground">Kondisi</legend>
      <div class="space-y-2">
        <label class="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 text-sm cursor-pointer transition hover:bg-muted/40">
          <input
            type="radio"
            name="kondisi"
            value="baik"
            ${curKondisi === 'baik' ? raw('checked') : ''}
            class="size-4 accent-primary"
          />
          <span>Baik</span>
        </label>
        <label class="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 text-sm cursor-pointer transition hover:bg-muted/40">
          <input
            type="radio"
            name="kondisi"
            value="rusak"
            ${curKondisi === 'rusak' ? raw('checked') : ''}
            class="size-4 accent-primary"
          />
          <span>Rusak</span>
        </label>
      </div>
    </fieldset>

    <!-- Status -->
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-foreground">Status</legend>
      <div class="space-y-2">
        <label class="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 text-sm cursor-pointer transition hover:bg-muted/40">
          <input
            type="radio"
            name="status"
            value="tersedia"
            ${curStatus === 'tersedia' ? raw('checked') : ''}
            class="size-4 accent-primary"
          />
          <span>Tersedia</span>
        </label>
        <label class="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 text-sm cursor-pointer transition hover:bg-muted/40">
          <input
            type="radio"
            name="status"
            value="dipinjam"
            ${curStatus === 'dipinjam' ? raw('checked') : ''}
            class="size-4 accent-primary"
          />
          <span>Dipinjam</span>
        </label>
      </div>
    </fieldset>
  `;

  return renderBaseFilterModal({
    id: 'dialog-filter-kelola',
    title: 'Filter Barang Inventaris',
    countActive,
    closeAction: 'close-filter-dialog',
    resetAction: 'reset-filter-dialog',
    applyAction: 'apply-filter-dialog',
    formId: 'form-filter-kelola',
    bodyContent,
  });
}

/**
 * Render modal detail barang native dialog.
 * @param {object|null} item
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderDetailModal(item) {
  if (!item) {
    return html`
      <dialog id="dialog-detail-kelola" aria-labelledby="dialog-detail-title" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full max-w-xl rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
        <div class="p-6">
          <h2 id="dialog-detail-title" class="sr-only">Detail Inventaris</h2>
        </div>
      </dialog>
    `;
  }

  const sisa = Number(item.sisaHariIni ?? item.totalBarang ?? 0);
  const total = Number(item.totalBarang ?? 0);
  const jumlahText = sisa === total ? `${total} unit` : `${sisa} dari ${total} unit tersedia`;

  return html`
    <dialog id="dialog-detail-kelola" aria-labelledby="dialog-detail-title" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <div class="flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="dialog-detail-title" class="text-lg font-semibold text-foreground">Detail Inventaris</h2>
          <button
            type="button"
            data-action="close-detail-dialog"
            aria-label="Tutup detail"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ${renderIcon('X', 'h-5 w-5')}
          </button>
        </div>

        <!-- Body Detail -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <dl class="divide-y divide-border text-sm">
            <!-- Nama Barang -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground flex items-center">Nama Barang</dt>
              <dd class="sm:col-span-2 flex flex-wrap items-center gap-2 font-medium text-foreground">
                <span class="text-base font-semibold">${item.namaBarang}</span>
                ${renderOrganisasiBadge(item.namaOrganisasi)}
              </dd>
            </div>

            <!-- Kategori -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground flex items-center">Kategori</dt>
              <dd class="sm:col-span-2 flex items-center">
                ${renderKategoriBadge(item.namaKategori)}
              </dd>
            </div>

            <!-- Jumlah -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground flex items-center">Jumlah</dt>
              <dd class="sm:col-span-2 flex items-center font-medium text-foreground">
                ${jumlahText}
              </dd>
            </div>

            <!-- Kondisi -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground flex items-center">Kondisi</dt>
              <dd class="sm:col-span-2 flex items-center">
                ${renderKondisiBadge(item.kondisi)}
              </dd>
            </div>

            <!-- Status -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground flex items-center">Status</dt>
              <dd class="sm:col-span-2 flex items-center">
                ${renderStatusBadge(item)}
              </dd>
            </div>

            <!-- Lokasi -->
            ${item.lokasi ? html`
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
                <dt class="font-medium text-muted-foreground flex items-center">Lokasi</dt>
                <dd class="sm:col-span-2 flex items-center text-foreground font-medium">
                  ${item.lokasi}
                </dd>
              </div>
            ` : raw('')}

            <!-- Deskripsi -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground">Deskripsi</dt>
              <dd class="sm:col-span-2 text-foreground">
                <div class="rounded-xl border border-border bg-card/60 p-3 whitespace-pre-line text-sm">
                  ${item.deskripsiBarang || '–'}
                </div>
              </dd>
            </div>

            <!-- Foto Barang -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3">
              <dt class="font-medium text-muted-foreground">Foto Barang</dt>
              <dd class="sm:col-span-2">
                <div class="w-full max-w-xs overflow-hidden rounded-xl border border-border aspect-[4/3] bg-muted/20 flex items-center justify-center">
                  ${item.thumbnail ? html`
                    <img
                      src="${item.thumbnail}"
                      alt="Foto ${item.namaBarang}"
                      class="h-full w-full object-contain p-2"
                      loading="lazy"
                    />
                  ` : html`
                    <div class="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      ${renderIcon('Archive', 'h-8 w-8')}
                      <span class="text-xs">Tidak ada foto</span>
                    </div>
                  `}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Footer -->
        <div class="flex justify-end border-t border-border px-6 py-3">
          <button
            type="button"
            data-action="close-detail-dialog"
            class="${buttonClass({ variant: 'default', size: 'default' })}"
          >
            Tutup
          </button>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * Kompresi dan muat gambar ke format JPEG Base64 via Canvas jika diperlukan,
 * memastikan ukuran gambar di bawah 2 MB dan aspect ratio terjaga.
 * @param {File} file
 * @returns {Promise<string>} dataUrl
 */
export async function compressImageToDataUrl(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (typeof FileReader === 'undefined' || typeof Image === 'undefined') {
      return resolve('');
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(e.target.result);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Render modal form Tambah / Edit inventaris.
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFormModal({
  formMode = 'tambah',
  formData = {},
  formErrors = {},
  kategoriList = [],
  isSubmitting = false,
  namaOrganisasi = 'OKI Anda',
} = {}) {
  const isEdit = formMode === 'edit';
  const title = isEdit ? 'Edit Inventaris' : 'Tambah Inventaris';
  const submitText = isSubmitting
    ? 'Menyimpan...'
    : isEdit
      ? 'Edit Inventaris'
      : 'Tambah Inventaris';

  return html`
    <dialog id="dialog-form-kelola" aria-labelledby="dialog-form-title" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <form id="kelola-inventaris-form" class="flex flex-col max-h-[90vh]" onsubmit="return false;">
        <!-- Header Dialog -->
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              ${renderIcon('Archive', 'h-4 w-4')}
            </span>
            <h2 id="dialog-form-title" class="text-lg font-semibold text-foreground">${title}</h2>
          </div>
          <button
            type="button"
            data-action="close-form-dialog"
            aria-label="Tutup form"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ${renderIcon('X', 'h-5 w-5')}
          </button>
        </div>

        <!-- Body Form (Scrollable) -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
          ${formErrors.umum ? html`
            <div class="${alertClass('destructive')}">
              ${formErrors.umum}
            </div>
          ` : raw('')}

          <!-- Nama Barang -->
          <div>
            <label for="form-input-nama" class="${labelClass()}">
              Nama Barang <span class="text-rose-500">*</span>
            </label>
            <input
              id="form-input-nama"
              name="namaBarang"
              type="text"
              placeholder="Masukkan nama barang"
              value="${formData.namaBarang || ''}"
              class="${inputClass({ error: Boolean(formErrors.namaBarang) })}"
              required
            />
            ${formErrors.namaBarang ? html`
              <p class="mt-1 text-xs text-rose-500">${formErrors.namaBarang}</p>
            ` : raw('')}
          </div>

          <!-- Grid: Jumlah Unit & Kategori -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Jumlah Unit -->
            <div>
              <label for="form-input-jumlah" class="${labelClass()}">
                Jumlah Unit <span class="text-rose-500">*</span>
              </label>
              <input
                id="form-input-jumlah"
                name="totalBarang"
                type="number"
                min="${formData.minTotal || 1}"
                max="999"
                value="${formData.totalBarang !== undefined ? formData.totalBarang : 1}"
                class="${inputClass({ error: Boolean(formErrors.totalBarang) })}"
                required
              />
              ${formErrors.totalBarang ? html`
                <p class="mt-1 text-xs text-rose-500">${formErrors.totalBarang}</p>
              ` : raw('')}
              ${isEdit && formData.minTotal > 1 ? html`
                <p class="mt-1 text-xs text-muted-foreground">Minimal ${formData.minTotal} unit (kuota peminjaman aktif).</p>
              ` : raw('')}
            </div>

            <!-- Kategori -->
            <div>
              <label for="form-select-kategori" class="${labelClass()}">
                Kategori <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <select
                  id="form-select-kategori"
                  name="idKategori"
                  class="${selectClass({ error: Boolean(formErrors.idKategori), className: 'appearance-none pr-10 cursor-pointer' })}"
                  required
                >
                  <option value="">Pilih kategori...</option>
                  ${raw(kategoriList.map((k) => `
                    <option value="${escapeHtml(k.idKategori)}" ${formData.idKategori === k.idKategori ? 'selected' : ''}>
                      ${escapeHtml(k.namaKategori)}
                    </option>
                  `).join(''))}
                </select>
                <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
                  ${renderIcon('ChevronDown', 'h-4 w-4')}
                </span>
              </div>
              ${formErrors.idKategori ? html`
                <p class="mt-1 text-xs text-rose-500">${formErrors.idKategori}</p>
              ` : raw('')}
              <p class="mt-1 text-[11px] text-muted-foreground">Pilih kategori yang sesuai untuk barang ini.</p>
            </div>
          </div>

          <!-- Pemilik Inventaris (Readonly) -->
          <div>
            <label class="${labelClass()}">Pemilik Inventaris</label>
            <input
              type="text"
              readonly
              disabled
              value="${namaOrganisasi}"
              class="${inputClass()} bg-muted/40 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <!-- Kondisi Barang (Radio) -->
          <div>
            <span class="${labelClass()}">Kondisi <span class="text-rose-500">*</span></span>
            <div class="mt-2 flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input
                  type="radio"
                  name="kondisi"
                  value="baik"
                  ${formData.kondisi === 'rusak' ? '' : 'checked'}
                  class="h-4 w-4 border-input text-primary focus:ring-primary"
                />
                <span>Baik</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input
                  type="radio"
                  name="kondisi"
                  value="rusak"
                  ${formData.kondisi === 'rusak' ? 'checked' : ''}
                  class="h-4 w-4 border-input text-primary focus:ring-primary"
                />
                <span>Rusak</span>
              </label>
            </div>
            ${formErrors.kondisi ? html`
              <p class="mt-1 text-xs text-rose-500">${formErrors.kondisi}</p>
            ` : raw('')}
          </div>

          <!-- Deskripsi Barang -->
          <div>
            <label for="form-input-deskripsi" class="${labelClass()}">Deskripsi</label>
            <textarea
              id="form-input-deskripsi"
              name="deskripsi"
              rows="3"
              placeholder="Masukkan deskripsi barang"
              class="${textareaClass()}"
            >${formData.deskripsi || formData.deskripsiBarang || ''}</textarea>
            ${formErrors.deskripsi ? html`
              <p class="mt-1 text-xs text-rose-500">${formErrors.deskripsi}</p>
            ` : raw('')}
          </div>

          <!-- Foto Barang Upload Dropzone -->
          <div>
            <label class="${labelClass()}">Foto Barang</label>
            <div
              id="foto-dropzone"
              class="mt-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 text-center transition hover:border-primary/50 hover:bg-accent/20 cursor-pointer"
            >
              <input
                id="form-foto-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                class="sr-only"
              />
              ${formData.thumbnail ? html`
                <div class="relative w-full max-w-[200px] aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted/20">
                  <img
                    id="foto-preview-img"
                    src="${formData.thumbnail}"
                    alt="Pratinjau foto"
                    class="h-full w-full object-contain p-1"
                  />
                  <button
                    type="button"
                    data-action="remove-foto"
                    aria-label="Hapus foto"
                    title="Hapus foto"
                    class="absolute top-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                  >
                    ${renderIcon('X', 'h-4 w-4')}
                  </button>
                </div>
              ` : html`
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    ${renderIcon('Folder', 'h-6 w-6')}
                  </span>
                  <div class="text-sm">
                    <span class="font-semibold text-foreground">Seret file ke sini, atau</span>
                    <span class="text-primary hover:underline">Pilih File</span>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    File harus berformat JPG atau PNG dengan ukuran maksimal 2 MB.
                  </p>
                </div>
              `}
            </div>
            ${formErrors.fotoFile ? html`
              <p class="mt-1 text-xs text-rose-500">${formErrors.fotoFile}</p>
            ` : raw('')}
          </div>
        </div>

        <!-- Footer Form -->
        <div class="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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
            data-action="submit-form-inventaris"
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
 * Render modal dialog konfirmasi hapus inventaris.
 * @param {object|null} item
 * @param {boolean} isSubmitting
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderDeleteModal(item, isSubmitting = false) {
  if (!item) {
    return html`
      <dialog id="dialog-delete-kelola" aria-labelledby="dialog-delete-title" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
        <div class="p-6">
          <h2 id="dialog-delete-title" class="sr-only">Hapus Inventaris</h2>
        </div>
      </dialog>
    `;
  }

  const descHtml = html`Apakah anda yakin ingin menghapus inventaris <strong class="text-foreground">${item.namaBarang}</strong>? Tindakan ini tidak dapat dibatalkan.`;

  return renderModal({
    asDialog: true,
    id: 'dialog-delete-kelola',
    titleId: 'dialog-delete-title',
    variant: 'delete',
    title: 'Hapus Inventaris?',
    description: descHtml,
    actions: [
      {
        label: 'Kembali',
        action: 'close-delete-dialog',
        variant: 'outline',
        disabled: isSubmitting,
      },
      {
        label: isSubmitting ? 'Menghapus...' : 'Hapus',
        action: 'confirm-delete-inventaris',
        dataId: item.idInventaris,
        variant: 'destructive',
        disabled: isSubmitting,
      },
    ],
  });
}

/**
 * Render modal dialog feedback status (sukses / galat).
 * @param {object|null} feedback
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderFeedbackModal(feedback) {
  if (!feedback) {
    return html`
      <dialog id="dialog-feedback-kelola" aria-labelledby="dialog-feedback-title" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full max-w-md rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
        <div class="p-6">
          <h2 id="dialog-feedback-title" class="sr-only">Notifikasi</h2>
        </div>
      </dialog>
    `;
  }

  const isSuccess = feedback.type === 'success';
  return renderModal({
    asDialog: true,
    id: 'dialog-feedback-kelola',
    titleId: 'dialog-feedback-title',
    variant: isSuccess ? 'success' : 'reject',
    title: feedback.title,
    description: feedback.message,
    actions: [
      {
        label: 'Kembali',
        action: 'close-feedback-dialog',
        variant: 'default',
        className: 'w-full rounded-xl',
      },
    ],
  });
}

/**
 * Render bagian tabel dan paginasi kelola inventaris.
 * Dipakai untuk render parsial agar input pencarian tidak kehilangan fokus.
 * @param {object} state
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderTableSection(state = {}) {
  const {
    items = [],
    meta = { page: 1, perPage: 10, total: 0, totalPages: 0 },
    loading = false,
    error = null,
    cari = '',
    nAktif = 0,
  } = state;

  const adaFilter = nAktif > 0 || (typeof cari === 'string' && cari.trim().length > 0);

  return html`
    <div id="kelola-table-container" class="space-y-4">
      <!-- Tabel Pembungkus Overflow 360px safe -->
      <div class="w-full overflow-x-auto">
        <table class="w-full min-w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th scope="col" class="px-4 py-4 w-12 text-center">No</th>
              <th scope="col" class="px-4 py-4 min-w-[200px]">Nama Barang</th>
              <th scope="col" class="px-4 py-4 min-w-[120px]">Kategori</th>
              <th scope="col" class="px-4 py-4 min-w-[100px] text-right">Jumlah Unit</th>
              <th scope="col" class="px-4 py-4 min-w-[120px]">Kondisi</th>
              <th scope="col" class="px-4 py-4 min-w-[100px]">Status</th>
              <th scope="col" class="px-4 py-4 min-w-[160px] text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${loading ? renderTableSkeleton() : error ? html`
              <tr class="border-b border-slate-100 last:border-0">
                <td colspan="7" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="text-destructive font-semibold">Gagal memuat inventaris</span>
                    <p class="text-xs text-muted-foreground">${error}</p>
                    <button
                      type="button"
                      data-action="retry-load"
                      class="${buttonClass({ variant: 'outline', size: 'sm', className: 'mt-2' })}"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </td>
              </tr>
            ` : items.length === 0 ? html`
              <tr class="border-b border-slate-100 last:border-0">
                <td colspan="7" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="text-base font-semibold text-foreground">
                      ${adaFilter ? 'Tidak ada hasil yang cocok' : 'Belum ada inventaris'}
                    </span>
                    <p class="text-xs text-muted-foreground max-w-sm">
                      ${adaFilter
                        ? 'Coba ubah kata kunci pencarian atau setel ulang filter.'
                        : "Anda belum memiliki barang inventaris. Klik 'Tambah Inventaris' untuk mulai."}
                    </p>
                    ${adaFilter ? html`
                      <button
                        type="button"
                        data-action="reset-filter-direct"
                        class="${buttonClass({ variant: 'outline', size: 'sm', className: 'mt-2' })}"
                      >
                        Setel Ulang Filter
                      </button>
                    ` : raw('')}
                  </div>
                </td>
              </tr>
            ` : raw(
              items.map((it, idx) => renderTableRow(it, idx, meta.page, meta.perPage).toString()).join('')
            )}
          </tbody>
        </table>
      </div>

      <!-- Paginasi -->
      ${!loading && !error && items.length > 0 ? renderPagination(meta.page, meta.totalPages) : raw('')}
    </div>
  `;
}

/**
 * Render konten utama halaman kelola inventaris.
 * @param {object} state
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKelolaContent(state = {}) {
  const {
    items = [],
    meta = { page: 1, perPage: 10, total: 0, totalPages: 0 },
    loading = false,
    error = null,
    cari = '',
    filters = { kategori: null, kondisi: null, status: null },
    nAktif = 0,
    kategoriList = [],
    detailItem = null,
    formMode = 'tambah',
    formData = {},
    formErrors = {},
    isSubmitting = false,
    deleteItem = null,
    feedback = null,
    namaOrganisasi = 'OKI Anda',
  } = state;

  const adaFilter = nAktif > 0 || cari.trim().length > 0;

  return html`
    <div class="space-y-6" id="kelola-inventaris-root">
      <!-- Header Halaman -->
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Kelola Inventaris</h1>
        <p class="text-sm text-muted-foreground">
          Kelola Inventaris OKI Anda.
        </p>
      </div>

      <!-- Tab Navigasi [Inventaris] [Kelola Kategori] -->
      ${renderKelolaTabs('inventaris')}

      <!-- Card List Barang Inventaris -->
      <div class="rounded-xl bg-white p-4 sm:p-6 shadow-[0_1px_4px_rgba(15,23,42,0.025)]">
        <!-- Toolbar Atas: Judul Card + Cari + Filter + Tambah -->
        <div class="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-foreground">List Barang Inventaris</h2>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Kolom Cari -->
            ${raw(renderSearchInput({
              id: 'kelola-search-input',
              wrapperId: 'kelola-search-wrapper',
              value: cari,
              placeholder: 'Cari barang inventaris',
              ariaLabel: 'Cari barang inventaris',
              className: 'min-w-[200px] flex-1 sm:w-64 sm:flex-none',
              clearable: true,
              clearAction: 'clear-search',
            }))}

            <!-- Tombol Filter -->
            ${renderFilterButton({
              id: 'kelola-filter-button',
              action: 'open-filter-dialog',
              title: 'Filter barang inventaris',
              ariaLabel: 'Filter barang inventaris',
              countActive: nAktif,
            })}

            <!-- Tombol Tambah Inventaris (Link Halaman Terpisah) -->
            <a
              href="#/kelola/inventaris/tambah"
              class="${buttonClass({ variant: 'default', size: 'default', className: 'h-11 rounded-full px-5 gap-1.5' })}"
            >
              ${renderIcon('Plus', 'h-4 w-4')}
              <span>Tambah Inventaris</span>
            </a>
          </div>
        </div>

        <!-- Bagian Tabel & Paginasi -->
        ${renderTableSection(state)}
      </div>

      <!-- Dialog Filter Native -->
      ${renderFilterModal({ filters, kategoriList, countActive: nAktif })}

      <!-- Dialog Detail Native -->
      ${renderDetailModal(detailItem)}

      <!-- Dialog Konfirmasi Hapus Native -->
      ${renderDeleteModal(deleteItem, isSubmitting)}

      <!-- Dialog Feedback Status Native -->
      ${renderFeedbackModal(feedback)}
    </div>
  `;
}

/**
 * State modul halaman di memori per sesi.
 */
let pageState = {
  items: [],
  meta: { page: 1, perPage: 10, total: 0, totalPages: 0 },
  loading: true,
  error: null,
  cari: '',
  filters: { kategori: null, kondisi: null, status: null },
  nAktif: 0,
  kategoriList: [],
  detailItem: null,
  formMode: 'tambah',
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
  isSubmitting: false,
  deleteItem: null,
  feedback: null,
  namaOrganisasi: 'OKI Anda',
};

let currentContainer = null;
let currentUser = null;
let searchDebounceTimer = null;
let lastTriggerEl = null;

async function loadData() {
  pageState.loading = true;
  pageState.error = null;
  updateUI();

  try {
    const res = await getInventarisKelola(currentUser, {
      cari: pageState.cari,
      kategoriIds: pageState.filters.kategori,
      kondisi: pageState.filters.kondisi,
      status: pageState.filters.status,
      page: pageState.meta.page,
      perPage: pageState.meta.perPage,
    });

    pageState.items = res?.data || [];
    pageState.meta = res?.meta || { page: 1, perPage: 10, total: 0, totalPages: 0 };
    pageState.loading = false;
  } catch (err) {
    pageState.items = [];
    pageState.meta = { page: 1, perPage: 10, total: 0, totalPages: 0 };
    pageState.error = err?.message || 'Terjadi kesalahan saat memuat inventaris.';
    pageState.loading = false;
  }

  updateUI();
}

function updateUI() {
  if (!currentContainer) return;
  pageState.nAktif = countActiveFilters(pageState.filters);
  const myOkiNama = currentUser?.organisasi?.namaOrganisasi || currentUser?.namaOrganisasi || 'OKI Anda';
  pageState.namaOrganisasi = myOkiNama;

  const tableContainer = currentContainer.querySelector('#kelola-table-container');
  if (tableContainer) {
    // Mode parsial: update bagian tabel & paginasi saja tanpa menimpa elemen input pencarian
    tableContainer.outerHTML = renderTableSection(pageState).toString();

    // Mutakhirkan badge counter filter di toolbar
    const badgeEl = currentContainer.querySelector('#kelola-filter-badge-counter');
    if (badgeEl) {
      if (pageState.nAktif > 0) {
        badgeEl.textContent = pageState.nAktif > 9 ? '9+' : String(pageState.nAktif);
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Mutakhirkan dialog detail agar ter-render dengan data barang terpilih
    const detailDlg = currentContainer.querySelector('#dialog-detail-kelola');
    if (detailDlg) {
      detailDlg.outerHTML = renderDetailModal(pageState.detailItem).toString();
    }

    // Mutakhirkan dialog konfirmasi hapus agar ter-render dengan data barang target
    const deleteDlg = currentContainer.querySelector('#dialog-delete-kelola');
    if (deleteDlg) {
      deleteDlg.outerHTML = renderDeleteModal(pageState.deleteItem, pageState.isSubmitting).toString();
    }

    // Mutakhirkan dialog feedback
    const feedbackDlg = currentContainer.querySelector('#dialog-feedback-kelola');
    if (feedbackDlg) {
      feedbackDlg.outerHTML = renderFeedbackModal(pageState.feedback).toString();
    }
  } else {
    // Render penuh awal
    currentContainer.innerHTML = renderKelolaContent(pageState);
  }
}

function handleSearchInput(e) {
  const val = e.target.value;
  pageState.cari = val;
  pageState.meta.page = 1;

  // Toggle tombol clear-search secara dinamis di DOM tanpa render ulang input
  const wrapper = document.getElementById('kelola-search-wrapper');
  const existingClear = wrapper ? wrapper.querySelector('[data-action="clear-search"]') : null;
  if (val.trim().length > 0 && !existingClear && wrapper) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-action', 'clear-search');
    btn.setAttribute('aria-label', 'Hapus kata kunci pencarian');
    btn.className = 'absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground inline-flex h-5 w-5 items-center justify-center rounded';
    btn.innerHTML = `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    wrapper.appendChild(btn);
  } else if (val.trim().length === 0 && existingClear) {
    existingClear.remove();
  }

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadData();
  }, 300);
}

function handleDocumentInput(e) {
  if (e.target && e.target.id === 'kelola-search-input') {
    handleSearchInput(e);
  }
}

function openFilterDialog() {
  const dlg = document.getElementById('dialog-filter-kelola');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
    const firstSelect = dlg.querySelector('#filter-kategori-select');
    firstSelect?.focus();
  }
}

function closeFilterDialog() {
  const dlg = document.getElementById('dialog-filter-kelola');
  if (dlg && typeof dlg.close === 'function') {
    dlg.close();
  }
  if (lastTriggerEl) {
    lastTriggerEl.focus();
    lastTriggerEl = null;
  }
}

function openDetailDialog(item, triggerEl = null) {
  pageState.detailItem = item;
  lastTriggerEl = triggerEl;
  updateUI();

  const dlg = document.getElementById('dialog-detail-kelola');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
    const closeBtn = dlg.querySelector('[data-action="close-detail-dialog"]');
    closeBtn?.focus();
  }
}

function closeDetailDialog() {
  const dlg = document.getElementById('dialog-detail-kelola');
  if (dlg && typeof dlg.close === 'function') {
    dlg.close();
  }
  pageState.detailItem = null;
  updateUI();
  if (lastTriggerEl) {
    lastTriggerEl.focus();
    lastTriggerEl = null;
  }
}

function openFormDialog(mode = 'tambah', item = null, triggerEl = null) {
  pageState.formMode = mode;
  pageState.formErrors = {};
  lastTriggerEl = triggerEl;

  if (mode === 'edit' && item) {
    pageState.formData = {
      idInventaris: item.idInventaris,
      namaBarang: item.namaBarang,
      totalBarang: item.totalBarang,
      idKategori: item.idKategori,
      kondisi: normalizeKondisi(item.kondisi) || 'baik',
      deskripsi: item.deskripsiBarang || '',
      thumbnail: item.thumbnail || '',
      minTotal: 1,
    };
  } else {
    pageState.formData = {
      idInventaris: '',
      namaBarang: '',
      totalBarang: 1,
      idKategori: pageState.kategoriList[0]?.idKategori || '',
      kondisi: 'baik',
      deskripsi: '',
      thumbnail: '',
      minTotal: 1,
    };
  }

  updateUI();

  const dlg = document.getElementById('dialog-form-kelola');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
    const namaInput = dlg.querySelector('#form-input-nama');
    namaInput?.focus();
  }
}

function closeFormDialog() {
  const dlg = document.getElementById('dialog-form-kelola');
  if (dlg && typeof dlg.close === 'function') {
    dlg.close();
  }
  if (lastTriggerEl) {
    lastTriggerEl.focus();
    lastTriggerEl = null;
  }
}

function openDeleteDialog(item, triggerEl = null) {
  pageState.deleteItem = item;
  lastTriggerEl = triggerEl;
  updateUI();

  const dlg = document.getElementById('dialog-delete-kelola');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
    const delBtn = dlg.querySelector('[data-action="confirm-delete-inventaris"]');
    delBtn?.focus();
  }
}

function closeDeleteDialog() {
  const dlg = document.getElementById('dialog-delete-kelola');
  if (dlg && typeof dlg.close === 'function') {
    dlg.close();
  }
  pageState.deleteItem = null;
  updateUI();
  if (lastTriggerEl) {
    lastTriggerEl.focus();
    lastTriggerEl = null;
  }
}

function openFeedbackDialog(type, title, message) {
  pageState.feedback = { type, title, message };
  updateUI();

  const dlg = document.getElementById('dialog-feedback-kelola');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
    const btn = dlg.querySelector('[data-action="close-feedback-dialog"]');
    btn?.focus();
  }
}

function closeFeedbackDialog() {
  const dlg = document.getElementById('dialog-feedback-kelola');
  if (dlg && typeof dlg.close === 'function') {
    dlg.close();
  }
  pageState.feedback = null;
  updateUI();
}

async function handleFotoUpload(file) {
  if (!file) return;

  const errFoto = validateFotoFile(file);
  if (errFoto) {
    pageState.formErrors = { ...pageState.formErrors, fotoFile: errFoto };
    updateUI();
    document.getElementById('dialog-form-kelola')?.showModal();
    return;
  }

  try {
    const dataUrl = await compressImageToDataUrl(file);
    pageState.formData.thumbnail = dataUrl;
    delete pageState.formErrors.fotoFile;
    updateUI();
    document.getElementById('dialog-form-kelola')?.showModal();
  } catch {
    pageState.formErrors = { ...pageState.formErrors, fotoFile: 'Gagal memproses gambar.' };
    updateUI();
    document.getElementById('dialog-form-kelola')?.showModal();
  }
}

/**
 * Handle delegasi klik di halaman kelola inventaris.
 */
async function handleDocumentClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) {
    // Backdrop click close untuk dialog native
    if (e.target && e.target.nodeName === 'DIALOG') {
      if (e.target.id === 'dialog-filter-kelola') closeFilterDialog();
      if (e.target.id === 'dialog-detail-kelola') closeDetailDialog();
      if (e.target.id === 'dialog-form-kelola') closeFormDialog();
      if (e.target.id === 'dialog-delete-kelola') closeDeleteDialog();
      if (e.target.id === 'dialog-feedback-kelola') closeFeedbackDialog();
    }

    // Klik dropzone memicu input file
    const dropzone = e.target.closest('#foto-dropzone');
    if (dropzone && !e.target.closest('[data-action="remove-foto"]')) {
      const fileInput = document.getElementById('form-foto-input');
      fileInput?.click();
    }
    return;
  }

  const action = actionEl.getAttribute('data-action');

  if (action === 'open-filter-dialog') {
    lastTriggerEl = actionEl;
    openFilterDialog();
  } else if (action === 'close-filter-dialog') {
    closeFilterDialog();
  } else if (action === 'reset-filter-dialog') {
    const form = document.getElementById('form-filter-kelola');
    if (form) {
      const sel = form.querySelector('#filter-kategori-select');
      if (sel) sel.value = '';
      const radios = form.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => { r.checked = false; });
    }
    const dlgBadge = document.getElementById('filter-dialog-badge');
    if (dlgBadge) {
      dlgBadge.classList.add('hidden');
      dlgBadge.textContent = '0';
    }
  } else if (action === 'apply-filter-dialog') {
    const form = document.getElementById('form-filter-kelola');
    if (form) {
      const formData = new FormData(form);
      const kat = formData.get('kategori') || null;
      const kon = formData.get('kondisi') || null;
      const st = formData.get('status') || null;
      pageState.filters = {
        kategori: kat && kat.length > 0 ? kat : null,
        kondisi: kon && kon.length > 0 ? kon : null,
        status: st && st.length > 0 ? st : null,
      };
      pageState.meta.page = 1;
    }
    closeFilterDialog();
    loadData();
  } else if (action === 'reset-filter-direct') {
    pageState.cari = '';
    pageState.filters = { kategori: null, kondisi: null, status: null };
    const inp = document.getElementById('kelola-search-input');
    if (inp) inp.value = '';
    const clearBtn = document.querySelector('[data-action="clear-search"]');
    if (clearBtn) clearBtn.remove();
    pageState.meta.page = 1;
    loadData();
  } else if (action === 'clear-search') {
    pageState.cari = '';
    const inp = document.getElementById('kelola-search-input');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    actionEl.remove();
    pageState.meta.page = 1;
    loadData();
  } else if (action === 'close-detail-dialog') {
    closeDetailDialog();
  } else if (action === 'change-page') {
    const p = Number(actionEl.getAttribute('data-page'));
    if (p && p >= 1 && p <= pageState.meta.totalPages && p !== pageState.meta.page) {
      pageState.meta.page = p;
      loadData();
    }
  } else if (action === 'retry-load') {
    loadData();
  } else if (action === 'detail-inventaris') {
    const id = actionEl.getAttribute('data-id');
    const it = pageState.items.find((x) => String(x.idInventaris) === String(id));
    if (it) {
      openDetailDialog(it, actionEl);
    }
  } else if (action === 'delete-inventaris') {
    const id = actionEl.getAttribute('data-id');
    const it = pageState.items.find((x) => String(x.idInventaris) === String(id));
    if (it) {
      openDeleteDialog(it, actionEl);
    }
  } else if (action === 'close-delete-dialog') {
    closeDeleteDialog();
  } else if (action === 'close-feedback-dialog') {
    closeFeedbackDialog();
  } else if (action === 'confirm-delete-inventaris') {
    const id = actionEl.getAttribute('data-id');
    if (!id) return;

    pageState.isSubmitting = true;
    updateUI();
    document.getElementById('dialog-delete-kelola')?.showModal();

    try {
      await deleteInventaris(currentUser, id);
      closeDeleteDialog();
      openFeedbackDialog(
        'success',
        'Inventaris Berhasil Dihapus!',
        'Barang inventaris telah berhasil dihapus dari sistem.'
      );
      await loadData();
    } catch (err) {
      closeDeleteDialog();
      openFeedbackDialog('error', 'Gagal Menghapus Inventaris', err.message);
    } finally {
      pageState.isSubmitting = false;
    }
  }
}

function handleDocumentKeyDown(e) {
  if (e.target && e.target.id === 'kelola-search-input' && e.key === 'Enter') {
    e.preventDefault();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    loadData();
    return;
  }

  if (e.key === 'Escape') {
    const filterDlg = document.getElementById('dialog-filter-kelola');
    if (filterDlg && filterDlg.open) {
      closeFilterDialog();
      return;
    }
    const detailDlg = document.getElementById('dialog-detail-kelola');
    if (detailDlg && detailDlg.open) {
      closeDetailDialog();
      return;
    }
    const formDlg = document.getElementById('dialog-form-kelola');
    if (formDlg && formDlg.open) {
      closeFormDialog();
      return;
    }
    const delDlg = document.getElementById('dialog-delete-kelola');
    if (delDlg && delDlg.open) {
      closeDeleteDialog();
      return;
    }
    const feedDlg = document.getElementById('dialog-feedback-kelola');
    if (feedDlg && feedDlg.open) {
      closeFeedbackDialog();
      return;
    }
  }
}

function handleFileInputChange(e) {
  const file = e.target.files?.[0];
  if (file) {
    handleFotoUpload(file);
  }
}

/**
 * Render awal modul halaman (string HTML murni untuk test runner).
 */
export function render(state = {}) {
  return renderKelolaContent({
    ...pageState,
    ...state,
    loading: state.loading !== undefined ? state.loading : true,
  }).toString();
}

/**
 * Mount halaman ke container DOM di browser.
 * @param {HTMLElement} container
 * @param {object} ctx
 */
export async function mount(container, ctx = {}) {
  currentContainer = container;
  currentUser = ctx.user || null;

  pageState = {
    items: [],
    meta: { page: 1, perPage: 10, total: 0, totalPages: 0 },
    loading: true,
    error: null,
    cari: ctx.query?.q || '',
    filters: {
      kategori: ctx.query?.kategori || null,
      kondisi: ctx.query?.kondisi || null,
      status: ctx.query?.status || null,
    },
    nAktif: 0,
    kategoriList: [],
    detailItem: null,
    formMode: 'tambah',
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
    isSubmitting: false,
    deleteItem: null,
    feedback: null,
    namaOrganisasi: currentUser?.organisasi?.namaOrganisasi || currentUser?.namaOrganisasi || 'OKI Anda',
  };

  updateUI();

  // Ambil daftar kategori untuk dropdown
  try {
    pageState.kategoriList = await getKategori();
  } catch {
    pageState.kategoriList = [];
  }

  // Event listener
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeyDown);
  document.addEventListener('input', handleDocumentInput);

  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'form-foto-input') {
      handleFileInputChange(e);
    }
  });

  await loadData();
}

/**
 * Unmount halaman dan bersihkan event listener.
 */
export function unmount() {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeyDown);
  document.removeEventListener('input', handleDocumentInput);

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  currentContainer = null;
  currentUser = null;
  lastTriggerEl = null;
}

