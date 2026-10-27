/**
 * inventaris.js — Halaman Katalog Inventaris PinjemDulu.
 * Acuan visual: _sumber/src/app/(peminjam)/peminjam/inventaris/_components/KatalogPage.jsx
 */

import { html, raw, escapeHtml } from '../ui/html.js';
import { buttonClass, inputClass, badgeClass, skeletonClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderFilterButton, renderFilterModal } from '../ui/filter.js';
import { getInventarisList } from '../services/inventaris.js';
import { getKategori } from '../services/kategori.js';
import { getOrganisasi } from '../services/organisasi.js';
import { getInitials } from '../lib/navigation.js';
import {
  filterInventaris,
  paginate,
  buildPageList,
  getStatusKetersediaan,
  parseKatalogParams,
  buildKatalogQueryString,
  KATALOG_DEFAULTS,
} from '../lib/katalog.js';
import { CATALOG_QUERY_KEY } from '../lib/catalog-nav.js';

/**
 * Render OrganisasiBadge mini untuk kartu katalog.
 * @param {string} nama
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderOrganisasiBadge(nama = '') {
  if (!nama) return raw('');
  const initials = getInitials(nama).slice(0, 2);
  return html`
    <span class="inline-flex items-center gap-2 font-medium text-zinc-700">
      <span
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white"
        aria-hidden="true"
      >
        ${initials}
      </span>
      <span class="truncate text-xs">${nama}</span>
    </span>
  `;
}

/**
 * Render KategoriBadge untuk kartu katalog.
 * @param {string} nama
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderKategoriBadge(nama = '') {
  if (!nama) return raw('');
  return html`
    <span class="${badgeClass('info')} font-normal">
      ${nama}
    </span>
  `;
}

/**
 * Render kartu tunggal inventaris.
 * @param {object} inv
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderInventarisCard(inv) {
  if (!inv) return raw('');
  const statusInfo = getStatusKetersediaan(inv);
  const hrefDetail = `#/inventaris/${encodeURIComponent(inv.idInventaris || '')}`;

  const imageMarkup = inv.thumbnail
    ? html`
        <img
          src="${inv.thumbnail}"
          alt="Gambar ${inv.namaBarang}"
          class="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400\'><svg class=\'h-8 w-8\' xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.6\'><path d=\'m7.5 4.27 9 5.15\'/><path d=\'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\'/><path d=\'m3.3 7 8.7 5 8.7-5\'/><path d=\'M12 22V12\'/></svg><span class=\'text-xs font-medium\'>Tanpa gambar</span></div>';"
        />
      `
    : html`
        <div class="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
          ${renderIcon('Package', 'h-8 w-8')}
          <span class="text-xs font-medium">Tanpa gambar</span>
        </div>
      `;

  return html`
    <a
      href="${hrefDetail}"
      data-action="view-detail"
      data-id="${inv.idInventaris}"
      class="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Lihat detail ${inv.namaBarang}"
    >
      <!-- Baris atas: OKI (kiri) & Kategori (kanan) -->
      <div class="mb-3 flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1 truncate">
          ${renderOrganisasiBadge(inv.namaOrganisasi)}
        </div>
        <div class="shrink-0">
          ${renderKategoriBadge(inv.namaKategori)}
        </div>
      </div>

      <!-- Gambar Thumbnail (aspect 4/3) -->
      <div class="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100">
        ${imageMarkup}
      </div>

      <!-- Informasi Ketersediaan & Nama Barang -->
      <div class="flex-1 space-y-2">
        <p class="text-xs font-medium ${statusInfo.variant === 'danger' ? 'text-rose-600' : 'text-zinc-500'}">
          ${statusInfo.label}
        </p>
        <h3 class="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900 group-hover:text-primary">
          ${inv.namaBarang}
        </h3>
      </div>

      <!-- Tombol panah bulat di kanan bawah -->
      <div class="mt-4 flex items-center justify-end">
        <span
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-all duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
          aria-hidden="true"
        >
          ${renderIcon('ArrowRight', 'h-4 w-4')}
        </span>
      </div>
    </a>
  `;
}

/**
 * Render skeleton loading untuk kartu inventaris.
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderCardSkeleton() {
  return html`
    <div class="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="${skeletonClass('h-6 w-6 rounded-full')}"></div>
          <div class="${skeletonClass('h-3 w-20 rounded-full')}"></div>
        </div>
        <div class="${skeletonClass('h-5 w-16 rounded-full')}"></div>
      </div>
      <div class="${skeletonClass('mb-3 aspect-[4/3] w-full rounded-2xl')}"></div>
      <div class="${skeletonClass('mb-2 h-3 w-24 rounded')}"></div>
      <div class="${skeletonClass('mb-1 h-4 w-full rounded')}"></div>
      <div class="${skeletonClass('mb-4 h-4 w-3/4 rounded')}"></div>
      <div class="mt-auto flex justify-end">
        <div class="${skeletonClass('h-9 w-9 rounded-full')}"></div>
      </div>
    </div>
  `;
}

import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

/**
 * Render tombol-tombol paginasi.
 * @param {number} currentPage
 * @param {number} totalPages
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderPagination(currentPage, totalPages) {
  const current = Math.max(1, currentPage || 1);
  const total = Math.max(1, totalPages || 1);
  return html`
    <nav role="navigation" aria-label="Pagination" class="mx-auto mt-8 flex w-full flex-col items-center gap-3">
      ${raw(renderSharedPagination({ currentPage: current, totalPages: total, action: 'change-page' }))}
    </nav>
  `;
}

/**
 * Render kerangka awal halaman katalog inventaris.
 * @param {object} [ctx]
 * @returns {string}
 */
