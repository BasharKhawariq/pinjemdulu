/** Halaman Pengelolaan > Kelola Pengembalian. */
import { getKelolaPengembalian, updateMockPengembalianStatus } from '../services/pengembalian.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderFilterButton, renderFilterModal } from '../ui/filter.js';
import { renderPagination as renderSharedPagination } from '../ui/pagination.js';
import { statusChipClass, renderStatusChip } from '../ui/status-chip.js';
import { selectClass, inputClass } from '../ui/classes.js';
import { renderModal as renderGlobalModal } from '../ui/modal.js';
import { compressImageToDataUrl } from './kelola-inventaris-form.js';
import { validateFotoFile } from '../lib/inventaris-form.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';
import { renderEmptyState } from '../ui/empty-state.js';

function renderReturnStatusChip(status) {
  const isRejected = String(status || '').toLowerCase().trim() === 'ditolak';
  return renderStatusChip({
    status,
    className: isRejected ? 'status-chip-return-rejected' : '',
  });
}

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
let changeHandler = null;
let pointerOverHandler = null;
let pointerOutHandler = null;
let tooltipScrollHandler = null;
let toastMessage = '';
let toastType = 'success';
let lateTooltipVisible = false;
let lateTooltipHovered = false;
let lateTooltipClickTimeout = null;
let modalRow = null;
let activeDialog = null; // 'detail' | 'confirm-approve' | 'form-approve' | 'confirm-submit-form' | 'confirm-cancel-form' | 'success-approve' | 'confirm-reject' | 'form-reject' | 'success-reject'
let rejectionValidationCount = 0;
let returnFormValidationCount = 0;
let formData = {
  tanggalPengembalian: '',
  sanksi: '',
  alasanPenolakan: '',
  kondisiPengembalian: 'baik',
  fotoKondisi: '',
  fotoError: '',
};

function dateLabel(value) {
  if (!value) return '–';
  try { return formatTanggal(String(value).slice(0, 10)); } catch { return String(value).slice(0, 10); }
}

