/**
 * dashboard-peminjam.js — Halaman Dashboard khusus Peminjam sesuai desain Figma PinjemDulu.
 * Untuk peran Penanggung Jawab (PJ Inventaris), tampilan dialihkan ke PlaceholderPage
 * agar pengerjaan Dashboard PJ tidak bentrok dengan bagian Peminjam.
 */

import { getPeminjaman } from '../services/peminjaman.js';
import { getRequestPj } from '../services/request-pj.js';
import { ROLES, STATUS_PEMINJAMAN } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import * as PlaceholderPage from './placeholder.js';

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

let activeTab = 'pengembalian';
let currentUser = null;
let livePeminjaman = [];
let liveRequestPj = [];
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

function getOrgBadgeClass(org) {
  const key = String(org || '').toUpperCase();
  if (key === 'HMTI') return 'bg-amber-400 text-amber-950';
  if (key === 'HME' || key === 'HMF') return 'bg-rose-700 text-white';
  if (key === 'HMS') return 'bg-slate-800 text-amber-400';
  if (key === 'HIMANIA') return 'bg-blue-600 text-white';
  return 'bg-slate-200 text-slate-700';
}

function getStatusBadge(status) {
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
    return { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700' };
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
      (card) => `
      <div class="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div>
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBoxClass}">
            ${renderIcon(card.icon, 'h-5 w-5')}
          </span>
        </div>
        <div class="mt-4">
          <p class="text-2xl font-bold leading-none text-slate-900">${card.value}</p>
          <p class="mt-2 text-xs font-medium text-slate-400">${escapeHtml(card.label)}</p>
        </div>
      </div>`
    )
    .join('');
}

