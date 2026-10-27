/**
 * Halaman Pengajuan Saya > Peminjaman.
 * Menampilkan transaksi peminjaman milik pengguna yang sedang login.
 * Sumber data saat ini masih menggunakan service mock frontend.
 */
import { getPeminjaman } from '../services/peminjaman.js';
import { ajukanPengembalian } from '../services/pengembalian.js';
import { getRowActions } from '../lib/peminjaman-aksi.js';
import { STATUS_PEMINJAMAN, LABEL_STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderStatusChip } from '../ui/status-chip.js';
import { renderModal } from '../ui/modal.js';

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
let onKeydownHandler = null;
// null | { type: 'detail', row } | { type: 'konfirmasi', row, submitting, error } | { type: 'sukses' }
let dialog = null;
let lastTrigger = null;

// Warna titik organisasi (nama kelas harus utuh agar ikut di-build Tailwind).
const ORG_DOT = {
  BEM: 'bg-blue-700',
  HMTI: 'bg-amber-400',
  HME: 'bg-rose-700',
  HIMANIA: 'bg-blue-600',
  RISPOL: 'bg-emerald-600',
  HMS: 'bg-slate-800',
  THEATRISIC: 'bg-red-700',
  PP: 'bg-teal-600',
};

function orgDotClass(org) {
  return ORG_DOT[String(org || '').trim().toUpperCase()] || 'bg-slate-400';
}

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
    dipinjam: 'bg-purple-50 text-purple-700',
    ditolak: 'bg-rose-300 text-rose-950',
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

function renderActions(row, id, name) {
  return getRowActions(row.status).map((action) => {
    if (action === 'kembali') {
      return `<button type="button" data-return="${escapeHtml(id)}" aria-label="Ajukan pengembalian ${escapeHtml(name)}" title="Ajukan pengembalian"
        class="inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-50">
        ${renderIcon('CircleCheck', 'h-[18px] w-[18px]')}
      </button>`;
    }
    return `<button type="button" data-detail="${escapeHtml(id)}" aria-label="Lihat detail ${escapeHtml(name)}" title="Lihat detail"
      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700">
      ${renderIcon('Info', 'h-[17px] w-[17px]')}
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
            <span class="inline-block h-3 w-3 shrink-0 rounded-full ${orgDotClass(org)}" aria-hidden="true"></span>
            <span>${escapeHtml(org)}</span>
          </div>
        </td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateOnly(submitted))}</td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateOnly(startDate))}</td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-[11px] text-slate-500">${escapeHtml(dateOnly(endDate))}</td>
        <td class="px-4 py-4 text-center text-[11px] text-slate-600">${escapeHtml(qty)}</td>
        <td class="px-4 py-4 text-center">${renderStatusChip({ status: row.status })}</td>
        <td class="px-4 py-4 text-center">
          <div class="inline-flex items-center justify-center gap-1">${renderActions(row, id, name)}</div>
        </td>
      </tr>`;
  }).join('');
}

import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

function renderPagination() {
  const count = getFilteredRows().length;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return `
    <div class="flex items-center justify-end border-t border-zinc-50 px-5 py-3">
      ${renderSharedPagination({
        currentPage,
        totalPages: pages,
        attrType: 'data-page',
        showNumbers: false,
      })}
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
  const ditolak = getTabForStatus(row.status) === 'ditolak' || String(row.status).toLowerCase() === 'ditolak';
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="detail-title" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <h2 id="detail-title" class="text-xl font-bold text-slate-900">Detail Peminjaman</h2>
          <button type="button" data-close-detail aria-label="Tutup detail" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">${renderIcon('X', 'h-5 w-5')}</button>
        </div>
        <div class="mt-6 space-y-5">
          <div>
            <p class="text-xs font-semibold text-slate-900">Nama Barang</p>
            <div class="mt-2 flex items-center justify-between">
              <span class="text-sm font-normal text-slate-800">${escapeHtml(name)}</span>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span class="inline-block h-3 w-3 rounded-full ${orgDotClass(org)}" aria-hidden="true"></span>${escapeHtml(org)}
              </span>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-zinc-200">
            <div class="sm:pr-4">
              <p class="text-xs font-semibold text-slate-900">Tanggal Pengajuan</p>
              <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateOnly(row.tanggalPengajuan || row.createdAt))}</p>
            </div>
            <div class="sm:px-4">
              <p class="text-xs font-semibold text-slate-900">Tanggal Mulai</p>
              <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateOnly(row.startDate || row.mulai || row.tanggalMulai))}</p>
            </div>
            <div class="sm:pl-4">
              <p class="text-xs font-semibold text-slate-900">Tanggal Selesai</p>
              <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(dateOnly(row.endDate || row.selesai || row.tanggalSelesai))}</p>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-900">Jumlah</p>
            <p class="mt-2 text-xs sm:text-sm text-slate-700">${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-900">Keperluan Peminjaman Barang</p>
            <div class="mt-2 rounded-2xl border border-zinc-200/80 p-3.5 text-xs sm:text-sm text-slate-700 bg-white">
              ${escapeHtml(row.keperluan || '—')}
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-900">Status</p>
            <div class="mt-2">
              ${renderStatusChip({ status: row.status })}
            </div>
          </div>
          ${ditolak ? `
            <div>
              <p class="text-xs font-semibold text-slate-900">Alasan Ditolak</p>
              <div class="mt-2 rounded-2xl border border-zinc-200/80 p-3.5 text-xs sm:text-sm text-slate-700 bg-white">
                ${escapeHtml(row.alasanPenolakan || 'Peminjaman tidak dapat diproses karena alasan operasional')}
              </div>
            </div>` : ''}
        </div>
        <div class="mt-6 flex justify-end">
          <button type="button" data-close-detail data-autofocus class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            Tutup
          </button>
        </div>
      </section>
    </div>`;
}