// Tooltip dibuat sebagai elemen fixed di dalam backdrop modal agar tidak terpotong
// oleh area scroll. Posisinya selalu dihitung ulang dari tombol warning yang aktif.
function updateLateTooltipPosition(anchor = null) {
  if (!rootElement || !lateTooltipVisible) return;
  const tooltip = rootElement.querySelector('#return-late-tooltip');
  const trigger = anchor || rootElement.querySelector('[data-action="show-late-tooltip"]');
  if (!tooltip || !trigger) return;

  const rect = trigger.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (rect.bottom < 0 || rect.top > viewportHeight) {
    tooltip.style.display = 'none';
    return;
  }

  // Ukur setelah ditampilkan, lalu letakkan di kiri icon dengan panah mengarah ke icon.
  tooltip.style.display = 'block';
  const tooltipWidth = tooltip.getBoundingClientRect().width;
  const left = Math.max(8, rect.left - 12 - tooltipWidth);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${rect.top + rect.height / 2}px`;
  // Top mengacu ke tengah icon, jadi tooltip perlu digeser setengah tinggi ke atas.
  tooltip.style.transform = 'translateY(-50%)';
}

function showLateTooltip(anchor = null, keepForThreeSeconds = false) {
  const tooltip = rootElement?.querySelector('#return-late-tooltip');
  if (!tooltip) return;
  lateTooltipVisible = true;
  tooltip.style.display = 'block';
  updateLateTooltipPosition(anchor);

  if (keepForThreeSeconds) {
    if (lateTooltipClickTimeout) clearTimeout(lateTooltipClickTimeout);
    lateTooltipClickTimeout = setTimeout(() => {
      lateTooltipClickTimeout = null;
      // Jika pointer masih di atas icon, tooltip tetap tampil karena hover.
      if (!lateTooltipHovered) hideLateTooltip();
    }, 3000);
  }
}

function hideLateTooltip() {
  if (lateTooltipClickTimeout) {
    clearTimeout(lateTooltipClickTimeout);
    lateTooltipClickTimeout = null;
  }
  lateTooltipVisible = false;
  lateTooltipHovered = false;
  const tooltip = rootElement?.querySelector('#return-late-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function pickupDateValue(row) {
  // Gunakan tanggal pengambilan asli jika tersedia; data dummy memakai tanggal mulai.
  return row.tanggalPengambilan || row.tanggalAmbil || row.pickupDate || row.startDate || row.mulai || row.tanggalMulai || '2026-10-20';
}

function getDaysLate(row) {
  if (row.waktuTerlambat) return row.waktuTerlambat;
  const endStr = row.endDate || row.selesai || row.tanggalSelesai;
  if (!endStr) return 3;
  const endDate = new Date(String(endStr).slice(0, 10));
  const retDate = row.tanggalPengembalian ? new Date(String(row.tanggalPengembalian).slice(0, 10)) : new Date();
  const diffTime = retDate.getTime() - endDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 3;
}

function statusInfo(status) {
  const s = String(status || '').toLowerCase();
  if (s === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || s === 'menunggu_pengembalian' || s === 'menunggu') {
    return { label: 'Menunggu', cls: statusChipClass(status) };
  }
  if (s === STATUS_PEMINJAMAN.TERLAMBAT || s === 'terlambat') {
    return { label: 'Terlambat', cls: statusChipClass(status) };
  }
  if (s === STATUS_PEMINJAMAN.DIKEMBALIKAN || s === 'selesai' || s === 'dikembalikan') {
    return { label: 'Dikembalikan', cls: statusChipClass(status) };
  }
  if (s === STATUS_PEMINJAMAN.DITOLAK || s === 'ditolak') {
    return { label: 'Ditolak', cls: statusChipClass(status) };
  }
  return { label: status || '—', cls: statusChipClass(status) };
}

function personName(row) {
  return row.pengguna?.nama || row.peminjam?.nama || row.namaPeminjam || 'Peminjam';
}

function personNim(row) {
  return row.pengguna?.nim || row.peminjam?.nim || row.nim || '254107020890';
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
  if (f === STATUS_PEMINJAMAN.DITOLAK || f === 'ditolak') {
    return r === STATUS_PEMINJAMAN.DITOLAK || r === 'ditolak';
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
  if (!pageRows.length) return renderEmptyState({ colspan: 8 });
  return pageRows.map((row, index) => {
    const id = String(row.id || row.idPeminjaman);
    const name = personName(row);
    const org = organizationName(row);
    const status = statusInfo(row.status);
    const pending =
      row.status === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ||
      String(row.status).toLowerCase() === 'menunggu_pengembalian' ||
      String(row.status).toLowerCase() === 'menunggu';

    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${start + index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">${escapeHtml(initials(name))}</span><span class="min-w-0"><span class="block truncate text-xs font-medium text-slate-500">${escapeHtml(name)}</span><span class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">${renderOrganisasiLogo(org, row.peminjam?.logoUrl || row.logoUrl, 'h-3.5 w-3.5')}<span>${escapeHtml(org)}</span></span></span></div></td>
      <td class="min-w-[140px] px-4 py-4 text-xs text-slate-400">${escapeHtml(itemName(row))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.startDate || row.mulai || row.tanggalMulai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.endDate || row.selesai || row.tanggalSelesai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.tanggalPengembalian))}</td>
      <td class="px-4 py-4 text-center">${renderReturnStatusChip(row.status)}</td>
      <td class="whitespace-nowrap px-4 py-4"><div class="flex items-center justify-center gap-0"><button type="button" data-action="detail" data-id="${escapeHtml(id)}" title="Lihat detail" aria-label="Lihat detail" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">${renderIcon('Info', 'h-4 w-4')}</button>${pending ? `<button type="button" data-action="confirm" data-id="${escapeHtml(id)}" title="Setujui pengembalian" aria-label="Setujui pengembalian" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-green-600 hover:bg-green-50">${renderIcon('CircleCheck', 'h-4 w-4')}</button><button type="button" data-action="late" data-id="${escapeHtml(id)}" title="Tolak pengembalian" aria-label="Tolak pengembalian" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50">${renderIcon('CircleX', 'h-4 w-4')}</button>` : ''}</div></td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const pages = Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE));
  return renderSharedPagination({
    currentPage,
    totalPages: pages,
    prevAction: 'prev',
    nextAction: 'next',
    showNumbers: false,
    className: 'justify-end',
  });
}

function renderFormPengembalianPage() {
  if (!modalRow) return '';
  const row = modalRow;
  const name = personName(row);
  const nim = personNim(row);
  const org = organizationName(row);
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';
  const readonlyClass = 'w-full rounded-xl border border-transparent bg-slate-50 px-4 py-3 text-sm text-slate-700 cursor-not-allowed';

  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Form Pengembalian</h1>
      <p class="mt-1 text-sm text-slate-400">Lengkapi informasi pengembalian dan kondisi barang.</p>
    </div>

    <div class="w-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div class="grid grid-cols-1 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">Nama Peminjam</label>
          <input type="text" readonly value="${escapeHtml(name)}" class="${readonlyClass}">
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">NIM</label>
          <input type="text" readonly value="${escapeHtml(nim)}" class="${readonlyClass}">
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">OKI Peminjam</label>
          <input type="text" readonly value="${escapeHtml(org)}" class="${readonlyClass}">
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">Barang Dipinjam</label>
          <input type="text" readonly value="${escapeHtml(itemName(row))}" class="${readonlyClass}">
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">Keperluan Peminjaman Barang</label>
          <input type="text" readonly value="${escapeHtml(row.keperluan || 'Kebutuhan kegiatan')}" class="${readonlyClass}">
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-slate-700">Jumlah Unit</label>
          <input type="text" readonly value="${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}" class="${readonlyClass}">
        </div>
        <div class="space-y-1.5">
          <label for="form-tanggal-pengembalian" class="block text-sm font-medium text-slate-700">Tanggal Pengembalian</label>
          <div data-action="open-return-date" class="relative flex min-h-[46px] w-full cursor-pointer items-center rounded-xl border ${returnFormValidationCount && !formData.tanggalPengembalian ? 'border-rose-400' : 'border-slate-200'} bg-white px-4 py-3 transition-colors hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <span id="return-date-display" class="pointer-events-none flex-1 text-sm ${formData.tanggalPengembalian ? 'text-slate-800' : 'text-slate-400'}">${formData.tanggalPengembalian ? escapeHtml(dateLabel(formData.tanggalPengembalian)) : 'Pilih Tanggal'}</span>
            <span class="pointer-events-none ml-3 text-slate-400">${renderIcon('CalendarDays', 'h-5 w-5 text-slate-400')}</span>
            <input type="date" id="form-tanggal-pengembalian" aria-label="Pilih tanggal pengembalian" min="${todayIsoDate()}" value="${escapeHtml(formData.tanggalPengembalian)}" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" style="color-scheme:light">
          </div>
          ${returnFormValidationCount && !formData.tanggalPengembalian ? '<p id="return-date-error" role="alert" class="text-xs text-rose-600">Tanggal pengembalian wajib diisi.</p>' : ''}
        </div>
        <div class="space-y-1.5">
          <label for="form-sanksi" class="block text-sm font-medium text-slate-700">Sanksi / Catatan</label>
          <textarea id="form-sanksi" rows="3" placeholder="Masukkan sanksi atau catatan" class="${fieldClass} resize-none ${returnFormValidationCount && !formData.sanksi.trim() ? 'border-rose-400' : ''}">${escapeHtml(formData.sanksi)}</textarea>
          ${returnFormValidationCount && !formData.sanksi.trim() ? '<p id="return-sanction-error" role="alert" class="text-xs text-rose-600">Sanksi / catatan wajib diisi.</p>' : ''}
        </div>
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-700">Kondisi Barang Saat Dikembalikan</p>
          <div class="flex flex-col items-start gap-3 text-sm text-slate-700">
            <label class="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-primary"><input class="accent-[var(--color-primary)]" type="radio" name="kondisi-pengembalian" value="baik" ${formData.kondisiPengembalian === 'baik' ? 'checked' : ''}>Baik</label>
            <label class="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-primary"><input class="accent-[var(--color-primary)]" type="radio" name="kondisi-pengembalian" value="rusak" ${formData.kondisiPengembalian === 'rusak' ? 'checked' : ''}>Rusak</label>
          </div>
        </div>
        <div class="space-y-1.5">
          <label for="foto-kondisi" class="block text-sm font-medium text-slate-700">Foto Kondisi Barang Saat Dikembalikan</label>
          <button type="button" data-action="choose-return-photo" class="flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-primary hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-primary/20">
            ${formData.fotoKondisi ? `<img src="${escapeHtml(formData.fotoKondisi)}" alt="Foto kondisi barang" class="max-h-40 rounded-lg object-contain">` : `<img src="assets/img/Image-Dropbox.png" alt="" class="mb-2 h-9 w-9 object-contain"><span class="text-sm font-medium text-slate-700">Pilih foto kondisi barang</span><span class="mt-1 text-xs text-slate-400">Format JPG atau PNG</span>`}
          </button>
          <input id="foto-kondisi" type="file" accept="image/jpeg,image/png,image/jpg" class="sr-only">
          ${formData.fotoError ? `<p class="text-sm text-rose-600">${escapeHtml(formData.fotoError)}</p>` : ''}
        </div>
      </div>

      <div class="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" data-action="prompt-cancel-form" class="h-12 min-w-[112px] rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">Batal</button>
        <button type="button" data-action="prompt-submit-form" class="h-12 min-w-[112px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/30">Kirim</button>
      </div>
    </div>
  </section>`;
}

