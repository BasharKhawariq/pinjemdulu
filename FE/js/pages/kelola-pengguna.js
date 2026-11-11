/** Halaman Pengelolaan > Kelola Pengguna. */
import {
  getUsers,
  updateMockUser,
  addMockUser,
  getRequestPasswordList,
  getRequestPasswordDetail,
  prosesRequestPassword,
  konfirmasiRequestPassword,
} from '../services/users.js';
import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { renderFilterButton, renderFilterModal } from '../ui/filter.js';
import { selectClass } from '../ui/classes.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';
import { renderEmptyState } from '../ui/empty-state.js';
import { renderPagination as renderSharedPagination } from '../ui/pagination.js';
import { formatTanggal } from '../lib/format.js';

const PAGE_SIZE = 10;
const ORGANISASI_LIST = ['BEM', 'HMTI', 'HME', 'HIMANIA', 'RISPOL', 'HMS', 'THEATRISIC', 'PP'];

// State Utama
let activeTab = 'pengguna'; // 'pengguna' | 'request-password'
let users = [];
let searchTerm = '';
let roleFilter = 'all';
let statusFilter = 'all';
let currentPage = 1;

// State Request Password
let requestPasswords = [];
let rpSearchTerm = '';
let rpStatusFilter = 'all';
let rpCurrentPage = 1;
let rpTotal = 0;
let rpTotalPages = 1;
let selectedRp = null;
let rpProsesData = null;
let rpFormattedMessage = '';
let copyFeedback = false;
let copyTimer = null;

// Modal & Notifikasi State
let modalMode = null;
let selectedUser = null;
let toastMessage = '';
let toastType = 'success';
let toastTimer = null;

let rootElement = null;
let clickHandler = null;
let inputHandler = null;
let submitHandler = null;
let changeHandler = null;

function nameOf(user) {
  return user?.nama || user?.namaPengguna || 'Pengguna';
}

function initials(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'P';
}

function organizationOf(user) {
  return user?.displayOrganization || user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || user?.okiPemohon || '—';
}

function orgLogoOf(user) {
  return user?.logoOrganisasi || user?.organisasiLogo || user?.organisasi?.icon || user?.organisasi?.logo || null;
}

function renderOrgLogo(user) {
  const org = organizationOf(user);
  const logo = orgLogoOf(user);
  return renderOrganisasiLogo(org, logo, 'h-4 w-4');
}

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === ROLES.PENANGGUNG_JAWAB || r === 'penanggung jawab' || r === 'pj') {
    return ROLES.PENANGGUNG_JAWAB;
  }
  return ROLES.PEMINJAM;
}

function roleLabel(role) {
  return normalizeRole(role) === ROLES.PENANGGUNG_JAWAB ? 'Penanggung Jawab' : 'Peminjam';
}

function statusOf(user) {
  return user.statusAkun || user.status_akun || STATUS_AKUN.AKTIF;
}

function isActive(user) {
  return statusOf(user) === STATUS_AKUN.AKTIF;
}

function countActiveFilters() {
  if (activeTab === 'request-password') {
    return rpStatusFilter !== 'all' ? 1 : 0;
  }
  let count = 0;
  if (roleFilter !== 'all') count++;
  if (statusFilter !== 'all') count++;
  return count;
}

function visibleUsers() {
  const q = searchTerm.trim().toLowerCase();
  return users
    .filter((user) => user.managementList !== false)
    .filter((user) => roleFilter === 'all' || user.role === roleFilter)
    .filter((user) => statusFilter === 'all' || statusOf(user) === statusFilter)
    .filter(
      (user) =>
        !q ||
        `${user.nama} ${user.nim} ${user.email || ''} ${organizationOf(user)} ${roleLabel(user.role)}`
          .toLowerCase()
          .includes(q)
    )
    .sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || '')));
}

