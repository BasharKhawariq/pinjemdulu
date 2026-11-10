/**
 * dashboard-pj.js — Dashboard Penanggung Jawab Inventaris.
 * Mempertahankan gaya dashboard peminjam dan menambahkan tabel Pengelolaan.
 */

import { getPeminjaman, updateMockPeminjamanStatus, updateMockPeminjamanPickup } from '../services/peminjaman.js';
import { updateMockPengembalianStatus } from '../services/pengembalian.js';
import { getRequestPj } from '../services/request-pj.js';
import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { getInventarisKelola } from '../services/inventaris-kelola.js';
import { renderStatusChip } from '../ui/status-chip.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { compressImageToDataUrl } from './kelola-inventaris-form.js';
import { validateFotoFile } from '../lib/inventaris-form.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';

const DEMO_PENGEMBALIAN_ROWS = [
  {
    id: 'dash-ret-1',
    namaBarang: 'Proyektor Epson',
    organisasi: 'HMTI',
    tanggalMulai: '2026-10-20',
    tanggalSelesai: '2026-10-25',
    tanggalDikembalikan: null,
    jumlahUnit: 1,
    status: 'menunggu',
    keperluan: 'Seminar Nasional HMTI',
  },
  {
    id: 'dash-ret-2',
    namaBarang: 'Kabel HDMI',
    organisasi: 'HME',
    tanggalMulai: '2026-08-15',
    tanggalSelesai: '2026-08-20',
    tanggalDikembalikan: null,
    jumlahUnit: 1,
    status: 'dikembalikan',
    keperluan: 'Workshop Elektronika',
  },
  {
    id: 'dash-ret-3',
    namaBarang: 'Camera Canon 700D',
    organisasi: 'HMS',
    tanggalMulai: '2026-07-07',
    tanggalSelesai: '2026-07-12',
    tanggalDikembalikan: null,
    jumlahUnit: 1,
    status: 'terlambat',
    keperluan: 'Dokumentasi Proyek Lapangan',
  },
  {
    id: 'dash-ret-4',
    namaBarang: 'Speaker Portable',
    organisasi: 'HIMANIA',
    tanggalMulai: '2026-04-26',
    tanggalSelesai: '2026-04-30',
    tanggalDikembalikan: null,
    jumlahUnit: 1,
    status: 'dikembalikan',
    keperluan: 'Rapat Anggota Tahunan',
  },
];

const DEMO_PEMINJAMAN_ROWS = [
  {
    id: 'dash-pinjam-1',
    namaBarang: 'Proyektor Epson',
    organisasi: 'HMTI',
    tanggalDiajukan: '2026-10-15',
    tanggalMulai: '2026-10-20',
    tanggalSelesai: '2026-10-25',
    jumlahUnit: 1,
    status: 'diajukan',
    keperluan: 'Seminar Nasional HMTI',
  },
  {
    id: 'dash-pinjam-2',
    namaBarang: 'Kabel HDMI',
    organisasi: 'HME',
    tanggalDiajukan: '2026-08-10',
    tanggalMulai: '2026-08-15',
    tanggalSelesai: '2026-08-20',
    jumlahUnit: 1,
    status: 'disetujui',
    keperluan: 'Workshop Elektronika',
  },
  {
    id: 'dash-pinjam-3',
    namaBarang: 'Camera Canon 700D',
    organisasi: 'HMS',
    tanggalDiajukan: '2026-07-01',
    tanggalMulai: '2026-07-07',
    tanggalSelesai: '2026-07-12',
    jumlahUnit: 1,
    status: 'dipinjam',
    keperluan: 'Dokumentasi Proyek Lapangan',
  },
  {
    id: 'dash-pinjam-4',
    namaBarang: 'Speaker Portable',
    organisasi: 'HIMANIA',
    tanggalDiajukan: '2026-04-20',
    tanggalMulai: '2026-04-26',
    tanggalSelesai: '2026-04-30',
    jumlahUnit: 1,
    status: 'ditolak',
    keperluan: 'Rapat Anggota Tahunan',
    alasanPenolakan: 'Jadwal bentrok dengan kegiatan internal organisasi.',
  },
];

let activeTab = 'peminjaman';
let managementTab = 'peminjaman';
let currentUser = null;
let livePeminjaman = [];
let liveRequestPj = [];
let liveInventaris = [];
let detailRow = null;
let rootElement = null;
let clickHandler = null;
let managementModal = null;
let managementModalRow = null;
let managementLateTooltipVisible = false;
let managementLateTooltipHovered = false;
let managementLateTooltipTimeout = null;
let managementLateTooltipPointerOverHandler = null;
let managementLateTooltipPointerOutHandler = null;
let managementLateTooltipScrollHandler = null;
let managementRejectReason = '';
let managementRejectReasonValidationActive = false;
let managementPickupDate = '';
let managementPickupPhoto = '';
let managementPickupPhotoError = '';
let managementReturnDate = '';
let managementReturnDateError = '';
let managementReturnSanksiError = '';
let managementReturnReason = '';
let managementReturnCondition = 'baik';
let managementReturnPhoto = '';
let managementReturnSanksi = '';
let managementReturnPhotoError = '';
let managementError = '';
let managementNotice = '';

function formatDateEnOrId(isoStr) {
  if (!isoStr) return '-';
  const formatted = formatTanggal(String(isoStr).slice(0, 10));
  return formatted || '-';
}