function renderRightBannerCards() {
  const stats = computeStats();
  return `
    <div class="flex flex-col gap-3.5">
      <div class="relative flex min-h-[112px] flex-col items-center justify-between overflow-hidden rounded-2xl bg-primary px-5 py-4 text-white shadow-sm">
        <span class="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-white/5"></span>
        <span class="relative z-10 inline-flex items-center rounded-full bg-white px-4 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
          Total Peminjaman
        </span>
        <span class="relative z-10 mt-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-900 shadow-sm">
          ${stats.totalPeminjaman}
        </span>
      </div>

      <div class="relative flex min-h-[112px] flex-col items-center justify-between overflow-hidden rounded-2xl bg-brand px-5 py-4 text-white shadow-sm">
        <span class="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/15"></span>
        <span class="pointer-events-none absolute -bottom-14 left-4 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="relative z-10 inline-flex items-center rounded-full bg-white px-4 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
          Pengajuan PJ
        </span>
        <span class="relative z-10 mt-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-900 shadow-sm">
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
        `<th class="px-4 py-3.5 font-semibold ${index === 1 ? 'text-left' : 'text-center'}">${escapeHtml(label)}</th>`
    )
    .join('');

  const bodyHtml = rows
    .map((row, index) => {
      const badge = getStatusBadge(row.status);
      const orgBadgeCls = getOrgBadgeClass(row.organisasi);
      const orgInitial = String(row.organisasi || 'O').slice(0, 1).toUpperCase();

      const middleCols = isPengembalian
        ? `
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${escapeHtml(formatDateEnOrId(row.tanggalMulai))}</td>
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${escapeHtml(formatDateEnOrId(row.tanggalSelesai))}</td>
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${row.tanggalDikembalikan ? escapeHtml(formatDateEnOrId(row.tanggalDikembalikan)) : '-'}</td>
        `
        : `
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${escapeHtml(formatDateEnOrId(row.tanggalDiajukan))}</td>
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${escapeHtml(formatDateEnOrId(row.tanggalMulai))}</td>
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${escapeHtml(formatDateEnOrId(row.tanggalSelesai))}</td>
        `;

      return `
        <tr class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60">
          <td class="whitespace-nowrap px-4 py-3.5 text-center text-[11px] text-slate-500">${index + 1}</td>
          <td class="min-w-[180px] px-4 py-3">
            <div class="max-w-[220px] truncate text-[11px] font-medium text-slate-400" title="${escapeHtml(row.namaBarang)}">${escapeHtml(row.namaBarang)}</div>
            <div class="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-slate-700">
              <span class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${orgBadgeCls}">${escapeHtml(orgInitial)}</span>
              <span>${escapeHtml(row.organisasi)}</span>
            </div>
          </td>
          ${middleCols}
          <td class="px-4 py-3.5 text-center text-[11px] text-slate-600">${escapeHtml(row.jumlahUnit)}</td>
          <td class="px-4 py-3.5 text-center">
            <span class="inline-flex whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-medium ${badge.cls}">
              ${escapeHtml(badge.label)}
            </span>
          </td>
          <td class="px-4 py-3.5 text-center">
            <button
              type="button"
              data-action="open-detail"
              data-id="${escapeHtml(row.id)}"
              aria-label="Lihat detail ${escapeHtml(row.namaBarang)}"
              title="Lihat detail"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
            >
              ${renderIcon('Info', 'h-[17px] w-[17px]')}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[860px] border-collapse text-left">
        <thead class="bg-white text-[10px] font-semibold uppercase tracking-[0.03em] text-slate-400">
          <tr class="border-b border-zinc-100">
            ${headerHtml}
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-50">
          ${bodyHtml}
        </tbody>
      </table>
    </div>
  `;
}

function renderDetailModal() {
  if (!detailRow) return '';
  const badge = getStatusBadge(detailRow.status);
  const isPengembalian = activeTab === 'pengembalian';

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="dash-detail-title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
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
            <dd class="mt-1 font-medium text-slate-700">${escapeHtml(detailRow.organisasi)}</dd>
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

function renderDashboardContent(ctx = {}) {
  const user = ctx.user || currentUser;
  const userName = user?.nama || 'Maitri Sakti';
  const seeAllHref = activeTab === 'pengembalian' ? '#/pengajuan-saya/pengembalian' : '#/pengajuan-saya/peminjaman';

  return `
    <section class="min-h-[calc(100vh-112px)] rounded-none bg-background -m-4 p-4 sm:-m-7 sm:p-7">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_240px] xl:grid-cols-[1fr_256px]">
        <div class="flex flex-col justify-between">
          <div>
            <h1 class="text-[24px] font-bold leading-tight text-slate-900 sm:text-[26px]">
              Halo, ${escapeHtml(userName)}
            </h1>
            <p class="mt-1 text-xs text-slate-400 sm:text-[13px]">
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
          <h2 class="text-[16px] font-bold text-slate-900">Pengajuan Saya</h2>
          <div class="inline-flex self-start rounded-xl bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:self-auto" role="tablist" aria-label="Kategori Pengajuan Saya">
            <button
              type="button"
              role="tab"
              data-action="switch-tab"
              data-tab="peminjaman"
              aria-selected="${activeTab === 'peminjaman'}"
              class="rounded-lg px-4 py-2 text-xs font-medium transition ${
                activeTab === 'peminjaman' ? 'bg-info font-semibold text-slate-900' : 'text-slate-600 hover:bg-zinc-50'
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
              class="rounded-lg px-4 py-2 text-xs font-medium transition ${
                activeTab === 'pengembalian' ? 'bg-info font-semibold text-slate-900' : 'text-slate-600 hover:bg-zinc-50'
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
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 transition hover:text-primary"
          >
            <span>Lihat Semua</span>
            ${renderIcon('ChevronRight', 'h-3.5 w-3.5')}
          </a>
        </div>
      </div>

      ${renderDetailModal()}
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
  activeTab = 'pengembalian';
  detailRow = null;

  try {
    const [loans, pjRequests] = await Promise.all([getPeminjaman(), getRequestPj()]);
    livePeminjaman = Array.isArray(loans) ? loans : [];
    liveRequestPj = Array.isArray(pjRequests) ? pjRequests : [];
  } catch {
    livePeminjaman = [];
    liveRequestPj = [];
  }

  if (rootElement) {
    rootElement.innerHTML = renderDashboardContent(ctx);
  }

  clickHandler = (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) {
      if (event.target.matches('[data-modal-overlay]')) {
        detailRow = null;
        if (rootElement) rootElement.innerHTML = renderDashboardContent(ctx);
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