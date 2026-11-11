/**
 * Halaman Pengajuan PJ (peminjam): daftar pengajuan menjadi Penanggung Jawab
 * milik pengguna login, detail pemohon, dan form Tambah Pengajuan.
 * Konfirmasi kirim dan pesan sukses memakai komponen modal bersama
 * (varian 'send' dan 'success') agar animasinya sama dengan halaman lain.
 */
import { getRequestPjSaya, createRequestPj } from '../services/request-pj.js';
import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import {
  TAB_PENGAJUAN_PJ,
  filterPengajuanPj,
  namaOrganisasiPemohon,
  validateLampiran,
} from '../lib/pengajuan-pj.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { buttonClass } from '../ui/classes.js';
import { escapeHtml } from '../ui/html.js';
import { renderStatusChip } from '../ui/status-chip.js';
import { renderModal } from '../ui/modal.js';
import { renderPagination as renderSharedPagination } from '../ui/pagination.js';
import { mockUsers } from '../data/users.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';
import { renderEmptyState } from '../ui/empty-state.js';

const PAGE_SIZE = 5;

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

let rows = [];
let user = null;
let activeTab = STATUS_REQUEST_PJ.MENUNGGU;
let currentPage = 1;
let rootElement = null;
let onClickHandler = null;
let onChangeHandler = null;
let onKeydownHandler = null;
// null | { type: 'detail', row } | { type: 'form', file, error }
//      | { type: 'konfirmasi', file, submitting, error } | { type: 'sukses' }
let dialog = null;
let lastTrigger = null;

function orgDotClass(org) {
  return ORG_DOT[String(org || '').trim().toUpperCase()] || 'bg-slate-400';
}

function dateOnly(value) {
  if (!value) return '—';
  return formatTanggal(String(value).slice(0, 10));
}

function tabLabel() {
  return TAB_PENGAJUAN_PJ.find((tab) => tab.key === activeTab)?.label || 'Menunggu';
}

function getFilteredRows() {
  return filterPengajuanPj(rows, { nim: user?.nim, status: activeTab });
}

function pageCount() {
  return Math.max(1, Math.ceil(getFilteredRows().length / PAGE_SIZE));
}

function renderTabs() {
  return TAB_PENGAJUAN_PJ.map((tab) => {
    const selected = activeTab === tab.key;
    return `
      <button type="button" data-tab="${tab.key}" aria-pressed="${selected}"
        class="shrink-0 cursor-pointer select-none rounded-lg px-4 py-2 text-[11px] font-medium transition ${selected ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">
        ${tab.label}
      </button>`;
  }).join('');
}

function renderRows() {
  const filtered = getFilteredRows();
  currentPage = Math.min(currentPage, pageCount());
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  if (!visible.length) {
    return renderEmptyState({ colspan: 5 });
  }

  return visible.map((row, index) => {
    const org = namaOrganisasiPemohon(row.pemohon, row.organisasi);
    const id = String(row.id);
    return `
      <tr class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60">
        <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-500">${start + index + 1}</td>
        <td class="px-4 py-4">
          <div class="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            ${renderOrganisasiLogo(org, row.logoUrl, 'h-3.5 w-3.5')}
            <span>${escapeHtml(org)}</span>
          </div>
        </td>
        <td class="whitespace-nowrap px-4 py-4 text-center text-xs text-slate-500">${escapeHtml(dateOnly(row.tanggalPengajuan))}</td>
        <td class="px-4 py-4 text-center">${renderStatusChip({ status: row.status })}</td>
        <td class="px-4 py-4 text-center">
          <button type="button" data-detail="${escapeHtml(id)}" aria-label="Lihat informasi pemohon ${escapeHtml(org)}" title="Lihat detail"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-700">
            ${renderIcon('Info', 'h-[17px] w-[17px]')}
          </button>
        </td>
      </tr>`;
  }).join('');
}

