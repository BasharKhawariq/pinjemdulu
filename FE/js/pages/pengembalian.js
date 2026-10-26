/**
 * Halaman Pengajuan Saya > Pengembalian.
 * Data masih mock untuk menyesuaikan prototipe UI/UX Figma.
 */
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';

const TABS = [
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'dikembalikan', label: 'Dikembalikan' },
  { key: 'terlambat', label: 'Terlambat' },
];

// Data contoh untuk menyamakan tampilan awal dengan desain Figma.
// Ganti dengan data dari service/backend ketika integrasi API dilakukan.
const DEMO_ROWS = [
  { id: 'ret-1', namaBarang: 'Proyektor Epson', organisasi: 'HMTI', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-25', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu' },
  { id: 'ret-2', namaBarang: 'Kabel HDMI', organisasi: 'HMF', tanggalMulai: '2026-08-15', tanggalSelesai: '2026-08-20', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu' },
  { id: 'ret-3', namaBarang: 'Camera Canon 700D', organisasi: 'HMS', tanggalMulai: '2026-07-07', tanggalSelesai: '2026-07-12', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu' },
  { id: 'ret-4', namaBarang: 'Speaker Portable', organisasi: 'HIMANIA', tanggalMulai: '2026-04-26', tanggalSelesai: '2026-04-30', tanggalDikembalikan: null, jumlahUnit: 1, status: 'menunggu' },
  { id: 'ret-5', namaBarang: 'Tripod Kamera', organisasi: 'HMTI', tanggalMulai: '2026-10-01', tanggalSelesai: '2026-10-03', tanggalDikembalikan: '2026-10-03', jumlahUnit: 1, status: 'dikembalikan' },
  { id: 'ret-6', namaBarang: 'Mikrofon Wireless', organisasi: 'BEM', tanggalMulai: '2026-10-10', tanggalSelesai: '2026-10-12', tanggalDikembalikan: null, jumlahUnit: 1, status: 'terlambat' },
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

function statusBadge(status) {
  const styles = {
    menunggu: 'bg-amber-50 text-amber-700',
    dikembalikan: 'bg-emerald-50 text-emerald-700',
    terlambat: 'bg-rose-50 text-rose-700',
  };
  const label = TABS.find((tab) => tab.key === status)?.label || status;
  return `<span class="inline-flex whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[10px] font-medium ${styles[status] || 'bg-zinc-100 text-zinc-700'}">${label}</span>`;
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
      <td class="px-4 py-4 text-center">${statusBadge(row.status)}</td>
      <td class="px-4 py-4 text-center"><button type="button" data-detail="${row.id}" aria-label="Lihat detail ${escapeHtml(row.namaBarang)}" title="Lihat detail" class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700">${renderIcon('Info', 'h-[17px] w-[17px]')}</button></td>
    </tr>`).join('');
}

function renderPagination() {
  const pages = Math.max(1, Math.ceil(getFilteredRows().length / PAGE_SIZE));
  return `<div class="flex items-center justify-end gap-1.5 px-5 py-3">
    <button type="button" data-page="prev" aria-label="Halaman sebelumnya" ${currentPage <= 1 ? 'disabled' : ''} class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-100 text-slate-400 hover:bg-zinc-50 disabled:opacity-40">${renderIcon('ChevronLeft', 'h-4 w-4')}</button>
    <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-white">${currentPage}</span>
    <button type="button" data-page="next" aria-label="Halaman berikutnya" ${currentPage >= pages ? 'disabled' : ''} class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-100 text-slate-400 hover:bg-zinc-50 disabled:opacity-40">${renderIcon('ChevronRight', 'h-4 w-4')}</button>
  </div>`;
}

function renderDetail(row) {
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" data-modal-overlay>
    <section role="dialog" aria-modal="true" aria-labelledby="return-detail-title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Detail pengembalian</p><h2 id="return-detail-title" class="mt-1 text-lg font-semibold text-slate-900">${escapeHtml(row.namaBarang)}</h2></div><button type="button" data-close-detail aria-label="Tutup detail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100">${renderIcon('X', 'h-4 w-4')}</button></div>
      <dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <div><dt class="text-xs text-slate-400">Organisasi</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(row.organisasi)}</dd></div>
        <div><dt class="text-xs text-slate-400">Status</dt><dd class="mt-1 font-medium text-slate-700">${TABS.find((tab) => tab.key === row.status)?.label || row.status}</dd></div>
        <div><dt class="text-xs text-slate-400">Tanggal mulai</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(dateLabel(row.tanggalMulai))}</dd></div>
        <div><dt class="text-xs text-slate-400">Tanggal selesai</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(dateLabel(row.tanggalSelesai))}</dd></div>
        <div><dt class="text-xs text-slate-400">Tanggal dikembalikan</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(dateLabel(row.tanggalDikembalikan))}</dd></div>
        <div><dt class="text-xs text-slate-400">Jumlah unit</dt><dd class="mt-1 font-medium text-slate-700">${row.jumlahUnit} unit</dd></div>
      </dl>
      <div class="mt-6 flex justify-end"><button type="button" data-close-detail class="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">Tutup</button></div>
    </section></div>`;
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
      <div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><h2 data-list-title class="text-[15px] font-semibold text-slate-900">List Barang Menunggu</h2><label class="flex h-9 w-full items-center gap-2 rounded-full bg-background px-3 text-slate-400 sm:w-[192px]">${renderIcon('Search', 'h-4 w-4 shrink-0')}<input data-search type="search" value="" placeholder="Cari barang inventaris" aria-label="Cari barang inventaris" class="min-w-0 w-full border-0 bg-transparent p-0 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0" /></label></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[900px] border-collapse text-left"><thead class="bg-white text-[10px] font-semibold uppercase tracking-[0.02em] text-slate-400"><tr class="border-b border-zinc-100"><th class="px-4 py-3 text-center font-semibold">No</th><th class="px-4 py-3 font-semibold">Nama Barang</th><th class="px-4 py-3 text-center font-semibold">Tanggal Mulai</th><th class="px-4 py-3 text-center font-semibold">Tanggal Selesai</th><th class="px-4 py-3 text-center font-semibold">Tanggal Dikembalikan</th><th class="px-4 py-3 text-center font-semibold">Jumlah Unit</th><th class="px-4 py-3 text-center font-semibold">Status</th><th class="px-4 py-3 text-center font-semibold">Aksi</th></tr></thead><tbody data-table-body class="divide-y divide-zinc-50">${renderRows()}</tbody></table></div>
      <div data-pagination>${renderPagination()}</div>
    </section><div data-detail-modal></div>
  </section>`;
}

export async function mount(root) {
  rootElement = root;
  activeTab = 'menunggu';
  searchTerm = '';
  currentPage = 1;
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
