import { getPeminjaman } from '../services/peminjaman.js';
import { ajukanPengembalian } from '../services/pengembalian.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderStatusChip } from '../ui/status-chip.js';
import { renderModal as renderGlobalModal } from '../ui/modal.js';

const TABS = [
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'dikembalikan', label: 'Dikembalikan' },
  { key: 'terlambat', label: 'Terlambat' },
  { key: 'ditolak', label: 'Ditolak' },
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
  { id: 'ret-7', namaBarang: 'Kabel HDMI', organisasi: 'HME', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-17', tanggalDikembalikan: null, jumlahUnit: 1, status: 'ditolak', diprosesOleh: 'Hanin Maizah', alasanPenolakan: 'Jumlah barang yang dikembalikan kurang lengkap', keperluan: 'Seminar BEM' },
];

let activeTab = 'menunggu';
let searchTerm = '';
let currentPage = 1;
const PAGE_SIZE = 5;
let rootElement = null;
let onClickHandler = null;
let onInputHandler = null;
let actionDialog = null;

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
      class="shrink-0 cursor-pointer select-none rounded-lg px-4 py-2 text-[11px] font-medium transition ${selected ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">${tab.label}</button>`;
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
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-500">${start + index + 1}</td>
      <td class="min-w-[180px] px-4 py-3">
        <div class="max-w-[220px] truncate text-xs font-medium text-slate-500" title="${escapeHtml(row.namaBarang)}">${escapeHtml(row.namaBarang)}</div>
        <div class="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-700">
          <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-700">${escapeHtml(row.organisasi.slice(0, 1))}</span>
          <span>${escapeHtml(row.organisasi)}</span>
        </div>
      </td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-500">${escapeHtml(dateLabel(row.tanggalMulai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-500">${escapeHtml(dateLabel(row.tanggalSelesai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-500">${escapeHtml(dateLabel(row.tanggalDikembalikan))}</td>
      <td class="px-4 py-4 text-center text-xs text-slate-600">${row.jumlahUnit}</td>
      <td class="px-4 py-4 text-center">${renderStatusChip({ status: row.status })}</td>
      <td class="px-4 py-4 text-center">${row.status === 'ditolak' ? `<button type="button" data-return-again="${escapeHtml(row.id)}" aria-label="Ajukan kembali pengembalian" title="Ajukan kembali pengembalian" class="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-50">${renderIcon('CircleCheck', 'h-[18px] w-[18px]')}</button>` : ''}<button type="button" data-detail="${escapeHtml(row.id)}" aria-label="Lihat detail ${escapeHtml(row.namaBarang)}" title="Lihat detail" class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700">${renderIcon('Info', 'h-[17px] w-[17px]')}</button></td>
    </tr>`).join('');
}

import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

function renderPagination() {
  const count = getFilteredRows().length;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.min(currentPage, pages);
  const from = count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, count);
  return `<div class="mt-6 flex items-center justify-between gap-3">
    <p class="text-xs text-slate-400">Menampilkan ${from}–${to} dari ${count} pengajuan</p>
    ${renderSharedPagination({
      currentPage: page,
      totalPages: pages,
      attrType: 'data-page',
      showNumbers: false,
    })}
  </div>`;
}