// Tooltip keterlambatan menggunakan posisi fixed agar tidak terpotong area scroll modal.
function updateManagementLateTooltipPosition(anchor = null) {
  if (!rootElement || !managementLateTooltipVisible) return;
  const tooltip = rootElement.querySelector('#dashboard-late-tooltip');
  const trigger = anchor || rootElement.querySelector('[data-action="management-show-late-tooltip"]');
  if (!tooltip || !trigger) return;

  const rect = trigger.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (rect.bottom < 0 || rect.top > viewportHeight) {
    tooltip.style.display = 'none';
    return;
  }

  tooltip.style.display = 'block';
  const tooltipWidth = tooltip.getBoundingClientRect().width;
  const left = Math.max(8, rect.left - 12 - tooltipWidth);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${rect.top + rect.height / 2}px`;
  tooltip.style.transform = 'translateY(-50%)';
}

function showManagementLateTooltip(anchor = null, keepForThreeSeconds = false) {
  const tooltip = rootElement?.querySelector('#dashboard-late-tooltip');
  if (!tooltip) return;
  managementLateTooltipVisible = true;
  tooltip.style.display = 'block';
  updateManagementLateTooltipPosition(anchor);

  if (keepForThreeSeconds) {
    if (managementLateTooltipTimeout) clearTimeout(managementLateTooltipTimeout);
    managementLateTooltipTimeout = setTimeout(() => {
      managementLateTooltipTimeout = null;
      // Hover tetap mempertahankan tooltip setelah durasi klik berakhir.
      if (!managementLateTooltipHovered) hideManagementLateTooltip();
    }, 3000);
  }
}

function hideManagementLateTooltip() {
  if (managementLateTooltipTimeout) {
    clearTimeout(managementLateTooltipTimeout);
    managementLateTooltipTimeout = null;
  }
  managementLateTooltipVisible = false;
  managementLateTooltipHovered = false;
  const tooltip = rootElement?.querySelector('#dashboard-late-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getOrgBadgeClass(org) {
  const key = String(org || '').toUpperCase();
  if (key === 'HMTI') return 'bg-amber-400 text-amber-950';
  if (key === 'HME' || key === 'HMF') return 'bg-rose-700 text-white';
  if (key === 'HMS') return 'bg-slate-800 text-amber-400';
  if (key === 'HIMANIA') return 'bg-blue-600 text-white';
  return 'bg-slate-200 text-slate-700';
}

function getStatusBadge(status, isReturn = false) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'menunggu' || normalized === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN) {
    return { label: 'Menunggu', cls: 'bg-amber-50 text-amber-600' };
  }
  if (normalized === 'dikembalikan' || normalized === STATUS_PEMINJAMAN.DIKEMBALIKAN) {
    return { label: 'Dikembalikan', cls: 'bg-emerald-50 text-emerald-600' };
  }
  if (normalized === 'terlambat' || normalized === STATUS_PEMINJAMAN.TERLAMBAT) {
    return { label: 'Terlambat', cls: 'bg-rose-100 text-rose-600' };
  }
  if (normalized === 'diajukan' || normalized === STATUS_PEMINJAMAN.DIAJUKAN) {
    return { label: 'Diajukan', cls: 'bg-blue-100 text-blue-700' };
  }
  if (normalized === 'disetujui' || normalized === STATUS_PEMINJAMAN.DISETUJUI) {
    return { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' };
  }
  if (normalized === 'dipinjam' || normalized === STATUS_PEMINJAMAN.DIPINJAM) {
    return { label: 'Dipinjam', cls: 'bg-purple-50 text-purple-700' };
  }
  if (normalized === 'ditolak' || normalized === STATUS_PEMINJAMAN.DITOLAK) {
    return {
      label: 'Ditolak',
      cls: isReturn ? 'status-chip-return-rejected-dashboard' : 'bg-rose-100 text-rose-700',
    };
  }
  return { label: String(status || '-'), cls: 'bg-zinc-100 text-zinc-700' };
}

function computeStats() {
  const extraLoans = Math.max(0, livePeminjaman.length - 3);
  const extraApproved = livePeminjaman.slice(0, extraLoans).filter((r) => r.status === STATUS_PEMINJAMAN.DISETUJUI).length;
  const extraRejected = livePeminjaman.slice(0, extraLoans).filter((r) => r.status === STATUS_PEMINJAMAN.DITOLAK).length;
  const extraReturned = livePeminjaman.slice(0, extraLoans).filter((r) => r.status === STATUS_PEMINJAMAN.DIKEMBALIKAN).length;
  const extraLate = livePeminjaman.slice(0, extraLoans).filter((r) => r.status === STATUS_PEMINJAMAN.TERLAMBAT).length;

  const nim = currentUser?.nim || null;
  const pjCount = nim
    ? liveRequestPj.filter((item) => String(item.pemohon?.nim) === String(nim)).length || 1
    : 1;

  return {
    disetujui: 2 + extraApproved,
    ditolak: 3 + extraRejected,
    dikembalikan: 4 + extraReturned,
    terlambat: 0 + extraLate,
    totalPeminjaman: 9 + extraLoans,
    pengajuanPj: pjCount,
  };
}

function getPeminjamanTableRows() {
  const extraLoans = Math.max(0, livePeminjaman.length - 3);
  const dynamicMapped = livePeminjaman.slice(0, extraLoans).map((row, idx) => ({
    id: String(row.id || row.idPeminjaman || `live-${idx}`),
    namaBarang: row.inventaris?.namaBarang || row.barang?.namaBarang || 'Barang inventaris',
    organisasi: row.inventaris?.namaOrganisasi || row.barang?.organisasi || 'BEM',
    tanggalDiajukan: row.tanggalPengajuan || row.startDate,
    tanggalMulai: row.startDate || row.mulai,
    tanggalSelesai: row.endDate || row.selesai,
    jumlahUnit: row.jumlahPinjam ?? 1,
    status: row.status,
    keperluan: row.keperluan || '—',
    alasanPenolakan: row.alasanPenolakan || null,
  }));
  return [...dynamicMapped, ...DEMO_PEMINJAMAN_ROWS].slice(0, 4);
}

function getPengembalianTableRows() {
  return DEMO_PENGEMBALIAN_ROWS.slice(0, 4);
}

function renderSummaryCards() {
  const applications = livePeminjaman.filter((row) => String(row.status || '').toLowerCase() === 'diajukan').length || 2;
  const damaged = liveInventaris.filter((row) => String(row.kondisi || '').toLowerCase() === 'rusak').length || 3;
  const available = liveInventaris.filter((row) => Number(row.sisaHariIni ?? row.totalBarang ?? 0) > 0 && String(row.kondisi || '').toLowerCase() !== 'rusak').length || 4;
  const late = livePeminjaman.filter((row) => String(row.status || '').toLowerCase() === 'terlambat').length;
  const cards = [
    { label: 'Pengajuan', value: applications, icon: 'Inbox', iconBoxClass: 'bg-blue-50 text-blue-600' },
    { label: 'Rusak', value: damaged, icon: 'CircleX', iconBoxClass: 'bg-rose-50 text-rose-600' },
    { label: 'Tersedia', value: available, icon: 'CircleCheck', iconBoxClass: 'bg-emerald-50 text-emerald-600' },
    { label: 'Terlambat', value: late, icon: 'AlarmClock', iconBoxClass: 'bg-rose-100 text-rose-600' },
  ];
  return cards.map((card) => `
    <div class="flex min-h-[132px] flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:p-5">
      <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBoxClass}">${renderIcon(card.icon, 'h-4 w-4')}</span>
      <div class="mt-4">
        <p class="text-2xl font-bold leading-none text-slate-900">${card.value}</p>
        <p class="mt-2 text-sm font-medium text-slate-400">${escapeHtml(card.label)}</p>
      </div>
    </div>`).join('');
}

function renderRightBannerCards() {
  const totalUnits = liveInventaris.reduce((sum, item) => sum + Number(item.totalBarang || 0), 0) || 9;
  const approvals = livePeminjaman.filter((row) => String(row.status || '').toLowerCase() === 'diajukan').length || 1;
  return `
    <div class="flex flex-col gap-3">
      <div class="relative flex min-h-[96px] flex-col items-center justify-between overflow-hidden rounded-2xl bg-primary px-5 py-3 text-white shadow-sm">
        <span class="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-white/5"></span>
        <span class="relative z-10 inline-flex items-center rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900">Total Unit</span>
        <span class="relative z-10 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-slate-900">${totalUnits}</span>
      </div>
      <div class="relative flex min-h-[96px] flex-col items-center justify-between overflow-hidden rounded-2xl bg-brand px-5 py-3 text-white shadow-sm">
        <span class="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/15"></span>
        <span class="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="relative z-10 inline-flex items-center rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900">Persetujuan PJ</span>
        <span class="relative z-10 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-slate-900">${approvals}</span>
      </div>
    </div>`;
}

function renderManagementTable() {
  const isReturn = managementTab === 'pengembalian';
  const targetRoute = isReturn ? '#/kelola/pengembalian' : '#/kelola/peminjaman';
  const allRows = livePeminjaman.map((row, index) => ({
    id: String(row.id || row.idPeminjaman || index),
    nama: row.peminjam?.nama || row.pengguna?.nama || row.namaPeminjam || 'Peminjam',
    organisasi: row.inventaris?.namaOrganisasi || row.barang?.namaOrganisasi || row.barang?.organisasi || row.inventaris?.organisasi || '—',
    barang: row.inventaris?.namaBarang || row.barang?.namaBarang || row.namaBarang || 'Barang inventaris',
    mulai: row.startDate || row.mulai || row.tanggalMulai,
    pengambilan: row.tanggalPengambilan,
    selesai: row.endDate || row.selesai || row.tanggalSelesai,
    tanggalKembali: row.tanggalPengembalian,
    jumlah: row.jumlahPinjam ?? row.jumlahUnit ?? 1,
    status: row.status || 'diajukan',
  }));
  const returnStatuses = [
    STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
    STATUS_PEMINJAMAN.DIKEMBALIKAN,
    STATUS_PEMINJAMAN.DITOLAK,
    'menunggu_pengembalian', 'menunggu', 'terlambat', 'dikembalikan', 'selesai', 'ditolak',
  ].map((value) => String(value).toLowerCase());
  const rows = (isReturn
    ? allRows.filter((row) => returnStatuses.includes(String(row.status).toLowerCase()))
    : allRows).slice(0, 5);
  const pendingValues = ['diajukan', 'menunggu_persetujuan'];
  const approvedValues = ['disetujui'];
  const returnPendingValues = [String(STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN).toLowerCase(), 'menunggu_pengembalian', 'menunggu'];
  const body = rows.length ? rows.map((row, index) => {
    const status = String(row.status || '').toLowerCase();
    const pending = pendingValues.includes(status);
    const approved = approvedValues.includes(status);
    const returnPending = returnPendingValues.includes(status);
    const initials = String(row.nama).split(/\s+/).map((part) => part[0] || '').slice(0, 2).join('').toUpperCase();
    const actionButton = (action, title, icon, color = 'text-slate-400') => `<button type="button" data-action="${action}" data-id="${escapeHtml(row.id)}" title="${title}" aria-label="${title}" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color} transition hover:bg-slate-100">${renderIcon(icon, 'h-4 w-4')}</button>`;
    const actionButtons = isReturn
      ? `${actionButton('management-detail-return', 'Lihat detail pengembalian', 'Info')}${returnPending ? `${actionButton('management-approve-return', 'Proses pengembalian', 'CircleCheck', 'text-green-600 hover:bg-green-50')}${actionButton('management-reject-return', 'Tolak pengembalian', 'CircleX', 'text-red-600 hover:bg-red-50')}` : ''}`
      : `${actionButton('management-detail-loan', 'Lihat detail peminjaman', 'Info')}${pending ? `${actionButton('management-approve-loan', 'Setujui pengajuan', 'CircleCheck', 'text-green-600 hover:bg-green-50')}${actionButton('management-reject-loan', 'Tolak pengajuan', 'CircleX', 'text-red-600 hover:bg-red-50')}` : approved ? actionButton('management-pickup', 'Konfirmasi pengambilan', 'HandCoins', 'text-slate-400 hover:bg-slate-100') : ''}`;
    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">${escapeHtml(initials)}</span><span class="min-w-0"><span class="block truncate text-xs font-medium text-slate-500">${escapeHtml(row.nama)}</span><span class="mt-1 flex items-center gap-1.5 text-[11px] text-slate-700">${renderOrganisasiLogo(row.organisasi, row.logoUrl, 'h-3.5 w-3.5')}${escapeHtml(row.organisasi)}</span></span></div></td>
      <td class="min-w-[150px] px-4 py-4 text-xs text-slate-400">${escapeHtml(row.barang)}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.mulai))}</td>
      ${isReturn ? `<td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.selesai))}</td><td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.tanggalKembali))}</td>` : `<td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(approved || status === String(STATUS_PEMINJAMAN.DIPINJAM).toLowerCase() ? formatDateEnOrId(row.pengambilan) : '—')}</td><td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.selesai))}</td><td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(row.jumlah)}</td>`}
      ${isReturn ? `<td class="whitespace-nowrap px-4 py-4 text-center">${renderStatusChip({ status: row.status, className: String(row.status || '').toLowerCase() === 'ditolak' ? 'status-chip-return-rejected' : '' })}</td>` : `<td class="whitespace-nowrap px-4 py-4 text-center">${renderStatusChip({ status: row.status })}</td>`}
      <td class="whitespace-nowrap px-1 py-4"><div class="flex items-center justify-center gap-0">${actionButtons}</div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="${isReturn ? 8 : 9}" class="px-6 py-16 text-center text-sm text-slate-400">${renderIcon('Search', 'mr-2 inline h-4 w-4')}Tidak ada data ${isReturn ? 'pengembalian' : 'peminjaman'}.</td></tr>`;

  const headers = isReturn
    ? '<th class="px-4 py-4 text-center font-semibold">No</th><th class="px-4 py-4 font-semibold">Nama Peminjam</th><th class="px-4 py-4 font-semibold">Barang Dipinjam</th><th class="px-4 py-4 text-center font-semibold">Tanggal Mulai</th><th class="px-4 py-4 text-center font-semibold">Tanggal Selesai</th><th class="px-4 py-4 text-center font-semibold">Tanggal Pengembalian</th><th class="px-4 py-4 text-center font-semibold">Status</th><th class="px-4 py-4 text-center font-semibold">Aksi</th>'
    : '<th class="px-4 py-4 text-center font-semibold">No</th><th class="px-4 py-4 font-semibold">Nama Peminjam</th><th class="px-4 py-4 font-semibold">Barang Dipinjam</th><th class="px-4 py-4 text-center font-semibold">Tanggal Mulai</th><th class="px-4 py-4 text-center font-semibold">Tanggal Pengambilan</th><th class="px-4 py-4 text-center font-semibold">Tanggal Selesai</th><th class="px-4 py-4 text-center font-semibold">Jumlah Unit</th><th class="px-4 py-4 text-center font-semibold">Status</th><th class="px-4 py-4 text-center font-semibold">Aksi</th>';
  return `
    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-[20px] font-semibold text-slate-900">Pengelolaan</h2>
      <div class="inline-flex self-start items-center gap-1 rounded-xl bg-white p-1.5 sm:self-auto" role="tablist" aria-label="Jenis pengelolaan">
        <button type="button" role="tab" data-action="switch-management-tab" data-tab="peminjaman" aria-selected="${!isReturn}" class="rounded-lg px-4 py-2 text-[11px] font-medium transition cursor-pointer select-none ${!isReturn ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">Kelola Peminjaman</button>
        <button type="button" role="tab" data-action="switch-management-tab" data-tab="pengembalian" aria-selected="${isReturn}" class="rounded-lg px-4 py-2 text-[11px] font-medium transition cursor-pointer select-none ${isReturn ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">Kelola Pengembalian</button>
      </div>
    </div>
    <section class="overflow-hidden rounded-xl border border-zinc-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div class="w-full overflow-x-auto"><table class="w-full min-w-[${isReturn ? '1000' : '1100'}px] border-collapse text-left">
        <thead><tr class="border-b border-slate-100 text-sm leading-[140%] tracking-normal text-slate-400">${headers}</tr></thead><tbody>${body}</tbody>
      </table></div>
    </section>
    <div class="mt-3 flex justify-end"><a href="${targetRoute}" class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 transition hover:text-primary hover:underline">Lihat Semua ${renderIcon('ChevronRight','h-3.5 w-3.5')}</a></div>`;
}