function renderModal() {
  if (!modalRow || !activeDialog) return '';
  const row = modalRow;
  const name = personName(row);
  const nim = personNim(row);
  const org = organizationName(row);
  const isTerlambat = row.status === STATUS_PEMINJAMAN.TERLAMBAT || String(row.status).toLowerCase() === 'terlambat';
  const isDikembalikan = row.status === STATUS_PEMINJAMAN.DIKEMBALIKAN || String(row.status).toLowerCase() === 'dikembalikan' || String(row.status).toLowerCase() === 'selesai';
  const daysLate = getDaysLate(row);

  // 1. Detail Pengembalian — mengikuti ukuran dan tipografi Detail Peminjaman.
  if (activeDialog === 'detail') {
    const dateColumns = [
      { label: 'Tanggal Mulai', value: dateLabel(row.startDate || row.mulai || row.tanggalMulai) },
      { label: 'Tanggal Pengambilan', value: dateLabel(pickupDateValue(row)) },
      { label: 'Tanggal Selesai', value: dateLabel(row.endDate || row.selesai || row.tanggalSelesai) },
      { label: 'Tanggal Pengembalian', value: dateLabel(row.tanggalPengembalian) },
    ];
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="return-detail-title" class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="return-detail-title" class="text-2xl font-semibold tracking-tight text-slate-900">Detail Pengembalian</h2>
          <button type="button" data-action="close-modal" aria-label="Tutup detail" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${renderIcon('X', 'h-5 w-5')}</button>
        </div>

        <div class="mt-6 space-y-6 text-sm">
          <div class="flex items-center justify-between gap-6">
            <p class="text-base font-semibold text-slate-900">Nama Peminjam</p>
            <div class="text-right"><p class="text-base font-medium text-slate-800">${escapeHtml(name)}</p><p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">${renderOrganisasiLogo(org, row.peminjam?.logoUrl || row.logoUrl, 'h-4 w-4')}<span>${escapeHtml(org)}</span></p></div>
          </div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">NIM</p><p class="text-base font-medium text-slate-800">${escapeHtml(nim)}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Barang Dipinjam</p><p class="text-right text-base font-medium text-slate-800">${escapeHtml(itemName(row))}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Jumlah Unit</p><p class="text-base font-medium text-slate-800">${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}</p></div>

          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-slate-300">
            ${dateColumns.map((date, index) => `<div class="text-center ${index === 0 ? 'sm:px-2' : 'sm:px-4'}"><p class="text-sm font-semibold text-slate-900 sm:text-base">${date.label}</p><p class="mt-3 text-sm font-medium text-slate-800 sm:text-base">${escapeHtml(date.value)}</p></div>`).join('')}
          </div>

          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Status</p><div class="flex items-center gap-2">${isTerlambat ? `<button type="button" data-action="show-late-tooltip" aria-label="Lihat waktu keterlambatan" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-800">${renderIcon('AlertCircle', 'h-6 w-6')}</button>` : ''}${renderReturnStatusChip(row.status)}</div></div>

          ${isDikembalikan ? `<div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Diproses Oleh</p><p class="text-base font-medium text-slate-800">${escapeHtml(row.diprosesOleh || row.namaPeminjam || name)}</p></div>` : ''}
          ${isDikembalikan && row.kondisiPengembalian ? `<div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Kondisi Barang Saat Dikembalikan</p><span class="rounded-lg px-3 py-1.5 text-sm font-medium ${String(row.kondisiPengembalian).toLowerCase() === 'rusak' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">${escapeHtml(row.kondisiPengembalian)}</span></div>` : ''}
          ${isDikembalikan && row.fotoKondisi ? `<div><p class="mb-2 text-base font-semibold text-slate-900">Foto Kondisi Barang Saat Dikembalikan</p><img src="${escapeHtml(row.fotoKondisi)}" alt="Foto kondisi barang saat dikembalikan" class="max-h-56 rounded-xl object-contain"></div>` : ''}
          ${String(row.status).toLowerCase() === 'ditolak' ? `<div><p class="mb-2 text-base font-semibold text-slate-900">Alasan Penolakan</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-700">${escapeHtml(row.alasanPenolakan || 'Pengembalian ditolak oleh pengelola.')}</div></div>` : ''}
          <div><p class="mb-2 text-base font-semibold text-slate-900">Keperluan Peminjaman Barang</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-800">${escapeHtml(row.keperluan || 'Seminar BEM')}</div></div>
          ${isDikembalikan ? `<div><p class="mb-2 text-base font-semibold text-slate-900">Sanksi</p><div class="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 text-sm leading-relaxed text-slate-700"><p class="font-semibold text-slate-900">Sanksi Keterlambatan dan Kehilangan Barang</p><p><strong>- Keterlambatan:</strong> Peminjam dapat dikenakan pembatasan peminjaman sementara.</p><p><strong>- Kehilangan:</strong> Peminjam wajib mengganti barang dengan barang serupa atau sesuai ketentuan pengelola.</p>${row.sanksi ? `<p><strong>Catatan:</strong> ${escapeHtml(row.sanksi)}</p>` : ''}</div></div>` : ''}
        </div>

        <div class="mt-6 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110">Tutup</button></div>
      </section>
      ${isTerlambat ? `<div id="return-late-tooltip" role="tooltip" class="pointer-events-none whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900" style="display:none;position:fixed;z-index:100000;filter:drop-shadow(0 5px 12px rgba(15,23,42,0.22))">Waktu Terlambat: ${daysLate} Hari<span aria-hidden="true" style="position:absolute;right:-5px;top:50%;width:10px;height:10px;background:white;border-radius:2px;transform:translateY(-50%) rotate(45deg)"></span></div>` : ''}
    </div>`;
  }

  // 2. Dialog Konfirmasi Setujui Pengajuan Pengembalian (Global Modal)
  if (activeDialog === 'confirm-approve') {
    return renderGlobalModal({
      variant: 'approve',
      title: 'Setujui pengajuan pengembalian?',
      description: 'Jika setuju, anda akan diarahkan ke form konfirmasi pengembalian',
      actions: [
        {
          label: 'Kembali',
          action: 'close-modal',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Setujui',
          action: 'open-form-approve',
          variant: 'default',
          className: 'w-1/2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700',
        },
      ],
    });
  }

  // 3. Form Pengembalian is rendered as page, no popup here
  if (activeDialog === 'form-approve') {
    return '';
  }

  // 4. Dialog Kirim Form Pengembalian ? (Global Modal)
  if (activeDialog === 'confirm-submit-form') {
    return renderGlobalModal({
      variant: 'send',
      title: 'Kirim Form Pengembalian ?',
      description: 'Periksa kembali data pengajuan yang akan anda kirim',
      actions: [
        {
          label: 'Kembali',
          action: 'back-to-form-approve',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Kirim',
          action: 'execute-approve',
          variant: 'default',
          className: 'w-1/2 rounded-xl bg-primary text-white transition-colors hover:brightness-110',
        },
      ],
    });
  }

  // 5. Dialog Batal Kirim Form ? (Global Modal)
  if (activeDialog === 'confirm-cancel-form') {
    return renderGlobalModal({
      variant: 'cancel',
      title: 'Batal Kirim Form ?',
      description: 'Apakah anda yakin ingin batal menyetujui pengembalian ?',
      actions: [
        {
          label: 'Kembali',
          action: 'back-to-form-approve',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Batalkan',
          action: 'confirm-cancel-return',
          variant: 'default',
          className: 'w-1/2 rounded-xl bg-primary text-white transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/30',
        },
      ],
    });
  }

  // 6. Dialog Pengembalian Berhasil! (Global Modal)
  if (activeDialog === 'success-approve') {
    return renderGlobalModal({
      variant: 'success',
      title: 'Pengembalian Berhasil!',
      description: 'Persetujuan pengembalian dan data berhasil disimpan.',
      primaryAction: {
        label: 'Kembali',
        action: 'close-modal',
        className: 'w-full rounded-xl bg-primary text-white transition-colors hover:brightness-110',
      },
    });
  }

  // 7. Dialog Tolak Pengajuan Pengembalian? (Global Modal)
  if (activeDialog === 'confirm-reject') {
    return renderGlobalModal({
      variant: 'reject',
      title: 'Tolak pengajuan pengembalian?',
      description: 'Periksa kembali data pengajuan yang akan anda tolak',
      actions: [
        {
          label: 'Kembali',
          action: 'back-to-form-reject',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Tolak',
          action: 'execute-reject',
          variant: 'default',
          className: 'w-1/2 rounded-xl bg-rose-600 text-white hover:bg-rose-700',
        },
      ],
    });
  }

  // 8. Popup Alasan Penolakan — disamakan dengan popup Permohonan Ditolak pada List Pengajuan PJ.
  if (activeDialog === 'form-reject') {
    const showError = rejectionValidationCount > 0;
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="return-reject-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="return-reject-title" class="text-xl font-bold tracking-tight text-slate-900">Pengembalian Ditolak</h2>
        <div class="mt-5 space-y-2">
          <label for="form-alasan-penolakan" class="block text-sm font-semibold text-slate-900">Alasan Penolakan</label>
          <textarea id="form-alasan-penolakan" rows="3" placeholder="Masukkan alasan penolakan" style="resize: none" class="w-full resize-none rounded-xl border ${showError ? 'border-red-300' : 'border-slate-200'} bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100">${escapeHtml(formData.alasanPenolakan)}</textarea>
          ${showError ? `<div id="return-rejection-error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ${rejectionValidationCount > 0 ? 'validation-blink' : ''}">Alasan penolakan wajib diisi.</div>` : ''}
        </div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-action="close-modal" class="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">Batal</button>
          <button type="button" data-action="prompt-confirm-reject" class="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Kirim</button>
        </div>
      </section>
    </div>`;
  }

  // 9. Dialog Pengembalian Berhasil Ditolak! (Global Modal)
  if (activeDialog === 'success-reject') {
    return renderGlobalModal({
      variant: 'reject',
      title: 'Pengembalian Berhasil Ditolak!',
      description: 'Persetujuan pengembalian dan data berhasil ditolak.',
      primaryAction: {
        label: 'Kembali',
        action: 'close-modal',
        className: 'w-full rounded-xl bg-primary text-white transition-colors hover:brightness-110',
      },
    });
  }

  return '';
}

