/** Halaman Pengelolaan > List Pengajuan Penanggung Jawab. */
import { getRequestPj, updateMockRequestPjStatus } from '../services/request-pj.js';
import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';

let rows = [];
let activeTab = STATUS_REQUEST_PJ.MENUNGGU;
let searchTerm = '';
let currentPage = 1;
const PAGE_SIZE = 5;
let rootElement = null;
let clickHandler = null;
let inputHandler = null;
let toastMessage = '';
let toastType = 'success';
let modalRow = null;

function personName(row) { return row.pemohon?.nama || row.namaPemohon || 'Pemohon'; }
function initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'P'; }
function dateLabel(value) {
  if (!value) return '—';
  try { return formatTanggal(String(value).slice(0, 10)); } catch { return String(value).slice(0, 10); }
}
function statusInfo(status) {
  const value = String(status || '').toLowerCase();
  if (value === STATUS_REQUEST_PJ.MENUNGGU) return { label: 'Menunggu', cls: 'bg-warning text-warning-foreground' };
  if (value === STATUS_REQUEST_PJ.DISETUJUI) return { label: 'Disetujui', cls: 'bg-success text-success-foreground' };
  if (value === STATUS_REQUEST_PJ.DITOLAK) return { label: 'Ditolak', cls: 'bg-danger text-danger-foreground' };
  return { label: status || '—', cls: 'bg-zinc-100 text-zinc-700' };
}
function visibleRows() {
  const q = searchTerm.trim().toLowerCase();
  return rows.filter((row) => {
    const name = personName(row);
    const organization = row.organisasi?.namaOrganisasi || row.pemohon?.organisasi?.namaOrganisasi || '';
    return String(row.status).toLowerCase() === activeTab && (!q || `${name} ${organization} ${row.pemohon?.nim || ''}`.toLowerCase().includes(q));
  });
}
function renderTableRows() {
  const filtered = visibleRows();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  if (!pageRows.length) return `<tr><td colspan="5" class="px-6 py-16 text-center text-sm text-slate-400">${renderIcon('Search', 'mr-2 inline h-4 w-4')}Tidak ada pengajuan PJ pada status ini.</td></tr>`;
  return pageRows.map((row, index) => {
    const id = String(row.id);
    const name = personName(row);
    const status = statusInfo(row.status);
    const pending = row.status === STATUS_REQUEST_PJ.MENUNGGU;
    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-3 py-3 text-center text-xs text-slate-400">${start + index + 1}</td>
      <td class="min-w-[220px] px-3 py-3"><div class="flex items-center gap-2"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-[10px] font-semibold text-white">${escapeHtml(initials(name))}</span><span class="block truncate text-[11px] font-medium text-slate-500">${escapeHtml(name)}</span></div></td>
      <td class="whitespace-nowrap px-3 py-3 text-center text-[11px] text-slate-400">${escapeHtml(dateLabel(row.tanggalPengajuan || row.createdAt))}</td>
      <td class="px-3 py-3 text-center"><span class="inline-flex whitespace-nowrap rounded-xl px-2.5 py-2 text-[10px] font-medium ${status.cls}">${escapeHtml(status.label)}</span></td>
      <td class="whitespace-nowrap px-3 py-3"><div class="flex items-center justify-center gap-1.5"><button type="button" data-action="detail" data-id="${escapeHtml(id)}" title="Lihat detail" aria-label="Lihat detail" class="rounded-full p-1 text-slate-400 hover:bg-slate-100">${renderIcon('Info', 'h-4 w-4')}</button>${pending ? `<button type="button" data-action="approve" data-id="${escapeHtml(id)}" title="Setujui pengajuan" aria-label="Setujui pengajuan" class="rounded-full p-1 text-green-600 hover:bg-green-50">${renderIcon('CircleCheck', 'h-4 w-4')}</button><button type="button" data-action="reject" data-id="${escapeHtml(id)}" title="Tolak pengajuan" aria-label="Tolak pengajuan" class="rounded-full p-1 text-red-600 hover:bg-red-50">${renderIcon('CircleX', 'h-4 w-4')}</button>` : ''}</div></td>
    </tr>`;
  }).join('');
}
function renderPagination() {
  const pages = Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE));
  return `<div class="flex items-center justify-end gap-2"><button type="button" data-action="prev" aria-label="Halaman sebelumnya" ${currentPage <= 1 ? 'disabled' : ''} class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-40">${renderIcon('ChevronLeft', 'h-4 w-4')}</button><span class="flex h-8 min-w-8 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">${currentPage}</span><button type="button" data-action="next" aria-label="Halaman berikutnya" ${currentPage >= pages ? 'disabled' : ''} class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-40">${renderIcon('ChevronRight', 'h-4 w-4')}</button></div>`;
}
function renderModal() {
  if (!modalRow) return '';
  const row = modalRow;
  const status = statusInfo(row.status);
  const details = [
    ['Nama pemohon', personName(row)],
    ['NIM', row.pemohon?.nim || '—'],
    ['Organisasi', row.organisasi?.namaOrganisasi || row.pemohon?.organisasi?.namaOrganisasi || '—'],
    ['Tanggal pengajuan', dateLabel(row.tanggalPengajuan)],
    ['Status', status.label],
    ['Alasan pengajuan', row.alasan || '—'],
    ...(row.alasanPenolakan ? [['Alasan penolakan', row.alasanPenolakan]] : []),
  ];
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" data-modal-backdrop><section role="dialog" aria-modal="true" aria-labelledby="request-pj-detail-title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div class="mb-5 flex items-start justify-between"><div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Detail pengajuan</p><h2 id="request-pj-detail-title" class="mt-1 text-xl font-semibold text-slate-900">Pengajuan Penanggung Jawab</h2></div><button type="button" data-action="close-modal" aria-label="Tutup detail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100">${renderIcon('X', 'h-5 w-5')}</button></div><dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">${details.map(([label, value]) => `<div><dt class="text-xs text-slate-400">${escapeHtml(label)}</dt><dd class="mt-1 break-words text-sm font-medium text-slate-800">${escapeHtml(value)}</dd></div>`).join('')}</dl><div class="mt-6 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Tutup</button></div></section></div>`;
}
function renderContent() {
  const count = visibleRows().length;
  const tabs = [
    [STATUS_REQUEST_PJ.MENUNGGU, 'Menunggu'],
    [STATUS_REQUEST_PJ.DISETUJUI, 'Disetujui'],
    [STATUS_REQUEST_PJ.DITOLAK, 'Ditolak'],
  ];
  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-6"><h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">List Pengajuan Penanggung Jawab</h1><p class="mt-1 text-xs text-slate-400">Pantau dan kelola proses pengajuan penanggung jawab inventaris.</p></div>
    <div class="mb-3 inline-flex items-center gap-1 rounded-xl bg-white p-1.5">${tabs.map(([value, label]) => `<button type="button" data-action="tab" data-tab="${value}" class="rounded-lg px-4 py-2 text-[11px] font-medium transition ${activeTab === value ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">${label}</button>`).join('')}</div>
    <div class="rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-3">
      <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 class="text-base font-semibold text-slate-900">List ${activeTab === STATUS_REQUEST_PJ.MENUNGGU ? 'Menunggu' : activeTab === STATUS_REQUEST_PJ.DISETUJUI ? 'Disetujui' : 'Ditolak'}</h2><div class="flex items-center gap-3"><label class="flex h-10 min-w-0 items-center gap-2 rounded-full bg-slate-50 px-3 sm:w-[185px]">${renderIcon('Search', 'h-4 w-4 shrink-0 text-slate-400')}<input id="search-pemohon-pj" type="search" value="${escapeHtml(searchTerm)}" placeholder="Cari nama pemohon" class="w-full min-w-0 bg-transparent text-[11px] text-slate-600 outline-none placeholder:text-slate-400" /></label><button type="button" data-action="filter" title="Filter nama pemohon" aria-label="Filter pengajuan" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100">${renderIcon('ListFilter', 'h-4 w-4')}</button></div></div>
      ${toastMessage ? `<div role="status" class="mb-3 rounded-lg px-4 py-2 text-sm ${toastType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">${escapeHtml(toastMessage)}</div>` : ''}
      <div class="w-full overflow-x-auto"><table class="w-full min-w-[650px] border-collapse text-left"><thead><tr class="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><th class="px-3 py-3 text-center">No</th><th class="px-3 py-3">Nama Pemohon</th><th class="px-3 py-3 text-center">Tanggal Pengajuan</th><th class="px-3 py-3 text-center">Status</th><th class="px-3 py-3 text-center">Aksi</th></tr></thead><tbody>${renderTableRows()}</tbody></table></div>
      <div class="mt-5 flex items-center justify-between gap-3"><p class="text-[11px] text-slate-400">Menampilkan ${count ? Math.min((currentPage - 1) * PAGE_SIZE + 1, count) : 0}–${Math.min(currentPage * PAGE_SIZE, count)} dari ${count} pengajuan</p>${renderPagination()}</div>
    </div>
  </section>${renderModal()}`;
}
function refresh() { if (rootElement) rootElement.innerHTML = renderContent(); }
export function render() { return renderContent(); }
export async function mount(root) {
  rootElement = root;
  activeTab = STATUS_REQUEST_PJ.MENUNGGU;
  searchTerm = '';
  currentPage = 1;
  toastMessage = '';
  modalRow = null;
  rows = await getRequestPj();
  rootElement.innerHTML = renderContent();
  clickHandler = async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      if (event.target.closest('[data-modal-backdrop]') && event.target === event.target.closest('[data-modal-backdrop]')) { modalRow = null; refresh(); }
      return;
    }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'close-modal') { modalRow = null; refresh(); return; }
    if (action === 'detail') { modalRow = rows.find((row) => String(row.id) === String(id)) || null; refresh(); return; }
    if (action === 'tab') { activeTab = button.dataset.tab; currentPage = 1; toastMessage = ''; refresh(); return; }
    if (action === 'prev') { currentPage = Math.max(1, currentPage - 1); refresh(); return; }
    if (action === 'next') { currentPage = Math.min(Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE)), currentPage + 1); refresh(); return; }
    if (action === 'filter') { searchTerm = ''; currentPage = 1; refresh(); return; }
    if (action === 'approve' || action === 'reject') {
      try {
        await updateMockRequestPjStatus(id, action === 'approve' ? STATUS_REQUEST_PJ.DISETUJUI : STATUS_REQUEST_PJ.DITOLAK);
        rows = await getRequestPj();
        toastType = 'success';
        toastMessage = action === 'approve' ? 'Pengajuan PJ berhasil disetujui.' : 'Pengajuan PJ berhasil ditolak.';
      } catch (error) {
        toastType = 'error'; toastMessage = error?.message || 'Status pengajuan gagal diperbarui.';
      }
      refresh();
    }
  };
  inputHandler = (event) => {
    if (event.target.id !== 'search-pemohon-pj') return;
    searchTerm = event.target.value;
    currentPage = 1;
    const tbody = rootElement.querySelector('tbody');
    if (tbody) tbody.innerHTML = renderTableRows();
    const footer = rootElement.querySelector('.mt-5.flex.items-center.justify-between');
    if (footer) footer.innerHTML = `<p class="text-[11px] text-slate-400">Menampilkan ${visibleRows().length ? 1 : 0}–${Math.min(PAGE_SIZE, visibleRows().length)} dari ${visibleRows().length} pengajuan</p>${renderPagination()}`;
  };
  rootElement.addEventListener('click', clickHandler);
  rootElement.addEventListener('input', inputHandler);
}
export function unmount() {
  if (rootElement && clickHandler) rootElement.removeEventListener('click', clickHandler);
  if (rootElement && inputHandler) rootElement.removeEventListener('input', inputHandler);
  rootElement = null; clickHandler = null; inputHandler = null; rows = []; modalRow = null;
}