function renderTable() {
  const isPengembalian = activeTab === 'pengembalian';
  const rows = isPengembalian ? getPengembalianTableRows() : getPeminjamanTableRows();

  const headers = isPengembalian
    ? ['No', 'Nama Barang', 'Tanggal Mulai', 'Tanggal Selesai', 'Tanggal Dikembalikan', 'Jumlah Unit', 'Status', 'Aksi']
    : ['No', 'Nama Barang', 'Tanggal Diajukan', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah Unit', 'Status', 'Aksi'];

  const headerHtml = headers
    .map(
      (label, index) =>
        `<th class="px-4 py-4 font-semibold ${index === 1 ? 'text-left' : 'text-center'}">${escapeHtml(label)}</th>`
    )
    .join('');

  const bodyHtml = rows
    .map((row, index) => {
      const badge = getStatusBadge(row.status, isPengembalian);
      const orgBadgeCls = getOrgBadgeClass(row.organisasi);
      const orgInitial = String(row.organisasi || 'O').slice(0, 1).toUpperCase();

      const middleCols = isPengembalian
        ? `
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.tanggalMulai))}</td>
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.tanggalSelesai))}</td>
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${row.tanggalDikembalikan ? escapeHtml(formatDateEnOrId(row.tanggalDikembalikan)) : '-'}</td>
        `
        : `
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.tanggalDiajukan))}</td>
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.tanggalMulai))}</td>
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(formatDateEnOrId(row.tanggalSelesai))}</td>
        `;

      return `
        <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
          <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${index + 1}</td>
          <td class="min-w-[180px] px-4 py-3">
            <div class="max-w-[220px] truncate text-xs font-medium text-slate-500" title="${escapeHtml(row.namaBarang)}">${escapeHtml(row.namaBarang)}</div>
            <div class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
              ${renderOrganisasiLogo(row.organisasi, row.logoUrl, 'h-3.5 w-3.5')}
              <span>${escapeHtml(row.organisasi)}</span>
            </div>
          </td>
          ${middleCols}
          <td class="px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(row.jumlahUnit)}</td>
          <td class="px-4 py-4 text-center">
            <span class="inline-flex whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-medium ${badge.cls}">
              ${escapeHtml(badge.label)}
            </span>
          </td>
          <td class="px-4 py-4 text-center">
            <button
              type="button"
              data-action="open-detail"
              data-id="${escapeHtml(row.id)}"
              aria-label="Lihat detail ${escapeHtml(row.namaBarang)}"
              title="Lihat detail"
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ${renderIcon('Info', 'h-4 w-4')}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr class="border-b border-slate-100 text-sm leading-[140%] tracking-normal text-slate-400">
            ${headerHtml}
          </tr>
        </thead>
        <tbody>
          ${bodyHtml}
        </tbody>
      </table>
    </div>
  `;
}

function renderDetailModal() {
  if (!detailRow) return '';
  const isPengembalian = activeTab === 'pengembalian';
  const badge = getStatusBadge(detailRow.status, isPengembalian);

  return `
    <div class="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="dash-detail-title" class="relative z-10 isolate w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Detail ${isPengembalian ? 'Pengembalian' : 'Peminjaman'}
            </p>
            <h2 id="dash-detail-title" class="mt-1 text-lg font-semibold text-slate-900">${escapeHtml(detailRow.namaBarang)}</h2>
          </div>
          <button type="button" data-action="close-detail" aria-label="Tutup detail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            ${renderIcon('X', 'h-4 w-4')}
          </button>
        </div>
        <dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          <div>
            <dt class="text-xs text-slate-400">Organisasi</dt>
            <dd class="mt-1 font-medium text-slate-700 inline-flex items-center gap-1.5">${renderOrganisasiLogo(detailRow.organisasi, detailRow.logoUrl, 'h-4 w-4')}<span>${escapeHtml(detailRow.organisasi)}</span></dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">Status</dt>
            <dd class="mt-1 font-medium text-slate-700">${escapeHtml(badge.label)}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">Tanggal mulai</dt>
            <dd class="mt-1 font-medium text-slate-700">${escapeHtml(formatDateEnOrId(detailRow.tanggalMulai))}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">Tanggal selesai</dt>
            <dd class="mt-1 font-medium text-slate-700">${escapeHtml(formatDateEnOrId(detailRow.tanggalSelesai))}</dd>
          </div>
          ${
            isPengembalian
              ? `<div>
                  <dt class="text-xs text-slate-400">Tanggal dikembalikan</dt>
                  <dd class="mt-1 font-medium text-slate-700">${detailRow.tanggalDikembalikan ? escapeHtml(formatDateEnOrId(detailRow.tanggalDikembalikan)) : '-'}</dd>
                </div>`
              : `<div>
                  <dt class="text-xs text-slate-400">Tanggal diajukan</dt>
                  <dd class="mt-1 font-medium text-slate-700">${escapeHtml(formatDateEnOrId(detailRow.tanggalDiajukan))}</dd>
                </div>`
          }
          <div>
            <dt class="text-xs text-slate-400">Jumlah unit</dt>
            <dd class="mt-1 font-medium text-slate-700">${escapeHtml(detailRow.jumlahUnit)} unit</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-xs text-slate-400">Keperluan</dt>
            <dd class="mt-1 font-medium text-slate-700">${escapeHtml(detailRow.keperluan || '—')}</dd>
          </div>
          ${
            detailRow.alasanPenolakan
              ? `<div class="col-span-2">
                  <dt class="text-xs text-slate-400">Alasan penolakan</dt>
                  <dd class="mt-1 font-medium text-rose-700">${escapeHtml(detailRow.alasanPenolakan)}</dd>
                </div>`
              : ''
          }
        </dl>
        <div class="mt-6 flex justify-end">
          <button type="button" data-action="close-detail" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Tutup
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderManagementModal() {
  if (!managementModal || !managementModalRow) return '';
  const row = managementModalRow;
  const name = row.peminjam?.nama || row.pengguna?.nama || row.namaPeminjam || 'Peminjam';
  const nim = row.peminjam?.nim || row.pengguna?.nim || row.nim || '—';
  const org = row.inventaris?.namaOrganisasi || row.barang?.namaOrganisasi || row.barang?.organisasi || row.inventaris?.organisasi || '—';
  const item = row.inventaris?.namaBarang || row.barang?.namaBarang || row.namaBarang || 'Barang inventaris';
  const start = row.startDate || row.mulai || row.tanggalMulai;
  const end = row.endDate || row.selesai || row.tanggalSelesai;
  const id = String(row.id || row.idPeminjaman || '');
  const status = getStatusBadge(row.status);
  const close = { label: 'Kembali', action: 'management-close', variant: 'outline', className: 'w-1/2 rounded-xl' };
  const action = (label, name, variant, className = 'w-1/2 rounded-xl') => ({ label, action: name, dataId: id, variant, className });
  const shell = (title, content, buttons = '', widthClass = 'max-w-lg') => `<div class="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-management-modal-backdrop><section role="dialog" aria-modal="true" class="relative z-10 isolate max-h-[90vh] w-full ${widthClass} overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div class="mb-5 flex items-center justify-between gap-4"><h2 class="text-xl font-bold tracking-tight text-slate-900">${title}</h2><button type="button" data-action="management-close" aria-label="Tutup" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100">${renderIcon('X','h-5 w-5')}</button></div>${content}${buttons ? `<div class="mt-6 flex justify-end gap-3">${buttons}</div>` : ''}</section></div>`;
  const primary = (actionName, label, color = 'bg-primary text-white') => `<button type="button" data-action="${actionName}" data-id="${escapeHtml(id)}" class="rounded-xl ${color} px-5 py-2.5 text-sm font-semibold transition hover:brightness-110">${label}</button>`;

  if (managementModal === 'detail-loan' || managementModal === 'detail-return') {
    const isReturn = managementModal === 'detail-return';
    const isRejected = String(row.status || '').toLowerCase() === 'ditolak';
    const isLate = String(row.status || '').toLowerCase() === 'terlambat';
    const dateColumns = [
      ...(!isReturn ? [{ label: 'Tanggal Pengajuan', value: formatDateEnOrId(row.tanggalPengajuan || row.createdAt) }] : []),
      { label: 'Tanggal Mulai', value: formatDateEnOrId(start) },
      ...(isReturn || String(row.status || '').toLowerCase() === 'dipinjam' ? [{ label: 'Tanggal Pengambilan', value: formatDateEnOrId(row.tanggalPengambilan || row.tanggalAmbil || row.pickupDate || start) }] : []),
      { label: 'Tanggal Selesai', value: formatDateEnOrId(end) },
      ...(isReturn ? [{ label: 'Tanggal Pengembalian', value: formatDateEnOrId(row.tanggalPengembalian) }] : []),
    ];
    const dateGrid = `<div class="grid grid-cols-1 gap-4 ${dateColumns.length === 5 ? 'sm:grid-cols-5' : dateColumns.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} sm:gap-0 sm:divide-x sm:divide-slate-300">${dateColumns.map((date, index) => `<div class="text-center ${index === 0 ? 'sm:px-2' : 'sm:px-4'}"><p class="text-sm font-semibold text-slate-900 sm:text-base">${date.label}</p><p class="mt-3 text-sm font-medium text-slate-800 sm:text-base">${escapeHtml(date.value)}</p></div>`).join('')}</div>`;
    return `<div class="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-management-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="management-detail-title" class="relative z-10 isolate max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="flex items-start justify-between gap-4"><h2 id="management-detail-title" class="text-2xl font-semibold tracking-tight text-slate-900">${isReturn ? 'Detail Pengembalian' : 'Detail Peminjaman'}</h2><button type="button" data-action="management-close" aria-label="Tutup detail" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${renderIcon('X','h-5 w-5')}</button></div>
        <div class="mt-6 space-y-6 text-sm">
          <div class="flex items-center justify-between gap-6"><p class="text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Nama Peminjam</p><div class="text-right"><p class="text-base font-medium text-slate-800">${escapeHtml(name)}</p><p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600"><span class="inline-block h-4 w-4 rounded-full bg-slate-400" aria-hidden="true"></span>${escapeHtml(org)}</p></div></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">NIM</p><p class="text-base font-medium text-slate-800">${escapeHtml(nim)}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">${isReturn ? 'Barang Dipinjam' : 'Nama Barang'}</p><p class="text-right text-base font-medium text-slate-800">${escapeHtml(item)}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Jumlah Unit</p><p class="text-base font-medium text-slate-800">${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}</p></div>
          ${dateGrid}
          <div class="flex items-center justify-between gap-6"><p class="text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Status</p><div class="flex items-center gap-2">${isLate ? `<button type="button" data-action="management-show-late-tooltip" aria-label="Lihat waktu keterlambatan" aria-describedby="dashboard-late-tooltip" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">${renderIcon('AlertCircle', 'h-6 w-6')}</button>` : ''}${renderStatusChip({status: row.status, className: isReturn && isRejected ? 'status-chip-return-rejected' : ''})}</div></div>
          ${isRejected ? `<div><p class="mb-2 text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Alasan Penolakan</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-700">${escapeHtml(row.alasanPenolakan || 'Pengembalian ditolak oleh pengelola.')}</div></div>` : ''}
          <div><p class="mb-2 text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Keperluan Peminjaman Barang</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-800">${escapeHtml(row.keperluan || 'Seminar BEM')}</div></div>
          ${isReturn && row.kondisiPengembalian ? `<div><p class="mb-2 text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Kondisi Barang Saat Dikembalikan</p><p class="text-base text-slate-800">${escapeHtml(row.kondisiPengembalian)}</p></div>` : ''}
          ${isReturn && row.fotoKondisi ? `<div><p class="mb-2 text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Foto Kondisi Barang Saat Dikembalikan</p><img src="${escapeHtml(row.fotoKondisi)}" alt="Foto kondisi barang saat dikembalikan" class="max-h-48 rounded-xl object-contain"></div>` : ''}
          ${isReturn && row.sanksi ? `<div><p class="mb-2 text-base ${isReturn ? 'font-semibold' : 'font-medium'} text-slate-900">Sanksi</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base text-slate-700">${escapeHtml(row.sanksi)}</div></div>` : ''}
        </div><div class="mt-6 flex justify-end"><button type="button" data-action="management-close" class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110">Tutup</button></div>
      </section>${isLate ? `<div id="dashboard-late-tooltip" role="tooltip" class="pointer-events-none whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900" style="display:none;position:fixed;z-index:100000;filter:drop-shadow(0 5px 12px rgba(15,23,42,0.22))">Waktu Terlambat: ${escapeHtml(row.waktuTerlambat || 3)} Hari<span aria-hidden="true" style="position:absolute;right:-5px;top:50%;width:10px;height:10px;background:white;border-radius:2px;transform:translateY(-50%) rotate(45deg)"></span></div>` : ''}</div>`;
  }

  if (managementModal === 'confirm-approve-loan') return renderModalComponent({ variant: 'approve', title: 'Setujui pengajuan peminjaman?', description: 'Saya yakin ingin menyetujui peminjaman ini', actions: [close, action('Setujui','management-execute-approve-loan','default','w-1/2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700')] });
  if (managementModal === 'reject-loan') return `<div class="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-management-modal-backdrop>
    <section role="dialog" aria-modal="true" aria-labelledby="dashboard-loan-reject-title" class="relative z-10 isolate w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="dashboard-loan-reject-title" class="text-xl font-bold tracking-tight text-slate-900">Permohonan Ditolak</h2>
      <div class="mt-5 space-y-2"><label for="dashboard-reject-reason" class="block text-sm font-semibold text-slate-900">Alasan Penolakan</label><textarea id="dashboard-reject-reason" rows="3" placeholder="Masukkan alasan penolakan" style="resize:none" class="w-full resize-none rounded-xl border ${managementError ? 'border-red-300' : 'border-slate-200'} bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100">${escapeHtml(managementRejectReason)}</textarea>${managementError ? `<div role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 validation-blink">${escapeHtml(managementError)}</div>` : ''}</div>
      <div class="mt-6 flex items-center justify-end gap-3"><button type="button" data-action="management-close" class="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">Batal</button><button type="button" data-action="management-submit-reject-loan" class="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Kirim</button></div>
    </section></div>`;
  if (managementModal === 'confirm-reject-loan') return renderModalComponent({ variant: 'reject', title: 'Tolak pengajuan peminjaman?', description: 'Saya yakin ingin menolak peminjaman ini', actions: [close, action('Tolak','management-execute-reject-loan','default','w-1/2 rounded-xl bg-rose-600 text-white hover:bg-rose-700')] });
  if (managementModal === 'success-approve-loan') return renderModalComponent({ variant: 'success', title: 'Pengajuan Disetujui', description: 'Pengajuan peminjaman barang berhasil disetujui dan status telah diperbarui.', primaryAction: {label:'Tutup',action:'management-close',className:'w-full rounded-xl transition-colors hover:brightness-110'} });
  if (managementModal === 'success-reject-loan') return renderModalComponent({ variant: 'reject', title: 'Pengajuan Berhasil Ditolak', description: 'Pengajuan peminjaman barang berhasil ditolak.', primaryAction: {label:'Tutup',action:'management-close',className:'w-full rounded-xl transition-colors hover:brightness-110'} });

  if (managementModal === 'pickup') return shell('Pengambilan Barang', `<div class="space-y-4">
    <div><label for="dashboard-pickup-date" class="mb-2 block text-sm font-semibold text-slate-900">Tanggal Pengambilan</label><div class="relative"><input id="dashboard-pickup-date" type="date" value="${escapeHtml(managementPickupDate)}" class="h-12 w-full rounded-2xl border border-slate-100 bg-white px-4 text-sm font-medium ${managementPickupDate ? 'text-slate-800' : 'text-transparent'} outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100">${managementPickupDate ? '' : '<span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-medium text-slate-400">Pilih tanggal</span>'}</div></div>
    <div><p class="mb-2 text-sm font-semibold text-slate-900">Foto Barang</p><button type="button" data-action="management-choose-pickup-photo" class="flex min-h-[150px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition-colors hover:bg-slate-100">${managementPickupPhoto ? `<img src="${escapeHtml(managementPickupPhoto)}" alt="Foto barang" class="max-h-32 rounded-lg object-contain">` : `<img src="assets/img/Image-Dropbox.png" alt="" class="mb-2 h-10 w-10 object-contain"><span class="text-xs font-semibold text-slate-700">Seret foto ke sini, atau Pilih File</span><span class="mt-1 text-[10px] text-slate-400">File harus berformat JPG atau PNG dengan ukuran maksimal 2 MB.</span>`}</button><input id="dashboard-pickup-photo" type="file" accept="image/jpeg,image/png,image/jpg" class="sr-only">${managementPickupPhotoError ? `<p class="mt-1 text-xs text-rose-600">${escapeHtml(managementPickupPhotoError)}</p>` : ''}</div>
    ${managementError ? `<p role="alert" class="text-xs text-red-600">${escapeHtml(managementError)}</p>` : ''}</div>`, `${primary('management-close','Batal','border border-slate-200 bg-white text-slate-600 hover:border-rose-700 hover:bg-rose-700 hover:text-white')}${primary('management-submit-pickup','Kirim')}`);

  if (managementModal === 'confirm-approve-return') return '';
  if (managementModal === 'form-approve-return') return '';
    if (managementModal === 'confirm-submit-return') return renderModalComponent({ variant: 'send', title: 'Kirim Form Pengembalian?', description: 'Periksa kembali data pengajuan yang akan anda kirim', actions: [ {label:'Kembali',action:'management-back-to-return-form',variant:'outline',className:'w-1/2 rounded-xl'}, action('Kirim','management-execute-approve-return','default','w-1/2 rounded-xl bg-primary text-white transition-colors hover:brightness-110') ] });
  if (managementModal === 'confirm-cancel-return-form') return renderModalComponent({ variant: 'cancel', title: 'Batal Kirim Form?', description: 'Apakah anda yakin ingin batal menyetujui pengembalian?', actions: [{label:'Kembali',action:'management-back-to-return-form',variant:'outline',className:'w-1/2 rounded-xl'},action('Batalkan','management-cancel-return-confirmed','default','w-1/2 rounded-xl bg-primary text-white transition-colors hover:brightness-110')] });
  if (managementModal === 'success-approve-return') return renderModalComponent({ variant: 'success', title: 'Pengembalian Berhasil!', description: 'Persetujuan pengembalian dan data berhasil disimpan.', primaryAction: {label:'Kembali',action:'management-close',className:'w-full rounded-xl bg-primary text-white transition-colors hover:brightness-110'} });
  if (managementModal === 'confirm-reject-return') return renderModalComponent({ variant: 'reject', title: 'Tolak pengajuan pengembalian?', description: 'Periksa kembali data pengajuan yang akan anda tolak', actions: [{label:'Kembali',action:'management-back-reject-return',variant:'outline',className:'w-1/2 rounded-xl'}, action('Tolak','management-execute-reject-return','default','w-1/2 rounded-xl bg-rose-600 text-white transition-colors hover:brightness-110')] });
  if (managementModal === 'reject-return') return `<div class="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-management-modal-backdrop>
    <section role="dialog" aria-modal="true" aria-labelledby="dashboard-return-reject-title" class="relative z-10 isolate w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="dashboard-return-reject-title" class="text-xl font-bold tracking-tight text-slate-900">Permohonan Ditolak</h2>
      <div class="mt-5 space-y-2"><label for="dashboard-return-reason" class="block text-sm font-semibold text-slate-900">Alasan Penolakan</label><textarea id="dashboard-return-reason" rows="3" placeholder="Masukkan alasan penolakan" style="resize:none" class="w-full resize-none rounded-xl border ${managementError ? 'border-red-300' : 'border-slate-200'} bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100">${escapeHtml(managementReturnReason)}</textarea>${managementError ? `<div role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 validation-blink">${escapeHtml(managementError)}</div>` : ''}</div>
      <div class="mt-6 flex items-center justify-end gap-3"><button type="button" data-action="management-close" class="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">Batal</button><button type="button" data-action="management-submit-reject-return" class="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Kirim</button></div>
    </section></div>`;
  if (managementModal === 'success-reject-return') return renderModalComponent({ variant: 'reject', title: 'Pengembalian Berhasil Ditolak!', description: 'Persetujuan pengembalian dan data berhasil ditolak.', primaryAction: {label:'Kembali',action:'management-close',className:'w-full rounded-xl bg-primary text-white transition-colors hover:brightness-110'} });
  return '';
}

function renderDashboardReturnFormPage() {
  if (!managementModalRow) return '';
  const row = managementModalRow;
  const name = row.peminjam?.nama || row.pengguna?.nama || row.namaPeminjam || 'Peminjam';
  const nim = row.peminjam?.nim || row.pengguna?.nim || row.nim || '—';
  const org = row.inventaris?.namaOrganisasi || row.barang?.namaOrganisasi || row.barang?.organisasi || row.inventaris?.organisasi || '—';
  const item = row.inventaris?.namaBarang || row.barang?.namaBarang || row.namaBarang || 'Barang inventaris';
  const readonlyClass = 'w-full rounded-xl border border-transparent bg-slate-50 px-4 py-3 text-sm text-slate-700 cursor-not-allowed';
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';
  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-6"><h1 class="text-2xl font-semibold tracking-tight text-slate-900">Form Pengembalian</h1><p class="mt-1 text-sm text-slate-400">Lengkapi informasi pengembalian dan kondisi barang.</p></div>
    <div class="w-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div class="grid grid-cols-1 gap-4">
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">Nama Peminjam</label><input type="text" readonly value="${escapeHtml(name)}" class="${readonlyClass}"></div>
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">NIM</label><input type="text" readonly value="${escapeHtml(nim)}" class="${readonlyClass}"></div>
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">OKI Peminjam</label><input type="text" readonly value="${escapeHtml(org)}" class="${readonlyClass}"></div>
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">Barang Dipinjam</label><input type="text" readonly value="${escapeHtml(item)}" class="${readonlyClass}"></div>
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">Keperluan Peminjaman Barang</label><input type="text" readonly value="${escapeHtml(row.keperluan || 'Kebutuhan kegiatan')}" class="${readonlyClass}"></div>
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">Jumlah Unit</label><input type="text" readonly value="${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}" class="${readonlyClass}"></div>
        <div class="space-y-1.5"><label for="dashboard-return-date" class="block text-sm font-medium text-slate-700">Tanggal Pengembalian</label><div data-action="management-open-return-date" class="relative flex min-h-[46px] w-full cursor-pointer items-center rounded-xl border ${managementReturnDateError ? 'border-rose-400' : 'border-slate-200'} bg-white px-4 py-3 transition-colors hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"><span id="dashboard-return-date-display" class="pointer-events-none flex-1 text-sm ${managementReturnDate ? 'text-slate-800' : 'text-slate-400'}">${managementReturnDate ? escapeHtml(formatDateEnOrId(managementReturnDate)) : 'Pilih Tanggal'}</span><span class="pointer-events-none ml-3 text-slate-400">${renderIcon('CalendarDays', 'h-5 w-5 text-slate-400')}</span><input type="date" id="dashboard-return-date" aria-label="Pilih tanggal pengembalian" min="${todayIsoDate()}" value="${escapeHtml(managementReturnDate)}" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" style="color-scheme:light"></div>${managementReturnDateError ? `<p id="dashboard-return-date-error" role="alert" class="text-xs text-rose-600">${escapeHtml(managementReturnDateError)}</p>` : ''}</div>
        <div class="space-y-1.5"><label for="dashboard-return-sanction" class="block text-sm font-medium text-slate-700">Sanksi / Catatan</label><textarea id="dashboard-return-sanction" rows="3" placeholder="Masukkan sanksi atau catatan" class="${fieldClass} resize-none ${managementReturnSanksiError ? 'border-rose-400' : ''}">${escapeHtml(managementReturnSanksi)}</textarea>${managementReturnSanksiError ? `<p id="dashboard-return-sanction-error" role="alert" class="text-xs text-rose-600">${escapeHtml(managementReturnSanksiError)}</p>` : ''}</div>
        <div class="space-y-2"><p class="text-sm font-medium text-slate-700">Kondisi Barang Saat Dikembalikan</p><div class="flex flex-col items-start gap-3 text-sm text-slate-700"><label class="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-primary"><input class="accent-[var(--color-primary)]" type="radio" name="dashboard-return-condition" value="baik" ${managementReturnCondition === 'baik' ? 'checked' : ''}>Baik</label><label class="inline-flex cursor-pointer items-center gap-2 transition-colors hover:text-primary"><input class="accent-[var(--color-primary)]" type="radio" name="dashboard-return-condition" value="rusak" ${managementReturnCondition === 'rusak' ? 'checked' : ''}>Rusak</label></div></div>
        <div class="space-y-1.5"><label class="block text-sm font-medium text-slate-700">Foto Kondisi Barang Saat Dikembalikan</label><button type="button" data-action="management-choose-return-photo" class="flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-primary hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-primary/20">${managementReturnPhoto ? `<img src="${escapeHtml(managementReturnPhoto)}" alt="Foto kondisi barang" class="max-h-40 rounded-lg object-contain">` : `<img src="assets/img/Image-Dropbox.png" alt="" class="mb-2 h-9 w-9 object-contain"><span class="text-sm font-medium text-slate-700">Pilih foto kondisi barang</span><span class="mt-1 text-xs text-slate-400">Format JPG atau PNG</span>`}</button><input id="dashboard-return-photo" type="file" accept="image/jpeg,image/png,image/jpg" class="sr-only">${managementReturnPhotoError ? `<p class="text-sm text-rose-600">${escapeHtml(managementReturnPhotoError)}</p>` : ''}</div>
      </div>
      ${managementError ? `<p role="alert" class="mt-3 text-sm text-rose-600">${escapeHtml(managementError)}</p>` : ''}
      <div class="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" data-action="management-cancel-return-form" class="h-12 min-w-[112px] rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">Batal</button><button type="button" data-action="management-submit-return-form" class="h-12 min-w-[112px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/30">Kirim</button></div>
    </div>
  </section>`;
}


function renderDashboardContent(ctx = {}) {
  if (managementModal === 'form-approve-return') return renderDashboardReturnFormPage() + renderManagementModal();
  const user = ctx.user || currentUser;
  const userName = user?.nama || 'Maitri Sakti';
  const seeAllHref = activeTab === 'pengembalian' ? '#/pengajuan-saya/pengembalian' : '#/pengajuan-saya/peminjaman';

  return `
    <section class="min-h-[calc(100vh-112px)] rounded-none bg-background -m-4 p-4 sm:-m-7 sm:p-7">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_240px] xl:grid-cols-[1fr_256px]">
        <div class="flex flex-col justify-between">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Halo, ${escapeHtml(userName)}
            </h1>
            <p class="mt-1 text-sm text-slate-400">
              Siap menyiapkan kegiatan organisasi hari ini?
            </p>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            ${renderSummaryCards()}
          </div>
        </div>

        ${renderRightBannerCards()}
      </div>

      <div class="mt-5">
        ${renderManagementTable()}
      </div>

      <div class="mt-7">
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-[20px] font-semibold text-slate-900">Pengajuan Saya</h2>
          <div class="inline-flex self-start items-center gap-1 rounded-xl bg-white p-1.5 sm:self-auto" role="tablist" aria-label="Kategori Pengajuan Saya">
            <button
              type="button"
              role="tab"
              data-action="switch-tab"
              data-tab="peminjaman"
              aria-selected="${activeTab === 'peminjaman'}"
              class="rounded-lg px-4 py-2 text-[11px] font-medium transition cursor-pointer select-none ${
                activeTab === 'peminjaman' ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }"
            >
              Peminjaman
            </button>
            <button
              type="button"
              role="tab"
              data-action="switch-tab"
              data-tab="pengembalian"
              aria-selected="${activeTab === 'pengembalian'}"
              class="rounded-lg px-4 py-2 text-[11px] font-medium transition cursor-pointer select-none ${
                activeTab === 'pengembalian' ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }"
            >
              Pengembalian
            </button>
          </div>
        </div>

        <section class="overflow-hidden rounded-xl border border-zinc-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          ${renderTable()}
        </section>

        <div class="mt-3 flex justify-end">
          <a
            href="${seeAllHref}"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 transition hover:text-primary hover:underline"
          >
            <span>Lihat Semua</span>
            ${renderIcon('ChevronRight', 'h-3.5 w-3.5')}
          </a>
        </div>
      </div>

      ${renderDetailModal()}
      ${renderManagementModal()}
    </section>
  `;
}

export function render(ctx = {}) {
  currentUser = ctx.user || null;
  return renderDashboardContent(ctx);
}

export async function mount(root, ctx = {}) {
  rootElement = root;
  currentUser = ctx.user || null;
  // Pertahankan tab terakhir saat pengguna kembali ke Dashboard PJ.
  detailRow = null;
  managementModal = null;
  managementModalRow = null;
  managementLateTooltipVisible = false;
  managementLateTooltipHovered = false;
  if (managementLateTooltipTimeout) clearTimeout(managementLateTooltipTimeout);
  managementLateTooltipTimeout = null;
  managementError = '';
  managementReturnCondition = 'baik';
  managementReturnPhoto = '';
  managementReturnSanksi = '';
  managementReturnPhotoError = '';

  try {
    const [loans, pjRequests, inventoryResult] = await Promise.all([getPeminjaman(), getRequestPj(), getInventarisKelola()]);
    livePeminjaman = Array.isArray(loans) ? loans : [];
    liveRequestPj = Array.isArray(pjRequests) ? pjRequests : [];
    liveInventaris = Array.isArray(inventoryResult?.data) ? inventoryResult.data : [];
  } catch {
    livePeminjaman = [];
    liveRequestPj = [];
    liveInventaris = [];
  }

  if (rootElement) {
    rootElement.innerHTML = renderDashboardContent(ctx);
  }

  clickHandler = async (event) => {
    const refreshDashboard = () => { if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx); };
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.matches('[data-modal-overlay]')) { detailRow = null; refreshDashboard(); }
      if (event.target.matches('[data-management-modal-backdrop]')) { hideManagementLateTooltip(); managementModal = null; managementModalRow = null; managementError = ''; refreshDashboard(); }
      return;
    }

    const action = actionEl.dataset.action;
    if (action === 'management-open-return-date') {
      const dateInput = rootElement.querySelector('#dashboard-return-date');
      try { dateInput?.showPicker?.(); } catch { dateInput?.focus(); }
      return;
    }
    const findManagementRow = (id) => livePeminjaman.find((row) => String(row.id || row.idPeminjaman) === String(id)) || null;
    const setManagementModal = (name, id = actionEl.dataset.id) => {
      managementModalRow = findManagementRow(id);
      managementModal = managementModalRow ? name : null;
      managementError = '';
      refreshDashboard();
    };
    if (action === 'management-close') {
      hideManagementLateTooltip();
      managementModal = null; managementModalRow = null; managementError = ''; refreshDashboard(); return;
    }
    if (action === 'management-show-late-tooltip') {
      showManagementLateTooltip(actionEl, true);
      return;
    }
    if (action === 'management-detail-loan') { setManagementModal('detail-loan'); return; }
    if (action === 'management-detail-return') { setManagementModal('detail-return'); return; }
    if (action === 'management-approve-loan') { setManagementModal('confirm-approve-loan'); return; }
    if (action === 'management-reject-loan') { managementRejectReason = ''; managementRejectReasonValidationActive = false; setManagementModal('reject-loan'); return; }
    if (action === 'management-submit-reject-loan') {
      managementRejectReason = rootElement.querySelector('#dashboard-reject-reason')?.value.trim() || '';
      if (!managementRejectReason) { managementRejectReasonValidationActive = true; managementError = 'Alasan penolakan wajib diisi.'; refreshDashboard(); return; }
      managementModal = 'confirm-reject-loan'; managementError = ''; refreshDashboard(); return;
    }
    if (action === 'management-back-reject-loan') { managementModal = 'reject-loan'; managementError = ''; refreshDashboard(); return; }
    if (action === 'management-execute-approve-loan' || action === 'management-execute-reject-loan') {
      const id = managementModalRow?.id || managementModalRow?.idPeminjaman;
      try {
        await updateMockPeminjamanStatus(id, action === 'management-execute-approve-loan' ? STATUS_PEMINJAMAN.DISETUJUI : STATUS_PEMINJAMAN.DITOLAK, action === 'management-execute-reject-loan' ? { alasanPenolakan: managementRejectReason } : {});
        livePeminjaman = await getPeminjaman(); managementNotice = action === 'management-execute-approve-loan' ? 'Pengajuan berhasil disetujui.' : 'Pengajuan berhasil ditolak.';
        managementModal = action === 'management-execute-approve-loan' ? 'success-approve-loan' : 'success-reject-loan'; managementError = ''; refreshDashboard();
      } catch (error) { managementError = error?.message || 'Status pengajuan gagal diperbarui.'; refreshDashboard(); }
      return;
    }
    if (action === 'management-pickup') { managementPickupDate = new Date().toISOString().slice(0,10); managementPickupPhoto = ''; managementPickupPhotoError = ''; setManagementModal('pickup'); return; }
    if (action === 'management-submit-pickup') {
      managementPickupDate = rootElement.querySelector('#dashboard-pickup-date')?.value || '';
      if (!managementPickupDate) { managementError = 'Tanggal pengambilan wajib diisi.'; refreshDashboard(); return; }
      try { await updateMockPeminjamanPickup(managementModalRow?.id || managementModalRow?.idPeminjaman, { tanggalPengambilan: managementPickupDate, fotoPengambilan: managementPickupPhoto }); livePeminjaman = await getPeminjaman(); managementModal = null; managementModalRow = null; managementError = ''; refreshDashboard(); }
      catch (error) { managementError = error?.message || 'Pengambilan gagal dikonfirmasi.'; refreshDashboard(); }
      return;
    }
    if (action === 'management-approve-return') { managementReturnDate = ''; managementReturnCondition = 'baik'; managementReturnPhoto = ''; managementReturnSanksi = ''; managementReturnPhotoError = ''; managementError = ''; managementReturnDateError = ''; managementReturnSanksiError = ''; setManagementModal('form-approve-return'); return; }
    if (action === 'management-open-form-approve-return') { managementReturnDate = ''; managementModal = 'form-approve-return'; managementError = ''; managementReturnDateError = ''; managementReturnSanksiError = ''; refreshDashboard(); return; }
    if (action === 'management-submit-return-form') {
      managementReturnDate = rootElement.querySelector('#dashboard-return-date')?.value || '';
      managementReturnSanksi = rootElement.querySelector('#dashboard-return-sanction')?.value || '';
      managementReturnCondition = rootElement.querySelector('input[name="dashboard-return-condition"]:checked')?.value || managementReturnCondition;
      managementReturnDateError = managementReturnDate ? '' : 'Tanggal pengembalian wajib diisi.';
      managementReturnSanksiError = managementReturnSanksi.trim() ? '' : 'Sanksi / catatan wajib diisi.';
      if (managementReturnDateError || managementReturnSanksiError) { refreshDashboard(); return; }
      managementModal = 'confirm-submit-return'; managementError = ''; refreshDashboard(); return;
    }
    if (action === 'management-back-to-return-form') { managementModal = 'form-approve-return'; managementError = ''; managementReturnDateError = ''; managementReturnSanksiError = ''; refreshDashboard(); return; }
    if (action === 'management-cancel-return-form') { managementModal = 'confirm-cancel-return-form'; managementError = ''; refreshDashboard(); return; }
    if (action === 'management-cancel-return-confirmed') { managementModal = null; managementModalRow = null; managementError = ''; refreshDashboard(); return; }
    if (action === 'management-choose-return-photo') { rootElement.querySelector('#dashboard-return-photo')?.click(); return; }
    if (action === 'management-choose-pickup-photo') { rootElement.querySelector('#dashboard-pickup-photo')?.click(); return; }
    if (action === 'management-execute-approve-return') {
      try {
        await updateMockPengembalianStatus(managementModalRow?.id || managementModalRow?.idPeminjaman, STATUS_PEMINJAMAN.DIKEMBALIKAN, { tanggalPengembalian: managementReturnDate, sanksi: managementReturnSanksi, kondisiPengembalian: managementReturnCondition, fotoKondisi: managementReturnPhoto });
        livePeminjaman = await getPeminjaman(); managementModal = 'success-approve-return'; managementError = '';
        refreshDashboard();
      } catch (error) { managementError = error?.message || 'Pengembalian gagal dikonfirmasi.'; managementModal = 'form-approve-return'; refreshDashboard(); }
      return;
    }
    if (action === 'management-reject-return') { managementReturnReason = ''; managementError = ''; setManagementModal('reject-return'); return; }
    if (action === 'management-open-form-reject-return') { managementReturnReason = ''; managementError = ''; managementModal = 'reject-return'; refreshDashboard(); return; }
    if (action === 'management-submit-reject-return') {
      managementReturnReason = rootElement.querySelector('#dashboard-return-reason')?.value.trim() || '';
      if (!managementReturnReason) { managementError = 'Alasan penolakan wajib diisi.'; refreshDashboard(); return; }
      managementError = '';
      managementModal = 'confirm-reject-return';
      refreshDashboard();
      return;
    }
    if (action === 'management-back-reject-return') { managementModal = 'reject-return'; managementError = ''; refreshDashboard(); return; }
    if (action === 'management-execute-reject-return') {
      try { await updateMockPengembalianStatus(managementModalRow?.id || managementModalRow?.idPeminjaman, STATUS_PEMINJAMAN.DITOLAK, { alasanPenolakan: managementReturnReason }); livePeminjaman = await getPeminjaman(); managementModal = 'success-reject-return'; managementError = ''; refreshDashboard(); }
      catch (error) { managementError = error?.message || 'Pengembalian gagal ditolak.'; managementModal = 'confirm-reject-return'; refreshDashboard(); }
      return;
    }
    if (action === 'switch-management-tab') {
      const nextTab = actionEl.dataset.tab;
      if (nextTab === 'peminjaman' || nextTab === 'pengembalian') {
        managementTab = nextTab;
        if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx);
      }
      return;
    }

    if (action === 'switch-tab') {
      const nextTab = actionEl.dataset.tab;
      if (nextTab === 'peminjaman' || nextTab === 'pengembalian') {
        activeTab = nextTab;
        detailRow = null;
        if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx);
      }
      return;
    }

    if (action === 'open-detail') {
      const id = actionEl.dataset.id;
      const rows = activeTab === 'pengembalian' ? getPengembalianTableRows() : getPeminjamanTableRows();
      detailRow = rows.find((item) => String(item.id) === String(id)) || null;
      if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx);
      return;
    }

    if (action === 'close-detail') {
      detailRow = null;
      if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx);
    }
  };

  const managementInputHandler = (event) => {
    if (event.target.id === 'dashboard-return-date') {
      managementReturnDate = event.target.value;
      const dateDisplay = rootElement.querySelector('#dashboard-return-date-display');
      if (dateDisplay) { dateDisplay.textContent = managementReturnDate ? formatDateEnOrId(managementReturnDate) : 'Pilih Tanggal'; dateDisplay.classList.toggle('text-slate-400', !managementReturnDate); dateDisplay.classList.toggle('text-slate-800', !!managementReturnDate); }
      if (managementReturnDate) { managementReturnDateError = ''; rootElement.querySelector('#dashboard-return-date-error')?.remove(); event.target.classList.remove('border-rose-400'); }
      return;
    }
    if (event.target.id === 'dashboard-return-sanction') {
      managementReturnSanksi = event.target.value;
      if (managementReturnSanksi.trim()) { managementReturnSanksiError = ''; rootElement.querySelector('#dashboard-return-sanction-error')?.remove(); event.target.classList.remove('border-rose-400'); }
      return;
    }
    if (event.target.id === 'dashboard-reject-reason') {
      managementRejectReason = event.target.value;
      if (managementRejectReasonValidationActive) {
        const message = 'Alasan penolakan wajib diisi.';
        const error = rootElement.querySelector('[role="alert"]');
        if (managementRejectReason.trim()) {
          if (managementError === message) managementError = '';
          error?.remove();
          event.target.classList.remove('border-red-300');
          event.target.classList.add('border-slate-200');
        } else {
          managementError = message;
          event.target.classList.remove('border-slate-200');
          event.target.classList.add('border-red-300');
          if (!error) {
            const messageElement = document.createElement('div');
            messageElement.setAttribute('role', 'alert');
            messageElement.className = 'rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 validation-blink';
            messageElement.textContent = message;
            event.target.insertAdjacentElement('afterend', messageElement);
          }
        }
      }
    }
    if (event.target.id === 'dashboard-return-reason') {
      managementReturnReason = event.target.value;
      const message = 'Alasan penolakan wajib diisi.';
      const error = event.target.parentElement?.querySelector('[role="alert"]');
      if (managementReturnReason.trim()) {
        if (managementError === message) managementError = '';
        error?.remove();
        event.target.classList.remove('border-red-300');
        event.target.classList.add('border-slate-200');
      } else if (managementError === message || managementReturnReason.length === 0) {
        managementError = message;
        event.target.classList.remove('border-slate-200');
        event.target.classList.add('border-red-300');
        if (!error) {
          const node = document.createElement('div');
          node.setAttribute('role', 'alert');
          node.className = 'rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 validation-blink';
          node.textContent = message;
          event.target.insertAdjacentElement('afterend', node);
        }
      }
    }
  };

  const returnPhotoChangeHandler = async (event) => {
    const isPickupPhoto = event.target.id === 'dashboard-pickup-photo';
    const isReturnPhoto = event.target.id === 'dashboard-return-photo';
    if (!isPickupPhoto && !isReturnPhoto) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateFotoFile(file);
    if (error) {
      if (isPickupPhoto) managementPickupPhotoError = error;
      else managementReturnPhotoError = error;
      refreshDashboardForPhoto();
      return;
    }
    try {
      const photo = await compressImageToDataUrl(file);
      if (isPickupPhoto) { managementPickupPhoto = photo; managementPickupPhotoError = ''; }
      else { managementReturnPhoto = photo; managementReturnPhotoError = ''; }
      refreshDashboardForPhoto();
    } catch {
      if (isPickupPhoto) managementPickupPhotoError = 'Gagal memproses foto barang.';
      else managementReturnPhotoError = 'Gagal memproses foto kondisi barang.';
      refreshDashboardForPhoto();
    }
  };
  const refreshDashboardForPhoto = () => { if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx); };
  managementLateTooltipPointerOverHandler = (event) => {
    const trigger = event.target?.closest?.('[data-action="management-show-late-tooltip"]');
    if (!trigger || trigger.contains(event.relatedTarget)) return;
    managementLateTooltipHovered = true;
    showManagementLateTooltip(trigger);
  };
  managementLateTooltipPointerOutHandler = (event) => {
    const trigger = event.target?.closest?.('[data-action="management-show-late-tooltip"]');
    if (!trigger || trigger.contains(event.relatedTarget)) return;
    managementLateTooltipHovered = false;
    // Klik mempertahankan tooltip sampai timer 3 detik selesai.
    if (managementLateTooltipTimeout) return;
    hideManagementLateTooltip();
  };
  managementLateTooltipScrollHandler = () => {
    if (managementLateTooltipVisible) updateManagementLateTooltipPosition();
  };
  root.addEventListener('click', clickHandler);
  root.addEventListener('input', managementInputHandler);
  root.addEventListener('change', returnPhotoChangeHandler);
  root.addEventListener('pointerover', managementLateTooltipPointerOverHandler);
  root.addEventListener('pointerout', managementLateTooltipPointerOutHandler);
  root.addEventListener('scroll', managementLateTooltipScrollHandler, true);
  window.addEventListener('resize', managementLateTooltipScrollHandler);
  root.__dashboardReturnPhotoChangeHandler = returnPhotoChangeHandler;
  root.__dashboardManagementInputHandler = managementInputHandler;
}

export function unmount(root) {
  const target = root || rootElement;
  if (target && clickHandler) target.removeEventListener('click', clickHandler);
  if (target?.__dashboardReturnPhotoChangeHandler) target.removeEventListener('change', target.__dashboardReturnPhotoChangeHandler);
  if (target?.__dashboardManagementInputHandler) target.removeEventListener('input', target.__dashboardManagementInputHandler);
  if (target && managementLateTooltipPointerOverHandler) target.removeEventListener('pointerover', managementLateTooltipPointerOverHandler);
  if (target && managementLateTooltipPointerOutHandler) target.removeEventListener('pointerout', managementLateTooltipPointerOutHandler);
  if (target && managementLateTooltipScrollHandler) target.removeEventListener('scroll', managementLateTooltipScrollHandler, true);
  if (managementLateTooltipScrollHandler && typeof window !== 'undefined') window.removeEventListener('resize', managementLateTooltipScrollHandler);
  hideManagementLateTooltip();
  managementLateTooltipPointerOverHandler = null;
  managementLateTooltipPointerOutHandler = null;
  managementLateTooltipScrollHandler = null;
  rootElement = null;
  clickHandler = null;
  detailRow = null;
  managementModal = null;
  managementModalRow = null;
}