/**
 * Halaman Pengajuan Saya > Peminjaman.
 * Menampilkan transaksi peminjaman milik pengguna yang sedang login.
 * Sumber data saat ini masih menggunakan service mock frontend.
 */
import { getPeminjaman } from '../services/peminjaman.js';
import { STATUS_PEMINJAMAN, LABEL_STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';

const TABS = [
  { key: 'diajukan', label: 'Diajukan', statuses: [STATUS_PEMINJAMAN.DIAJUKAN, 'diajukan'] },
  { key: 'disetujui', label: 'Disetujui', statuses: [STATUS_PEMINJAMAN.DISETUJUI, 'disetujui'] },
  { key: 'dipinjam', label: 'Dipinjam', statuses: [STATUS_PEMINJAMAN.DIPINJAM, 'dipinjam', 'sedang dipinjam'] },
  { key: 'ditolak', label: 'Ditolak', statuses: [STATUS_PEMINJAMAN.DITOLAK, 'ditolak'] },
];

let pageRows = [];
let activeTab = 'diajukan';
let searchTerm = '';
let currentPage = 1;
const PAGE_SIZE = 5;
let rootElement = null;
let onClickHandler = null;
let onInputHandler = null;

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase().replaceAll('_', ' ');
}

function getTabForStatus(status) {
  const normalized = normalizeStatus(status);
  return TABS.find((tab) => tab.statuses.some((value) => normalizeStatus(value) === normalized))?.key || 'lainnya';
}

function statusLabel(status) {
  const key = Object.entries(STATUS_PEMINJAMAN).find(([, value]) => value === status)?.[0];
  if (key && LABEL_STATUS_PEMINJAMAN[key]) return LABEL_STATUS_PEMINJAMAN[key];
  const normalized = normalizeStatus(status);
  const tab = TABS.find((item) => item.statuses.some((value) => normalizeStatus(value) === normalized));
  return tab?.label || String(status || '—');
}

function badgeClass(status) {
  const key = getTabForStatus(status);
  const styles = {
    diajukan: 'bg-blue-100 text-blue-700',
    disetujui: 'bg-emerald-100 text-emerald-700',
    dipinjam: 'bg-amber-100 text-amber-700',
    ditolak: 'bg-rose-100 text-rose-700',
  };
  return styles[key] || 'bg-zinc-100 text-zinc-700';
}

function dateOnly(value) {
  if (!value) return '—';
  return formatTanggal(String(value).slice(0, 10));
}

function getFilteredRows() {
  const tab = TABS.find((item) => item.key === activeTab);
  const term = searchTerm.trim().toLowerCase();
  return pageRows.filter((row) => {
    const inTab = tab ? tab.statuses.some((status) => normalizeStatus(status) === normalizeStatus(row.status)) : true;
    const itemName = row.inventaris?.namaBarang || row.barang?.namaBarang || '';
    const orgName = row.inventaris?.namaOrganisasi || row.barang?.namaOrganisasi || '';
    const matchesSearch = !term || `${itemName} ${orgName}`.toLowerCase().includes(term);
    return inTab && matchesSearch;
  });
}

function renderTabs() {
  return TABS.map((tab) => {
    const selected = activeTab === tab.key;
    return `
      <button type="button" data-tab="${tab.key}" aria-pressed="${selected}"
        class="shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-medium transition ${selected ? 'bg-info text-info-foreground' : 'text-zinc-600 hover:bg-zinc-50'}">
        ${tab.label}
      </button>`;
  }).join('');
}

