import { getPeminjaman } from '../services/peminjaman.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderStatusChip } from '../ui/status-chip.js';

const TABS = [
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'dikembalikan', label: 'Dikembalikan' },
  { key: 'terlambat', label: 'Terlambat' },
];

// Data contoh untuk menyamakan tampilan awal dengan desain Figma.
// Ganti dengan data dari service/backend ketika integrasi API dilakukan.
const DEMO_ROWS = [
  { id: 'ret-1', namaBarang: 'Proyektor Epson', organisasi: 'HMTI', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-17', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu', keperluan: 'Seminar BEM' },
  { id: 'ret-2', namaBarang: 'Kabel HDMI', organisasi: 'HME', tanggalMulai: '2026-08-15', tanggalSelesai: '2026-08-20', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu', keperluan: 'Workshop HME' },
  { id: 'ret-3', namaBarang: 'Camera Canon 700D', organisasi: 'HMS', tanggalMulai: '2026-07-07', tanggalSelesai: '2026-07-12', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu', keperluan: 'Dokumentasi kegiatan' },
  { id: 'ret-4', namaBarang: 'Speaker Portable', organisasi: 'HIMANIA', tanggalMulai: '2026-04-26', tanggalSelesai: '2026-04-30', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu', keperluan: 'Pentas seni' },
  { id: 'ret-5', namaBarang: 'Proyektor Epson', organisasi: 'HMTI', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-17', tanggalDikembalikan: '2026-10-25', jumlahUnit: 1, status: 'dikembalikan', diprosesOleh: 'Hanin Maizah', keperluan: 'Seminar BEM' },
  { id: 'ret-6', namaBarang: 'Kabel HDMI', organisasi: 'HME', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-17', tanggalDikembalikan: '2026-10-25', jumlahUnit: 1, status: 'terlambat', diprosesOleh: 'Hanin Maizah', waktuTerlambat: 3, keperluan: 'Seminar BEM' },
];

let activeTab = 'menunggu';
let searchTerm = '';
let currentPage = 1;
const PAGE_SIZE = 5;
let rootElement = null;
let onClickHandler = null;
let onInputHandler = null;

function dateLabel(value) {
  return value ? formatTanggal(String(value).slice(0, 10)) : '—';
}

function getFilteredRows() {
  const term = searchTerm.trim().toLowerCase();
  return DEMO_ROWS.filter((row) => row.status === activeTab)
    .filter((row) => !term || `${row.namaBarang} ${row.organisasi}`.toLowerCase().includes(term));
}

function renderTabs() {
  return TABS.map((tab) => {
    const selected = activeTab === tab.key;
    return `<button type="button" data-tab="${tab.key}" role="tab" aria-selected="${selected}"
      class="shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-medium transition ${selected ? 'bg-info text-info-foreground' : 'text-slate-600 hover:bg-zinc-50'}">${tab.label}</button>`;
  }).join('');
}

function renderRows() {
  const rows = getFilteredRows();
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);
  if (!visible.length) {
    return `<tr><td colspan="8" class="px-5 py-14 text-center text-sm text-slate-400">Tidak ada data pengembalian pada kategori ini.</td></tr>`;
  }
  return visible.map((row, index) => `
    <tr class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60">
      <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${start + index + 1}</td>
      <td class="min-w-[180px] px-4 py-3">
        <div class="max-w-[220px] truncate text-[11px] font-medium text-slate-500" title="${escapeHtml(row.namaBarang)}">${escapeHtml(row.namaBarang)}</div>
        <div class="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-700">
          <span class="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 text-[7px] font-bold text-slate-700">${escapeHtml(row.organisasi.slice(0, 1))}</span>
          <span>${escapeHtml(row.organisasi)}</span>
        </div>
      </td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateLabel(row.tanggalMulai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateLabel(row.tanggalSelesai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateLabel(row.tanggalDikembalikan))}</td>
      <td class="px-4 py-4 text-center text-[11px] text-slate-600">${row.jumlahUnit}</td>
      <td class="px-4 py-4 text-center">${renderStatusChip({ status: row.status })}</td>
      <td class="px-4 py-4 text-center"><button type="button" data-detail="${row.id}" aria-label="Lihat detail ${escapeHtml(row.namaBarang)}" title="Lihat detail" class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700">${renderIcon('Info', 'h-[17px] w-[17px]')}</button></td>
    </tr>`).join('');
}

import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

function renderPagination() {
  const pages = Math.max(1, Math.ceil(getFilteredRows().length / PAGE_SIZE));
  return `<div class="flex items-center justify-end px-5 py-3">
    ${renderSharedPagination({
      currentPage,
      totalPages: pages,
      attrType: 'data-page',
      showNumbers: false,
    })}
  </div>`;
}

function renderDetail(row) {
  const isTerlambat = row.status === 'terlambat' || row.status === STATUS_PEMINJAMAN.TERLAMBAT;
  const isDikembalikan = row.status === 'dikembalikan' || row.status === STATUS_PEMINJAMAN.DIKEMBALIKAN || row.status === 'selesai';
  const daysLate = row.waktuTerlambat || 3;
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-overlay>
    <section role="dialog" aria-modal="true" aria-labelledby="return-detail-title" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <h2 id="return-detail-title" class="text-xl font-bold text-slate-900">Detail Pengembalian</h2>
        <button type="button" data-close-detail aria-label="Tutup detail" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">${renderIcon('X', 'h-5 w-5')}</button>
      </div>
      <div class="mt-6 space-y-5">
        <div>
          <p class="text-xs font-semibold text-slate-900">Nama Barang</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-sm font-normal text-slate-800">${escapeHtml(row.namaBarang)}</span>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span class="inline-block h-3 w-3 rounded-full bg-slate-400" aria-hidden="true"></span>
              ${escapeHtml(row.organisasi)}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-zinc-200">
          <div class="sm:pr-4">
            <p class="text-xs font-semibold text-slate-900">Tanggal Mulai</p>
            <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateLabel(row.tanggalMulai))}</p>
          </div>
          <div class="sm:px-4">
            <p class="text-xs font-semibold text-slate-900">Tanggal Selesai</p>
            <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateLabel(row.tanggalSelesai))}</p>
          </div>
          <div class="sm:pl-4">
            <p class="text-xs font-semibold text-slate-900">Tanggal Pengembalian</p>
            <p class="mt-2 text-xs sm:text-sm text-slate-700">${row.tanggalDikembalikan ? escapeHtml(dateLabel(row.tanggalDikembalikan)) : '–'}</p>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold text-slate-900">Jumlah</p>
          <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(row.jumlahUnit || 1)}</p>
        </div>

        <div>
          <p class="text-xs font-semibold text-slate-900">Keperluan Peminjaman Barang</p>
          <div class="mt-2 rounded-2xl border border-zinc-200/80 p-3.5 text-xs sm:text-sm text-slate-700 bg-white">
            ${escapeHtml(row.keperluan || 'Seminar BEM')}
          </div>
        </div>

        ${(isDikembalikan || isTerlambat) && row.diprosesOleh ? `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-900">Diproses Oleh</span>
            <span class="text-sm font-medium text-slate-800">${escapeHtml(row.diprosesOleh)}</span>
          </div>
        ` : ''}

        <div>
          <p class="text-xs font-semibold text-slate-900">Status</p>
          <div class="mt-2 flex items-center">
            ${renderStatusChip({ status: row.status })}
            ${isTerlambat ? `
              <div class="relative group ml-2 inline-flex items-center">
                <span class="inline-flex h-5 w-5 items-center justify-center text-rose-600 cursor-pointer" aria-label="Informasi keterlambatan">
                  ${renderIcon('AlertCircle', 'h-5 w-5')}
                </span>
                <div class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xl border border-slate-200">
                  Waktu Terlambat: ${daysLate} Hari
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button type="button" data-close-detail data-autofocus class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
          Tutup
        </button>
      </div>
    </section>
  </div>`;
}

