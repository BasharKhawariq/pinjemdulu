/**
 * detail.js — Halaman Detail Inventaris PinjemDulu.
 * Acuan visual: _sumber/src/app/(peminjam)/peminjam/inventaris/[id]/_components/DetailPage.jsx
 */

import { html, raw, escapeHtml } from '../ui/html.js';
import { buttonClass, badgeClass, cardClass, skeletonClass, alertClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { getInventarisById, getPeminjamanAktif } from '../services/inventaris.js';
import { getDetailViewModel } from '../lib/detail-inventaris.js';
import { plainTextToHtml } from '../lib/deskripsi.js';
import { CATALOG_QUERY_KEY, buildKatalogUrl } from '../lib/catalog-nav.js';
import { STATUS_PEMINJAMAN_VARIANT, getStatusLabel } from '../lib/constants.js';
import { renderOrganisasiBadge, renderKategoriBadge } from './inventaris.js';

/**
 * Render skeleton loading untuk halaman detail.
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderDetailSkeleton() {
  return html`
    <div class="w-full space-y-6">
      <div class="flex items-center gap-3">
        <div class="${skeletonClass('h-10 w-10 rounded-full')}"></div>
        <div class="${skeletonClass('h-8 w-64 rounded-xl')}"></div>
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div class="space-y-6 lg:col-span-3">
          <div class="${skeletonClass('aspect-[16/10] w-full rounded-2xl')}"></div>
          <div class="${skeletonClass('h-48 w-full rounded-2xl')}"></div>
        </div>
        <div class="lg:col-span-2">
          <div class="${skeletonClass('h-96 w-full rounded-2xl')}"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render item jadwal peminjaman.
 * @param {object} item
 * @param {number} idx
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderJadwalItem(item, idx) {
  const badgeVariant = STATUS_PEMINJAMAN_VARIANT[item.status] || 'default';
  const statusLabel = getStatusLabel(item.status, 'peminjaman');

  return html`
    <li
      id="jadwal-item-${idx}"
      class="rounded-xl border border-zinc-200 bg-white transition-all overflow-hidden"
    >
      <button
        type="button"
        data-action="toggle-jadwal"
        data-index="${idx}"
        aria-expanded="false"
        class="flex w-full items-center gap-3 p-3 text-left sm:p-4 hover:bg-zinc-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <!-- Blok Tanggal Mulai -->
        <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-center sm:h-16 sm:w-16">
          <span class="text-lg font-bold leading-none text-zinc-900 sm:text-xl">
            ${item.startShort?.hari || '-'}
          </span>
          <span class="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-xs">
            ${item.startShort?.bulan || '-'}
          </span>
        </div>

        <!-- Keperluan & Rentang Tanggal -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-zinc-900 sm:text-base">
            ${item.keperluan}
          </p>
          <p class="mt-0.5 truncate text-xs text-zinc-500 sm:text-sm">
            ${item.rentangText}
          </p>
        </div>

        <!-- Status Badge & Chevron Desktop -->
        <div class="hidden items-center gap-3 sm:flex">
          <span class="${badgeClass(badgeVariant)}">
            ${statusLabel}
          </span>
          <span class="text-zinc-400 transition-transform duration-200" id="chevron-jadwal-${idx}">
            ${renderIcon('ChevronDown', 'h-4 w-4')}
          </span>
        </div>

        <!-- Chevron Mobile -->
        <div class="flex items-center gap-2 sm:hidden">
          <span class="text-zinc-400 transition-transform duration-200" id="chevron-mobile-jadwal-${idx}">
            ${renderIcon('ChevronDown', 'h-4 w-4')}
          </span>
        </div>
      </button>

      <!-- Panel Rincian Tersembunyi (Expandable) -->
      <div id="details-jadwal-${idx}" class="hidden border-t border-zinc-100 bg-zinc-50/50 px-3 pb-4 pt-3 sm:px-5 sm:pb-5">
        <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div class="flex items-center gap-2">
            <span class="text-zinc-400">${renderIcon('Package', 'h-4 w-4')}</span>
            <div>
              <dt class="text-[11px] uppercase tracking-wide text-zinc-500">Jumlah Unit</dt>
              <dd class="text-sm font-medium text-zinc-900">${item.jumlahPinjam} unit</dd>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-zinc-400">${renderIcon('Building2', 'h-4 w-4')}</span>
            <div>
              <dt class="text-[11px] uppercase tracking-wide text-zinc-500">OKI Peminjam</dt>
              <dd class="text-sm font-medium text-zinc-900">${item.namaOrganisasi}</dd>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-zinc-400">${renderIcon('ShieldCheck', 'h-4 w-4')}</span>
            <div>
              <dt class="text-[11px] uppercase tracking-wide text-zinc-500">Hari Persiapan</dt>
              <dd class="text-sm font-medium text-zinc-900">${item.bufferStartDate}</dd>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-zinc-400">${renderIcon('CheckCircle2', 'h-4 w-4')}</span>
            <div>
              <dt class="text-[11px] uppercase tracking-wide text-zinc-500">Hari Pengecekan</dt>
              <dd class="text-sm font-medium text-zinc-900">${item.bufferEndDate}</dd>
            </div>
          </div>
        </dl>
      </div>
    </li>
  `;
}

/**
 * Render konten lengkap detail inventaris setelah data tersedia.
 * @param {object} vm - View model dari getDetailViewModel
 * @param {string} hrefKatalog
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function renderDetailContent(vm, hrefKatalog = '#/inventaris') {
  const hrefAjukan = `#/inventaris/${encodeURIComponent(vm.idInventaris)}/ajukan`;

  // Deskripsi aman (baris ganda jadi p, baris tunggal jadi br)
  const deskripsiHtml = vm.deskripsiBarang
    ? raw(plainTextToHtml(vm.deskripsiBarang))
    : html`<p class="text-sm text-zinc-400">Deskripsi belum tersedia.</p>`;

  // Gambar atau fallback
  const imageMarkup = vm.thumbnail
    ? html`
        <img
          src="${vm.thumbnail}"
          alt="Gambar ${vm.namaBarang}"
          class="h-full w-full object-contain p-4"
          loading="lazy"
          onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400\'><svg class=\'h-12 w-12\' xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.6\'><path d=\'m7.5 4.27 9 5.15\'/><path d=\'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\'/><path d=\'m3.3 7 8.7 5 8.7-5\'/><path d=\'M12 22V12\'/></svg><span class=\'text-sm font-medium\'>Tanpa gambar</span></div>';"
        />
      `
    : html`
        <div class="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
          ${renderIcon('Package', 'h-12 w-12')}
          <span class="text-sm font-medium">Tanpa gambar</span>
        </div>
      `;

  // Tombol Ajukan & Peringatan
  let alertBox = raw('');
  let buttonMarkup = raw('');

  if (vm.ajukanStatus.code === 'OKI_SENDIRI') {
    alertBox = html`
      <div role="alert" class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 mb-5">
        <span class="mt-0.5 shrink-0">${renderIcon('Ban', 'h-5 w-5')}</span>
        <div class="text-xs leading-relaxed sm:text-sm">
          <p class="font-semibold">Barang milik OKI Anda</p>
          <p class="mt-0.5 opacity-90">${vm.ajukanStatus.alasan}</p>
        </div>
      </div>
    `;
    buttonMarkup = html`
      <button
        type="button"
        disabled
        aria-disabled="true"
        class="${buttonClass({ size: 'lg' })} w-full rounded-2xl font-semibold opacity-60 cursor-not-allowed"
      >
        ${renderIcon('Ban', 'mr-2 h-4 w-4')}
        <span>Barang Milik OKI Anda</span>
      </button>
    `;
  } else if (vm.ajukanStatus.code === 'INVENTARIS_RUSAK') {
    alertBox = html`
      <div role="alert" class="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 mb-5">
        <span class="mt-0.5 shrink-0 text-rose-600">${renderIcon('AlertTriangle', 'h-5 w-5')}</span>
        <div class="text-xs leading-relaxed sm:text-sm">
          <p class="font-semibold">Barang Dalam Kondisi Rusak</p>
          <p class="mt-0.5 opacity-90">${vm.ajukanStatus.alasan}</p>
        </div>
      </div>
    `;
    buttonMarkup = html`
      <button
        type="button"
        disabled
        aria-disabled="true"
        class="${buttonClass({ size: 'lg' })} w-full rounded-2xl font-semibold opacity-60 cursor-not-allowed"
      >
        ${renderIcon('AlertTriangle', 'mr-2 h-4 w-4')}
        <span>Barang Rusak (Tidak Dapat Dipinjam)</span>
      </button>
    `;
  } else if (vm.ajukanStatus.code === 'STOK_HABIS') {
    buttonMarkup = html`
      <button
        type="button"
        disabled
        aria-disabled="true"
        class="${buttonClass({ size: 'lg' })} w-full rounded-2xl font-semibold opacity-60 cursor-not-allowed"
      >
        ${renderIcon('Ban', 'mr-2 h-4 w-4')}
        <span>Stok Tidak Tersedia</span>
      </button>
    `;
  } else {
    buttonMarkup = html`
      <a
        href="${hrefAjukan}"
        id="btn-ajukan-peminjaman"
        aria-label="Ajukan peminjaman ${vm.namaBarang}"
        class="${buttonClass({ variant: 'default', size: 'lg' })} w-full rounded-2xl font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        Ajukan Peminjaman
      </a>
    `;
  }

  // Daftar Jadwal
  const jadwalSection = vm.jadwal.length === 0
    ? html`
        <div class="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <p class="text-sm font-semibold text-zinc-900">Belum ada jadwal peminjaman</p>
          <p class="mt-1 text-xs text-zinc-500">
            Saat ini belum ada kegiatan yang memesan barang ini di masa mendatang.
          </p>
        </div>
      `
    : html`
        <ul class="flex flex-col gap-2" role="list">
          ${vm.jadwal.map((j, idx) => renderJadwalItem(j, idx))}
        </ul>
      `;

  return html`
    <div class="w-full">
      <!-- Baris Header Navigasi -->
      <div class="mb-6 flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-start gap-3">
          <a
            href="${hrefKatalog}"
            aria-label="Kembali ke katalog inventaris"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
          >
            ${renderIcon('ArrowLeft', 'h-4 w-4')}
          </a>
          <h1 class="truncate text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            ${vm.namaBarang}
          </h1>
        </div>
        <div>
          ${renderKategoriBadge(vm.namaKategori)}
        </div>
      </div>

      <!-- Grid Konten 2 Kolom -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <!-- Kolom Kiri: Foto Besar + Jadwal Peminjaman -->
        <div class="space-y-6 lg:col-span-3">
          <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
            <div class="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-zinc-100">
              ${imageMarkup}
            </div>
          </div>

          <section aria-labelledby="jadwal-heading" class="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="jadwal-heading" class="text-base font-semibold text-zinc-900 sm:text-lg">
                  Jadwal Peminjaman
                </h2>
                <p class="mt-1 text-xs text-zinc-500 sm:text-sm">
                  Klik jadwal untuk melihat rincian unit dan waktu persiapan.
                </p>
              </div>
              <span class="text-zinc-400">${renderIcon('CalendarDays', 'h-5 w-5')}</span>
            </div>

            ${jadwalSection}
          </section>
        </div>

        <!-- Kolom Kanan: Detail Info Card -->
        <div class="lg:col-span-2">
          <div class="${cardClass('overflow-hidden rounded-2xl shadow-sm bg-white border border-zinc-200 p-4 sm:p-6 space-y-5')}">
            <header>
              <h2 class="text-base font-semibold text-zinc-900 sm:text-lg">
                Detail Barang Inventaris
              </h2>
              <p class="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                Informasi ketersediaan, kondisi, dan pemilik barang.
              </p>
            </header>

            ${alertBox}

            <!-- Baris Informasi -->
            <div class="space-y-3.5 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5 sm:p-4">
              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
                <span class="font-medium text-zinc-500 uppercase tracking-wide text-[11px]">Tersedia hari ini</span>
                <span class="font-medium text-zinc-900">
                  <span class="font-bold text-primary">${vm.isRusak ? 0 : vm.sisaHariIni}</span>
                  <span class="text-zinc-500">dari ${vm.totalBarang} unit</span>
                </span>
              </div>

              <div class="h-px w-full bg-zinc-200/60"></div>

              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
                <span class="font-medium text-zinc-500 uppercase tracking-wide text-[11px]">Kondisi</span>
                <span class="font-semibold text-zinc-900">${vm.labelKondisi}</span>
              </div>

              <div class="h-px w-full bg-zinc-200/60"></div>

              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
                <span class="font-medium text-zinc-500 uppercase tracking-wide text-[11px]">Ketersediaan</span>
                <div>
                  ${vm.tersedia
                    ? html`<span class="${badgeClass('success')}">Tersedia</span>`
                    : vm.isRusak
                      ? html`<span class="${badgeClass('danger')}">Rusak (Tidak Tersedia)</span>`
                      : html`<span class="${badgeClass('danger')}">Tidak Tersedia</span>`}
                </div>
              </div>

              <div class="h-px w-full bg-zinc-200/60"></div>

              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
                <span class="font-medium text-zinc-500 uppercase tracking-wide text-[11px]">Pemilik Inventaris</span>
                <div>${renderOrganisasiBadge(vm.namaOrganisasi)}</div>
              </div>
            </div>

            <!-- Deskripsi Barang -->
            <div>
              <span class="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Deskripsi
              </span>
              <div class="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 leading-relaxed">
                ${deskripsiHtml}
              </div>
            </div>

            <!-- Tombol Aksi -->
            <div class="pt-2">
              ${buttonMarkup}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render kerangka awal halaman detail inventaris (skeleton).
 * @param {object} [ctx]
 * @returns {string}
 */
export function render(ctx = {}) {
  void ctx;
  return html`
    <div id="detail-page-root" class="w-full">
      ${renderDetailSkeleton()}
    </div>
  `.toString();
}

/**
 * Pasang interaksi dan fetch data detail inventaris.
 * @param {HTMLElement} root
 * @param {object} [ctx]
 * @returns {() => void} unmount callback
 */
export async function mount(root, ctx = {}) {
  if (!root) return;

  const container = root.querySelector('#detail-page-root') || root;
  const id = ctx.params?.id || '';

  // Dapatkan URL katalog dari query yang tersimpan di sessionStorage
  let hrefKatalog = '#/inventaris';
  try {
    const savedQuery = sessionStorage.getItem(CATALOG_QUERY_KEY);
    if (savedQuery) {
      hrefKatalog = buildKatalogUrl('#/inventaris', savedQuery);
    }
  } catch {
    /* abaikan */
  }

  if (!id) {
    container.innerHTML = html`
      <div class="w-full">
        <div class="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-12">
          <div class="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            ${renderIcon('AlertTriangle', 'h-7 w-7')}
          </div>
          <h2 class="text-lg font-semibold text-zinc-900 sm:text-xl">Barang tidak ditemukan</h2>
          <p class="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            ID barang inventaris tidak valid atau tidak disertakan.
          </p>
          <div class="mt-5">
            <a href="${hrefKatalog}" class="${buttonClass({ variant: 'default' })} rounded-xl">
              Kembali ke Katalog
            </a>
          </div>
        </div>
      </div>
    `.toString();
    return;
  }

  let isCancelled = false;

  async function loadDetail() {
    container.innerHTML = renderDetailSkeleton().toString();

    try {
      const [inv, jadwalList] = await Promise.all([
        getInventarisById(id),
        getPeminjamanAktif(id).catch(() => []),
      ]);

      if (isCancelled) return;

      const vm = getDetailViewModel(inv, jadwalList, ctx.user);
      container.innerHTML = renderDetailContent(vm, hrefKatalog).toString();
    } catch (err) {
      if (isCancelled) return;

      const isNotFound = err?.status === 404 || err?.statusCode === 404;
      if (isNotFound) {
        container.innerHTML = html`
          <div class="w-full">
            <div class="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-12">
              <div class="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                ${renderIcon('AlertTriangle', 'h-7 w-7')}
              </div>
              <h2 class="text-lg font-semibold text-zinc-900 sm:text-xl">Barang tidak ditemukan</h2>
              <p class="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                Barang dengan ID yang Anda cari tidak tersedia atau sudah dihapus.
              </p>
              <div class="mt-5">
                <a href="${hrefKatalog}" class="${buttonClass({ variant: 'default' })} rounded-xl">
                  Kembali ke Katalog
                </a>
              </div>
            </div>
          </div>
        `.toString();
        return;
      }

      container.innerHTML = html`
        <div class="w-full">
          <div class="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-6 text-center sm:p-10">
            <div class="mx-auto mb-2 text-rose-600 inline-flex">
              ${renderIcon('AlertTriangle', 'h-7 w-7')}
            </div>
            <h2 class="text-base font-semibold text-zinc-900 sm:text-lg">Gagal memuat detail barang</h2>
            <p class="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Silakan coba beberapa saat lagi atau kembali ke katalog.
            </p>
            <div class="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                data-action="retry-detail"
                class="${buttonClass({ variant: 'outline' })} rounded-xl gap-2"
              >
                ${renderIcon('RefreshCw', 'h-4 w-4')}
                <span>Coba Lagi</span>
              </button>
              <a href="${hrefKatalog}" class="${buttonClass({ variant: 'ghost' })} rounded-xl">
                Ke Katalog
              </a>
            </div>
          </div>
        </div>
      `.toString();
    }
  }

  loadDetail();

  // Delegasi Event Klik untuk Accordion Jadwal & Retry
  function handleClick(e) {
    const toggleBtn = e.target.closest('[data-action="toggle-jadwal"]');
    if (toggleBtn) {
      const idx = toggleBtn.getAttribute('data-index');
      const detailsEl = container.querySelector(`#details-jadwal-${idx}`);
      const chevronEl = container.querySelector(`#chevron-jadwal-${idx}`);
      const chevronMobileEl = container.querySelector(`#chevron-mobile-jadwal-${idx}`);

      if (detailsEl) {
        const isHidden = detailsEl.classList.contains('hidden');
        detailsEl.classList.toggle('hidden');
        toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        if (chevronEl) chevronEl.classList.toggle('rotate-180', isHidden);
        if (chevronMobileEl) chevronMobileEl.classList.toggle('rotate-180', isHidden);
      }
      return;
    }

    const retryBtn = e.target.closest('[data-action="retry-detail"]');
    if (retryBtn) {
      loadDetail();
      return;
    }
  }

  container.addEventListener('click', handleClick);

  return function unmount() {
    isCancelled = true;
    container.removeEventListener('click', handleClick);
  };
}
