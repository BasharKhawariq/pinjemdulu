/** Halaman Pengelolaan > Kelola Pengembalian. */
import { getPeminjaman } from '../services/peminjaman.js';
import { updateMockPengembalianStatus } from '../services/pengembalian.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderFilterButton, renderFilterModal } from '../ui/filter.js';
import { selectClass, inputClass } from '../ui/classes.js';

const OKI_LIST = ['BEM', 'HMTI', 'HME', 'HIMANIA', 'RISPOL', 'HMS', 'THEATRISIC', 'PP'];

let rows = [];
let searchTerm = '';
let okiFilter = 'all';
let tanggalFilter = '';
let statusFilter = 'all';
let currentPage = 1;
const PAGE_SIZE = 5;
let rootElement = null;
let clickHandler = null;
let inputHandler = null;
let toastMessage = '';
let toastType = 'success';
let modalRow = null;

function dateLabel(value) {
  if (!value) return '–';
  try { return formatTanggal(String(value).slice(0, 10)); } catch { return String(value).slice(0, 10); }
}

function statusInfo(status) {
  const s = String(status || '').toLowerCase();
  if (s === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || s === 'menunggu_pengembalian' || s === 'menunggu') {
    return { label: 'Menunggu', cls: 'bg-warning text-warning-foreground' };
  }
  if (s === STATUS_PEMINJAMAN.TERLAMBAT || s === 'terlambat') {
    return { label: 'Terlambat', cls: 'bg-danger text-danger-foreground' };
  }
  if (s === STATUS_PEMINJAMAN.DIKEMBALIKAN || s === 'selesai' || s === 'dikembalikan') {
    return { label: 'Dikembalikan', cls: 'bg-success text-success-foreground' };
  }
  return { label: status || '—', cls: 'bg-zinc-100 text-zinc-700' };
}

function personName(row) {
  return row.pengguna?.nama || row.peminjam?.nama || row.namaPeminjam || 'Peminjam';
}

function organizationName(row) {
  return (
    row.peminjam?.displayOrganization ||
    row.pengguna?.displayOrganization ||
    row.peminjam?.organisasi?.namaOrganisasi ||
    row.peminjam?.namaOrganisasi ||
    row.inventaris?.namaOrganisasi ||
    row.barang?.namaOrganisasi ||
    'Organisasi'
  );
}

function itemName(row) {
  return row.inventaris?.namaBarang || row.barang?.namaBarang || row.barang?.nama || 'Barang inventaris';
}

function initials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'P';
}

function countActiveFilters() {
  let count = 0;
  if (okiFilter && okiFilter !== 'all') count++;
  if (tanggalFilter) count++;
  if (statusFilter && statusFilter !== 'all') count++;
  return count;
}

function matchTanggalPeminjaman(row, selectedDate) {
  if (!selectedDate) return true;
  const start = String(row.startDate || row.mulai || row.tanggalMulai || '').slice(0, 10);
  const end = String(row.endDate || row.selesai || row.tanggalSelesai || start).slice(0, 10);
  if (!start) return false;
  return selectedDate === start || (selectedDate >= start && selectedDate <= end);
}

function matchStatusPengembalian(rowStatus, filterStatus) {
  if (!filterStatus || filterStatus === 'all') return true;
  const r = String(rowStatus || '').toLowerCase();
  const f = String(filterStatus || '').toLowerCase();
  if (f === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || f === 'menunggu_pengembalian' || f === 'menunggu') {
    return r === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || r === 'menunggu_pengembalian' || r === 'menunggu';
  }
  if (f === STATUS_PEMINJAMAN.TERLAMBAT || f === 'terlambat') {
    return r === STATUS_PEMINJAMAN.TERLAMBAT || r === 'terlambat';
  }
  if (f === STATUS_PEMINJAMAN.DIKEMBALIKAN || f === 'selesai' || f === 'dikembalikan') {
    return r === STATUS_PEMINJAMAN.DIKEMBALIKAN || r === 'selesai' || r === 'dikembalikan';
  }
  return r === f || r.replaceAll('_', ' ') === f.replaceAll('_', ' ');
}

function matchOki(row, filterOki) {
  if (!filterOki || filterOki === 'all') return true;
  const org = organizationName(row);
  return org.toLowerCase() === filterOki.toLowerCase();
}

function visibleRows() {
  const q = searchTerm.trim().toLowerCase();
  return rows.filter((row) => {
    const mOki = matchOki(row, okiFilter);
    const mTanggal = matchTanggalPeminjaman(row, tanggalFilter);
    const mStatus = matchStatusPengembalian(row.status, statusFilter);
    const mQuery = !q || `${personName(row)} ${organizationName(row)} ${itemName(row)}`.toLowerCase().includes(q);
    return mOki && mTanggal && mStatus && mQuery;
  });
}