export function render(ctx = {}) {
  const currentParams = parseKatalogParams(ctx.path || '');
  const cariValue = currentParams.cari || '';

  return html`
    <div class="w-full">
      <!-- Header Halaman -->
      <div class="mb-6">
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Katalog Barang Inventaris
        </h1>
        <p class="mt-1 text-sm text-zinc-500">
          Cari, filter, dan lihat ketersediaan barang inventaris untuk kegiatan Anda.
        </p>
      </div>

      <!-- Baris Kontrol: Cari (col 6), Filter Kategori (col 3), Filter OKI (col 3) -->
      <div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-12">
        <!-- Kolom Pencarian -->
        <div class="flex items-center gap-2 md:col-span-6">
          ${renderSearchInput({
            id: 'katalog-search-input',
            value: cariValue,
            placeholder: 'Cari barang inventaris...',
            ariaLabel: 'Cari barang inventaris',
            className: 'flex-1',
          })}
          <div class="md:hidden">
            ${renderFilterButton({
              id: 'btn-filter-katalog-mobile',
              action: 'open-filter-dialog',
              title: 'Filter inventaris',
              countActive: (currentParams.kategoriIds || []).length + (currentParams.okiIds || []).length,
            })}
          </div>
        </div>

        <!-- Filter Dropdown Kategori -->
        <div class="relative md:col-span-3" id="dropdown-kategori-container">
          <button
            type="button"
            id="btn-filter-kategori"
            data-action="toggle-filter-kategori"
            aria-expanded="false"
            aria-haspopup="true"
            class="${buttonClass({ variant: 'outline' })} h-11 w-full justify-between rounded-xl px-4 font-normal text-zinc-700"
          >
            <span id="label-filter-kategori" class="truncate">Semua Kategori</span>
            ${renderIcon('ChevronDown', 'h-4 w-4 shrink-0 text-muted-foreground')}
          </button>
          <div
            id="popover-kategori"
            class="absolute left-0 top-full z-40 mt-1 hidden w-full min-w-[240px] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg sm:w-72"
          >
            <div id="chips-kategori" class="mb-2 flex flex-wrap gap-1 empty:hidden"></div>
            <div id="options-kategori" class="max-h-56 overflow-y-auto space-y-1">
              <div class="p-2 text-xs text-zinc-400">Memuat kategori...</div>
            </div>
          </div>
        </div>

        <!-- Filter Dropdown OKI -->
        <div class="relative md:col-span-3" id="dropdown-oki-container">
          <button
            type="button"
            id="btn-filter-oki"
            data-action="toggle-filter-oki"
            aria-expanded="false"
            aria-haspopup="true"
            class="${buttonClass({ variant: 'outline' })} h-11 w-full justify-between rounded-xl px-4 font-normal text-zinc-700"
          >
            <span id="label-filter-oki" class="truncate">Semua OKI</span>
            ${renderIcon('ChevronDown', 'h-4 w-4 shrink-0 text-muted-foreground')}
          </button>
          <div
            id="popover-oki"
            class="absolute left-0 top-full z-40 mt-1 hidden w-full min-w-[240px] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg sm:w-72"
          >
            <div id="chips-oki" class="mb-2 flex flex-wrap gap-1 empty:hidden"></div>
            <div id="options-oki" class="max-h-56 overflow-y-auto space-y-1">
              <div class="p-2 text-xs text-zinc-400">Memuat organisasi...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Area Hasil / Kartu Inventaris -->
      <div id="katalog-results" aria-live="polite">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          ${Array.from({ length: KATALOG_DEFAULTS.LIMIT }).map(() => renderCardSkeleton())}
        </div>
      </div>

      <!-- Filter Modal Katalog -->
      ${renderFilterModal({
        id: 'dialog-filter-katalog',
        title: 'Filter Katalog Inventaris',
        countActive: (currentParams.kategoriIds || []).length + (currentParams.okiIds || []).length,
        closeAction: 'close-filter-dialog',
        resetAction: 'reset-filters',
        applyAction: 'close-filter-dialog',
        formId: 'form-filter-katalog',
        bodyContent: html`
          <div class="space-y-4">
            <div>
              <span class="text-sm font-medium text-foreground block mb-2">Kategori</span>
              <div id="modal-options-kategori" class="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border p-2">
                <div class="text-xs text-muted-foreground p-1">Memuat kategori...</div>
              </div>
            </div>
            <div>
              <span class="text-sm font-medium text-foreground block mb-2">Organisasi (OKI)</span>
              <div id="modal-options-oki" class="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border p-2">
                <div class="text-xs text-muted-foreground p-1">Memuat organisasi...</div>
              </div>
            </div>
          </div>
        `,
      })}
    </div>
  `.toString();
}