function renderPagination() {
  const count = getFilteredRows().length;
  const page = Math.min(currentPage, pageCount());
  const from = count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, count);
  return `
    <div class="mt-6 flex items-center justify-between gap-3">
      <p class="text-xs text-slate-400">Menampilkan ${from}–${to} dari ${count} pengajuan</p>
      ${renderSharedPagination({
        currentPage: page,
        totalPages: pageCount(),
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
  const title = rootElement?.querySelector('[data-list-title]');
  if (title) title.textContent = `List Pengajuan ${tabLabel()}`;
}

function renderFileChip(nama) {
  return `
    <div class="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
      ${renderIcon('FileText', 'h-4 w-4 shrink-0 text-slate-400')}
      <span class="truncate">${escapeHtml(nama)}</span>
    </div>`;
}

function renderDetail(row) {
  const org = namaOrganisasiPemohon(row.pemohon, row.organisasi);
  const ditolak = row.status === STATUS_REQUEST_PJ.DITOLAK;
  const statusClass =
    row.status === STATUS_REQUEST_PJ.MENUNGGU
      ? 'bg-amber-50 text-amber-600'
      : row.status === STATUS_REQUEST_PJ.DISETUJUI
        ? 'bg-green-50 text-green-700'
        : 'bg-red-50 text-red-600';
  const statusLabel = TAB_PENGAJUAN_PJ.find((tab) => tab.key === row.status)?.label || '—';
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="pj-detail-title" class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="pj-detail-title" class="text-2xl font-semibold tracking-tight text-slate-900">Informasi Pemohon</h2>
          <button type="button" data-action="close-modal" aria-label="Tutup detail" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${renderIcon('X', 'h-5 w-5')}</button>
        </div>

        <div class="mt-6 space-y-6 text-sm">
          <div class="flex items-center justify-between gap-6">
            <p class="text-base font-semibold text-slate-900">Nama Pemohon</p>
            <div class="text-right">
              <p class="text-base font-medium text-slate-800">${escapeHtml(row.pemohon?.nama || '—')}</p>
              <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">${renderOrganisasiLogo(org, row.pemohon?.logoUrl || row.logoUrl || row.organisasi?.logoUrl, 'h-4 w-4')}<span>${escapeHtml(org)}</span></p>
            </div>
          </div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">NIM</p><p class="break-all text-right text-base font-medium text-slate-800">${escapeHtml(row.pemohon?.nim || '—')}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Tanggal Pengajuan</p><p class="text-right text-base font-medium text-slate-800">${escapeHtml(dateOnly(row.tanggalPengajuan))}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Status</p><span class="inline-flex rounded-xl px-4 py-1.5 text-xs font-medium ${statusClass}">${escapeHtml(statusLabel)}</span></div>
          ${ditolak ? `<div><p class="mb-2 text-base font-semibold text-slate-900">Alasan Penolakan</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-700 whitespace-pre-line">${escapeHtml(row.alasanPenolakan || 'Pengajuan ditolak oleh pengelola.')}</div></div>` : ''}
          <div>
            <p class="mb-2 text-base font-semibold text-slate-900">Lampiran Surat</p>
            <div class="flex min-h-[62px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white px-5 py-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">${renderIcon('FileImage', 'h-5 w-5')}</span>
              <span class="break-words text-base font-medium text-slate-800">${escapeHtml(row.lampiran?.nama || 'Tidak ada lampiran surat')}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end"><button type="button" data-action="close-modal" data-autofocus class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110">Tutup</button></div>
      </section>
    </div>`;
}

function renderForm(state) {
  const org = namaOrganisasiPemohon(user, null);
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-overlay>
      <section role="dialog" aria-modal="true" aria-labelledby="pj-form-title" class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="pj-form-title" class="text-2xl font-semibold tracking-tight text-slate-900">Tambah Pengajuan</h2>
          <button type="button" data-action="cancel-form" aria-label="Tutup form" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${renderIcon('X', 'h-5 w-5')}</button>
        </div>

        <div class="mt-6 space-y-6 text-sm">
          <div class="flex items-center justify-between gap-6">
            <p class="text-base font-semibold text-slate-900">Nama Pemohon</p>
            <div class="text-right">
              <p class="text-base font-medium text-slate-800">${escapeHtml(user?.nama || '—')}</p>
              <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">${renderOrganisasiLogo(org, user?.organisasi?.logoUrl || user?.logoUrl, 'h-4 w-4')}<span>${escapeHtml(org)}</span></p>
            </div>
          </div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">NIM</p><p class="break-all text-right text-base font-medium text-slate-800">${escapeHtml(user?.nim || '—')}</p></div>
          <div>
            <p class="mb-2 text-base font-semibold text-slate-900">Lampiran Surat</p>
            <input type="file" data-file-input accept=".jpg,.jpeg,.png,.pdf" class="sr-only" tabindex="-1" aria-hidden="true" />
            <button type="button" data-action="pick-file" data-autofocus aria-describedby="pj-file-hint"
              class="flex min-h-[62px] w-full items-center gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">${renderIcon('UploadCloud', 'h-5 w-5')}</span>
              <span class="truncate text-base font-medium ${state.file ? 'text-slate-800' : 'text-slate-400'}" data-file-name>${escapeHtml(state.file ? state.file.name : 'Upload here')}</span>
            </button>
            <p id="pj-file-hint" class="mt-2 text-xs ${state.error ? 'text-rose-600' : 'text-red-500'}" ${state.error ? 'role="alert"' : ''}>${escapeHtml(state.error || 'Maximum size 2MB')}</p>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-action="cancel-form" class="rounded-xl px-5 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50">Batal</button>
          <button type="button" data-action="submit-form" class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110">Ajukan</button>
        </div>
      </section>
    </div>`;
}