function refreshTable() {
  const body = rootElement?.querySelector('[data-table-body]');
  if (body) body.innerHTML = renderRows();
  const pagination = rootElement?.querySelector('[data-pagination]');
  if (pagination) pagination.innerHTML = renderPagination();
  const tabs = rootElement?.querySelector('[data-tabs]');
  if (tabs) tabs.innerHTML = renderTabs();
  const title = rootElement?.querySelector('[data-list-title]');
  if (title) title.textContent = `List Barang ${TABS.find((tab) => tab.key === activeTab)?.label || 'Pengembalian'}`;
}

export function render() {
  return `<section class="min-h-[calc(100vh-112px)] rounded-none bg-background -m-4 p-4 sm:-m-7 sm:p-7">
    <div class="mb-6"><h1 class="text-[22px] font-semibold leading-tight text-slate-900">Pengembalian</h1><p class="mt-1 text-[11px] text-slate-400 sm:text-xs">Pantau status pengembalian dan riwayat pengembalian barangmu.</p></div>
    <div class="mb-3 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-white p-1.5" data-tabs role="tablist" aria-label="Filter status pengembalian">${renderTabs()}</div>
    <section class="overflow-hidden rounded-xl border border-zinc-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><h2 data-list-title class="text-[15px] font-semibold text-slate-900">List Barang Menunggu</h2>${renderSearchInput({ dataSearch: true, value: searchTerm, placeholder: 'Cari barang inventaris', ariaLabel: 'Cari barang inventaris', className: 'w-full sm:w-64' })}</div>
      <div class="overflow-x-auto"><table class="w-full min-w-[900px] border-collapse text-left"><thead class="bg-white text-[10px] font-semibold uppercase tracking-[0.02em] text-slate-400"><tr class="border-b border-zinc-100"><th class="px-4 py-3 text-center font-semibold">No</th><th class="px-4 py-3 font-semibold">Nama Barang</th><th class="px-4 py-3 text-center font-semibold">Tanggal Mulai</th><th class="px-4 py-3 text-center font-semibold">Tanggal Selesai</th><th class="px-4 py-3 text-center font-semibold">Tanggal Dikembalikan</th><th class="px-4 py-3 text-center font-semibold">Jumlah Unit</th><th class="px-4 py-3 text-center font-semibold">Status</th><th class="px-4 py-4 text-center font-semibold">Aksi</th></tr></thead><tbody data-table-body class="divide-y divide-zinc-50">${renderRows()}</tbody></table></div>
      <div data-pagination>${renderPagination()}</div>
    </section><div data-detail-modal></div>
  </section>`;
}