async function loadRows() {
  const all = await getKelolaPengembalian();
  return all.filter((row) => [
    STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
    STATUS_PEMINJAMAN.DIKEMBALIKAN,
    STATUS_PEMINJAMAN.DITOLAK,
    'menunggu_pengembalian',
    'terlambat',
    'selesai',
    'dikembalikan',
    'ditolak',
  ].includes(row.status));
}

function renderContent() {
  if (['form-approve', 'confirm-submit-form', 'confirm-cancel-form'].includes(activeDialog)) {
    return `${renderFormPengembalianPage()}${renderModal()}`;
  }

  const count = visibleRows().length;
  const nAktif = countActiveFilters();
  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-9">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Kelola Pengembalian</h1>
      <p class="mt-1 text-sm text-slate-400">Pantau dan kelola proses pengembalian barang serta kondisi barang yang dikembalikan.</p>
    </div>
    <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-semibold text-slate-900">List Pengembalian</h2>
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
      <div class="w-full overflow-x-auto">
      <table class="w-full min-w-[790px] border-collapse text-left">
      <thead>
        <tr class="border-b border-slate-100 text-sm leading-[140%] tracking-normal text-slate-400">
          <th class="px-4 py-3.5 text-center font-semibold">No</th>
          <th class="px-4 py-3.5 font-semibold">Nama Peminjam</th>
          <th class="px-4 py-3.5 font-semibold">Barang Dipinjam</th>
          <th class="px-4 py-3.5 text-center font-semibold">Tanggal Mulai</th>
          <th class="px-4 py-3.5 text-center font-semibold">Tanggal Selesai</th>
          <th class="px-4 py-3.5 text-center font-semibold">Tanggal Kembali</th>
          <th class="px-4 py-3.5 text-center font-semibold">Status</th>
          <th class="px-4 py-3.5 text-center font-semibold">Aksi</th>
        </tr>
      </thead>
        <tbody>
          ${renderTableRows()}
        </tbody>
        </table>
        </div>
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
              <option value="${STATUS_PEMINJAMAN.DITOLAK}" ${statusFilter === STATUS_PEMINJAMAN.DITOLAK ? 'selected' : ''}>Ditolak</option>
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
  lateTooltipVisible = false;
  modalRow = null;
  activeDialog = null;
  formData = {
    tanggalPengembalian: '',
    sanksi: '',
    alasanPenolakan: '',
    kondisiPengembalian: 'baik',
    fotoKondisi: '',
    fotoError: '',
  };
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
        activeDialog = null;
        refresh();
      }
      return;
    }
    const action = button.dataset.action;
    if (action === 'open-return-date') {
      const dateInput = rootElement.querySelector('#form-tanggal-pengembalian');
      try { dateInput?.showPicker?.(); } catch { dateInput?.focus(); }
      return;
    }
    const id = button.dataset.id;

    if (action === 'close-modal') {
      hideLateTooltip();
      modalRow = null;
      activeDialog = null;
      refresh();
      return;
    }

    if (action === 'show-late-tooltip') {
      // Klik menahan tooltip selama 3 detik, meskipun pointer meninggalkan icon.
      showLateTooltip(button, true);
      return;
    }

    if (action === 'detail') {
      modalRow = rows.find((row) => String(row.id || row.idPeminjaman) === String(id)) || null;
      activeDialog = 'detail';
      refresh();
      return;
    }

    if (action === 'choose-return-photo') {
      rootElement.querySelector('#foto-kondisi')?.click();
      return;
    }

    if (action === 'prev') {
      currentPage = Math.max(1, currentPage - 1);
      refresh();
      return;
    }

    if (action === 'next') {
      currentPage = Math.min(Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE)), currentPage + 1);
      refresh();
      return;
    }

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

    // Alur Persetujuan (Approval)
    if (action === 'confirm' || action === 'approve') {
      modalRow = rows.find((row) => String(row.id || row.idPeminjaman) === String(id)) || null;
      formData.tanggalPengembalian = '';
      returnFormValidationCount = 0;
      formData.sanksi = '';
      formData.kondisiPengembalian = 'baik';
      formData.fotoKondisi = '';
      formData.fotoError = '';
      activeDialog = 'confirm-approve';
      refresh();
      return;
    }

    if (action === 'open-form-approve') {
      formData.tanggalPengembalian = '';
      returnFormValidationCount = 0;
      formData.sanksi = '';
      activeDialog = 'form-approve';
      refresh();
      return;
    }

    if (action === 'prompt-submit-form') {
      const tgl = rootElement.querySelector('#form-tanggal-pengembalian')?.value;
      const sanksi = rootElement.querySelector('#form-sanksi')?.value;
      const kondisi = rootElement.querySelector('input[name="kondisi-pengembalian"]:checked')?.value;
      formData.tanggalPengembalian = tgl || '';
      formData.sanksi = sanksi || '';
      if (kondisi) formData.kondisiPengembalian = kondisi;
      returnFormValidationCount += 1;
      if (!formData.tanggalPengembalian || !formData.sanksi.trim()) { refresh(); return; }
      returnFormValidationCount = 0;
      activeDialog = 'confirm-submit-form';
      refresh();
      return;
    }

    if (action === 'prompt-cancel-form') {
      activeDialog = 'confirm-cancel-form';
      refresh();
      return;
    }

    if (action === 'back-to-form-approve') {
      activeDialog = 'form-approve';
      refresh();
      return;
    }

    if (action === 'confirm-cancel-return') {
      modalRow = null;
      activeDialog = null;
      refresh();
      return;
    }

    if (action === 'execute-approve') {
      try {
        await updateMockPengembalianStatus(
          modalRow.id || modalRow.idPeminjaman,
          STATUS_PEMINJAMAN.DIKEMBALIKAN,
          {
            tanggalPengembalian: formData.tanggalPengembalian,
            sanksi: formData.sanksi,
            kondisiPengembalian: formData.kondisiPengembalian,
            fotoKondisi: formData.fotoKondisi,
          }
        );
        rows = await loadRows();
        activeDialog = 'success-approve';
      } catch (error) {
        toastType = 'error';
        toastMessage = error?.message || 'Gagal menyetujui pengembalian.';
        modalRow = null;
        activeDialog = null;
      }
      refresh();
      return;
    }

    // Alur Penolakan (Rejection)
    if (action === 'late' || action === 'reject') {
      modalRow = rows.find((row) => String(row.id || row.idPeminjaman) === String(id)) || null;
      formData.alasanPenolakan = '';
      rejectionValidationCount = 0;
      activeDialog = 'confirm-reject';
      refresh();
      return;
    }

    if (action === 'open-form-reject') {
      formData.alasanPenolakan = '';
      rejectionValidationCount = 0;
      activeDialog = 'form-reject';
      refresh();
      return;
    }

    if (action === 'prompt-confirm-reject') {
      const alasan = rootElement.querySelector('#form-alasan-penolakan')?.value || '';
      formData.alasanPenolakan = alasan.trim();
      if (!formData.alasanPenolakan) {
        rejectionValidationCount += 1;
        refresh();
        return;
      }
      rejectionValidationCount = 0;
      activeDialog = 'confirm-reject';
      refresh();
      return;
    }

    if (action === 'back-to-form-reject') {
      activeDialog = 'form-reject';
      refresh();
      return;
    }

    if (action === 'execute-reject') {
      const alasan = rootElement.querySelector('#form-alasan-penolakan')?.value || formData.alasanPenolakan || '';
      formData.alasanPenolakan = alasan.trim();
      if (!formData.alasanPenolakan) {
        activeDialog = 'form-reject';
        toastType = 'error';
        toastMessage = 'Alasan penolakan wajib diisi.';
        refresh();
        return;
      }
      try {
        await updateMockPengembalianStatus(
          modalRow.id || modalRow.idPeminjaman,
          STATUS_PEMINJAMAN.DITOLAK,
          {
            alasanPenolakan: formData.alasanPenolakan,
          }
        );
        rows = await loadRows();
        activeDialog = 'success-reject';
      } catch (error) {
        toastType = 'error';
        toastMessage = error?.message || 'Gagal menolak pengembalian.';
        modalRow = null;
        activeDialog = null;
      }
      refresh();
      return;
    }
  };

  inputHandler = (event) => {
    if (event.target.id === 'form-tanggal-pengembalian') {
      formData.tanggalPengembalian = event.target.value;
      const dateDisplay = rootElement.querySelector('#return-date-display');
      if (dateDisplay) { dateDisplay.textContent = formData.tanggalPengembalian ? dateLabel(formData.tanggalPengembalian) : 'Pilih Tanggal'; dateDisplay.classList.toggle('text-slate-400', !formData.tanggalPengembalian); dateDisplay.classList.toggle('text-slate-800', !!formData.tanggalPengembalian); }
      if (formData.tanggalPengembalian) { rootElement.querySelector('#return-date-error')?.remove(); event.target.classList.remove('border-rose-400'); }
      return;
    }
    if (event.target.id === 'form-sanksi') {
      formData.sanksi = event.target.value;
      if (formData.sanksi.trim()) { rootElement.querySelector('#return-sanction-error')?.remove(); event.target.classList.remove('border-rose-400'); }
      return;
    }
    if (event.target.id === 'form-alasan-penolakan') {
      formData.alasanPenolakan = event.target.value;
      if (rejectionValidationCount > 0) {
        const textarea = event.target;
        const error = rootElement.querySelector('#return-rejection-error');
        const fieldGroup = textarea.parentElement;
        if (formData.alasanPenolakan.trim()) {
          error?.remove();
          textarea.classList.remove('border-red-300');
          textarea.classList.add('border-slate-200');
        } else {
          textarea.classList.remove('border-slate-200');
          textarea.classList.add('border-red-300');
          if (!error && fieldGroup) {
            const errorElement = document.createElement('div');
            errorElement.id = 'return-rejection-error';
            errorElement.setAttribute('role', 'alert');
            errorElement.className = 'rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 validation-blink';
            errorElement.textContent = 'Alasan penolakan wajib diisi.';
            textarea.insertAdjacentElement('afterend', errorElement);
          }
        }
      }
      return;
    }
    if (event.target.id !== 'search-pengembalian') return;
    searchTerm = event.target.value;
    currentPage = 1;
    const filtered = visibleRows();
    const tbody = rootElement.querySelector('tbody');
    if (tbody) tbody.innerHTML = renderTableRows();
    const footer = rootElement.querySelector('.mt-5.flex.items-center.justify-between');
    if (footer) footer.innerHTML = `<p class="text-xs text-slate-500">Menampilkan ${filtered.length ? 1 : 0}–${Math.min(PAGE_SIZE, filtered.length)} dari ${filtered.length} pengajuan</p>${renderPagination()}`;
  };

  changeHandler = async (event) => {
    if (event.target.name === 'kondisi-pengembalian') {
      formData.kondisiPengembalian = event.target.value;
      return;
    }
    if (event.target.id !== 'foto-kondisi') return;
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateFotoFile(file);
    if (error) {
      formData.fotoError = error;
      refresh();
      return;
    }
    try {
      formData.fotoKondisi = await compressImageToDataUrl(file);
      formData.fotoError = '';
      refresh();
    } catch {
      formData.fotoError = 'Gagal memproses foto kondisi barang.';
      refresh();
    }
  };

  pointerOverHandler = (event) => {
    const trigger = event.target?.closest?.('[data-action="show-late-tooltip"]');
    if (!trigger || trigger.contains(event.relatedTarget)) return;
    lateTooltipHovered = true;
    showLateTooltip(trigger);
  };

  pointerOutHandler = (event) => {
    const trigger = event.target?.closest?.('[data-action="show-late-tooltip"]');
    if (!trigger || trigger.contains(event.relatedTarget)) return;
    lateTooltipHovered = false;
    // Jangan tutup akibat hover-out selama timer klik 3 detik masih berjalan.
    if (lateTooltipClickTimeout) return;
    hideLateTooltip();
  };

  tooltipScrollHandler = () => {
    if (lateTooltipVisible) updateLateTooltipPosition();
  };

  rootElement.addEventListener('click', clickHandler);
  rootElement.addEventListener('input', inputHandler);
  rootElement.addEventListener('change', changeHandler);
  rootElement.addEventListener('pointerover', pointerOverHandler);
  rootElement.addEventListener('pointerout', pointerOutHandler);
  // Capture diperlukan karena event scroll dari elemen modal tidak bubbling.
  rootElement.addEventListener('scroll', tooltipScrollHandler, true);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', tooltipScrollHandler);
  }
}