function renderConfirmReturn(state) {
  return renderModal({
    variant: 'send',
    title: 'Ajukan Pengembalian?',
    description: 'Periksa kembali data pengajuan yang akan anda kirim',
    actions: [
      {
        label: 'Kembali',
        action: 'cancel-return',
        variant: 'outline',
        className: 'flex-1 rounded-xl',
      },
      {
        label: state.submitting ? 'Mengirim...' : 'Kirim',
        action: 'confirm-return',
        variant: 'default',
        className: 'flex-1 rounded-xl bg-primary text-white hover:bg-primary/90',
        disabled: state.submitting,
      },
    ],
    content: state.error ? `<p role="alert" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">${escapeHtml(state.error)}</p>` : '',
  });
}

function renderSuccessReturn() {
  return renderModal({
    variant: 'success',
    title: 'Pengembalian Berhasil Dikirim!',
    description: 'Anda telah berhasil mengirimkan pengajuan pengembalian',
    actions: [
      {
        label: 'Kembali',
        action: 'close-success',
        variant: 'default',
        className: 'w-full rounded-xl bg-primary text-white hover:bg-primary/90',
      },
    ],
  });
}

function renderDialog() {
  if (!dialog) return '';
  if (dialog.type === 'detail') return renderDetail(dialog.row);
  if (dialog.type === 'konfirmasi') return renderConfirmReturn(dialog);
  if (dialog.type === 'sukses') return renderSuccessReturn();
  return '';
}

function showDialog(next, trigger = null) {
  if (trigger) lastTrigger = trigger;
  dialog = next;
  const holder = rootElement?.querySelector('[data-detail-modal]');
  if (!holder) return;
  holder.innerHTML = renderDialog();
  holder.querySelector('[data-autofocus]')?.focus();
}

function closeDialog() {
  const trigger = lastTrigger;
  lastTrigger = null;
  showDialog(null);
  if (trigger && rootElement?.contains(trigger)) trigger.focus();
}

async function submitReturn() {
  if (dialog?.type !== 'konfirmasi' || dialog.submitting) return;
  const { row } = dialog;
  showDialog({ ...dialog, submitting: true, error: '' });
  try {
    const updated = await ajukanPengembalian(row.id || row.idPeminjaman);
    row.status = updated?.status ?? row.status;
    lastTrigger = null;
    renderTableContent();
    showDialog({ type: 'sukses' });
  } catch (error) {
    showDialog({ type: 'konfirmasi', row, submitting: false, error: error?.message || 'Pengajuan pengembalian gagal dikirim.' });
  }
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
          ${renderSearchInput({
            dataSearch: true,
            value: searchTerm,
            placeholder: 'Cari barang inventaris',
            ariaLabel: 'Cari barang inventaris',
            className: 'w-full sm:w-64',
          })}
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
  dialog = null;
  lastTrigger = null;
  try {
    const all = await getPeminjaman();
    const user = ctx.user || null;
    const nim = user?.nim || user?.pengguna?.nim || null;
    pageRows = all.filter((row) => {
      if (!nim) return true;
      const ownerNim = row.pengguna?.nim || row.peminjam?.nim || row.nim || null;
      return !ownerNim || String(ownerNim) === String(nim);
    });
    if (!pageRows.length && all.length) {
      pageRows = all;
    }
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
    const returnButton = event.target.closest('[data-return]');
    if (returnButton) {
      const row = pageRows.find((item) => String(item.id || item.idPeminjaman) === returnButton.dataset.return);
      if (row) showDialog({ type: 'konfirmasi', row, submitting: false, error: '' }, returnButton);
      return;
    }
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton) {
      const row = pageRows.find((item) => String(item.id || item.idPeminjaman) === detailButton.dataset.detail);
      if (row) showDialog({ type: 'detail', row }, detailButton);
      return;
    }
    const actionBtn = event.target.closest('[data-action]');
    const action = actionBtn?.dataset?.action;
    if (action === 'confirm-return' || event.target.closest('[data-confirm-return]')) {
      submitReturn();
      return;
    }
    if (
      action === 'cancel-return' ||
      action === 'close-detail' ||
      action === 'close-success' ||
      action === 'close-modal' ||
      event.target.closest('[data-cancel-return]') ||
      event.target.closest('[data-close-detail]') ||
      event.target.closest('[data-close-success]')
    ) {
      closeDialog();
      return;
    }
    if (
      (event.target.matches('[data-modal-overlay]') || event.target.matches('[data-modal-backdrop]')) &&
      !(dialog?.type === 'konfirmasi' && dialog.submitting)
    ) {
      closeDialog();
      return;
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
  onKeydownHandler = (event) => {
    if (event.key !== 'Escape' || !dialog) return;
    if (dialog.type === 'konfirmasi' && dialog.submitting) return;
    closeDialog();
  };
  root.addEventListener('click', onClickHandler);
  root.addEventListener('input', onInputHandler);
  document.addEventListener('keydown', onKeydownHandler);
}

export function unmount() {
  if (rootElement && onClickHandler) rootElement.removeEventListener('click', onClickHandler);
  if (rootElement && onInputHandler) rootElement.removeEventListener('input', onInputHandler);
  if (onKeydownHandler) document.removeEventListener('keydown', onKeydownHandler);
  rootElement = null;
  onClickHandler = null;
  onInputHandler = null;
  onKeydownHandler = null;
  dialog = null;
  lastTrigger = null;
  pageRows = [];
}