export async function mount(root, ctx = {}) {
  rootElement = root;
  activeTab = 'menunggu';
  searchTerm = '';
  currentPage = 1;
  try {
    const all = await getPeminjaman();
    const mapped = all.filter((p) => {
      const s = String(p.status).toLowerCase();
      return (
        s === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ||
        s === STATUS_PEMINJAMAN.DIKEMBALIKAN ||
        s === STATUS_PEMINJAMAN.TERLAMBAT ||
        s === 'menunggu_pengembalian' ||
        s === 'menunggu' ||
        s === 'selesai' ||
        s === 'dikembalikan' ||
        s === 'terlambat'
      );
    }).map((p) => {
      const s = String(p.status).toLowerCase();
      let tabKey = 'menunggu';
      if (s === STATUS_PEMINJAMAN.DIKEMBALIKAN || s === 'selesai' || s === 'dikembalikan') tabKey = 'dikembalikan';
      if (s === STATUS_PEMINJAMAN.TERLAMBAT || s === 'terlambat') tabKey = 'terlambat';
      return {
        id: String(p.id || p.idPeminjaman),
        namaBarang: p.inventaris?.namaBarang || p.barang?.namaBarang || p.namaBarang,
        organisasi: p.inventaris?.namaOrganisasi || p.barang?.namaOrganisasi || p.namaOrganisasi || 'Organisasi',
        tanggalMulai: p.startDate || p.mulai || p.tanggalMulai,
        tanggalSelesai: p.endDate || p.selesai || p.tanggalSelesai,
        tanggalDikembalikan: p.tanggalPengembalian,
        jumlahUnit: p.jumlahPinjam ?? p.jumlahUnit ?? 1,
        status: tabKey,
        keperluan: p.keperluan,
        diprosesOleh: p.diprosesOleh,
        waktuTerlambat: p.waktuTerlambat,
      };
    });
    if (mapped.length) {
      DEMO_ROWS.length = 0;
      DEMO_ROWS.push(...mapped);
    }
  } catch {
    // pertahankan demo rows
  }
  refreshTable();
  onClickHandler = (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) { activeTab = tab.dataset.tab; currentPage = 1; refreshTable(); return; }
    const page = event.target.closest('[data-page]');
    if (page && !page.disabled) {
      const pages = Math.max(1, Math.ceil(getFilteredRows().length / PAGE_SIZE));
      currentPage = page.dataset.page === 'next' ? Math.min(pages, currentPage + 1) : Math.max(1, currentPage - 1);
      refreshTable(); return;
    }
    const detail = event.target.closest('[data-detail]');
    if (detail) {
      const row = DEMO_ROWS.find((item) => item.id === detail.dataset.detail);
      if (row) rootElement.querySelector('[data-detail-modal]').innerHTML = renderDetail(row);
      return;
    }
    if (event.target.closest('[data-close-detail]') || event.target.matches('[data-modal-overlay]')) {
      rootElement.querySelector('[data-detail-modal]').innerHTML = '';
    }
  };
  onInputHandler = (event) => {
    if (!event.target.matches('[data-search]')) return;
    searchTerm = event.target.value;
    currentPage = 1;
    refreshTable();
    const input = rootElement.querySelector('[data-search]');
    if (input) { input.value = searchTerm; input.focus(); input.setSelectionRange(searchTerm.length, searchTerm.length); }
  };
  root.addEventListener('click', onClickHandler);
  root.addEventListener('input', onInputHandler);
}

export function unmount(root) {
  if (root && onClickHandler) root.removeEventListener('click', onClickHandler);
  if (root && onInputHandler) root.removeEventListener('input', onInputHandler);
  rootElement = null;
  onClickHandler = null;
  onInputHandler = null;
}