/**
 * Pasang interaksi, data fetching, dan kontrol state pada halaman katalog.
 * @param {HTMLElement} root
 * @param {object} [ctx]
 * @returns {() => void} unmount callback
 */
export async function mount(root, ctx = {}) {
  if (!root) return;

  const searchInput = root.querySelector('#katalog-search-input');
  const resultsArea = root.querySelector('#katalog-results');
  const btnKategori = root.querySelector('#btn-filter-kategori');
  const popoverKategori = root.querySelector('#popover-kategori');
  const labelKategori = root.querySelector('#label-filter-kategori');
  const chipsKategori = root.querySelector('#chips-kategori');
  const optionsKategori = root.querySelector('#options-kategori');

  const btnOki = root.querySelector('#btn-filter-oki');
  const popoverOki = root.querySelector('#popover-oki');
  const labelOki = root.querySelector('#label-filter-oki');
  const chipsOki = root.querySelector('#chips-oki');
  const optionsOki = root.querySelector('#options-oki');

  // Baca state awal dari URL hash
  const initialParams = parseKatalogParams(window?.location?.hash || ctx.path || '');
  let currentCari = initialParams.cari;
  let currentKategoriIds = [...initialParams.kategoriIds];
  let currentOkiIds = [...initialParams.okiIds];
  let currentPage = initialParams.page;

  let allKategori = [];
  let allOrganisasi = [];
  let debounceTimer = null;
  let activeFetchToken = 0;

  function updateUrlQuery() {
    if (typeof window === 'undefined') return;
    const qs = buildKatalogQueryString({
      cari: currentCari,
      kategoriIds: currentKategoriIds,
      okiIds: currentOkiIds,
      page: currentPage,
    });
    const hash = qs ? `#/inventaris?${qs}` : '#/inventaris';
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }

    try {
      if (qs) {
        sessionStorage.setItem(CATALOG_QUERY_KEY, `?${qs}`);
      } else {
        sessionStorage.removeItem(CATALOG_QUERY_KEY);
      }
    } catch {
      /* abaikan */
    }
  }

  function updateDropdownUI() {
    // 1. Kategori
    if (labelKategori) {
      if (currentKategoriIds.length === 0) {
        labelKategori.textContent = 'Semua Kategori';
      } else if (currentKategoriIds.length === 1) {
        const found = allKategori.find((k) => k.idKategori === currentKategoriIds[0]);
        labelKategori.textContent = found ? found.namaKategori : '1 Kategori';
      } else {
        labelKategori.textContent = `${currentKategoriIds.length} Kategori`;
      }
    }

    if (chipsKategori) {
      if (currentKategoriIds.length === 0) {
        chipsKategori.innerHTML = '';
        chipsKategori.classList.add('hidden');
      } else {
        chipsKategori.classList.remove('hidden');
        chipsKategori.innerHTML = currentKategoriIds
          .map((id) => {
            const k = allKategori.find((item) => item.idKategori === id);
            const name = k ? k.namaKategori : id;
            return `
              <span class="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800">
                <span class="max-w-[120px] truncate">${escapeHtml(name)}</span>
                <button type="button" data-action="remove-kategori-chip" data-id="${escapeHtml(id)}" class="text-zinc-400 hover:text-zinc-700">
                  &times;
                </button>
              </span>
            `;
          })
          .join('');
      }
    }

    if (optionsKategori && allKategori.length > 0) {
      optionsKategori.innerHTML = allKategori
        .map((k) => {
          const checked = currentKategoriIds.includes(k.idKategori);
          return `
            <label class="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition hover:bg-primary hover:text-white group">
              <input
                type="checkbox"
                data-action="select-kategori"
                value="${escapeHtml(k.idKategori)}"
                ${checked ? 'checked' : ''}
                class="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span class="flex-1 truncate group-hover:text-white">${escapeHtml(k.namaKategori)}</span>
            </label>
          `;
        })
        .join('');
    }

    const modalOptionsKat = root.querySelector('#modal-options-kategori');
    if (modalOptionsKat && allKategori.length > 0) {
      modalOptionsKat.innerHTML = allKategori
        .map((k) => {
          const checked = currentKategoriIds.includes(k.idKategori);
          return `
            <label class="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition hover:bg-primary hover:text-white group">
              <input
                type="checkbox"
                data-action="select-kategori"
                value="${escapeHtml(k.idKategori)}"
                ${checked ? 'checked' : ''}
                class="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span class="flex-1 truncate group-hover:text-white">${escapeHtml(k.namaKategori)}</span>
            </label>
          `;
        })
        .join('');
    }

    // 2. OKI
    if (labelOki) {
      if (currentOkiIds.length === 0) {
        labelOki.textContent = 'Semua OKI';
      } else if (currentOkiIds.length === 1) {
        const found = allOrganisasi.find((o) => o.idOrganisasi === currentOkiIds[0]);
        labelOki.textContent = found ? found.namaOrganisasi : '1 OKI';
      } else {
        labelOki.textContent = `${currentOkiIds.length} OKI`;
      }
    }

    if (chipsOki) {
      if (currentOkiIds.length === 0) {
        chipsOki.innerHTML = '';
        chipsOki.classList.add('hidden');
      } else {
        chipsOki.classList.remove('hidden');
        chipsOki.innerHTML = currentOkiIds
          .map((id) => {
            const o = allOrganisasi.find((item) => item.idOrganisasi === id);
            const name = o ? o.namaOrganisasi : id;
            return `
              <span class="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800">
                <span class="max-w-[120px] truncate">${escapeHtml(name)}</span>
                <button type="button" data-action="remove-oki-chip" data-id="${escapeHtml(id)}" class="text-zinc-400 hover:text-zinc-700">
                  &times;
                </button>
              </span>
            `;
          })
          .join('');
      }
    }

    if (optionsOki && allOrganisasi.length > 0) {
      optionsOki.innerHTML = allOrganisasi
        .map((o) => {
          const checked = currentOkiIds.includes(o.idOrganisasi);
          return `
            <label class="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition hover:bg-primary hover:text-white group">
              <input
                type="checkbox"
                data-action="select-oki"
                value="${escapeHtml(o.idOrganisasi)}"
                ${checked ? 'checked' : ''}
                class="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span class="flex-1 truncate group-hover:text-white">${escapeHtml(o.namaOrganisasi)}</span>
            </label>
          `;
        })
        .join('');
    }

    const modalOptionsOki = root.querySelector('#modal-options-oki');
    if (modalOptionsOki && allOrganisasi.length > 0) {
      modalOptionsOki.innerHTML = allOrganisasi
        .map((o) => {
          const checked = currentOkiIds.includes(o.idOrganisasi);
          return `
            <label class="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition hover:bg-primary hover:text-white group">
              <input
                type="checkbox"
                data-action="select-oki"
                value="${escapeHtml(o.idOrganisasi)}"
                ${checked ? 'checked' : ''}
                class="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span class="flex-1 truncate group-hover:text-white">${escapeHtml(o.namaOrganisasi)}</span>
            </label>
          `;
        })
        .join('');
    }
  }

  async function loadData() {
    const fetchToken = ++activeFetchToken;
    if (resultsArea) {
      resultsArea.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          ${Array.from({ length: KATALOG_DEFAULTS.LIMIT })
            .map(() => renderCardSkeleton().toString())
            .join('')}
        </div>
      `;
    }

    try {
      const res = await getInventarisList({
        search: currentCari,
        idKategori: currentKategoriIds,
        idOrganisasi: currentOkiIds,
        page: currentPage,
        limit: KATALOG_DEFAULTS.LIMIT,
      });

      if (fetchToken !== activeFetchToken) return;

      const items = res?.data || [];
      const total = res?.meta?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / KATALOG_DEFAULTS.LIMIT));

      if (items.length === 0) {
        resultsArea.innerHTML = html`
          <div class="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-12 text-center">
            <h2 class="text-base font-semibold text-zinc-900 sm:text-lg">
              Barang tidak ditemukan
            </h2>
            <p class="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Coba ubah kata kunci pencarian atau atur ulang filter kategori dan OKI.
            </p>
            <div class="mt-5">
              <button
                type="button"
                data-action="reset-filters"
                class="${buttonClass({ variant: 'outline' })} rounded-xl"
              >
                Atur Ulang Filter
              </button>
            </div>
          </div>
        `.toString();
        return;
      }

      const cardsHtml = items.map((inv) => renderInventarisCard(inv)).join('');
      const paginationHtml = renderPagination(currentPage, totalPages).toString();

      resultsArea.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          ${cardsHtml}
        </div>
        ${paginationHtml}
      `;
    } catch {
      if (fetchToken !== activeFetchToken) return;
      resultsArea.innerHTML = html`
        <div class="rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-6 text-center" role="alert">
          <div class="mx-auto mb-2 text-rose-600 inline-flex">
            ${renderIcon('AlertTriangle', 'h-8 w-8')}
          </div>
          <h2 class="text-base font-semibold text-zinc-900">Gagal memuat katalog</h2>
          <p class="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Silakan cek koneksi Anda lalu coba lagi.
          </p>
          <div class="mt-4">
            <button
              type="button"
              data-action="retry-katalog"
              class="${buttonClass({ variant: 'outline' })} rounded-xl gap-2"
            >
              ${renderIcon('RefreshCw', 'h-4 w-4')}
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      `.toString();
    }
  }

  // Load Kategori & Organisasi untuk Opsi Filter
  try {
    const [kategoriList, organisasiList] = await Promise.all([getKategori(), getOrganisasi()]);
    allKategori = kategoriList || [];
    allOrganisasi = organisasiList || [];
    updateDropdownUI();
  } catch {
    /* abaikan kegagalan opsi */
  }

  // Load inventaris pertama kali
  loadData();

  // Search input handler dengan debounce 300ms
  function handleSearchInput(e) {
    const val = (e.target.value || '').trim();
    if (val === currentCari) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentCari = val;
      currentPage = 1;
      updateUrlQuery();
      loadData();
    }, 300);
  }

  searchInput?.addEventListener('input', handleSearchInput);

  // Popover close on outside click
  function handleDocumentClick(e) {
    if (!root.contains(e.target)) {
      popoverKategori?.classList.add('hidden');
      btnKategori?.setAttribute('aria-expanded', 'false');
      popoverOki?.classList.add('hidden');
      btnOki?.setAttribute('aria-expanded', 'false');
    }
  }

  document.addEventListener('click', handleDocumentClick);

  // Delegasi Event Klik di root
  function handleClick(e) {
    // 1. Toggle Filter Kategori
    const toggleKatBtn = e.target.closest('[data-action="toggle-filter-kategori"]');
    if (toggleKatBtn) {
      e.stopPropagation();
      const isHidden = popoverKategori?.classList.contains('hidden');
      popoverKategori?.classList.toggle('hidden');
      popoverOki?.classList.add('hidden');
      btnKategori?.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      btnOki?.setAttribute('aria-expanded', 'false');
      return;
    }

    // 2. Toggle Filter OKI
    const toggleOkiBtn = e.target.closest('[data-action="toggle-filter-oki"]');
    if (toggleOkiBtn) {
      e.stopPropagation();
      const isHidden = popoverOki?.classList.contains('hidden');
      popoverOki?.classList.toggle('hidden');
      popoverKategori?.classList.add('hidden');
      btnOki?.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      btnKategori?.setAttribute('aria-expanded', 'false');
      return;
    }

    // Cegah penutupan jika klik di dalam popover
    if (e.target.closest('#popover-kategori') || e.target.closest('#popover-oki')) {
      return;
    }

    // Buka/Tutup Filter Modal Dialog
    const openFilterModal = e.target.closest('[data-action="open-filter-dialog"]');
    if (openFilterModal) {
      root.querySelector('#dialog-filter-katalog')?.showModal();
      return;
    }
    const closeFilterModal = e.target.closest('[data-action="close-filter-dialog"]');
    if (closeFilterModal) {
      root.querySelector('#dialog-filter-katalog')?.close();
      return;
    }

    // 3. Remove Kategori Chip
    const removeKatChip = e.target.closest('[data-action="remove-kategori-chip"]');
    if (removeKatChip) {
      const id = removeKatChip.getAttribute('data-id');
      currentKategoriIds = currentKategoriIds.filter((k) => k !== id);
      currentPage = 1;
      updateDropdownUI();
      updateUrlQuery();
      loadData();
      return;
    }

    // 4. Remove OKI Chip
    const removeOkiChip = e.target.closest('[data-action="remove-oki-chip"]');
    if (removeOkiChip) {
      const id = removeOkiChip.getAttribute('data-id');
      currentOkiIds = currentOkiIds.filter((o) => o !== id);
      currentPage = 1;
      updateDropdownUI();
      updateUrlQuery();
      loadData();
      return;
    }

    // 5. Reset Filters
    const resetBtn = e.target.closest('[data-action="reset-filters"]');
    if (resetBtn) {
      currentCari = '';
      currentKategoriIds = [];
      currentOkiIds = [];
      currentPage = 1;
      if (searchInput) searchInput.value = '';
      updateDropdownUI();
      updateUrlQuery();
      loadData();
      return;
    }

    // 6. Ganti Halaman (Pagination)
    const pageBtn = e.target.closest('[data-action="change-page"]');
    if (pageBtn && !pageBtn.disabled) {
      const p = Number(pageBtn.getAttribute('data-page'));
      if (Number.isInteger(p) && p > 0 && p !== currentPage) {
        currentPage = p;
        updateUrlQuery();
        loadData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // 7. Retry
    const retryBtn = e.target.closest('[data-action="retry-katalog"]');
    if (retryBtn) {
      loadData();
      return;
    }

    // Tutup dropdown jika klik di luar
    popoverKategori?.classList.add('hidden');
    btnKategori?.setAttribute('aria-expanded', 'false');
    popoverOki?.classList.add('hidden');
    btnOki?.setAttribute('aria-expanded', 'false');
  }

  // Delegasi Event Change untuk Checkbox
  function handleChange(e) {
    if (e.target.matches('[data-action="select-kategori"]')) {
      const val = e.target.value;
      if (e.target.checked) {
        if (!currentKategoriIds.includes(val)) currentKategoriIds.push(val);
      } else {
        currentKategoriIds = currentKategoriIds.filter((k) => k !== val);
      }
      currentPage = 1;
      updateDropdownUI();
      updateUrlQuery();
      loadData();
      return;
    }

    if (e.target.matches('[data-action="select-oki"]')) {
      const val = e.target.value;
      if (e.target.checked) {
        if (!currentOkiIds.includes(val)) currentOkiIds.push(val);
      } else {
        currentOkiIds = currentOkiIds.filter((o) => o !== val);
      }
      currentPage = 1;
      updateDropdownUI();
      updateUrlQuery();
      loadData();
      return;
    }
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('change', handleChange);

  // Return unmount listener cleaner
  return function unmount() {
    if (debounceTimer) clearTimeout(debounceTimer);
    activeFetchToken++;
    searchInput?.removeEventListener('input', handleSearchInput);
    document.removeEventListener('click', handleDocumentClick);
    root.removeEventListener('click', handleClick);
    root.removeEventListener('change', handleChange);
  };
}
