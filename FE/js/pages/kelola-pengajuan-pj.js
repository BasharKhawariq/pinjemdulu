/** Halaman Pengelolaan > List Pengajuan Penanggung Jawab. */
import { getRequestPj, updateMockRequestPjStatus } from '../services/request-pj.js';
import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import { formatTanggal } from '../lib/format.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';

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
let toastTimeout = null;
let modalRow = null;
let feedbackModal = null;
let rejectionReason = '';
let rejectionValidationCount = 0;

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
    const org = row.organisasi?.namaOrganisasi || row.pemohon?.organisasi?.namaOrganisasi || row.pemohon?.displayOrganization || row.organisasi || '';
    const status = statusInfo(row.status);
    const pending = row.status === STATUS_REQUEST_PJ.MENUNGGU;
    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-400">${start + index + 1}</td>
      <td class="min-w-[220px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-white">${escapeHtml(initials(name))}</span><div class="min-w-0"><span class="block truncate text-xs font-medium text-slate-500">${escapeHtml(name)}</span>${org ? `<span class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">${renderOrganisasiLogo(org, row.pemohon?.logoUrl || row.logoUrl, 'h-3.5 w-3.5')}<span>${escapeHtml(org)}</span></span>` : ''}</div></div></td>
      <td class="w-[190px] whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-400">${escapeHtml(dateLabel(row.tanggalPengajuan || row.createdAt))}</td>
      <td class="w-[140px] px-4 py-3.5 text-center"><span class="inline-flex whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold ${status.cls}">${escapeHtml(status.label)}</span></td>
      <td class="whitespace-nowrap px-4 py-3.5"><div class="flex items-center justify-center gap-0"><button type="button" data-action="detail" data-id="${escapeHtml(id)}" title="Lihat detail" aria-label="Lihat detail" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">${renderIcon('Info', 'h-4 w-4')}</button>${pending ? `<button type="button" data-action="approve" data-id="${escapeHtml(id)}" title="Setujui pengajuan" aria-label="Setujui pengajuan" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-green-600 hover:bg-green-50">${renderIcon('CircleCheck', 'h-4 w-4')}</button><button type="button" data-action="reject" data-id="${escapeHtml(id)}" title="Tolak pengajuan" aria-label="Tolak pengajuan" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50">${renderIcon('CircleX', 'h-4 w-4')}</button>` : ''}</div></td>
    </tr>`;
  }).join('');
}
import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

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
function renderModal() {
  if (feedbackModal?.stage === 'approve-confirm' || feedbackModal?.stage === 'reject-confirm') {
    const approve = feedbackModal.stage === 'approve-confirm';
    const title = approve ? 'Setujui permohonan role?' : 'Tolak permohonan role?';
    const description = approve
      ? 'Apakah anda yakin ingin menyetujui permohonan ini'
      : 'Apakah anda yakin ingin menolak permohonan ini ?';
    const actionLabel = approve ? 'Setujui' : 'Tolak';
    const actionClass = approve
      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
      : 'bg-rose-600 text-white hover:bg-rose-700';
    const gif = approve ? 'assets/animations/modal-approve.gif' : 'assets/animations/modal-reject.gif';
    const action = approve ? 'confirm-approve' : 'confirm-reject';
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="request-pj-confirm-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex flex-col items-center text-center">
          <img src="${gif}" alt="" class="mb-4 h-24 w-24 object-contain" />
          <h2 id="request-pj-confirm-title" class="text-xl font-bold tracking-tight text-slate-900">${title}</h2>
          <p class="mt-2 text-sm font-normal text-slate-400">${description}</p>
          <div class="mt-6 flex w-full items-center gap-3">
            <button type="button" data-action="back-confirm" class="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-secondary-hover hover:text-secondary-hover-foreground hover:border-secondary-hover">Kembali</button>
            <button type="button" data-action="${action}" class="h-12 flex-1 rounded-xl ${actionClass} px-4 text-sm font-semibold transition-colors">${actionLabel}</button>
          </div>
        </div>
      </section>
    </div>`;
  }
  if (feedbackModal?.stage === 'reject-form') {
    const showError = rejectionValidationCount > 0;
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="request-pj-reject-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="request-pj-reject-title" class="text-xl font-bold tracking-tight text-slate-900">Permohonan Ditolak</h2>
        <div class="mt-5 space-y-2">
          <label for="rejection-reason" class="block text-sm font-semibold text-slate-900">Alasan Penolakan</label>
          <textarea id="rejection-reason" rows="3" placeholder="Masukkan alasan penolakan" style="resize: none" class="w-full resize-none rounded-xl border ${showError ? 'border-red-300' : 'border-slate-200'} bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100">${escapeHtml(rejectionReason)}</textarea>
          ${showError ? `<div id="rejection-reason-error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ${rejectionValidationCount > 0 ? 'validation-blink' : ''}">Alasan penolakan wajib diisi.</div>` : ''}
        </div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-action="cancel-reject-form" class="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">Batal</button>
          <button type="button" data-action="submit-rejection-reason" class="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Kirim</button>
        </div>
      </section>
    </div>`;
  }
  if (feedbackModal?.stage === 'result') {
    return renderModalComponent({
      id: 'modal-feedback-pj',
      title: feedbackModal.title,
      description: feedbackModal.message,
      variant: feedbackModal.type,
      actions: [{ label: 'Tutup', action: 'close-feedback-modal', variant: 'default', className: 'w-full rounded-xl hover:brightness-110' }],
    });
  }
  if (!modalRow) return '';
  const row = modalRow;
  const status = statusInfo(row.status);
  const organization = row.organisasi?.namaOrganisasi || row.pemohon?.organisasi?.namaOrganisasi || '—';
  const nim = row.pemohon?.nim || '—';
  const attachment = row.lampiran?.nama || row.lampiran?.name || '';
  const statusClass = status.label === 'Menunggu' ? 'bg-amber-50 text-amber-600' : status.label === 'Disetujui' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600';
  const rejectionReasonText = row.alasanPenolakan || row.alasan_penolakan || '';
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="request-pj-detail-title" class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <h2 id="request-pj-detail-title" class="text-2xl font-semibold tracking-tight text-slate-900">Informasi Pemohon</h2>
          <button type="button" data-action="close-modal" aria-label="Tutup detail" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">${renderIcon('X', 'h-5 w-5')}</button>
        </div>

        <div class="mt-6 space-y-6 text-sm">
          <div class="flex items-center justify-between gap-6">
            <p class="text-base font-semibold text-slate-900">Nama Pemohon</p>
            <div class="text-right">
              <p class="text-base font-medium text-slate-800">${escapeHtml(personName(row))}</p>
              <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">${renderOrganisasiLogo(organization, row.pemohon?.logoUrl || row.logoUrl, 'h-4 w-4')}<span>${escapeHtml(organization)}</span></p>
            </div>
          </div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">NIM</p><p class="break-all text-right text-base font-medium text-slate-800">${escapeHtml(nim)}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Tanggal Pengajuan</p><p class="text-right text-base font-medium text-slate-800">${escapeHtml(dateLabel(row.tanggalPengajuan || row.createdAt))}</p></div>
          <div class="flex items-center justify-between gap-6"><p class="text-base font-semibold text-slate-900">Status</p><span class="inline-flex rounded-xl px-4 py-1.5 text-xs font-medium ${statusClass}">${escapeHtml(status.label)}</span></div>
          ${status.label === 'Ditolak' ? `<div><p class="mb-2 text-base font-semibold text-slate-900">Alasan Penolakan</p><div class="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-medium text-slate-700 whitespace-pre-line">${escapeHtml(rejectionReasonText || '—')}</div></div>` : ''}
          <div>
            <p class="mb-2 text-base font-semibold text-slate-900">Lampiran Surat</p>
            <div class="flex min-h-[62px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white px-5 py-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">${renderIcon('FileImage', 'h-5 w-5')}</span>
              <span class="break-words text-base font-medium text-slate-800">${escapeHtml(attachment || 'Tidak ada lampiran surat')}</span>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110">Tutup</button></div>
      </section>
    </div>`;
}
function renderContent() {
  const count = visibleRows().length;
  const tabs = [
    [STATUS_REQUEST_PJ.MENUNGGU, 'Menunggu'],
    [STATUS_REQUEST_PJ.DISETUJUI, 'Disetujui'],
    [STATUS_REQUEST_PJ.DITOLAK, 'Ditolak'],
  ];
  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-9"><h1 class="text-3xl font-semibold tracking-tight text-slate-900">List Pengajuan Penanggung Jawab</h1><p class="mt-1 text-sm text-slate-400">Pantau dan kelola proses pengajuan penanggung jawab inventaris.</p></div>
    <div class="mb-3 inline-flex items-center gap-1 rounded-xl bg-white p-1.5">${tabs.map(([value, label]) => `<button type="button" data-action="tab" data-tab="${value}" class="rounded-lg px-4 py-2 text-[11px] font-medium transition ${activeTab === value ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">${label}</button>`).join('')}</div>
    <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 class="text-lg font-semibold text-slate-900">List ${activeTab === STATUS_REQUEST_PJ.MENUNGGU ? 'Menunggu' : activeTab === STATUS_REQUEST_PJ.DISETUJUI ? 'Disetujui' : 'Ditolak'}</h2><div class="flex items-center gap-3">${renderSearchInput({ id: 'search-pemohon-pj', value: searchTerm, placeholder: 'Cari nama pemohon', ariaLabel: 'Cari nama pemohon', className: 'w-full sm:w-64' })}</div></div>
      ${toastMessage ? `<div role="status" class="mb-3 rounded-lg px-4 py-2 text-sm ${toastType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">${escapeHtml(toastMessage)}</div>` : ''}
      <div class="w-full overflow-x-auto"><table class="w-full min-w-[650px] border-collapse text-left">
        <thead>
          <tr class="border-b border-slate-100 text-sm leading-[140%] tracking-normal text-slate-400">
            <th class="px-4 py-3.5 text-center font-semibold">No</th>
            <th class="px-4 py-3.5 font-semibold">Nama Pemohon</th>
            <th class="w-[190px] px-4 py-3.5 text-center font-semibold">Tanggal Pengajuan</th>
            <th class="w-[140px] px-4 py-3.5 text-center font-semibold">Status</th>
            <th class="px-4 py-3.5 text-center font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows()}
        </tbody></table>
      </div>
      <div class="mt-5 flex items-center justify-between gap-3"><p class="text-xs text-slate-500">Menampilkan ${count ? Math.min((currentPage - 1) * PAGE_SIZE + 1, count) : 0}–${Math.min(currentPage * PAGE_SIZE, count)} dari ${count} pengajuan</p>${renderPagination()}</div>
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
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = null;
  modalRow = null;
  feedbackModal = null;
  rejectionReason = '';
  rejectionValidationCount = 0;
  rows = await getRequestPj();
  rootElement.innerHTML = renderContent();
  clickHandler = async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      if (event.target.closest('[data-modal-backdrop]') && event.target === event.target.closest('[data-modal-backdrop]')) { modalRow = null; feedbackModal = null; refresh(); }
      return;
    }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'close-modal' || action === 'close-feedback-modal') { modalRow = null; feedbackModal = null; rejectionReason = ''; rejectionValidationCount = 0; refresh(); return; }
    if (action === 'detail') { modalRow = rows.find((row) => String(row.id) === String(id)) || null; feedbackModal = null; refresh(); return; }
    if (action === 'tab') { activeTab = button.dataset.tab; currentPage = 1; toastMessage = ''; refresh(); return; }
    if (action === 'prev') { currentPage = Math.max(1, currentPage - 1); refresh(); return; }
    if (action === 'next') { currentPage = Math.min(Math.max(1, Math.ceil(visibleRows().length / PAGE_SIZE)), currentPage + 1); refresh(); return; }
    if (action === 'approve') {
      modalRow = rows.find((row) => String(row.id) === String(id)) || null;
      feedbackModal = { stage: 'approve-confirm', requestId: id };
      refresh(); return;
    }
    if (action === 'reject') {
      modalRow = rows.find((row) => String(row.id) === String(id)) || null;
      rejectionReason = '';
      rejectionValidationCount = 0;
      feedbackModal = { stage: 'reject-form', requestId: id };
      refresh(); return;
    }
    if (action === 'back-confirm') {
      if (feedbackModal?.stage === 'approve-confirm') { feedbackModal = null; modalRow = null; }
      else if (feedbackModal?.stage === 'reject-confirm') feedbackModal = { stage: 'reject-form', requestId: feedbackModal.requestId };
      refresh(); return;
    }
    if (action === 'submit-rejection-reason') {
      rejectionReason = rootElement.querySelector('#rejection-reason')?.value.trim() || '';
      if (!rejectionReason) {
        rejectionValidationCount += 1;
        refresh();
        return;
      }
      rejectionValidationCount = 0;
      feedbackModal = { stage: 'reject-confirm', requestId: feedbackModal?.requestId };
      refresh(); return;
    }
    if (action === 'cancel-reject-form') {
      feedbackModal = null; modalRow = null; rejectionReason = ''; rejectionValidationCount = 0; refresh(); return;
    }
    if (action === 'confirm-approve' || action === 'confirm-reject') {
      const requestId = feedbackModal?.requestId;
      const isApprove = action === 'confirm-approve';
      try {
        await updateMockRequestPjStatus(requestId, isApprove ? STATUS_REQUEST_PJ.DISETUJUI : STATUS_REQUEST_PJ.DITOLAK, isApprove ? null : rejectionReason.trim());
        rows = await getRequestPj();
        modalRow = null;
        // Setelah status diperbarui, tampilkan notifikasi pada daftar selama 3 detik.
        feedbackModal = null;
        modalRow = null;
        rejectionReason = '';
        rejectionValidationCount = 0;
        toastType = 'success';
        toastMessage = isApprove ? 'Pengajuan PJ berhasil disetujui.' : 'Pengajuan PJ berhasil ditolak.';
      } catch (error) {
        feedbackModal = null;
        toastType = 'error';
        toastMessage = error?.message || 'Status pengajuan gagal diperbarui.';
      }
      if (toastTimeout) clearTimeout(toastTimeout);
      refresh();
      if (toastMessage) {
        toastTimeout = setTimeout(() => {
          toastMessage = '';
          toastTimeout = null;
          refresh();
        }, 3000);
      }
    }
  };
  inputHandler = (event) => {
    if (event.target.id === 'rejection-reason') {
      rejectionReason = event.target.value;
      if (rejectionValidationCount > 0) {
        const textarea = event.target;
        const error = rootElement.querySelector('#rejection-reason-error');
        if (rejectionReason.trim()) {
          error?.remove();
          textarea.classList.remove('border-red-300');
          textarea.classList.add('border-slate-200');
        } else {
          textarea.classList.remove('border-slate-200');
          textarea.classList.add('border-red-300');
          if (!error) {
            const errorElement = document.createElement('div');
            errorElement.id = 'rejection-reason-error';
            errorElement.setAttribute('role', 'alert');
            errorElement.className = 'rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 validation-blink';
            errorElement.textContent = 'Alasan penolakan wajib diisi.';
            textarea.insertAdjacentElement('afterend', errorElement);
          }
        }
      }
      return;
    }
    if (event.target.id === 'rejection-reason') { rejectionReason = event.target.value; return; }
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
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = null;
  rootElement = null; clickHandler = null; inputHandler = null; rows = []; modalRow = null;
}