function renderConfirm(state) {
  return renderModal({
    variant: 'send',
    title: 'Ajukan Permohonan?',
    description: 'Periksa kembali data pengajuan yang akan anda kirim',
    actions: [
      {
        label: 'Kembali',
        action: 'back-to-form',
        variant: 'outline',
        className: 'flex-1 rounded-xl',
        disabled: state.submitting,
      },
      {
        label: state.submitting ? 'Mengirim...' : 'Kirim',
        action: 'confirm-send',
        variant: 'default',
        className: 'flex-1 rounded-xl bg-primary text-white hover:bg-primary/90',
        disabled: state.submitting,
      },
    ],
    content: state.error ? `<p role="alert" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">${escapeHtml(state.error)}</p>` : '',
  });
}

function renderSuccess() {
  return renderModal({
    variant: 'success',
    title: 'Pengajuan Berhasil Dikirim!',
    description: 'Anda telah berhasil mengirimkan pengajuan penanggung jawab',
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
  if (dialog.type === 'form') return renderForm(dialog);
  if (dialog.type === 'konfirmasi') return renderConfirm(dialog);
  if (dialog.type === 'sukses') return renderSuccess();
  return '';
}

function showDialog(next, trigger = null) {
  if (trigger) lastTrigger = trigger;
  dialog = next;
  const holder = rootElement?.querySelector('[data-dialog]');
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

function goToForm(file = null, error = '') {
  showDialog({ type: 'form', file, error });
}

function submitForm() {
  if (dialog?.type !== 'form') return;
  const error = validateLampiran(dialog.file);
  if (error) {
    goToForm(dialog.file, error);
    return;
  }
  showDialog({ type: 'konfirmasi', file: dialog.file, submitting: false, error: '' });
}

async function confirmSend() {
  if (dialog?.type !== 'konfirmasi' || dialog.submitting) return;
  const { file } = dialog;
  showDialog({ ...dialog, submitting: true, error: '' });
  try {
    await createRequestPj({ lampiran: file }, user);
    rows = await getRequestPjSaya(user?.nim);
    activeTab = STATUS_REQUEST_PJ.MENUNGGU;
    currentPage = 1;
    lastTrigger = null;
    renderTableContent();
    showDialog({ type: 'sukses' });
  } catch (error) {
    showDialog({ type: 'konfirmasi', file, submitting: false, error: error?.message || 'Pengajuan gagal dikirim.' });
  }
}

export function render() {
  return `
    <section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
      <div class="mb-9">
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Pengajuan PJ</h1>
        <p class="mt-1 text-sm text-slate-400">Kelola dan pantau pengajuan penanggung jawab inventaris.</p>
      </div>

      <div class="mb-3 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-white p-1.5" data-tabs role="tablist" aria-label="Filter status pengajuan PJ">
        ${renderTabs()}
      </div>

      <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 data-list-title class="text-lg font-semibold text-slate-900">List Pengajuan ${tabLabel()}</h2>
          <button
            type="button"
            data-action="open-form"
            class="${buttonClass({ variant: 'default', size: 'default', className: 'h-11 rounded-full px-5 gap-1.5 button-hover-soft-primary' })}"
          >
            ${renderIcon('Plus', 'h-4 w-4')}
            <span>Tambah Pengajuan</span>
          </button>
        </div>
        <div class="w-full overflow-x-auto">
          <table class="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr class="border-b border-zinc-100 text-sm leading-[140%] text-slate-400">
                <th class="px-4 py-4 text-center font-semibold">No</th>
                <th class="px-4 py-4 font-semibold">Organisasi</th>
                <th class="px-4 py-4 text-center font-semibold">Tanggal Pengajuan</th>
                <th class="px-4 py-4 text-center font-semibold">Status</th>
                <th class="px-4 py-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody data-table-body class="divide-y divide-zinc-50">${renderRows()}</tbody>
          </table>
        </div>
        <div data-pagination>${renderPagination()}</div>
      </div>
      <div data-dialog></div>
    </section>`;
}

export async function mount(root, ctx = {}) {
  rootElement = root;
  // Sesi hanya menyimpan data ringkas; profil lengkap (organisasi) diambil dari data pengguna.
  const sesi = ctx.user || null;
  user = sesi ? mockUsers.find((u) => String(u.nim) === String(sesi.nim)) || sesi : null;
  activeTab = STATUS_REQUEST_PJ.MENUNGGU;
  currentPage = 1;
  dialog = null;
  lastTrigger = null;
  try {
    rows = user?.nim ? await getRequestPjSaya(user.nim) : [];
  } catch {
    rows = [];
  }
  renderTableContent();

  onClickHandler = (event) => {
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      activeTab = tabButton.dataset.tab;
      currentPage = 1;
      renderTableContent();
      return;
    }
    const pageButton = event.target.closest('[data-page]');
    if (pageButton && !pageButton.disabled) {
      currentPage = pageButton.dataset.page === 'next'
        ? Math.min(pageCount(), currentPage + 1)
        : Math.max(1, currentPage - 1);
      renderTableContent();
      return;
    }
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton) {
      const row = rows.find((item) => String(item.id) === detailButton.dataset.detail);
      if (row) showDialog({ type: 'detail', row }, detailButton);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset?.action;
    if (action === 'open-form') {
      showDialog({ type: 'form', file: null, error: '' }, event.target.closest('[data-action]'));
      return;
    }
    if (action === 'pick-file') {
      rootElement.querySelector('[data-file-input]')?.click();
      return;
    }
    if (action === 'submit-form') { submitForm(); return; }
    if (action === 'back-to-form') {
      if (dialog?.type === 'konfirmasi' && !dialog.submitting) goToForm(dialog.file, '');
      return;
    }
    if (action === 'confirm-send') { confirmSend(); return; }
    if (action === 'cancel-form' || action === 'close-modal' || action === 'close-success') {
      closeDialog();
      return;
    }
    if (
      (event.target.matches('[data-modal-overlay]') || event.target.matches('[data-modal-backdrop]')) &&
      !(dialog?.type === 'konfirmasi' && dialog.submitting)
    ) {
      closeDialog();
    }
  };

  onChangeHandler = (event) => {
    if (!event.target.matches('[data-file-input]') || dialog?.type !== 'form') return;
    const picked = event.target.files?.[0];
    const file = picked ? { name: picked.name, size: picked.size } : null;
    goToForm(file, file ? validateLampiran(file) : '');
  };

  onKeydownHandler = (event) => {
    if (event.key !== 'Escape' || !dialog) return;
    if (dialog.type === 'konfirmasi' && dialog.submitting) return;
    closeDialog();
  };

  root.addEventListener('click', onClickHandler);
  root.addEventListener('change', onChangeHandler);
  document.addEventListener('keydown', onKeydownHandler);
}

export function unmount() {
  if (rootElement && onClickHandler) rootElement.removeEventListener('click', onClickHandler);
  if (rootElement && onChangeHandler) rootElement.removeEventListener('change', onChangeHandler);
  if (onKeydownHandler) document.removeEventListener('keydown', onKeydownHandler);
  rootElement = null;
  onClickHandler = null;
  onChangeHandler = null;
  onKeydownHandler = null;
  dialog = null;
  lastTrigger = null;
  rows = [];
  user = null;
}