function renderDetail(row) {
  const isTerlambat = row.status === 'terlambat' || row.status === STATUS_PEMINJAMAN.TERLAMBAT;
  const isDikembalikan = row.status === 'dikembalikan' || row.status === STATUS_PEMINJAMAN.DIKEMBALIKAN || row.status === 'selesai';
  const isDitolak = row.status === 'ditolak' || row.status === STATUS_PEMINJAMAN.DITOLAK;
  const daysLate = row.waktuTerlambat || 3;
  const dateColumns = [
    { label: 'Tanggal Mulai', value: dateLabel(row.tanggalMulai) },
    { label: 'Tanggal Pengambilan', value: row.tanggalPengambilan ? dateLabel(row.tanggalPengambilan) : '–' },
    { label: 'Tanggal Selesai', value: dateLabel(row.tanggalSelesai) },
    { label: 'Tanggal Pengembalian', value: row.tanggalDikembalikan ? dateLabel(row.tanggalDikembalikan) : '–' },
  ];
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-overlay>
    <section role="dialog" aria-modal="true" aria-labelledby="return-detail-title" class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <div class="flex items-start justify-between gap-4">
        <h2 id="return-detail-title" class="text-2xl font-semibold tracking-tight text-slate-900">${isDitolak ? 'Detail Penolakan' : 'Detail Pengembalian'}</h2>
        <button type="button" data-close-detail aria-label="Tutup detail" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${renderIcon('X', 'h-5 w-5')}</button>
      </div>

      <div class="mt-6 space-y-6 text-sm">
        <div class="flex items-center justify-between gap-6">
          <p class="text-base font-semibold text-slate-900">Barang Dipinjam</p>
          <div class="text-right">
            <p class="text-base font-medium text-slate-800">${escapeHtml(row.namaBarang)}</p>
            <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600"><span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white">${escapeHtml(String(row.organisasi || 'O').slice(0, 1).toUpperCase())}</span>${escapeHtml(row.organisasi)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Jumlah Unit</p><p class="text-base font-medium text-slate-800">${escapeHtml(row.jumlahUnit || 1)}</p></div>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-slate-300">
          ${dateColumns.map((date, index) => `<div class="text-center ${index === 0 ? 'sm:px-2' : 'sm:px-4'}"><p class="text-sm font-semibold text-slate-900 sm:text-base">${date.label}</p><p class="mt-3 text-sm font-medium text-slate-800 sm:text-base">${escapeHtml(date.value)}</p></div>`).join('')}
        </div>

        <div class="flex items-center justify-between gap-6">
          <p class="text-base font-semibold text-slate-900">Status</p>
          <div class="flex items-center gap-2">
            ${isTerlambat ? `
              <div class="relative group inline-flex items-center">
                <span class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-800" aria-label="Informasi keterlambatan">
                  ${renderIcon('AlertCircle', 'h-6 w-6')}
                </span>
                <div class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-xl border border-slate-200">
                  Waktu Terlambat: ${daysLate} Hari
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                </div>
              </div>
            ` : ''}
            ${renderStatusChip({ status: row.status })}
          </div>
        </div>

        ${(isDikembalikan || isTerlambat) && row.diprosesOleh ? `<div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Diproses Oleh</p><p class="text-base font-medium text-slate-800">${escapeHtml(row.diprosesOleh)}</p></div>` : ''}
        ${isDitolak ? `<div><p class="mb-2 text-base font-semibold text-slate-900">Alasan Penolakan</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-700">${escapeHtml(row.alasanPenolakan || 'Pengembalian ditolak oleh pengelola.')}</div></div>` : ''}
        <div><p class="mb-2 text-base font-semibold text-slate-900">Keperluan Peminjaman Barang</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-800">${escapeHtml(row.keperluan || 'Seminar BEM')}</div></div>
      </div>

      <div class="mt-6 flex justify-end">
        <button type="button" data-close-detail data-autofocus class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110">Tutup</button>
      </div>
    </section>
  </div>`;
}

function renderActionDialog() {
  if (!actionDialog) return '';
  if (actionDialog.type === 'success') {
    return renderGlobalModal({
      variant: 'success',
      title: 'Pengembalian Berhasil Dikirim Kembali!',
      description: 'Anda telah berhasil mengirimkan kembali pengajuan pengembalian.',
      primaryAction: { label: 'Kembali', action: 'close-return-dialog', className: 'w-full rounded-xl bg-primary text-white transition-colors hover:brightness-110' },
    });
  }
  return renderGlobalModal({
    variant: 'send',
    title: 'Ajukan Kembali Pengembalian?',
    description: 'Periksa kembali data pengajuan yang akan anda kirim',
    actions: [
      { label: 'Kembali', action: 'close-return-dialog', variant: 'outline', className: 'w-1/2 rounded-xl' },
      { label: 'Kirim', action: 'submit-return-again', variant: 'default', className: 'w-1/2 rounded-xl bg-primary text-white transition-colors hover:brightness-110' },
    ],
  });
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

function refreshPage() {
  if (rootElement) rootElement.innerHTML = render();
}

export function render() {
  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-9">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Pengembalian</h1>
      <p class="mt-1 text-sm text-slate-400">Pantau status pengembalian dan riwayat pengembalian barangmu.</p>
    </div>

    <div class="mb-3 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-white p-1.5" data-tabs role="tablist" aria-label="Filter status pengembalian">${renderTabs()}</div>

    <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 data-list-title class="text-lg font-semibold text-slate-900">List Barang ${TABS.find((tab) => tab.key === activeTab)?.label || 'Pengembalian'}</h2>
        ${renderSearchInput({ dataSearch: true, value: searchTerm, placeholder: 'Cari barang inventaris', ariaLabel: 'Cari barang inventaris', className: 'w-full sm:w-[260px]' })}
      </div>
      <div class="w-full overflow-x-auto">
        <table class="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr class="border-b border-zinc-100 text-sm leading-[140%] text-slate-400">
              <th class="px-4 py-4 text-center font-semibold">No</th>
              <th class="px-4 py-4 font-semibold">Nama Barang</th>
              <th class="px-4 py-4 text-center font-semibold">Tanggal Mulai</th>
              <th class="px-4 py-4 text-center font-semibold">Tanggal Selesai</th>
              <th class="px-4 py-4 text-center font-semibold">Tanggal Dikembalikan</th>
              <th class="px-4 py-4 text-center font-semibold">Jumlah Unit</th>
              <th class="px-4 py-4 text-center font-semibold">Status</th>
              <th class="px-4 py-4 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody data-table-body class="divide-y divide-zinc-50">${renderRows()}</tbody>
        </table>
      </div>
      <div data-pagination>${renderPagination()}</div>
    </div>
    <div data-detail-modal></div>${renderActionDialog()}
  </section>`;
}

export async function mount(root, ctx = {}) {
  rootElement = root;
  activeTab = 'menunggu';
  searchTerm = '';
  currentPage = 1;
  actionDialog = null;
  try {
    const all = await getPeminjaman();
    const mapped = all.filter((p) => {
      const s = String(p.status).toLowerCase();
      return (
        s === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ||
        s === STATUS_PEMINJAMAN.DIKEMBALIKAN ||
        s === STATUS_PEMINJAMAN.TERLAMBAT ||
        s === STATUS_PEMINJAMAN.DITOLAK ||
        s === 'menunggu_pengembalian' ||
        s === 'menunggu' ||
        s === 'selesai' ||
        s === 'dikembalikan' ||
        s === 'terlambat' ||
        s === 'ditolak'
      );
    }).map((p) => {
      const s = String(p.status).toLowerCase();
      let tabKey = 'menunggu';
      if (s === STATUS_PEMINJAMAN.DIKEMBALIKAN || s === 'selesai' || s === 'dikembalikan') tabKey = 'dikembalikan';
      if (s === STATUS_PEMINJAMAN.TERLAMBAT || s === 'terlambat') tabKey = 'terlambat';
      if (s === STATUS_PEMINJAMAN.DITOLAK || s === 'ditolak') tabKey = 'ditolak';
      return {
        id: String(p.id || p.idPeminjaman),
        namaBarang: p.inventaris?.namaBarang || p.barang?.namaBarang || p.namaBarang,
        organisasi: p.inventaris?.namaOrganisasi || p.barang?.namaOrganisasi || p.namaOrganisasi || 'Organisasi',
        tanggalMulai: p.startDate || p.mulai || p.tanggalMulai,
        tanggalSelesai: p.endDate || p.selesai || p.tanggalSelesai,
        tanggalDikembalikan: p.tanggalPengembalian,
        tanggalPengambilan: p.tanggalPengambilan,
        jumlahUnit: p.jumlahPinjam ?? p.jumlahUnit ?? 1,
        status: tabKey,
        keperluan: p.keperluan,
        diprosesOleh: p.diprosesOleh,
        alasanPenolakan: p.alasanPenolakan,
        kondisiPengembalian: p.kondisiPengembalian,
        fotoKondisi: p.fotoKondisi,
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
  onClickHandler = async (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) { activeTab = tab.dataset.tab; currentPage = 1; refreshTable(); return; }
    const returnAgain = event.target.closest('[data-return-again]');
    if (returnAgain) {
      actionDialog = { type: 'confirm', id: returnAgain.dataset.returnAgain };
      refreshPage();
      return;
    }
    const modalAction = event.target.closest('[data-action]');
    if (modalAction?.dataset.action === 'close-return-dialog') {
      actionDialog = null;
      refreshPage();
      return;
    }
    if (modalAction?.dataset.action === 'submit-return-again') {
      const target = DEMO_ROWS.find((row) => row.id === actionDialog?.id);
      if (!target) return;
      try {
        await ajukanPengembalian(target.id);
        target.status = 'menunggu';
        target.tanggalDikembalikan = null;
        actionDialog = { type: 'success' };
      } catch {
        actionDialog = null;
      }
      refreshPage();
      return;
    }
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