export function unmount() {
  if (rootElement && clickHandler) rootElement.removeEventListener('click', clickHandler);
  if (rootElement && inputHandler) rootElement.removeEventListener('input', inputHandler);
  if (rootElement && changeHandler) rootElement.removeEventListener('change', changeHandler);
  if (rootElement && pointerOverHandler) rootElement.removeEventListener('pointerover', pointerOverHandler);
  if (rootElement && pointerOutHandler) rootElement.removeEventListener('pointerout', pointerOutHandler);
  if (rootElement && tooltipScrollHandler) rootElement.removeEventListener('scroll', tooltipScrollHandler, true);
  if (tooltipScrollHandler && typeof window !== 'undefined') window.removeEventListener('resize', tooltipScrollHandler);
  hideLateTooltip();
  rootElement = null;
  clickHandler = null;
  inputHandler = null;
  changeHandler = null;
  pointerOverHandler = null;
  pointerOutHandler = null;
  tooltipScrollHandler = null;
  rows = [];
  modalRow = null;
  activeDialog = null;
  lateTooltipVisible = false;
  lateTooltipHovered = false;
  if (lateTooltipClickTimeout) {
    clearTimeout(lateTooltipClickTimeout);
    lateTooltipClickTimeout = null;
  }
  formData = {
    tanggalPengembalian: '',
    sanksi: '',
    alasanPenolakan: '',
    kondisiPengembalian: 'baik',
    fotoKondisi: '',
    fotoError: '',
  };
  okiFilter = 'all';
  tanggalFilter = '';
  statusFilter = 'all';
}