function renderRows() {
  const filtered = getFilteredRows();
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  if (!visible.length) {
    return `<tr><td colspan="8" class="px-5 py-14 text-center text-sm text-zinc-500">
      <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">${renderIcon('Search', 'h-5 w-5')}</div>
      Tidak ada data peminjaman pada kategori ini.
    </td></tr>`;
  }

  return visible.map((row, index) => {
    const item = row.inventaris || row.barang || {};
    const org = item.namaOrganisasi || row.namaOrganisasi || 'Organisasi';
    const name = item.namaBarang || 'Barang inventaris';
    const id = String(row.id || row.idPeminjaman || index);
    const submitted = row.tanggalPengajuan || row.createdAt || row.startDate;
    const startDate = row.startDate || row.mulai || row.tanggalMulai;
    const endDate = row.endDate || row.selesai || row.tanggalSelesai;
    const qty = row.jumlahPinjam ?? row.jumlahUnit ?? 1;
    return `
      <tr class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60">
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${start + index + 1}</td>
        <td class="min-w-[180px] px-4 py-3">
          <div class="max-w-[220px] truncate text-[11px] font-medium text-slate-500" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
          <div class="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-700">
            <span class="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 text-[7px] font-bold text-slate-700">${escapeHtml(org.slice(0, 1).toUpperCase())}</span>
            <span>${escapeHtml(org)}</span>
          </div>
        </td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateOnly(submitted))}</td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateOnly(startDate))}</td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateOnly(endDate))}</td>
        <td class="px-4 py-4 text-center text-[11px] text-slate-600">${escapeHtml(qty)}</td>
        <td class="px-4 py-4 text-center"><span class="inline-flex whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[10px] font-medium ${badgeClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span></td>
        <td class="px-4 py-4 text-center">
          <button type="button" data-detail="${escapeHtml(id)}" aria-label="Lihat detail ${escapeHtml(name)}" title="Lihat detail"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700">
            ${renderIcon('Info', 'h-[17px] w-[17px]')}
          </button>
        </td>
      </tr>`;
  }).join('');
}

function renderPagination() {
  const count = getFilteredRows().length;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return `
    <div class="flex items-center justify-end gap-1.5 border-t border-zinc-50 px-5 py-3">
      <button type="button" data-page="prev" aria-label="Halaman sebelumnya" ${currentPage <= 1 ? 'disabled' : ''}
        class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-100 text-slate-400 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">${renderIcon('ChevronLeft', 'h-4 w-4')}</button>
      <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-white">${currentPage}</span>
      <button type="button" data-page="next" aria-label="Halaman berikutnya" ${currentPage >= pages ? 'disabled' : ''}
        class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-100 text-slate-400 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40">${renderIcon('ChevronRight', 'h-4 w-4')}</button>
    </div>`;
}

function renderTableContent() {
  const body = rootElement?.querySelector('[data-table-body]');
  if (body) body.innerHTML = renderRows();
  const pagination = rootElement?.querySelector('[data-pagination]');
  if (pagination) pagination.innerHTML = renderPagination();
  const tabs = rootElement?.querySelector('[data-tabs]');
  if (tabs) tabs.innerHTML = renderTabs();
}