function renderUserRows() {
  const filtered = visibleUsers();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (!pageRows.length) return renderEmptyState({ colspan: 6 });

  return pageRows
    .map((user, index) => {
      const active = isActive(user);
      const roleClass =
        user.role === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';
      return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-500">${start + index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-xs font-semibold text-white">${escapeHtml(initials(nameOf(user)))}</span><div class="min-w-0"><div class="truncate text-xs font-medium text-slate-500">${escapeHtml(nameOf(user))}</div><div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">${renderOrgLogo(user)}<span class="truncate">${escapeHtml(organizationOf(user))}</span></div></div></div></td>
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-400">${escapeHtml(user.nim || '—')}</td>
      <td class="px-4 py-3.5 text-center"><button type="button" data-action="toggle" data-id="${escapeHtml(user.id)}" aria-label="${active ? 'Nonaktifkan' : 'Aktifkan'} akun ${escapeHtml(nameOf(user))}" aria-pressed="${active}" class="relative inline-flex h-5 w-9 items-center rounded-full transition ${active ? 'bg-primary' : 'bg-slate-200'}"><span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${active ? 'translate-x-[18px]' : 'translate-x-[2px]'}"></span></button></td>
      <td class="px-4 py-3.5 text-center"><span class="inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(user.role))}</span></td>
      <td class="whitespace-nowrap px-4 py-3.5"><div class="flex items-center justify-center gap-0"><button type="button" data-action="edit" data-id="${escapeHtml(user.id)}" title="Edit pengguna" aria-label="Edit pengguna" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Pencil', 'h-4 w-4')}</button><button type="button" data-action="detail" data-id="${escapeHtml(user.id)}" title="Detail pengguna" aria-label="Detail pengguna" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Info', 'h-4 w-4')}</button></div></td>
    </tr>`;
    })
    .join('');
}

function renderRpRows() {
  if (!requestPasswords.length) return renderEmptyState({ colspan: 6 });

  const start = (rpCurrentPage - 1) * PAGE_SIZE;

  return requestPasswords
    .map((row, index) => {
      const isMenunggu = String(row.status || '').toLowerCase() === 'menunggu';
      const statusBadge = isMenunggu
        ? `<span class="inline-flex whitespace-nowrap rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Menunggu</span>`
        : `<span class="inline-flex whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Dikonfirmasi</span>`;

      const actionButton = isMenunggu
        ? `<button type="button" data-action="rp-start-approve" data-id="${escapeHtml(row.idRequestPassword)}" title="Setujui perubahan password" aria-label="Setujui perubahan password" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary hover:bg-blue-50 transition">${renderIcon('Send', 'h-4 w-4')}</button>`
        : `<button type="button" data-action="rp-view-detail" data-id="${escapeHtml(row.idRequestPassword)}" title="Detail request password" aria-label="Detail request password" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">${renderIcon('Info', 'h-4 w-4')}</button>`;

      const tglStr = row.tanggalRequest ? formatTanggal(String(row.tanggalRequest).slice(0, 10)) : '—';

      return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
        <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-500">${start + index + 1}</td>
        <td class="min-w-[190px] px-4 py-3">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-xs font-semibold text-white">
              ${escapeHtml(initials(row.namaPengguna || 'Pengguna'))}
            </span>
            <div class="min-w-0">
              <div class="truncate text-xs font-medium text-slate-800">${escapeHtml(row.namaPengguna || 'Pengguna')}</div>
              <div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                <span>${escapeHtml(row.okiPemohon || '—')}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-400">${escapeHtml(row.nim || '—')}</td>
        <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-500">${escapeHtml(tglStr)}</td>
        <td class="whitespace-nowrap px-4 py-3.5 text-center">${statusBadge}</td>
        <td class="whitespace-nowrap px-4 py-3.5 text-center">${actionButton}</td>
      </tr>`;
    })
    .join('');
}

function renderUserPagination() {
  const pages = Math.max(1, Math.ceil(visibleUsers().length / PAGE_SIZE));
  return renderSharedPagination({
    currentPage,
    totalPages: pages,
    prevAction: 'prev',
    nextAction: 'next',
    showNumbers: false,
    className: 'justify-end',
  });
}

function renderRpPagination() {
  return renderSharedPagination({
    currentPage: rpCurrentPage,
    totalPages: Math.max(1, rpTotalPages),
    prevAction: 'rp-prev',
    nextAction: 'rp-next',
    showNumbers: false,
    className: 'justify-end',
  });
}

// ----------------- MODAL RENDERING -----------------

function renderRpConfirmApproveModal() {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-8 shadow-2xl text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-primary">
          ${renderIcon('Send', 'h-8 w-8')}
        </div>
        <h2 class="text-lg font-bold text-slate-900">Setujui perubahan password?</h2>
        <p class="mt-2 text-xs sm:text-sm text-slate-500">Apakah anda yakin untuk merubah password pengguna?</p>
        <div class="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            data-action="close-modal"
            class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Kembali
          </button>
          <button
            type="button"
            data-action="rp-do-approve"
            class="flex-1 rounded-xl bg-primary py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
          >
            Setujui
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderRpPreviewModal() {
  if (!selectedRp || !rpProsesData) return '';
  const resetUrl = rpProsesData.tautanReset || '';
  const nama = selectedRp.namaPengguna || selectedRp.nama || 'Pengguna';
  const nim = selectedRp.nim || '—';

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <h2 class="text-lg font-bold text-slate-900">Tautan Ubah Password</h2>
        
        <div class="mt-5 space-y-4">
          <!-- Nama -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Nama</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(nama)}
            </div>
          </div>

          <!-- NIM -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">NIM</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(nim)}
            </div>
          </div>

          <!-- Pesan dan Link URL -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Pesan dan Link URL</span>
            <div id="rp-message-box" class="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line select-all">
Halo <strong class="text-slate-900">${escapeHtml(nama)}! 👋</strong>

Kami menerima permintaan ubah password untuk akun PinjemDulu Anda.

Untuk melanjutkan proses ubah password, silakan buka tautan berikut:

<a href="${escapeHtml(resetUrl)}" target="_blank" class="font-medium text-primary hover:underline break-all">${escapeHtml(resetUrl)}</a>

<strong>Catatan:</strong>
- Tautan hanya dapat digunakan satu kali untuk menyelesaikan proses ubah password.
- Setelah berhasil digunakan, tautan tidak dapat digunakan kembali.

Jika Anda tidak merasa mengajukan permintaan ini, silakan abaikan pesan ini.

Terima kasih telah menggunakan <strong>PinjemDulu</strong>! 👋
            </div>
          </div>
        </div>

        <div class="mt-7 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            data-action="close-modal"
            class="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition"
          >
            Tutup
          </button>
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              data-action="copy-rp-message"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              ${renderIcon('Copy', 'h-4 w-4 text-slate-500')}
              <span>${copyFeedback ? 'Tersalin!' : 'Salin Pesan'}</span>
            </button>
            <button
              type="button"
              data-action="to-confirm-send"
              class="rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
            >
              Konfirmasi Pengiriman
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderRpConfirmSendModal() {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-8 shadow-2xl text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          ${renderIcon('CircleCheck', 'h-8 w-8')}
        </div>
        <h2 class="text-lg font-bold text-slate-900">Konfirmasi Pengiriman?</h2>
        <p class="mt-2 text-xs sm:text-sm text-slate-500">Pastikan anda benar-benar telah mengirimkan pesan URL kepada peminjam</p>
        <div class="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            data-action="back-to-rp-preview"
            class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Kembali
          </button>
          <button
            type="button"
            data-action="do-confirm-send"
            class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Konfirmasi
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderRpSuccessModal() {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-8 shadow-2xl text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          ${renderIcon('CircleCheck', 'h-8 w-8')}
        </div>
        <h2 class="text-lg font-bold text-slate-900">Konfirmasi Berhasil!</h2>
        <p class="mt-2 text-xs sm:text-sm text-slate-500">Status request password berhasil diperbarui</p>
        <div class="mt-6">
          <button
            type="button"
            data-action="close-modal"
            class="w-full rounded-xl bg-primary py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
          >
            Kembali
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderRpDetailModal() {
  if (!selectedRp) return '';
  const r = selectedRp;
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <h2 class="text-lg font-bold text-slate-900">Detail Request Password</h2>
        <div class="mt-5 space-y-3.5 text-xs sm:text-sm">
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Nama Peminjam</span>
            <span class="font-medium text-slate-800">${escapeHtml(r.namaPengguna || '—')}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">NIM</span>
            <span class="font-medium text-slate-800">${escapeHtml(r.nim || '—')}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">No. WhatsApp</span>
            <span class="font-medium text-slate-800">${escapeHtml(r.noWhatsapp || '—')}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Tanggal Pengajuan</span>
            <span class="font-medium text-slate-800">${r.tanggalRequest ? formatTanggal(String(r.tanggalRequest).slice(0, 10)) : '—'}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Status</span>
            <span class="inline-flex rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">${escapeHtml(r.status || 'Dikonfirmasi')}</span>
          </div>
          ${r.dikonfirmasiPada ? `
            <div class="flex justify-between py-2 border-b border-slate-100">
              <span class="text-slate-500">Dikonfirmasi Pada</span>
              <span class="font-medium text-slate-800">${formatTanggal(String(r.dikonfirmasiPada).slice(0, 10))}</span>
            </div>
          ` : ''}
          ${r.nimPemroses ? `
            <div class="flex justify-between py-2 border-b border-slate-100">
              <span class="text-slate-500">Diproses Oleh</span>
              <span class="font-medium text-slate-800">${escapeHtml(r.nimPemroses)}</span>
            </div>
          ` : ''}
          ${r.pesanTerkirim ? `
            <div class="mt-3">
              <span class="mb-1.5 block font-medium text-slate-700">Pesan Terkirim</span>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 whitespace-pre-line">
                ${escapeHtml(r.pesanTerkirim)}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="mt-6 flex justify-end">
          <button
            type="button"
            data-action="close-modal"
            class="rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderModal() {
  if (!modalMode) return '';

  if (modalMode === 'rp-confirm-approve') return renderRpConfirmApproveModal();
  if (modalMode === 'rp-preview') return renderRpPreviewModal();
  if (modalMode === 'rp-confirm-send') return renderRpConfirmSendModal();
  if (modalMode === 'rp-success') return renderRpSuccessModal();
  if (modalMode === 'rp-detail') return renderRpDetailModal();

  if (modalMode === 'success-edit') {
    return renderModalComponent({
      id: 'modal-success-edit-user',
      title: 'Data Pengguna Berhasil Diperbarui!',
      description: 'Perubahan data pengguna telah berhasil disimpan ke dalam sistem.',
      variant: 'success',
      actions: [{ label: 'Tutup', action: 'close-modal', variant: 'default' }],
    });
  }

  if (!selectedUser) return '';
  const u = selectedUser;

  if (modalMode === 'detail') {
    const roleClass =
      normalizeRole(u.role) === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 class="text-xl font-semibold tracking-tight text-slate-900">Detail Pengguna</h2><div class="mt-6 space-y-4"><div><span class="mb-2 block text-sm font-medium text-slate-900">Nama Peminjam</span><div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"><span class="text-sm font-medium text-slate-800 break-words">${escapeHtml(nameOf(u))}</span><div class="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600">${renderOrgLogo(u)}<span>${escapeHtml(organizationOf(u))}</span></div></div></div><div><span class="mb-2 block text-sm font-medium text-slate-900">NIM</span><div class="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] break-all">${escapeHtml(u.nim || '—')}</div></div><div><div class="flex items-center justify-between gap-4"><span class="text-sm font-medium text-slate-900">Role</span><span class="inline-flex rounded-xl px-4 py-1.5 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(u.role))}</span></div></div></div><div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110">Tutup</button></div></section></div>`;
  }

  const editing = modalMode === 'edit';
  const currentRole = editing ? normalizeRole(u?.role) : ROLES.PEMINJAM;
  const isPeminjam = currentRole === ROLES.PEMINJAM;
  const isPj = currentRole === ROLES.PENANGGUNG_JAWAB;

  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 id="user-form-title" class="text-xl font-semibold tracking-tight text-slate-900">${editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2><form id="user-form" class="mt-6 space-y-4"><div><label class="mb-2 block text-sm font-medium text-slate-900">Nama Peminjam</label><input name="nama" type="text" value="${escapeHtml(editing ? (u.nama || '') : '')}" placeholder="Nama Peminjam" required ${editing ? 'readonly' : ''} class="w-full rounded-2xl border border-slate-100 ${editing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'} px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /></div><div><label class="mb-2 block text-sm font-medium text-slate-900">NIM</label><input name="nim" type="text" value="${escapeHtml(editing ? (u.nim || '') : '')}" placeholder="NIM" required ${editing ? 'readonly' : ''} class="w-full rounded-2xl border border-slate-100 ${editing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'} px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /></div><div><label class="mb-2 block text-sm font-medium text-slate-900">Organisasi</label>${editing ? `<div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800">${escapeHtml(organizationOf(u))}</div><input type="hidden" name="displayOrganization" value="${escapeHtml(organizationOf(u))}" />` : `<div class="relative"><select name="displayOrganization" class="${selectClass('appearance-none pr-10 cursor-pointer')}">${ORGANISASI_LIST.map((org) => `<option value="${escapeHtml(org)}" ${'HIMANIA' === org ? 'selected' : ''}>${escapeHtml(org)}</option>`).join('')}</select><span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">${renderIcon('ChevronDown', 'h-4 w-4 stroke-[2.2]')}</span></div>`}</div><div><span class="mb-3 block text-sm font-medium text-slate-900">Role</span><div class="space-y-3" id="role-radio-group"><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PEMINJAM}" ${isPeminjam ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPeminjam ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPeminjam ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Peminjam</span></label><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PENANGGUNG_JAWAB}" ${isPj ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPj ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPj ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Penanggung Jawab</span></label></div></div><div id="user-form-error" class="hidden rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700"></div><div class="mt-8 flex items-center justify-end gap-5"><button type="button" data-action="close-modal" class="cancel-form-button rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors">Batal</button><button type="submit" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110">${editing ? 'Edit' : 'Tambah'}</button></div></form></section></div>`;
}

function renderContent() {
  const isPenggunaTab = activeTab === 'pengguna';
  const filteredUsers = visibleUsers();
  const nAktif = countActiveFilters();

  return `<section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
    <div class="mb-9">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Kelola Pengguna</h1>
      <p class="mt-1 text-sm text-slate-400">Pantau dan kelola akun pengguna, hak akses, dan perannya dalam sistem.</p>
    </div>

    <div class="rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
      <!-- Card Header: Tabs & Actions -->
      <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <!-- Tab Switcher -->
        <div class="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1 self-start">
          <button
            type="button"
            data-action="switch-tab"
            data-tab="pengguna"
            class="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition ${isPenggunaTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
          >
            List Pengguna
          </button>
          <button
            type="button"
            data-action="switch-tab"
            data-tab="request-password"
            class="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition ${!isPenggunaTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
          >
            List Request Password
          </button>
        </div>

        <!-- Search & Filter Controls -->
        <div class="flex flex-wrap items-center justify-end gap-2.5">
          ${renderSearchInput({
            id: isPenggunaTab ? 'search-users' : 'search-rp',
            value: isPenggunaTab ? searchTerm : rpSearchTerm,
            placeholder: 'Cari nama pengguna',
            ariaLabel: 'Cari nama pengguna',
            className: 'w-full sm:w-64',
          })}
          ${renderFilterButton({
            id: isPenggunaTab ? 'btn-filter-pengguna' : 'btn-filter-rp',
            action: 'open-filter-dialog',
            title: 'Filter pengguna',
            ariaLabel: 'Filter pengguna',
            countActive: nAktif,
          })}
          ${isPenggunaTab
            ? `
            <button
              type="button"
              data-action="add"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 shrink-0"
            >
              ${renderIcon('Plus', 'h-4 w-4')}
              <span>Tambah Pengguna</span>
            </button>
          `
            : ''}
        </div>
      </div>

      ${toastMessage ? `<div role="status" class="mb-4 rounded-xl px-4 py-2.5 text-sm ${toastType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">${escapeHtml(toastMessage)}</div>` : ''}

      <!-- Table Area -->
      <div class="w-full overflow-x-auto">
        <table class="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr class="border-b border-slate-100 text-sm font-medium leading-[140%] tracking-normal text-slate-400">
              <th class="px-4 py-3.5 text-center font-semibold w-14">No</th>
              <th class="px-4 py-3.5 font-semibold">Nama</th>
              <th class="px-4 py-3.5 text-center font-semibold">NIM</th>
              ${isPenggunaTab
                ? `
                <th class="px-4 py-3.5 text-center font-semibold">Status</th>
                <th class="px-4 py-3.5 text-center font-semibold">Role</th>
              `
                : `
                <th class="px-4 py-3.5 text-center font-semibold">Tanggal Pengajuan</th>
                <th class="px-4 py-3.5 text-center font-semibold">Status</th>
              `}
              <th class="px-4 py-3.5 text-center font-semibold w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${isPenggunaTab ? renderUserRows() : renderRpRows()}
          </tbody>
        </table>
      </div>

      <!-- Footer: Counter & Pagination -->
      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-slate-500">
          ${isPenggunaTab
            ? `Menampilkan ${filteredUsers.length ? Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredUsers.length) : 0}–${Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} dari ${filteredUsers.length} pengguna`
            : `Menampilkan ${requestPasswords.length ? Math.min((rpCurrentPage - 1) * PAGE_SIZE + 1, rpTotal) : 0}–${Math.min(rpCurrentPage * PAGE_SIZE, rpTotal)} dari ${rpTotal} request password`}
        </p>
        ${isPenggunaTab ? renderUserPagination() : renderRpPagination()}
      </div>
    </div>
  </section>

  ${renderModal()}

  ${renderFilterModal({
    id: 'dialog-filter-pengguna',
    title: isPenggunaTab ? 'Filter Pengguna' : 'Filter Request Password',
    countActive: nAktif,
    closeAction: 'close-filter-dialog',
    resetAction: 'reset-filter-dialog',
    applyAction: 'apply-filter-dialog',
    formId: 'form-filter-pengguna',
    bodyContent: isPenggunaTab
      ? `
      <!-- Role -->
      <div class="space-y-1.5">
        <label for="filter-user-role" class="text-sm font-medium text-foreground">Role</label>
        <div class="relative">
          <select id="filter-user-role" name="role" class="${selectClass('appearance-none pr-10 cursor-pointer')}">
            <option value="all" ${roleFilter === 'all' ? 'selected' : ''}>Semua Role</option>
            <option value="${ROLES.PEMINJAM}" ${roleFilter === ROLES.PEMINJAM ? 'selected' : ''}>Peminjam</option>
            <option value="${ROLES.PENANGGUNG_JAWAB}" ${roleFilter === ROLES.PENANGGUNG_JAWAB ? 'selected' : ''}>Penanggung Jawab</option>
          </select>
          <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
            ${renderIcon('ChevronDown', 'h-4 w-4')}
          </span>
        </div>
      </div>

      <!-- Status Akun -->
      <div class="space-y-1.5">
        <label for="filter-user-status" class="text-sm font-medium text-foreground">Status Akun</label>
        <div class="relative">
          <select id="filter-user-status" name="statusAkun" class="${selectClass('appearance-none pr-10 cursor-pointer')}">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
            <option value="${STATUS_AKUN.AKTIF}" ${statusFilter === STATUS_AKUN.AKTIF ? 'selected' : ''}>Aktif</option>
            <option value="${STATUS_AKUN.NONAKTIF}" ${statusFilter === STATUS_AKUN.NONAKTIF ? 'selected' : ''}>Nonaktif</option>
          </select>
          <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
            ${renderIcon('ChevronDown', 'h-4 w-4')}
          </span>
        </div>
      </div>
    `
      : `
      <!-- Status Request Password -->
      <div class="space-y-1.5">
        <label for="filter-rp-status" class="text-sm font-medium text-foreground">Status Pengajuan</label>
        <div class="relative">
          <select id="filter-rp-status" name="rpStatus" class="${selectClass('appearance-none pr-10 cursor-pointer')}">
            <option value="all" ${rpStatusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
            <option value="Menunggu" ${rpStatusFilter === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
            <option value="Dikonfirmasi" ${rpStatusFilter === 'Dikonfirmasi' ? 'selected' : ''}>Dikonfirmasi</option>
          </select>
          <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
            ${renderIcon('ChevronDown', 'h-4 w-4')}
          </span>
        </div>
      </div>
    `,
  })}`;
}

function refresh() {
  if (rootElement) rootElement.innerHTML = renderContent();
}

async function loadRpData() {
  try {
    const res = await getRequestPasswordList({
      page: rpCurrentPage,
      limit: PAGE_SIZE,
      q: rpSearchTerm,
      status: rpStatusFilter,
    });
    requestPasswords = res?.data || [];
    rpTotal = res?.meta?.total || 0;
    rpTotalPages = res?.meta?.totalPages || 1;
  } catch (err) {
    console.error('Gagal memuat request password:', err);
    requestPasswords = [];
    rpTotal = 0;
    rpTotalPages = 1;
  }
}

export function render() {
  return renderContent();
}

export async function mount(root, ctx = {}) {
  rootElement = root;
  activeTab = ctx.query?.tab === 'request-password' ? 'request-password' : 'pengguna';
  searchTerm = '';
  roleFilter = 'all';
  statusFilter = 'all';
  currentPage = 1;

  rpSearchTerm = '';
  rpStatusFilter = 'all';
  rpCurrentPage = 1;
  selectedRp = null;
  rpProsesData = null;
  rpFormattedMessage = '';
  copyFeedback = false;

  modalMode = null;
  selectedUser = null;
  toastMessage = '';

  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }

  // Muat data awal secara paralel
  try {
    const [userData] = await Promise.all([getUsers(), loadRpData()]);
    users = userData || [];
  } catch {
    users = [];
  }

  rootElement.innerHTML = renderContent();

  clickHandler = async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      const backdrop = event.target.closest('[data-modal-backdrop]');
      if (backdrop && event.target === backdrop) {
        modalMode = null;
        selectedUser = null;
        selectedRp = null;
        refresh();
      }
      return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    // Ganti Tab
    if (action === 'switch-tab') {
      const newTab = button.dataset.tab;
      if (newTab !== activeTab) {
        activeTab = newTab;
        if (activeTab === 'request-password') {
          await loadRpData();
        }
        refresh();
      }
      return;
    }

    // Modal umum
    if (action === 'close-modal') {
      modalMode = null;
      selectedUser = null;
      selectedRp = null;
      refresh();
      return;
    }

    // Aksi Pengguna
    if (action === 'add') {
      modalMode = 'add';
      selectedUser = {};
      refresh();
      return;
    }

    if (action === 'edit' || action === 'detail') {
      selectedUser = users.find((user) => String(user.id) === String(id)) || null;
      modalMode = action;
      refresh();
      return;
    }

    // Filter Dialog
    if (action === 'open-filter-dialog') {
      rootElement.querySelector('#dialog-filter-pengguna')?.showModal();
      return;
    }

    if (action === 'close-filter-dialog') {
      rootElement.querySelector('#dialog-filter-pengguna')?.close();
      return;
    }

    if (action === 'reset-filter-dialog') {
      if (activeTab === 'pengguna') {
        roleFilter = 'all';
        statusFilter = 'all';
        currentPage = 1;
      } else {
        rpStatusFilter = 'all';
        rpCurrentPage = 1;
        await loadRpData();
      }
      rootElement.querySelector('#dialog-filter-pengguna')?.close();
      refresh();
      return;
    }

    if (action === 'apply-filter-dialog') {
      if (activeTab === 'pengguna') {
        roleFilter = rootElement.querySelector('#filter-user-role')?.value || 'all';
        statusFilter = rootElement.querySelector('#filter-user-status')?.value || 'all';
        currentPage = 1;
      } else {
        rpStatusFilter = rootElement.querySelector('#filter-rp-status')?.value || 'all';
        rpCurrentPage = 1;
        await loadRpData();
      }
      rootElement.querySelector('#dialog-filter-pengguna')?.close();
      refresh();
      return;
    }

    // Pagination Pengguna
    if (action === 'prev') {
      currentPage = Math.max(1, currentPage - 1);
      refresh();
      return;
    }

    if (action === 'next') {
      currentPage = Math.min(Math.max(1, Math.ceil(visibleUsers().length / PAGE_SIZE)), currentPage + 1);
      refresh();
      return;
    }

    // Pagination Request Password
    if (action === 'rp-prev') {
      if (rpCurrentPage > 1) {
        rpCurrentPage--;
        await loadRpData();
        refresh();
      }
      return;
    }

    if (action === 'rp-next') {
      if (rpCurrentPage < rpTotalPages) {
        rpCurrentPage++;
        await loadRpData();
        refresh();
      }
      return;
    }

    // Toggle Status Akun Pengguna
    if (action === 'toggle') {
      const user = users.find((item) => String(item.id) === String(id));
      if (!user) return;
      const nextStatus = isActive(user) ? STATUS_AKUN.NONAKTIF : STATUS_AKUN.AKTIF;
      try {
        await updateMockUser(id, { statusAkun: nextStatus });
        toastMessage = `Akun ${user.nama} sekarang ${nextStatus === STATUS_AKUN.AKTIF ? 'aktif' : 'nonaktif'}.`;
        toastType = 'success';
        users = await getUsers();
      } catch (error) {
        toastMessage = error.message || 'Status akun gagal diperbarui.';
        toastType = 'error';
      }
      if (toastTimer) clearTimeout(toastTimer);
      refresh();
      toastTimer = setTimeout(() => {
        toastMessage = '';
        toastTimer = null;
        refresh();
      }, 3000);
      return;
    }

    // ----------------- FLOW REQUEST PASSWORD -----------------

    // 1. Klik icon Send ✈️ pada baris Menunggu -> Buka Modal 1 (Setujui perubahan password?)
    if (action === 'rp-start-approve') {
      selectedRp = requestPasswords.find((r) => String(r.idRequestPassword) === String(id)) || null;
      if (!selectedRp) return;
      modalMode = 'rp-confirm-approve';
      refresh();
      return;
    }

    // 2. Klik "Setujui" di Modal 1 -> panggil API proses -> buka Modal 2 (Preview tautan & pesan WA)
    if (action === 'rp-do-approve') {
      if (!selectedRp) return;
      try {
        const res = await prosesRequestPassword(selectedRp.idRequestPassword);
        rpProsesData = res;

        const nama = selectedRp.namaPengguna || 'Pengguna';
        const rawTautan = res?.tautanReset || '';

        // Ekstrak token dari respons backend dan bangun tautan menggunakan origin & path browser saat ini
        const tokenMatch = rawTautan.match(/token=([^&\s]+)/);
        const token = tokenMatch ? tokenMatch[1] : '';

        const currentPath = window.location.pathname.replace(/\/+$/, '');
        const cleanTautan = `${window.location.origin}${currentPath}#/reset-password?token=${token}`;

        rpProsesData.tautanReset = cleanTautan;

        rpFormattedMessage = `Halo *${nama}*! 👋\n\nKami menerima permintaan ubah password untuk akun PinjemDulu Anda.\n\nUntuk melanjutkan proses ubah password, silakan buka tautan berikut:\n\n${cleanTautan}\n\n*Catatan:*\n- Tautan hanya dapat digunakan satu kali untuk menyelesaikan proses ubah password.\n- Setelah berhasil digunakan, tautan tidak dapat digunakan kembali.\n\nJika Anda tidak merasa mengajukan permintaan ini, silakan abaikan pesan ini.\n\nTerima kasih telah menggunakan *PinjemDulu*! 👋`;

        // Update URL wa.me dengan pesan lengkap
        const rawWa = String(selectedRp.noWhatsapp || '').replace(/\D+/g, '');
        const intlWa = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa;
        rpProsesData.waUrl = `https://wa.me/${intlWa}?text=${encodeURIComponent(rpFormattedMessage)}`;

        modalMode = 'rp-preview';
        refresh();
      } catch (err) {
        toastMessage = err?.message || 'Gagal memproses request password.';
        toastType = 'error';
        modalMode = null;
        refresh();
      }
      return;
    }

    // 3. Salin pesan ke clipboard di Modal 2
    if (action === 'copy-rp-message') {
      try {
        await navigator.clipboard.writeText(rpFormattedMessage);
        copyFeedback = true;
        refresh();
        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          copyFeedback = false;
          copyTimer = null;
          refresh();
        }, 2000);
      } catch {
        // Fallback jika clipboard API dicegah browser
        const box = rootElement.querySelector('#rp-message-box');
        if (box) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(box);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      return;
    }

    // 4. Klik "Konfirmasi Pengiriman" di Modal 2 -> buka Modal 3 (Konfirmasi Pengiriman?)
    if (action === 'to-confirm-send') {
      modalMode = 'rp-confirm-send';
      refresh();
      return;
    }

    // 5. Kembali ke Modal 2 dari Modal 3
    if (action === 'back-to-rp-preview') {
      modalMode = 'rp-preview';
      refresh();
      return;
    }

    // 6. Klik "Konfirmasi" di Modal 3 -> Buka wa.me, panggil konfirmasi API, buka Modal 4
    if (action === 'do-confirm-send') {
      if (!selectedRp) return;
      try {
        // Buka WhatsApp di tab baru
        if (rpProsesData?.waUrl) {
          window.open(rpProsesData.waUrl, '_blank');
        }

        await konfirmasiRequestPassword(selectedRp.idRequestPassword, rpFormattedMessage);

        await loadRpData();
        modalMode = 'rp-success';
        refresh();
      } catch (err) {
        toastMessage = err?.message || 'Gagal mengonfirmasi pengiriman.';
        toastType = 'error';
        modalMode = null;
        refresh();
      }
      return;
    }

    // 7. Klik icon Info ℹ️ pada baris Dikonfirmasi -> buka Modal Detail
    if (action === 'rp-view-detail') {
      const rpId = id;
      try {
        const detail = await getRequestPasswordDetail(rpId);
        selectedRp = detail || requestPasswords.find((r) => String(r.idRequestPassword) === String(rpId)) || null;
      } catch {
        selectedRp = requestPasswords.find((r) => String(r.idRequestPassword) === String(rpId)) || null;
      }
      if (selectedRp) {
        modalMode = 'rp-detail';
        refresh();
      }
      return;
    }
  };

  inputHandler = async (event) => {
    if (event.target.id === 'search-users') {
      const input = event.target;
      const pos = input.selectionStart;
      searchTerm = input.value;
      currentPage = 1;
      refresh();
      const replacement = rootElement.querySelector('#search-users');
      if (replacement) {
        replacement.focus();
        try {
          replacement.setSelectionRange(pos, pos);
        } catch {}
      }
    } else if (event.target.id === 'search-rp') {
      const input = event.target;
      const pos = input.selectionStart;
      rpSearchTerm = input.value;
      rpCurrentPage = 1;
      await loadRpData();
      refresh();
      const replacement = rootElement.querySelector('#search-rp');
      if (replacement) {
        replacement.focus();
        try {
          replacement.setSelectionRange(pos, pos);
        } catch {}
      }
    }
  };

  submitHandler = async (event) => {
    if (event.target.id !== 'user-form') return;
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const errorBox = rootElement.querySelector('#user-form-error');

    try {
      const wasEditing = modalMode === 'edit';
      if (wasEditing) await updateMockUser(selectedUser.id, data);
      else await addMockUser(data);
      users = await getUsers();
      if (wasEditing) {
        modalMode = 'success-edit';
        toastType = 'success';
        toastMessage = '';
      } else {
        modalMode = null;
        selectedUser = null;
        toastType = 'success';
        toastMessage = 'Pengguna berhasil ditambahkan.';
      }
      refresh();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.message || 'Data pengguna gagal disimpan.';
        errorBox.classList.remove('hidden');
      }
    }
  };

  changeHandler = (event) => {
    if (event.target && event.target.name === 'role') {
      const group = rootElement?.querySelector('#role-radio-group');
      if (group) {
        const val = event.target.value;
        group.querySelectorAll('[data-role-label]').forEach((label) => {
          const radio = label.querySelector('input[name="role"]');
          const indicator = label.querySelector('[data-role-indicator]');
          const check = label.querySelector('[data-role-check]');
          const checked = radio && radio.value === val;
          if (indicator) {
            indicator.className = `flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${checked ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}`;
          }
          if (check) {
            if (checked) {
              check.classList.remove('hidden');
              check.classList.add('block');
            } else {
              check.classList.remove('block');
              check.classList.add('hidden');
            }
          }
        });
      }
    }
  };

  rootElement.addEventListener('click', clickHandler);
  rootElement.addEventListener('input', inputHandler);
  rootElement.addEventListener('change', changeHandler);
  rootElement.addEventListener('submit', submitHandler);
}

export function unmount() {
  if (rootElement && clickHandler) rootElement.removeEventListener('click', clickHandler);
  if (rootElement && inputHandler) rootElement.removeEventListener('input', inputHandler);
  if (rootElement && submitHandler) rootElement.removeEventListener('submit', submitHandler);
  if (rootElement && changeHandler) rootElement.removeEventListener('change', changeHandler);
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
  rootElement = null;
  clickHandler = null;
  inputHandler = null;
  submitHandler = null;
  changeHandler = null;
  selectedRp = null;
  rpProsesData = null;
}
