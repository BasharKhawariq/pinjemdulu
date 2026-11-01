/** Halaman Pengelolaan > Kelola Pengembalian. */
import { getPeminjaman } from '../services/peminjaman.js';
import { updateMockPengembalianStatus } from '../services/pengembalian.js';
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
let activeDialog = null; // 'detail' | 'confirm-approve' | 'form-approve' | 'confirm-submit-form' | 'confirm-cancel-form' | 'success-approve' | 'confirm-reject' | 'form-reject' | 'success-reject'
let formData = {
  tanggalPengembalian: '',
  sanksi: '',
  alasanPenolakan: '',
};

function dateLabel(value) {
  if (!value) return '–';
  try { return formatTanggal(String(value).slice(0, 10)); } catch { return String(value).slice(0, 10); }
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
  if (!pageRows.length) return `<tr><td colspan="8" class="px-6 py-16 text-center text-sm text-slate-400">${renderIcon('Search', 'mr-2 inline h-4 w-4')}Tidak ada data pengembalian yang cocok.</td></tr>`;
  return pageRows.map((row, index) => {
    const id = String(row.id || row.idPeminjaman);
    const name = personName(row);
    const org = organizationName(row);
    const status = statusInfo(row.status);
    const pending =
      row.status === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN ||
      String(row.status).toLowerCase() === 'menunggu_pengembalian' ||
      row.status === STATUS_PEMINJAMAN.TERLAMBAT ||
      String(row.status).toLowerCase() === 'terlambat';

    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${start + index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">${escapeHtml(initials(name))}</span><span class="min-w-0"><span class="block truncate text-xs font-medium text-slate-500">${escapeHtml(name)}</span><span class="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><span class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-100 text-[8px] font-bold text-amber-800">${escapeHtml(org.slice(0,1).toUpperCase())}</span>${escapeHtml(org)}</span></span></div></td>
      <td class="min-w-[140px] px-4 py-4 text-xs text-slate-400">${escapeHtml(itemName(row))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.startDate || row.mulai || row.tanggalMulai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.endDate || row.selesai || row.tanggalSelesai))}</td>
      <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.tanggalPengembalian))}</td>
      <td class="px-4 py-4 text-center">${renderStatusChip(row.status)}</td>
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

  return `<section class="w-full px-5 pb-8 pt-6 sm:px-6 lg:px-7">
    <div class="w-full space-y-6">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Form Pengembalian</h1>
        <p class="mt-1 text-sm text-slate-400">Konfirmasi pengembalian barang dan catat tanggal pengembalian serta sanksi jika ada.</p>
      </div>

      <div class="w-full rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100">
        <div class="w-full space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700">Nama Peminjam</label>
            <input type="text" readonly value="${escapeHtml(name)}" class="w-full rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 select-none cursor-not-allowed border-0">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700">NIM</label>
            <input type="text" readonly value="${escapeHtml(nim)}" class="w-full rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 select-none cursor-not-allowed border-0">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700">OKI Peminjam</label>
            <input type="text" readonly value="${escapeHtml(org)}" class="w-full rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 select-none cursor-not-allowed border-0">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700">Barang Dipinjam</label>
            <input type="text" readonly value="${escapeHtml(itemName(row))}" class="w-full rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 select-none cursor-not-allowed border-0">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700">Keperluan Peminjaman Barang</label>
            <input type="text" readonly value="${escapeHtml(row.keperluan || 'Kebutuhan kegiatan')}" class="w-full rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 select-none cursor-not-allowed border-0">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700">Jumlah Unit</label>
            <input type="text" readonly value="${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}" class="w-full rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 select-none cursor-not-allowed border-0">
          </div>

          <div class="space-y-1.5">
            <label for="form-tanggal-pengembalian" class="text-xs font-semibold text-slate-700">Tanggal Pengembalian</label>
            <div class="relative">
              <input type="date" id="form-tanggal-pengembalian" value="${escapeHtml(formData.tanggalPengembalian)}" placeholder="Pilih Tanggal" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 pr-10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                ${renderIcon('CalendarDays', 'h-4 w-4')}
              </span>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="form-sanksi" class="text-xs font-semibold text-slate-700">Sanksi</label>
            <input type="text" id="form-sanksi" value="${escapeHtml(formData.sanksi)}" placeholder="Catatan sanksi atau kondisi jika ada" class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          </div>
        </div>

        <div class="mt-8 flex items-center justify-end gap-3">
          <button type="button" data-action="prompt-cancel-form" class="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800">
            Batal
          </button>
          <button type="button" data-action="prompt-submit-form" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">
            Kirim
          </button>
        </div>
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
  const showSanksi = !isDikembalikan;
  const daysLate = getDaysLate(row);

  // 1. Modal Detail Pengembalian (Image 2 & 5)
  if (activeDialog === 'detail') {
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="return-detail-title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div class="mb-5 flex items-center justify-between">
          <h2 id="return-detail-title" class="text-xl font-bold text-slate-900">Detail Pengembalian</h2>
          <button type="button" data-action="close-modal" aria-label="Tutup detail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            ${renderIcon('X', 'h-5 w-5')}
          </button>
        </div>

        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-slate-900">Nama Peminjam</span>
            <div class="text-right">
              <span class="block text-sm font-medium text-slate-800">${escapeHtml(name)}</span>
              <span class="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span class="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold text-white">${escapeHtml(org.slice(0, 1).toUpperCase())}</span>
                <span class="font-medium uppercase">${escapeHtml(org)}</span>
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-slate-900">NIM</span>
            <span class="text-sm font-medium text-slate-800">${escapeHtml(nim)}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-slate-900">Barang Dipinjam</span>
            <span class="text-sm font-medium text-slate-800">${escapeHtml(itemName(row))}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-slate-900">Jumlah Unit</span>
            <span class="text-sm font-medium text-slate-800">${escapeHtml(row.jumlahPinjam ?? row.jumlahUnit ?? 1)}</span>
          </div>
        </div>

        <div class="my-5 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50/50 p-3 text-center border border-slate-100">
          <div class="px-1 sm:px-2">
            <p class="text-xs font-medium text-slate-900">Tanggal Mulai</p>
            <p class="mt-1.5 text-xs sm:text-sm font-medium text-slate-700">${escapeHtml(dateLabel(row.startDate || row.mulai || row.tanggalMulai))}</p>
          </div>
          <div class="px-1 sm:px-2">
            <p class="text-xs font-medium text-slate-900">Tanggal Selesai</p>
            <p class="mt-1.5 text-xs sm:text-sm font-medium text-slate-700">${escapeHtml(dateLabel(row.endDate || row.selesai || row.tanggalSelesai))}</p>
          </div>
          <div class="px-1 sm:px-2">
            <p class="text-xs font-medium text-slate-900">Tanggal Pengembalian</p>
            <p class="mt-1.5 text-xs sm:text-sm font-medium text-slate-700">${row.tanggalPengembalian ? escapeHtml(dateLabel(row.tanggalPengembalian)) : '–'}</p>
          </div>
        </div>

        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between py-1">
            <span class="text-xs sm:text-sm font-medium text-slate-900">Status</span>
            <div class="flex items-center">
              ${isTerlambat ? `
                <div class="relative group mr-2 inline-flex items-center">
                  <span class="inline-flex h-5 w-5 items-center justify-center text-rose-600 cursor-pointer" aria-label="Informasi keterlambatan">
                    ${renderIcon('AlertCircle', 'h-5 w-5')}
                  </span>
                  <div class="pointer-events-none absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xl border border-slate-200">
                    Waktu Terlambat: ${daysLate} Hari
                    <div class="absolute top-full right-2 border-4 border-transparent border-t-white"></div>
                  </div>
                </div>
              ` : ''}
              ${renderStatusChip(row.status)}
            </div>
          </div>

          ${isDikembalikan ? `
            <div class="flex items-center justify-between py-1">
              <span class="text-xs sm:text-sm font-medium text-slate-900">Diproses Oleh</span>
              <span class="text-sm font-medium text-slate-800">${escapeHtml(row.diprosesOleh || row.namaPeminjam || name)}</span>
            </div>
          ` : ''}
        </div>

        <div class="mt-4">
          <p class="text-xs font-semibold text-slate-900">Keperluan Peminjaman Barang</p>
          <div class="mt-1.5 rounded-xl bg-slate-50/80 p-3 text-xs sm:text-sm text-slate-700 border border-slate-100">
            ${escapeHtml(row.keperluan || 'Seminar BEM')}
          </div>
        </div>

        ${showSanksi ? `
          <div class="mt-4">
            <p class="text-xs font-semibold text-slate-900">Sanksi</p>
            <div class="mt-1.5 rounded-xl bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-1.5 border border-slate-100 leading-relaxed">
              <p class="font-bold text-slate-800">Sanksi Keterlambatan dan Kehilangan Barang</p>
              <p><strong>- Keterlambatan:</strong> Peminjam dapat dikenakan pembatasan peminjaman sementara.</p>
              <p><strong>- Kehilangan:</strong> Peminjam wajib mengganti barang dengan barang serupa atau sesuai ketentuan pengelola.</p>
            </div>
          </div>
        ` : ''}

        <div class="mt-6 flex justify-end">
          <button type="button" data-action="close-modal" class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">
            Tutup
          </button>
        </div>
      </section>
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
          className: 'w-1/2 rounded-xl bg-primary text-white hover:bg-primary/90',
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
          className: 'w-1/2 rounded-xl bg-primary text-white hover:bg-primary/90',
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
        className: 'w-full rounded-xl bg-primary text-white hover:bg-primary/90',
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
          action: 'close-modal',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Tolak',
          action: 'open-form-reject',
          variant: 'default',
          className: 'w-1/2 rounded-xl bg-rose-600 text-white hover:bg-rose-700',
        },
      ],
    });
  }

  // 8. Modal Pengembalian Ditolak (Form Alasan Penolakan)
  if (activeDialog === 'form-reject') {
    return renderGlobalModal({
      title: 'Pengembalian Ditolak',
      customIcon: renderIcon('CircleX', 'h-8 w-8'),
      customBadgeClass: 'bg-rose-50 text-rose-600',
      content: `
        <div class="mt-4 w-full text-left space-y-1.5">
          <label for="form-alasan-penolakan" class="text-xs font-semibold text-slate-700">Alasan Penolakan</label>
          <textarea id="form-alasan-penolakan" rows="4" placeholder="Masukkan alasan penolakan" class="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">${escapeHtml(formData.alasanPenolakan)}</textarea>
        </div>
      `,
      actions: [
        {
          label: 'Batal',
          action: 'close-modal',
          variant: 'ghost',
          className: 'px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800',
        },
        {
          label: 'Kirim',
          action: 'execute-reject',
          variant: 'default',
          className: 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90',
        },
      ],
    });
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
        className: 'w-full rounded-xl bg-primary text-white hover:bg-primary/90',
      },
    });
  }

  return '';
}

async function loadRows() {
  const all = await getPeminjaman();
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
  modalRow = null;
  activeDialog = null;
  formData = {
    tanggalPengembalian: '',
    sanksi: '',
    alasanPenolakan: '',
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
    const id = button.dataset.id;

    if (action === 'close-modal') {
      modalRow = null;
      activeDialog = null;
      refresh();
      return;
    }

    if (action === 'detail') {
      modalRow = rows.find((row) => String(row.id || row.idPeminjaman) === String(id)) || null;
      activeDialog = 'detail';
      refresh();
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
      activeDialog = 'confirm-approve';
      refresh();
      return;
    }

    if (action === 'open-form-approve') {
      formData.tanggalPengembalian = new Date().toISOString().slice(0, 10);
      formData.sanksi = '';
      activeDialog = 'form-approve';
      refresh();
      return;
    }

    if (action === 'prompt-submit-form') {
      const tgl = rootElement.querySelector('#form-tanggal-pengembalian')?.value;
      const sanksi = rootElement.querySelector('#form-sanksi')?.value;
      if (tgl) formData.tanggalPengembalian = tgl;
      if (sanksi !== undefined) formData.sanksi = sanksi;
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
      activeDialog = 'confirm-reject';
      refresh();
      return;
    }

    if (action === 'open-form-reject') {
      formData.alasanPenolakan = '';
      activeDialog = 'form-reject';
      refresh();
      return;
    }

    if (action === 'execute-reject') {
      const alasan = rootElement.querySelector('#form-alasan-penolakan')?.value || '';
      formData.alasanPenolakan = alasan;
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
  activeDialog = null;
  formData = {
    tanggalPengembalian: '',
    sanksi: '',
    alasanPenolakan: '',
  };
  okiFilter = 'all';
  tanggalFilter = '';
  statusFilter = 'all';
}