function renderDetail(row) {
  const item = row.inventaris || row.barang || {};
  const name = item.namaBarang || 'Barang inventaris';
  const org = item.namaOrganisasi || row.namaOrganisasi || '—';
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="detail-title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div><p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Detail peminjaman</p><h2 id="detail-title" class="mt-1 text-lg font-semibold text-slate-900">${escapeHtml(name)}</h2></div>
          <button type="button" data-close-detail aria-label="Tutup detail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100">${renderIcon('X', 'h-4 w-4')}</button>
        </div>
        <dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          <div><dt class="text-xs text-slate-400">Organisasi</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(org)}</dd></div>
          <div><dt class="text-xs text-slate-400">Status</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(statusLabel(row.status))}</dd></div>
          <div><dt class="text-xs text-slate-400">Tanggal diajukan</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(dateOnly(row.tanggalPengajuan || row.createdAt))}</dd></div>
          <div><dt class="text-xs text-slate-400">Jumlah unit</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(row.jumlahPinjam ?? 1)} unit</dd></div>
          <div><dt class="text-xs text-slate-400">Tanggal mulai</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(dateOnly(row.startDate || row.mulai))}</dd></div>
          <div><dt class="text-xs text-slate-400">Tanggal selesai</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(dateOnly(row.endDate || row.selesai))}</dd></div>
          <div class="col-span-2"><dt class="text-xs text-slate-400">Keperluan</dt><dd class="mt-1 font-medium text-slate-700">${escapeHtml(row.keperluan || '—')}</dd></div>
          ${row.alasanPenolakan ? `<div class="col-span-2"><dt class="text-xs text-slate-400">Alasan penolakan</dt><dd class="mt-1 font-medium text-rose-700">${escapeHtml(row.alasanPenolakan)}</dd></div>` : ''}
        </dl>
        <div class="mt-6 flex justify-end"><button type="button" data-close-detail class="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">Tutup</button></div>
      </section>
    </div>`;
}

export function render() {
  return `
    <section class="min-h-[calc(100vh-112px)] rounded-none bg-background -m-4 p-4 sm:-m-7 sm:p-7">
      <div class="mb-6">
        <h1 class="text-[22px] font-semibold leading-tight text-slate-900">Peminjaman</h1>
        <p class="mt-1 text-[11px] text-slate-400 sm:text-xs">Pantau status pengajuan dan riwayat peminjaman barangmu.</p>
      </div>

      <div class="mb-3 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-white p-1.5" data-tabs role="tablist" aria-label="Filter status peminjaman">
        ${renderTabs()}
      </div>

      <section class="overflow-hidden rounded-xl border border-zinc-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 class="text-[15px] font-semibold text-slate-900">List Barang ${TABS.find((tab) => tab.key === activeTab)?.label || 'Peminjaman'}</h2>
          <label class="flex h-9 w-full items-center gap-2 rounded-full bg-background px-3 text-slate-400 sm:w-[192px]">
            ${renderIcon('Search', 'h-4 w-4 shrink-0')}
            <input data-search type="search" value="${escapeHtml(searchTerm)}" placeholder="Cari barang inventaris" aria-label="Cari barang inventaris" class="min-w-0 w-full border-0 bg-transparent p-0 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:ring-0" />
          </label>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] border-collapse text-left">
            <thead class="bg-white text-[10px] font-semibold uppercase tracking-[0.02em] text-slate-400">
              <tr class="border-b border-zinc-100">
                <th class="px-4 py-3 text-center font-semibold">No</th>
                <th class="px-4 py-3 font-semibold">Nama Barang</th>
                <th class="px-4 py-3 text-center font-semibold">Tanggal Diajukan</th>
                <th class="px-4 py-3 text-center font-semibold">Tanggal Mulai</th>
                <th class="px-4 py-3 text-center font-semibold">Tanggal Selesai</th>
                <th class="px-4 py-3 text-center font-semibold">Jumlah Unit</th>
                <th class="px-4 py-3 text-center font-semibold">Status</th>
                <th class="px-4 py-3 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody data-table-body class="divide-y divide-zinc-50">${renderRows()}</tbody>
          </table>
        </div>
        <div data-pagination>${renderPagination()}</div>
      </section>
      <div data-detail-modal></div>
    </section>`;
}

export async function mount(root, ctx = {}) {
  rootElement = root;
  activeTab = 'diajukan';
  searchTerm = '';
  currentPage = 1;
  try {
    const all = await getPeminjaman();
    const user = ctx.user || null;
    const nim = user?.nim || user?.pengguna?.nim || null;
    pageRows = all.filter((row) => {
      if (!nim) return true;
      const ownerNim = row.pengguna?.nim || row.peminjam?.nim || row.nim || null;
      return !ownerNim || String(ownerNim) === String(nim);
    });
  } catch {
    pageRows = [];
  }
  renderTableContent();

  onClickHandler = (event) => {
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      activeTab = tabButton.dataset.tab;
      currentPage = 1;
      const title = rootElement.querySelector('section section h2');
      if (title) title.textContent = `List Barang ${TABS.find((tab) => tab.key === activeTab)?.label || 'Peminjaman'}`;
      renderTableContent();
      return;
    }
    const pageButton = event.target.closest('[data-page]');
    if (pageButton && !pageButton.disabled) {
      const count = getFilteredRows().length;
      const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      currentPage = pageButton.dataset.page === 'next' ? Math.min(pages, currentPage + 1) : Math.max(1, currentPage - 1);
      renderTableContent();
      return;
    }
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton) {
      const row = pageRows.find((item) => String(item.id || item.idPeminjaman) === detailButton.dataset.detail);
      if (row) rootElement.querySelector('[data-detail-modal]').innerHTML = renderDetail(row);
      return;
    }
    if (event.target.closest('[data-close-detail]') || event.target.matches('[data-modal-overlay]')) {
      rootElement.querySelector('[data-detail-modal]').innerHTML = '';
    }
  };
  onInputHandler = (event) => {
    if (!event.target.matches('[data-search]')) return;
    const position = event.target.selectionStart;
    searchTerm = event.target.value;
    currentPage = 1;
    renderTableContent();
    const input = rootElement.querySelector('[data-search]');
    input?.focus();
    try { input?.setSelectionRange(position, position); } catch { /* input type search */ }
  };
  root.addEventListener('click', onClickHandler);
  root.addEventListener('input', onInputHandler);
}

export function unmount() {
  if (rootElement && onClickHandler) rootElement.removeEventListener('click', onClickHandler);
  if (rootElement && onInputHandler) rootElement.removeEventListener('input', onInputHandler);
  rootElement = null;
  onClickHandler = null;
  onInputHandler = null;
  pageRows = [];
}