function renderTableRows() {
  const filtered = visibleRows();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  if (!pageRows.length) return `<tr><td colspan="8" class="px-6 py-16 text-center text-sm text-slate-400">${renderIcon('Search', 'mr-2 inline h-4 w-4')}Tidak ada data pengembalian yang cocok.</td></tr>`;
  return pageRows.map((row, index) => {
    const id = String(row.id || row.idPeminjaman);
    const name = personName(row);
    const org = organizationName(row);
    const status = statusInfo(row.status);
    const pending = row.status === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || String(row.status).toLowerCase() === 'menunggu_pengembalian';
    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${start + index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">${escapeHtml(initials(name))}</span><span class="min-w-0"><span class="block truncate text-sm font-medium text-slate-800">${escapeHtml(name)}</span><span class="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><span class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-100 text-[8px] font-bold text-amber-800">${escapeHtml(org.slice(0,1).toUpperCase())}</span>${escapeHtml(org)}</span></span></div></td>
      <td class="min-w-[140px] px-4 py-4 text-sm text-slate-600">${escapeHtml(itemName(row))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-sm text-slate-600">${escapeHtml(dateLabel(row.startDate || row.mulai || row.tanggalMulai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-sm text-slate-600">${escapeHtml(dateLabel(row.endDate || row.selesai || row.tanggalSelesai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-sm text-slate-600">${escapeHtml(dateLabel(row.tanggalPengembalian))}</td>
      <td class="px-4 py-4 text-center"><span class="inline-flex whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold ${status.cls}">${escapeHtml(status.label)}</span></td>
      <td class="whitespace-nowrap px-4 py-4"><div class="flex items-center justify-center gap-1.5"><button type="button" data-action="detail" data-id="${escapeHtml(id)}" title="Lihat detail" aria-label="Lihat detail" class="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">${renderIcon('Info', 'h-4 w-4')}</button>${pending ? `<button type="button" data-action="confirm" data-id="${escapeHtml(id)}" title="Konfirmasi pengembalian" aria-label="Konfirmasi pengembalian" class="rounded-full p-1.5 text-green-600 hover:bg-green-50">${renderIcon('CircleCheck', 'h-4 w-4')}</button><button type="button" data-action="late" data-id="${escapeHtml(id)}" title="Tandai terlambat" aria-label="Tandai terlambat" class="rounded-full p-1.5 text-red-600 hover:bg-red-50">${renderIcon('CircleX', 'h-4 w-4')}</button>` : ''}</div></td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const pages = Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE));
  return `<div class="flex items-center justify-end gap-2"><button type="button" data-action="prev" aria-label="Halaman sebelumnya" ${currentPage <= 1 ? 'disabled' : ''} class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-40">${renderIcon('ChevronLeft', 'h-4 w-4')}</button><span class="flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">${currentPage}</span><button type="button" data-action="next" aria-label="Halaman berikutnya" ${currentPage >= pages ? 'disabled' : ''} class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-40">${renderIcon('ChevronRight', 'h-4 w-4')}</button></div>`;
}

function renderModal() {
  if (!modalRow) return '';
  const row = modalRow;
  const details = [
    ['Nama peminjam', personName(row)],
    ['Organisasi', organizationName(row)],
    ['Barang dipinjam', itemName(row)],
    ['Tanggal mulai', dateLabel(row.startDate || row.mulai)],
    ['Tanggal selesai', dateLabel(row.endDate || row.selesai)],
    ['Tanggal kembali', dateLabel(row.tanggalPengembalian)],
    ['Jumlah unit', row.jumlahPinjam ?? 1],
    ['Kondisi sebelum', row.kondisiSebelum || '—'],
    ['Kondisi sesudah', row.kondisiSesudah || '—'],
    ['Status', statusInfo(row.status).label],
  ];
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop><section role="dialog" aria-modal="true" aria-labelledby="return-detail-title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div class="mb-5 flex items-start justify-between"><div><p class="text-xs font-medium uppercase tracking-wide text-slate-400">Detail transaksi</p><h2 id="return-detail-title" class="mt-1 text-xl font-semibold text-slate-900">Detail Pengembalian</h2></div><button type="button" data-action="close-modal" aria-label="Tutup detail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100">${renderIcon('X', 'h-5 w-5')}</button></div><dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">${details.map(([label, value]) => `<div><dt class="text-xs text-slate-400">${escapeHtml(label)}</dt><dd class="mt-1 text-sm font-medium text-slate-800">${escapeHtml(value)}</dd></div>`).join('')}</dl><div class="mt-6 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Tutup</button></div></section></div>`;
}

async function loadRows() {
  const all = await getPeminjaman();
  return all.filter((row) => [
    STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
    STATUS_PEMINJAMAN.DIKEMBALIKAN,
    'menunggu_pengembalian',
    'terlambat',
    'selesai',
    'dikembalikan',
  ].includes(row.status));
}

function renderContent() {
  const count = visibleRows().length;
  const nAktif = countActiveFilters();
  return `<section class="w-full px-5 pb-8 pt-6 sm:px-6 lg:px-7">
    <div class="mb-6">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Kelola Pengembalian</h1>
      <p class="mt-1 text-sm text-slate-400">Pantau dan kelola proses pengembalian barang serta kondisi barang yang dikembalikan.</p>
    </div>
    <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-5">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-base font-semibold text-slate-900">List Pengembalian</h2>
        <div class="flex items-center gap-2.5">
          ${renderSearchInput({ id: 'search-pengembalian', value: searchTerm, placeholder: 'Cari nama peminjam', ariaLabel: 'Cari nama peminjam', className: 'w-full sm:w-64' })}
          ${renderFilterButton({
            id: 'btn-filter-pengembalian',
            action: 'open-filter-dialog',
            title: 'Filter pengembalian',
            ariaLabel: 'Filter pengembalian',
            countActive: nAktif,
          })}
        </div>
      </div>
      ${toastMessage ? `<div role="status" class="mb-3 rounded-lg px-4 py-2 text-sm ${toastType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">${escapeHtml(toastMessage)}</div>` : ''}
      <div class="w-full overflow-x-auto"><table class="w-full min-w-[790px] border-collapse text-left"><thead><tr class="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400"><th class="px-4 py-3.5 text-center">No</th><th class="px-4 py-3.5">Nama Peminjam</th><th class="px-4 py-3.5">Barang Dipinjam</th><th class="px-4 py-3.5 text-center">Tanggal Mulai</th><th class="px-4 py-3.5 text-center">Tanggal Selesai</th><th class="px-4 py-3.5 text-center">Tanggal Kembali</th><th class="px-4 py-3.5 text-center">Status</th><th class="px-4 py-3.5 text-center">Aksi</th></tr></thead><tbody>${renderTableRows()}</tbody></table></div>
      <div class="mt-5 flex items-center justify-between gap-3"><p class="text-xs text-slate-500">Menampilkan ${count ? Math.min((currentPage - 1) * PAGE_SIZE + 1, count) : 0}–${Math.min(currentPage * PAGE_SIZE, count)} dari ${count} pengajuan</p>${renderPagination()}</div>
    </div>
  </section>
  ${renderModal()}
  ${renderFilterModal({
    id: 'dialog-filter-pengembalian',
    title: 'Filter Kelola Pengembalian',
    countActive: nAktif,
    closeAction: 'close-filter-dialog',
    resetAction: 'reset-filter-dialog',
    applyAction: 'apply-filter-dialog',
    formId: 'form-filter-pengembalian',
    bodyContent: `
      <div class="space-y-4">
        <!-- OKI Peminjam -->
        <div class="space-y-1.5">
          <label for="filter-pengembalian-oki" class="text-sm font-medium text-foreground">OKI Peminjam</label>
          <div class="relative">
            <select id="filter-pengembalian-oki" name="oki" class="${selectClass('appearance-none pr-10 cursor-pointer')}">
              <option value="all" ${okiFilter === 'all' ? 'selected' : ''}>Pilih OKI</option>
              ${OKI_LIST.map((oki) => `<option value="${escapeHtml(oki)}" ${okiFilter === oki ? 'selected' : ''}>${escapeHtml(oki)}</option>`).join('')}
            </select>
            <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              ${renderIcon('ChevronDown', 'h-4 w-4')}
            </span>
          </div>
        </div>

        <!-- Tanggal Peminjaman -->
        <div class="space-y-1.5">
          <label for="filter-pengembalian-tanggal" class="text-sm font-medium text-foreground">Tanggal Peminjaman</label>
          <div class="relative">
            <input
              type="date"
              id="filter-pengembalian-tanggal"
              name="tanggal"
              value="${escapeHtml(tanggalFilter)}"
              placeholder="Pilih Tanggal"
              class="${inputClass('appearance-none pr-10 cursor-pointer text-slate-700 w-full')}"
            />
            <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              ${renderIcon('CalendarDays', 'h-4 w-4')}
            </span>
          </div>
        </div>

        <!-- Status -->
        <div class="space-y-1.5">
          <label for="filter-pengembalian-status" class="text-sm font-medium text-foreground">Status</label>
          <div class="relative">
            <select id="filter-pengembalian-status" name="status" class="${selectClass('appearance-none pr-10 cursor-pointer')}">
              <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Pilih status</option>
              <option value="${STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN}" ${statusFilter === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ? 'selected' : ''}>Menunggu Konfirmasi</option>
              <option value="${STATUS_PEMINJAMAN.TERLAMBAT}" ${statusFilter === STATUS_PEMINJAMAN.TERLAMBAT ? 'selected' : ''}>Terlambat</option>
              <option value="${STATUS_PEMINJAMAN.DIKEMBALIKAN}" ${statusFilter === STATUS_PEMINJAMAN.DIKEMBALIKAN ? 'selected' : ''}>Dikembalikan</option>
            </select>
            <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
              ${renderIcon('ChevronDown', 'h-4 w-4')}
            </span>
          </div>
        </div>
      </div>
    `,
  })}`;
}

function refresh() { if (rootElement) rootElement.innerHTML = renderContent(); }
export function render() { return renderContent(); }

export async function mount(root) {
  rootElement = root;
  searchTerm = '';
  currentPage = 1;
  toastMessage = '';
  modalRow = null;
  okiFilter = 'all';
  tanggalFilter = '';
  statusFilter = 'all';
  rows = await loadRows();
  rootElement.innerHTML = renderContent();

  clickHandler = async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      if (event.target.closest('[data-modal-backdrop]') && event.target === event.target.closest('[data-modal-backdrop]')) {
        modalRow = null;
        refresh();
      }
      return;
    }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'close-modal') { modalRow = null; refresh(); return; }
    if (action === 'detail') { modalRow = rows.find((row) => String(row.id || row.idPeminjaman) === String(id)) || null; refresh(); return; }
    if (action === 'prev') { currentPage = Math.max(1, currentPage - 1); refresh(); return; }
    if (action === 'next') { currentPage = Math.min(Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE)), currentPage + 1); refresh(); return; }
    if (action === 'open-filter-dialog') {
      rootElement.querySelector('#dialog-filter-pengembalian')?.showModal();
      return;
    }
    if (action === 'close-filter-dialog') {
      rootElement.querySelector('#dialog-filter-pengembalian')?.close();
      return;
    }
    if (action === 'reset-filter-dialog') {
      okiFilter = 'all';
      tanggalFilter = '';
      statusFilter = 'all';
      currentPage = 1;
      rootElement.querySelector('#dialog-filter-pengembalian')?.close();
      refresh();
      return;
    }
    if (action === 'apply-filter-dialog') {
      okiFilter = rootElement.querySelector('#filter-pengembalian-oki')?.value || 'all';
      tanggalFilter = rootElement.querySelector('#filter-pengembalian-tanggal')?.value || '';
      statusFilter = rootElement.querySelector('#filter-pengembalian-status')?.value || 'all';
      currentPage = 1;
      rootElement.querySelector('#dialog-filter-pengembalian')?.close();
      refresh();
      return;
    }
    if (action === 'confirm' || action === 'late') {
      try {
        await updateMockPengembalianStatus(id, action === 'confirm' ? STATUS_PEMINJAMAN.DIKEMBALIKAN : STATUS_PEMINJAMAN.TERLAMBAT);
        rows = await loadRows();
        toastType = 'success';
        toastMessage = action === 'confirm' ? 'Pengembalian berhasil dikonfirmasi.' : 'Status pengembalian ditandai terlambat.';
      } catch (error) {
        toastType = 'error';
        toastMessage = error?.message || 'Status pengembalian gagal diperbarui.';
      }
      refresh();
    }
  };

  inputHandler = (event) => {
    if (event.target.id !== 'search-pengembalian') return;
    searchTerm = event.target.value;
    currentPage = 1;
    const filtered = visibleRows();
    const tbody = rootElement.querySelector('tbody');
    if (tbody) tbody.innerHTML = renderTableRows();
    const footer = rootElement.querySelector('.mt-5.flex.items-center.justify-between');
    if (footer) footer.innerHTML = `<p class="text-xs text-slate-500">Menampilkan ${filtered.length ? 1 : 0}–${Math.min(PAGE_SIZE, filtered.length)} dari ${filtered.length} pengajuan</p>${renderPagination()}`;
  };

  rootElement.addEventListener('click', clickHandler);
  rootElement.addEventListener('input', inputHandler);
}

export function unmount() {
  if (rootElement && clickHandler) rootElement.removeEventListener('click', clickHandler);
  if (rootElement && inputHandler) rootElement.removeEventListener('input', inputHandler);
  rootElement = null;
  clickHandler = null;
  inputHandler = null;
  rows = [];
  modalRow = null;
  okiFilter = 'all';
  tanggalFilter = '';
  statusFilter = 'all';
}
