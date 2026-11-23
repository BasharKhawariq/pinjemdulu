/**
 * dashboard-peminjam.js — Halaman Dashboard khusus Peminjam sesuai desain Figma PinjemDulu.
 * Untuk peran Penanggung Jawab (PJ Inventaris), tampilan dialihkan ke PlaceholderPage
 * agar pengerjaan Dashboard PJ tidak bentrok dengan bagian Peminjam.
 */

import { getPeminjaman } from '../services/peminjaman.js';
import { getRequestPj } from '../services/request-pj.js';
import { getPengembalian } from '../services/pengembalian.js';
import { isMockEnabled, apiFetch } from '../services/client.js';
import { ROLES, STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';
import { renderStatusChip } from '../ui/status-chip.js';
import { renderEmptyState } from '../ui/empty-state.js';
import { renderContainerLoading } from '../ui/loading-state.js';
import * as PlaceholderPage from './placeholder.js';

let activeTab = 'peminjaman';
let currentUser = null;
let isLoading = false;
let livePeminjaman = [];
let liveRequestPj = [];
let livePengembalian = [];
let apiDashboardStats = null;
let detailRow = null;
let rootElement = null;
let clickHandler = null;

function isPjUser(user) {
  return user?.role === ROLES.PENANGGUNG_JAWAB;
}

function formatDateEnOrId(isoStr) {
  if (!isoStr) return '-';
  const formatted = formatTanggal(String(isoStr).slice(0, 10));
  return formatted || '-';
}

function getStatusBadge(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'menunggu' || normalized === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN) {
    return { label: 'Menunggu', cls: 'bg-amber-50 text-amber-600' };
  }
  if (normalized === 'dikembalikan' || normalized === 'selesai' || normalized === STATUS_PEMINJAMAN.DIKEMBALIKAN) {
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
    return { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700' };
  }
  return { label: String(status || '-'), cls: 'bg-zinc-100 text-zinc-700' };
}

function computeStats() {
  if (apiDashboardStats) {
    return {
      disetujui: apiDashboardStats.totalDisetujui ?? 0,
      ditolak: apiDashboardStats.totalDitolak ?? 0,
      dikembalikan: apiDashboardStats.totalDikembalikan ?? 0,
      terlambat: apiDashboardStats.totalTerlambat ?? 0,
      totalPeminjaman: apiDashboardStats.totalPeminjaman ?? 0,
      pengajuanPj: apiDashboardStats.totalPengajuanPj ?? 0,
    };
  }

  const nim = currentUser?.nim || null;
  const pjCount = nim
    ? liveRequestPj.filter((item) => String(item.pemohon?.nim) === String(nim)).length
    : 0;

  return {
    disetujui: livePeminjaman.filter((r) => String(r.status || '').toLowerCase() === 'disetujui').length,
    ditolak: livePeminjaman.filter((r) => String(r.status || '').toLowerCase() === 'ditolak').length,
    dikembalikan: livePeminjaman.filter((r) => {
      const s = String(r.status || '').toLowerCase();
      return s === STATUS_PEMINJAMAN.DIKEMBALIKAN || s === 'dikembalikan' || s === 'selesai';
    }).length,
    terlambat: livePeminjaman.filter((r) => String(r.status || '').toLowerCase() === 'terlambat').length,
    totalPeminjaman: livePeminjaman.length,
    pengajuanPj: pjCount,
  };
}

function getPeminjamanTableRows() {
  if (livePeminjaman.length > 0) {
    return livePeminjaman.slice(0, 4).map((row, idx) => ({
      id: String(row.id || row.idPeminjaman || `live-${idx}`),
      namaBarang: row.namaBarang || row.inventaris?.namaBarang || row.barang?.namaBarang || 'Barang inventaris',
      organisasi: row.okiPemilik || row.inventaris?.namaOrganisasi || row.barang?.organisasi || row.namaOrganisasi || 'Organisasi',
      logoUrl: row.logoPemilikUrl || row.inventaris?.logoUrl || row.barang?.logoUrl || row.logoUrl || null,
      tanggalDiajukan: row.tanggalPengajuan || row.createdAt || row.startDate,
      tanggalMulai: row.startDate || row.mulai || row.tanggalMulai,
      tanggalSelesai: row.endDate || row.selesai || row.tanggalSelesai,
      tanggalPengambilan: row.tanggalPengambilan || null,
      jumlahUnit: row.jumlahPinjam ?? 1,
      status: row.status,
      keperluan: row.keperluan || '—',
      alasanPenolakan: row.alasanPenolakan || null,
    }));
  }
  return [];
}

function getPengembalianTableRows() {
  if (livePengembalian.length > 0) {
    return livePengembalian.slice(0, 4).map((row, idx) => ({
      id: String(row.id || row.idPengembalian || `live-${idx}`),
      namaBarang: row.namaBarang || row.inventaris?.namaBarang || row.barang?.namaBarang || 'Barang inventaris',
      organisasi: row.okiPemilik || row.inventaris?.namaOrganisasi || row.organisasi || row.namaOrganisasi || 'Organisasi',
      logoUrl: row.logoPemilikUrl || row.inventaris?.logoUrl || row.logoUrl || null,
      tanggalMulai: row.tanggalMulai,
      tanggalSelesai: row.tanggalSelesai,
      tanggalPengambilan: row.tanggalPengambilan || null,
      tanggalDikembalikan: row.tanggalDikembalikan,
      waktuTerlambat: row.waktuTerlambat || null,
      diprosesOleh: row.diprosesOleh || null,
      jumlahUnit: row.jumlahUnit ?? row.jumlahPinjam ?? 1,
      status: row.status,
      keperluan: row.keperluan || '—',
      alasanPenolakan: row.alasanPenolakan || null,
    }));
  }
  return [];
}

function renderSummaryCards() {
  const stats = computeStats();
  const cards = [
    {
      label: 'Disetujui',
      value: stats.disetujui,
      icon: 'CheckCircle2',
      iconBoxClass: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Ditolak',
      value: stats.ditolak,
      icon: 'XCircle',
      iconBoxClass: 'bg-rose-200 text-rose-700',
    },
    {
      label: 'Dikembalikan',
      value: stats.dikembalikan,
      icon: 'Inbox',
      iconBoxClass: 'bg-teal-100 text-teal-700',
    },
    {
      label: 'Terlambat',
      value: stats.terlambat,
      icon: 'AlarmClock',
      iconBoxClass: 'bg-rose-100 text-rose-600',
    },
  ];

  return cards
    .map(
      (card, index) => `
      <div class="pd-rise-in" style="animation-delay:${Math.min(index, 7) * 50}ms">
        <div class="pd-card-hover flex h-full min-h-[132px] flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:p-5">
          <div>
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBoxClass}">
              ${renderIcon(card.icon, 'h-4 w-4')}
            </span>
          </div>
          <div class="mt-4">
            <p class="text-2xl font-bold leading-none text-slate-900">${card.value}</p>
            <p class="mt-2 text-sm font-medium text-slate-400">${escapeHtml(card.label)}</p>
          </div>
        </div>
      </div>`
    )
    .join('');
}

function renderRightBannerCards() {
  const stats = computeStats();
  return `
    <div class="pd-rise-in flex flex-col gap-3">
      <div class="pd-card-hover relative flex min-h-[96px] flex-col items-center justify-between overflow-hidden rounded-2xl bg-primary px-5 py-3 text-white shadow-sm">
        <span class="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-white/5"></span>
        <span class="relative z-10 inline-flex items-center rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900">
          Total Peminjaman
        </span>
        <span class="relative z-10 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-slate-900">
          ${stats.totalPeminjaman}
        </span>
      </div>

      <div class="pd-card-hover relative flex min-h-[96px] flex-col items-center justify-between overflow-hidden rounded-2xl bg-brand px-5 py-3 text-white shadow-sm">
        <span class="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/15"></span>
        <span class="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="relative z-10 inline-flex items-center rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-900">
          Pengajuan PJ
        </span>
        <span class="relative z-10 mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-slate-900">
          ${stats.pengajuanPj}
        </span>
      </div>
    </div>
  `;
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

  const bodyHtml = rows.length ? rows
    .map((row, index) => {
      const badge = getStatusBadge(row.status);

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
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition active:scale-95 hover:bg-slate-100 hover:text-slate-700"
            >
              ${renderIcon('Info', 'h-4 w-4')}
            </button>
          </td>
        </tr>
      `;
    })
    .join('') : renderEmptyState({ colspan: 8 });

  const cardsHtml = rows.length ? rows.map((row, index) => {
      const badge = getStatusBadge(row.status);
      const dates = isPengembalian
        ? [
            { label: 'Tanggal Mulai', value: formatDateEnOrId(row.tanggalMulai) },
            { label: 'Tanggal Selesai', value: formatDateEnOrId(row.tanggalSelesai) },
            { label: 'Tanggal Dikembalikan', value: row.tanggalDikembalikan ? formatDateEnOrId(row.tanggalDikembalikan) : '—' },
          ]
        : [
            { label: 'Tanggal Diajukan', value: formatDateEnOrId(row.tanggalDiajukan) },
            { label: 'Tanggal Mulai', value: formatDateEnOrId(row.tanggalMulai) },
            { label: 'Tanggal Selesai', value: formatDateEnOrId(row.tanggalSelesai) },
          ];
      return `
        <div class="pd-rise-in" style="animation-delay:${Math.min(index, 7) * 50}ms">
          <article class="pd-card-hover rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pengajuan ${index + 1}</p>
              <h3 class="mt-1 break-words text-sm font-semibold text-slate-800">${escapeHtml(row.namaBarang)}</h3>
              <p class="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                ${renderOrganisasiLogo(row.organisasi, row.logoUrl, 'h-4 w-4')}
                <span>${escapeHtml(row.organisasi)}</span>
              </p>
            </div>
            <span class="inline-flex shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-medium ${badge.cls}">
              ${escapeHtml(badge.label)}
            </span>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3">
            ${dates.map((date) => `
              <div class="min-w-0">
                <dt class="text-[10px] text-slate-400">${date.label}</dt>
                <dd class="mt-1 break-words text-xs font-medium text-slate-700">${escapeHtml(date.value)}</dd>
              </div>
            `).join('')}
            <div>
              <dt class="text-[10px] text-slate-400">Jumlah Unit</dt>
              <dd class="mt-1 text-xs font-medium text-slate-700">${escapeHtml(row.jumlahUnit)}</dd>
            </div>
          </dl>
          <button
            type="button"
            data-action="open-detail"
            data-id="${escapeHtml(row.id)}"
            aria-label="Lihat detail ${escapeHtml(row.namaBarang)}"
            class="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            ${renderIcon('Info', 'h-4 w-4')}
            Lihat Detail
          </button>
          </article>
        </div>
      `;
    }).join('') : '<div class="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">Belum ada pengajuan.</div>';

  if (isLoading) {
    return renderContainerLoading({ message: 'Memuat pengajuan saya...', minHeight: 'min-h-[180px]' });
  }

  return `
    <div class="space-y-3 p-3 md:hidden" data-card-list>
      ${cardsHtml}
    </div>
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr class="border-b border-slate-100 text-sm leading-[140%] tracking-normal text-slate-400">
            ${headerHtml}
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

function renderDetailModal() {
  if (!detailRow) return '';
  const isPengembalian = activeTab === 'pengembalian';
  const statusKey = String(detailRow.status || '').toLowerCase();
  const isTerlambat = statusKey === 'terlambat' || statusKey === STATUS_PEMINJAMAN.TERLAMBAT;
  const isDikembalikan = statusKey === 'dikembalikan' || statusKey === 'selesai' || statusKey === STATUS_PEMINJAMAN.DIKEMBALIKAN;
  const isDitolak = statusKey === 'ditolak' || statusKey === STATUS_PEMINJAMAN.DITOLAK;
  const showPickup = !isPengembalian && (statusKey === 'dipinjam' || statusKey === STATUS_PEMINJAMAN.DIPINJAM);
  const daysLate = detailRow.waktuTerlambat || 3;
  const dateColumns = isPengembalian
    ? [
        { label: 'Tanggal Mulai', value: formatDateEnOrId(detailRow.tanggalMulai) },
        { label: 'Tanggal Pengambilan', value: detailRow.tanggalPengambilan ? formatDateEnOrId(detailRow.tanggalPengambilan) : '–' },
        { label: 'Tanggal Selesai', value: formatDateEnOrId(detailRow.tanggalSelesai) },
        { label: 'Tanggal Pengembalian', value: detailRow.tanggalDikembalikan ? formatDateEnOrId(detailRow.tanggalDikembalikan) : '–' },
      ]
    : [
        { label: 'Tanggal Pengajuan', value: formatDateEnOrId(detailRow.tanggalDiajukan) },
        { label: 'Tanggal Mulai', value: formatDateEnOrId(detailRow.tanggalMulai) },
        ...(showPickup ? [{ label: 'Tanggal Pengambilan', value: detailRow.tanggalPengambilan ? formatDateEnOrId(detailRow.tanggalPengambilan) : '–' }] : []),
        { label: 'Tanggal Selesai', value: formatDateEnOrId(detailRow.tanggalSelesai) },
      ];
  const title = isPengembalian ? (isDitolak ? 'Detail Penolakan' : 'Detail Pengembalian') : 'Detail Peminjaman';

  return `
    <div class="pd-fade-in fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-900/35 backdrop-blur-sm p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="dash-detail-title" class="pd-pop-in relative z-10 isolate max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="dash-detail-title" class="text-2xl font-semibold tracking-tight text-slate-900">${title}</h2>
          <button type="button" data-action="close-detail" aria-label="Tutup detail" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition active:scale-95 hover:bg-slate-100 hover:text-slate-700">${renderIcon('X', 'h-5 w-5')}</button>
        </div>

        <div class="mt-6 space-y-6 text-sm">
          <div class="flex items-center justify-between gap-6">
            <p class="text-base font-semibold text-slate-900">Barang Dipinjam</p>
            <div class="text-right">
              <p class="text-base font-medium text-slate-800">${escapeHtml(detailRow.namaBarang)}</p>
              <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">${renderOrganisasiLogo(detailRow.organisasi, detailRow.logoUrl, 'h-4 w-4')}<span>${escapeHtml(detailRow.organisasi)}</span></p>
            </div>
          </div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Jumlah Unit</p><p class="text-base font-medium text-slate-800">${escapeHtml(detailRow.jumlahUnit || 1)}</p></div>

          <div class="grid grid-cols-2 gap-4 ${dateColumns.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} sm:gap-0 sm:divide-x sm:divide-slate-300">
            ${dateColumns.map((date, index) => `<div class="text-center ${index === 0 ? 'sm:px-2' : 'sm:px-4'}"><p class="text-sm font-semibold text-slate-900 sm:text-base">${date.label}</p><p class="mt-3 text-sm font-medium text-slate-800 sm:text-base">${escapeHtml(date.value)}</p></div>`).join('')}
          </div>

          <div class="flex items-center justify-between gap-6">
            <p class="text-base font-semibold text-slate-900">Status</p>
            <div class="flex items-center gap-2">
              ${isPengembalian && isTerlambat ? `
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
              ${renderStatusChip({ status: detailRow.status })}
            </div>
          </div>

          ${isPengembalian && (isDikembalikan || isTerlambat) && detailRow.diprosesOleh ? `<div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Diproses Oleh</p><p class="text-base font-medium text-slate-800">${escapeHtml(detailRow.diprosesOleh)}</p></div>` : ''}
          ${isDitolak ? `<div><p class="mb-2 text-base font-semibold text-slate-900">${isPengembalian ? 'Alasan Penolakan' : 'Alasan Ditolak'}</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-700">${escapeHtml(detailRow.alasanPenolakan || (isPengembalian ? 'Pengembalian ditolak oleh pengelola.' : 'Peminjaman tidak dapat diproses karena alasan operasional'))}</div></div>` : ''}
          <div><p class="mb-2 text-base font-semibold text-slate-900">Keperluan Peminjaman Barang</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-800">${escapeHtml(detailRow.keperluan || '—')}</div></div>
        </div>

        <div class="mt-6 flex justify-end">
          <button type="button" data-action="close-detail" data-autofocus class="button-hover-soft-neutral rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors">Tutup</button>
        </div>
      </section>
    </div>
  `;
}

// Modal ditempatkan pada host terpisah agar buka/tutup modal tidak perlu
// membangun ulang seluruh dashboard (yang memicu ulang animasi kartu & tabel).
function openDetailModal(id) {
  const rows = activeTab === 'pengembalian' ? getPengembalianTableRows() : getPeminjamanTableRows();
  detailRow = rows.find((item) => String(item.id) === String(id)) || null;
  const host = rootElement?.querySelector('[data-detail-modal-host]');
  if (host) host.innerHTML = renderDetailModal();
}

function closeDetailModal() {
  detailRow = null;
  const host = rootElement?.querySelector('[data-detail-modal-host]');
  if (host) host.innerHTML = '';
}

function renderDashboardContent(ctx = {}) {
  const user = ctx.user || currentUser;
  const userName = user?.nama || 'Maitri Sakti';
  const seeAllHref = activeTab === 'pengembalian' ? '#/pengajuan-saya/pengembalian' : '#/pengajuan-saya/peminjaman';

  return `
    <section class="min-h-[calc(100dvh-112px)] rounded-none bg-background -m-4 p-4 sm:-m-7 sm:p-7">
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

      <div data-detail-modal-host>${renderDetailModal()}</div>
    </section>
  `;
}

export function render(ctx = {}) {
  if (isPjUser(ctx.user)) {
    return PlaceholderPage.render({ ...ctx, path: ctx.path || '#/dashboard-peminjam' });
  }
  currentUser = ctx.user || null;
  return renderDashboardContent(ctx);
}

export async function mount(root, ctx = {}) {
  if (isPjUser(ctx.user)) {
    return PlaceholderPage.mount(root, ctx);
  }
  rootElement = root;
  currentUser = ctx.user || null;
  activeTab = 'peminjaman';
  detailRow = null;

  isLoading = true;
  if (rootElement) {
    rootElement.innerHTML = renderDashboardContent(ctx);
  }

  try {
    const [loans, pjRequests, returns, dashStats] = await Promise.all([
      getPeminjaman(),
      getRequestPj(),
      !isMockEnabled() ? getPengembalian().catch(() => []) : [],
      !isMockEnabled() ? apiFetch('/api/dashboard').catch(() => null) : null,
    ]);
    livePeminjaman = Array.isArray(loans) ? loans : [];
    liveRequestPj = Array.isArray(pjRequests) ? pjRequests : [];
    livePengembalian = Array.isArray(returns) ? returns : [];
    apiDashboardStats = dashStats;
  } catch {
    livePeminjaman = [];
    liveRequestPj = [];
    livePengembalian = [];
    apiDashboardStats = null;
  } finally {
    isLoading = false;
  }

  if (rootElement) {
    rootElement.innerHTML = renderDashboardContent(ctx);
  }

  clickHandler = (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.matches('[data-modal-overlay]')) {
        closeDetailModal();
      }
      return;
    }

    const action = actionEl.dataset.action;
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
      openDetailModal(actionEl.dataset.id);
      return;
    }

    if (action === 'close-detail') {
      closeDetailModal();
    }
  };

  root.addEventListener('click', clickHandler);
}

export function unmount(root) {
  const target = root || rootElement;
  if (target && clickHandler) {
    target.removeEventListener('click', clickHandler);
  }
  rootElement = null;
  clickHandler = null;
  detailRow = null;
}
