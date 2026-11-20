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
import { renderFilterButton } from '../ui/filter.js';
import { buttonClass, selectClass } from '../ui/classes.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';
import { renderEmptyState } from '../ui/empty-state.js';
import { renderPagination as renderSharedPagination } from '../ui/pagination.js';
import { renderTableLoadingRow } from '../ui/loading-state.js';
import { formatTanggal } from '../lib/format.js';
import { getUser } from '../state/session.js';

const PAGE_SIZE = 10;
const ORGANISASI_LIST = ['BEM', 'HMTI', 'HME', 'HIMANIA', 'RISPOL', 'HMS', 'THEATRISIC', 'PP'];

export function formatNomorWa(num) {
  if (!num) return '';
  const digits = String(num).replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 12)}`;
}

export function formatWaDisplay(num) {
  if (!num) return '—';
  const digits = String(num).replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');
  if (!digits) return '—';
  return `+62 ${formatNomorWa(digits)}`;
}

// State Utama
let activeTab = 'pengguna'; // 'pengguna' | 'request-password'
let users = [];
let isUsersLoading = false;
let searchTerm = '';
let roleFilter = 'all';
let statusFilter = 'all';
let currentPage = 1;

// State Request Password
let requestPasswords = [];
let isRpLoading = false;
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
let pendingStatusChange = null;
let pendingAddUser = null;
let pendingEditUser = null;
let userFormError = '';
let nameFieldError = '';
let waFieldError = '';

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
  return (
    user?.displayOrganization ||
    user?.singkatan ||
    user?.organisasi?.namaOrganisasi ||
    user?.organisasi?.singkatan ||
    user?.namaOrganisasi ||
    user?.okiPemohon ||
    (typeof user?.organisasi === 'string' ? user.organisasi : null) ||
    '—'
  );
}

function orgLogoOf(user) {
  return (
    user?.logoUrl ||
    user?.organisasi?.logoUrl ||
    user?.logoOrganisasi ||
    user?.organisasiLogo ||
    user?.organisasi?.icon ||
    user?.organisasi?.logo ||
    null
  );
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
  if (isUsersLoading) {
    return renderTableLoadingRow({ colspan: 6, message: 'Memuat data pengguna...' });
  }
  const filtered = visibleUsers();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (!pageRows.length) return renderEmptyState({ colspan: 6 });

  const currentUser = getUser();

  return pageRows
    .map((user, index) => {
      const active = isActive(user);
      const isSelf = currentUser && (
        (currentUser.nim && String(user.nim) === String(currentUser.nim)) ||
        (currentUser.id && String(user.id) === String(currentUser.id))
      );
      const roleClass =
        user.role === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';

      const toggleHtml = isSelf
        ? `<button type="button" disabled title="Tidak dapat menonaktifkan akun sendiri" aria-label="Tidak dapat menonaktifkan akun sendiri" class="relative inline-flex h-5 w-9 items-center rounded-full bg-primary opacity-40 cursor-not-allowed"><span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm translate-x-[18px]"></span></button>`
        : `<button type="button" data-action="toggle" data-id="${escapeHtml(user.id)}" aria-label="${active ? 'Nonaktifkan' : 'Aktifkan'} akun ${escapeHtml(nameOf(user))}" aria-pressed="${active}" class="relative inline-flex h-5 w-9 items-center rounded-full transition ${active ? 'bg-primary' : 'bg-slate-200'}"><span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${active ? 'translate-x-[18px]' : 'translate-x-[2px]'}"></span></button>`;

      return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-500">${start + index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-xs font-semibold text-white">${escapeHtml(initials(nameOf(user)))}</span><div class="min-w-0"><div class="truncate text-xs font-medium text-slate-500">${escapeHtml(nameOf(user))}</div><div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">${renderOrgLogo(user)}<span class="truncate">${escapeHtml(organizationOf(user))}</span></div></div></div></td>
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-400">${escapeHtml(user.nim || '—')}</td>
      <td class="px-4 py-3.5 text-center">${toggleHtml}</td>
      <td class="px-4 py-3.5 text-center"><span class="inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(user.role))}</span></td>
      <td class="whitespace-nowrap px-4 py-3.5"><div class="flex items-center justify-center gap-0"><button type="button" data-action="edit" data-id="${escapeHtml(user.id)}" title="Edit pengguna" aria-label="Edit pengguna" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Pencil', 'h-4 w-4')}</button><button type="button" data-action="detail" data-id="${escapeHtml(user.id)}" title="Detail pengguna" aria-label="Detail pengguna" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Info', 'h-4 w-4')}</button></div></td>
    </tr>`;
    })
    .join('');
}

function renderRpRows() {
  if (isRpLoading) {
    return renderTableLoadingRow({ colspan: 6, message: 'Memuat data request password...' });
  }
  if (!requestPasswords.length) return renderEmptyState({ colspan: 6 });

  const start = (rpCurrentPage - 1) * PAGE_SIZE;

  return requestPasswords
    .map((row, index) => {
      const isMenunggu = String(row.status || '').toLowerCase() === 'menunggu';
      const statusBadge = isMenunggu
        ? `<span class="inline-flex whitespace-nowrap rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Menunggu</span>`
        : `<span class="inline-flex whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Dikonfirmasi</span>`;

      const actionButton = isMenunggu
        ? `<button type="button" data-action="rp-start-approve" data-id="${escapeHtml(row.idRequestPassword)}" title="Setujui perubahan password" aria-label="Setujui perubahan password" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">${renderIcon('Send', 'h-4 w-4')}</button>`
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
              <div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-700">
                ${renderOrganisasiLogo(row.okiPemohon, row.logoUrl, 'h-3.5 w-3.5')}
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
  return renderModalComponent({
    id: 'modal-rp-confirm-approve',
    title: 'Setujui perubahan password?',
    description: 'Apakah anda yakin untuk merubah password pengguna?',
    variant: 'send',
    actions: [
      {
        label: 'Kembali',
        action: 'close-modal',
        variant: 'outline',
        className: 'w-1/2 rounded-xl',
      },
      {
        label: 'Setujui',
        action: 'rp-do-approve',
        className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
      },
    ],
  }).toString();
}

function renderRpPreviewModal() {
  if (!selectedRp || !rpProsesData) return '';
  const resetUrl = rpProsesData.tautanReset || '';
  const nama = selectedRp.namaPengguna || selectedRp.nama || 'Pengguna';
  const nim = selectedRp.nim || '—';
  const wa = selectedRp.noWhatsapp || selectedRp.no_whatsapp || '';

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <h2 class="text-lg font-bold text-slate-900">Tautan Ubah Password</h2>
        
        <div class="mt-5 space-y-4">
          <!-- Nama Pengguna -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Nama Pengguna</span>
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

          <!-- Nomor Whatsapp -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Nomor Whatsapp</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(formatWaDisplay(wa))}
            </div>
          </div>

          <!-- Pesan dan Link URL -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Pesan dan link URL</span>
            <div id="rp-message-box" class="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line select-all">
Halo <strong class="text-slate-900">${escapeHtml(nama)}! 👋</strong>

Kami menerima permintaan ubah password untuk akun PinjemDulu Anda.

Untuk melanjutkan proses ubah password, silakan klik tautan berikut:

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
  const nama = r.namaPengguna || r.nama || 'Pengguna';
  const nim = r.nim || '—';
  const wa = r.noWhatsapp || r.no_whatsapp || '';
  const tgl = r.tanggalRequest ? formatTanggal(String(r.tanggalRequest).slice(0, 10)) : '—';
  const rawPesan = r.pesanTerkirim || `Halo *${nama}*! 👋\n\nKami menerima permintaan ubah password untuk akun PinjemDulu Anda.\n\nJika Anda tidak merasa mengajukan permintaan ini, silakan abaikan pesan ini.\n\nTerima kasih telah menggunakan *PinjemDulu*! 👋`;

  const formattedHtmlPesan = escapeHtml(rawPesan).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" class="font-medium text-primary hover:underline break-all">$1</a>'
  );

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop>
      <section role="dialog" aria-modal="true" class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <h2 class="text-lg font-bold text-slate-900">Detail Ubah Password</h2>

        <div class="mt-5 space-y-4">
          <!-- Nama Pengguna -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Nama Pengguna</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(nama)}
            </div>
          </div>

          <!-- Tanggal Pengajuan -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Tanggal Pengajuan</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(tgl)}
            </div>
          </div>

          <!-- NIM -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">NIM</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(nim)}
            </div>
          </div>

          <!-- Nomor Whatsapp -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Nomor Whatsapp</span>
            <div class="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800">
              ${escapeHtml(formatWaDisplay(wa))}
            </div>
          </div>

          <!-- Pesan dan Link URL -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-600">Pesan dan link URL</span>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line select-all">
              ${formattedHtmlPesan}
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            data-action="close-modal"
            class="rounded-xl bg-primary px-7 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
          >
            tutup
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

  if (modalMode === 'status-confirm') {
    return renderModalComponent({
      id: 'modal-status-confirm-user',
      title: 'Ubah status akun pengguna?',
      description: 'Apakah anda yakin untuk merubah akun pengguna?',
      variant: 'send',
      actions: [
        {
          label: 'Kembali',
          action: 'cancel-status-change',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Ya, saya yakin',
          action: 'confirm-status-change',
          className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
        },
      ],
    }).toString();
  }

  if (modalMode === 'status-success') {
    return renderModalComponent({
      id: 'modal-status-success-user',
      title: 'Ubah status akun pengguna berhasil!',
      description: 'Status akun pengguna berhasil diubah',
      variant: 'success',
      actions: [{
        label: 'Kembali',
        action: 'close-modal',
        className: 'w-full rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
      }],
    }).toString();
  }

  if (modalMode === 'edit-confirm') {
    return renderModalComponent({
      id: 'modal-edit-user-confirm',
      title: 'Edit Data Pengguna ?',
      description: 'Periksa kembali data pengajuan yang akan anda kirim',
      variant: 'send',
      actions: [
        {
          label: 'Kembali',
          action: 'back-edit-form',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Kirim',
          action: 'confirm-edit-user',
          className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
        },
      ],
    }).toString();
  }

  if (modalMode === 'add-confirm') {
    return renderModalComponent({
      id: 'modal-add-user-confirm',
      title: 'Tambah Data Pengguna ?',
      description: 'Periksa kembali data pengajuan yang akan anda kirim',
      variant: 'send',
      actions: [
        {
          label: 'Kembali',
          action: 'back-add-form',
          variant: 'outline',
          className: 'w-1/2 rounded-xl',
        },
        {
          label: 'Kirim',
          action: 'confirm-add-user',
          className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
        },
      ],
    }).toString();
  }

  if (modalMode === 'add-success') {
    return renderModalComponent({
      id: 'modal-add-user-success',
      title: 'Tambah Data Berhasil!',
      description: 'Berhasil menambah data pengguna',
      variant: 'success',
      actions: [{
        label: 'Kembali',
        action: 'close-modal',
        className: 'w-full rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
      }],
    }).toString();
  }

  if (modalMode === 'edit-success' || modalMode === 'success-edit') {
    return renderModalComponent({
      id: 'modal-success-edit-user',
      title: 'Edit Berhasil!',
      description: 'Data pengguna berhasil disimpan.',
      variant: 'success',
      actions: [{
        label: 'Kembali',
        action: 'close-modal',
        className: 'w-full rounded-xl bg-primary text-primary-foreground transition hover:brightness-110',
      }],
    }).toString();
  }

  if (!selectedUser && modalMode !== 'add') return '';
  const u = selectedUser || {};

  if (modalMode === 'detail') {
    const roleClass =
      normalizeRole(u.role) === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';
    const waDisplay = formatWaDisplay(u.noWhatsapp || u.no_whatsapp);
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 class="text-xl font-semibold tracking-tight text-slate-900">Detail Pengguna</h2><div class="mt-6 space-y-4"><div><span class="mb-2 block text-sm font-medium text-slate-900">Nama Peminjam</span><div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"><span class="text-sm font-medium text-slate-800 break-words">${escapeHtml(nameOf(u))}</span><div class="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600">${renderOrgLogo(u)}<span>${escapeHtml(organizationOf(u))}</span></div></div></div><div><span class="mb-2 block text-sm font-medium text-slate-900">NIM</span><div class="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] break-all">${escapeHtml(u.nim || '—')}</div></div><div><span class="mb-2 block text-sm font-medium text-slate-900">Nomor Whatsapp</span><div class="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] break-all">${escapeHtml(waDisplay)}</div></div><div><div class="flex items-center justify-between gap-4"><span class="text-sm font-medium text-slate-900">Role</span><span class="inline-flex rounded-xl px-4 py-1.5 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(u.role))}</span></div></div></div>
    <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">Tutup</button></div></section></div>`;
  }

  const editing = modalMode === 'edit';
  const currentRole = u?.role ? normalizeRole(u.role) : ROLES.PEMINJAM;
  const isPeminjam = currentRole === ROLES.PEMINJAM;
  const isPj = currentRole === ROLES.PENANGGUNG_JAWAB;

  const currentUser = getUser();
  const pjOrg =
    currentUser?.organisasi?.namaOrganisasi ||
    currentUser?.organisasi?.singkatan ||
    currentUser?.organisasi?.nama ||
    (typeof currentUser?.organisasi === 'string' ? currentUser.organisasi : null) ||
    currentUser?.displayOrganization ||
    'HMTI';
  const selectedOrg = editing ? organizationOf(u) : (u?.displayOrganization || pjOrg);

  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 id="user-form-title" class="text-xl font-semibold tracking-tight text-slate-900">${editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2><form id="user-form" class="mt-6 space-y-4"><div><label class="mb-2 block text-sm font-medium text-slate-900">Nama Pengguna</label><input name="nama" type="text" value="${escapeHtml(u.nama || '')}" placeholder="Nama Pengguna" class="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /><p id="name-field-error" class="mt-1.5 text-xs text-rose-500 ${nameFieldError ? '' : 'hidden'}">${escapeHtml(nameFieldError)}</p></div><div><div class="mb-2 flex items-center justify-between"><label class="text-sm font-medium text-slate-900">NIM</label><span id="nim-digit-counter" class="text-xs ${((u.nim || '')).length === 12 ? 'font-semibold text-emerald-600' : 'font-medium text-slate-400'}">${((u.nim || '')).length}/12</span></div><input name="nim" type="text" inputmode="numeric" maxlength="12" value="${escapeHtml(u.nim || '')}" placeholder="NIM" class="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /><p id="nim-field-error" class="mt-1.5 text-xs text-rose-500 hidden">NIM tidak valid</p></div><div><label class="mb-2 block text-sm font-medium text-slate-900">Nomor Whatsapp</label><div class="flex items-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100"><span class="inline-flex h-12 items-center border-r border-slate-100 bg-slate-50 px-4 text-sm font-medium text-slate-600">+62</span><input name="noWhatsapp" type="tel" value="${escapeHtml(formatNomorWa(u.noWhatsapp || u.no_whatsapp || ''))}" placeholder="812-3456-7890" class="h-12 flex-1 border-0 border-none bg-transparent px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none ring-0 shadow-none focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none" style="border: none !important; outline: none !important; box-shadow: none !important;" /><span class="flex items-center justify-center pr-4" style="padding-right:16px;"><svg class="h-4 w-4 shrink-0 rounded-full border border-slate-200 overflow-hidden" viewBox="0 0 24 24"><path d="M0,0 H24 V12 H0 Z" class="fill-rose-600" style="fill:#e11d48;" /><path d="M0,12 H24 V24 H0 Z" class="fill-white" style="fill:#ffffff;" /></svg></span></div><p id="wa-field-error" class="mt-1.5 text-xs text-rose-500 ${waFieldError ? '' : 'hidden'}">${escapeHtml(waFieldError)}</p></div><div><label class="mb-2 block text-sm font-medium text-slate-900">Organisasi</label><div class="relative"><select name="displayOrganizationSelect" disabled class="${selectClass('appearance-none pr-10 cursor-not-allowed bg-slate-50 text-slate-500 opacity-90')}"><option value="${escapeHtml(selectedOrg)}" selected>${escapeHtml(selectedOrg)}</option></select><input type="hidden" name="displayOrganization" value="${escapeHtml(selectedOrg)}" /><span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">${renderIcon('Lock', 'h-4 w-4 stroke-[2]')}</span></div><p class="mt-1 text-xs text-slate-400">Organisasi otomatis disesuaikan dengan organisasi Anda (${escapeHtml(selectedOrg)}).</p></div><div><span class="mb-3 block text-sm font-medium text-slate-900">Role</span><div class="space-y-3" id="role-radio-group"><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PEMINJAM}" ${isPeminjam ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPeminjam ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPeminjam ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Peminjam</span></label><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PENANGGUNG_JAWAB}" ${isPj ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPj ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPj ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Penanggung Jawab</span></label></div></div><div id="user-form-error" class="${userFormError ? '' : 'hidden'} rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">${escapeHtml(userFormError)}</div><div class="mt-8 flex items-center justify-end gap-4"><button type="button" data-action="close-modal" class="cancel-form-button rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50" style="height:40px; min-height:40px; max-height:40px; padding-top:0; padding-bottom:0; line-height:20px; box-sizing:border-box;">Batal</button><button type="submit" class="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:brightness-110" style="display:inline-flex; flex-shrink:0; align-items:center; justify-content:center; white-space:nowrap; width:auto; min-width:92px; height:40px; min-height:40px; max-height:40px; padding:0 32px; line-height:20px; box-sizing:border-box;">${editing ? 'Edit' : 'Tambah'}</button></div></form></section></div>`;
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

    <div class="mb-3 inline-flex items-center gap-1 rounded-xl bg-white p-1.5">
      <button type="button" data-action="switch-tab" data-tab="pengguna" class="rounded-lg px-4 py-2 text-[11px] font-medium transition ${isPenggunaTab ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">List Pengguna</button>
      <button type="button" data-action="switch-tab" data-tab="request-password" class="rounded-lg px-4 py-2 text-[11px] font-medium transition ${!isPenggunaTab ? 'bg-blue-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}">List Request Password</button>
    </div>

    <div class="rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
      <!-- Judul card, sejajar dengan area pencarian seperti halaman List Pengajuan PJ -->
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-semibold text-slate-900">${isPenggunaTab ? 'List Pengguna' : 'List Request Password'}</h2>
        <!-- Search & Filter Controls -->
        <div class="flex flex-wrap items-center justify-start gap-2.5 sm:justify-end">
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
              class="${buttonClass({ variant: 'default', size: 'default', className: 'h-11 rounded-full px-5 gap-1.5 button-hover-soft-primary shrink-0' })}"
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

  <dialog id="dialog-filter-pengguna" aria-labelledby="filter-pengguna-title" style="width: min(512px, calc(100vw - 2rem)); max-width: none;" class="fixed left-1/2 top-1/2 z-50 m-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
    <div class="flex flex-col p-5 sm:p-6">
      <div class="flex items-center justify-between border-b border-border pb-3">
        <div class="flex min-w-0 items-center gap-2">
          <h2 id="filter-pengguna-title" class="text-base font-semibold leading-tight text-foreground">${isPenggunaTab ? 'Filter Kelola Pengguna' : 'Filter Request Password'}</h2>
          ${nAktif > 0 ? `<span class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">${nAktif}</span>` : ''}
        </div>
        <button type="button" data-action="close-filter-dialog" aria-label="Tutup filter" class="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground">
          ${renderIcon('X', 'h-4 w-4')}
        </button>
      </div>
      <form id="form-filter-pengguna" class="mt-4 space-y-4">
        ${isPenggunaTab
      ? `
      <!-- Role: opsi tunggal yang bisa dibatalkan dengan klik ulang -->
      <div>
        <span class="mb-3 block text-sm font-semibold text-slate-900">Role</span>
        <div class="space-y-3">
          <label class="flex cursor-pointer items-center gap-3" data-filter-option>
            <input type="checkbox" name="filterRole" value="${ROLES.PEMINJAM}" data-filter-checkbox data-filter-group="role" ${roleFilter === ROLES.PEMINJAM ? 'checked' : ''} class="sr-only" />
            <span data-filter-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${roleFilter === ROLES.PEMINJAM ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}">
              <svg data-filter-check class="h-3 w-3 stroke-[3] ${roleFilter === ROLES.PEMINJAM ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="text-sm font-medium text-slate-800">Peminjam</span>
          </label>
          <label class="flex cursor-pointer items-center gap-3" data-filter-option>
            <input type="checkbox" name="filterRole" value="${ROLES.PENANGGUNG_JAWAB}" data-filter-checkbox data-filter-group="role" ${roleFilter === ROLES.PENANGGUNG_JAWAB ? 'checked' : ''} class="sr-only" />
            <span data-filter-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${roleFilter === ROLES.PENANGGUNG_JAWAB ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}">
              <svg data-filter-check class="h-3 w-3 stroke-[3] ${roleFilter === ROLES.PENANGGUNG_JAWAB ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="text-sm font-medium text-slate-800">Penanggung Jawab</span>
          </label>
        </div>
      </div>

      <!-- Status Akun: opsi tunggal yang bisa dibatalkan dengan klik ulang -->
      <div>
        <span class="mb-3 block text-sm font-semibold text-slate-900">Status Akun</span>
        <div class="space-y-3">
          <label class="flex cursor-pointer items-center gap-3" data-filter-option>
            <input type="checkbox" name="filterStatusAkun" value="${STATUS_AKUN.AKTIF}" data-filter-checkbox data-filter-group="statusAkun" ${statusFilter === STATUS_AKUN.AKTIF ? 'checked' : ''} class="sr-only" />
            <span data-filter-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${statusFilter === STATUS_AKUN.AKTIF ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}">
              <svg data-filter-check class="h-3 w-3 stroke-[3] ${statusFilter === STATUS_AKUN.AKTIF ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="text-sm font-medium text-slate-800">Aktif</span>
          </label>
          <label class="flex cursor-pointer items-center gap-3" data-filter-option>
            <input type="checkbox" name="filterStatusAkun" value="${STATUS_AKUN.NONAKTIF}" data-filter-checkbox data-filter-group="statusAkun" ${statusFilter === STATUS_AKUN.NONAKTIF ? 'checked' : ''} class="sr-only" />
            <span data-filter-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${statusFilter === STATUS_AKUN.NONAKTIF ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}">
              <svg data-filter-check class="h-3 w-3 stroke-[3] ${statusFilter === STATUS_AKUN.NONAKTIF ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span class="text-sm font-medium text-slate-800">Nonaktif</span>
          </label>
        </div>
      </div>
    `
      : `
      <!-- Status Request Password -->
      <div class="space-y-1.5">
        <label for="filter-rp-status" class="block text-sm font-semibold text-foreground">Status Pengajuan</label>
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
    `}
      </form>
      <div class="mt-5 flex items-center justify-end gap-3">
        <button type="button" data-action="reset-filter-dialog" class="filter-reset-link px-2 py-2.5 text-sm font-semibold text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">Reset</button>
        <button type="button" data-action="apply-filter-dialog" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Terapkan</button>
      </div>
    </div>
  </dialog>`;
}

function refresh() {
  if (rootElement) rootElement.innerHTML = renderContent();
}

async function loadRpData() {
  isRpLoading = true;
  refresh();
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
  } finally {
    isRpLoading = false;
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
  isUsersLoading = false;
  isRpLoading = false;
  rpFormattedMessage = '';
  copyFeedback = false;

  modalMode = null;
  selectedUser = null;
  pendingStatusChange = null;
  pendingAddUser = null;
  pendingEditUser = null;
  userFormError = '';
  nameFieldError = '';
  waFieldError = '';
  toastMessage = '';

  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }

  isUsersLoading = true;
  isRpLoading = true;
  rootElement.innerHTML = renderContent();

  // Muat data awal secara paralel
  try {
    const [userData] = await Promise.all([
      getUsers(),
      getRequestPasswordList({
        page: rpCurrentPage,
        limit: PAGE_SIZE,
        q: rpSearchTerm,
        status: rpStatusFilter,
      }).then((res) => {
        requestPasswords = res?.data || [];
        rpTotal = res?.meta?.total || 0;
        rpTotalPages = res?.meta?.totalPages || 1;
      }).catch((err) => {
        console.error('Gagal memuat request password:', err);
        requestPasswords = [];
        rpTotal = 0;
        rpTotalPages = 1;
      }),
    ]);
    users = userData || [];
  } catch {
    users = [];
  } finally {
    isUsersLoading = false;
    isRpLoading = false;
  }

  refresh();

  clickHandler = async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      const backdrop = event.target.closest('[data-modal-backdrop]');
      if (backdrop && event.target === backdrop) {
        modalMode = null;
        selectedUser = null;
        selectedRp = null;
        pendingEditUser = null;
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
      pendingStatusChange = null;
      pendingAddUser = null;
      pendingEditUser = null;
      userFormError = '';
      nameFieldError = '';
      waFieldError = '';
      refresh();
      return;
    }

    // Aksi Pengguna
    if (action === 'add') {
      modalMode = 'add';
      selectedUser = {};
      pendingAddUser = null;
      pendingEditUser = null;
      userFormError = '';
      nameFieldError = '';
      waFieldError = '';
      refresh();
      return;
    }

    if (action === 'edit' || action === 'detail') {
      selectedUser = users.find((user) => String(user.id) === String(id)) || null;
      pendingEditUser = null;
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
      const filterForm = rootElement.querySelector('#form-filter-pengguna');
      if (activeTab === 'pengguna') {
        // Reset hanya mengosongkan pilihan di popup; perubahan diterapkan setelah Terapkan.
        filterForm?.querySelectorAll('input[data-filter-checkbox]').forEach((checkbox) => {
          checkbox.checked = false;
          const option = checkbox.closest('[data-filter-option]');
          const indicator = option?.querySelector('[data-filter-indicator]');
          const check = option?.querySelector('[data-filter-check]');
          if (indicator) indicator.className = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition border-slate-300 bg-white text-transparent';
          if (check) {
            check.classList.remove('block');
            check.classList.add('hidden');
          }
        });
      } else {
        const rpStatusSelect = filterForm?.querySelector('#filter-rp-status');
        if (rpStatusSelect) rpStatusSelect.value = 'all';
      }
      // Popup sengaja tetap terbuka, sama seperti Reset pada Filter Barang Inventaris.
      return;
    }

    if (action === 'apply-filter-dialog') {
      if (activeTab === 'pengguna') {
        roleFilter = rootElement.querySelector('input[name="filterRole"]:checked')?.value || 'all';
        statusFilter = rootElement.querySelector('input[name="filterStatusAkun"]:checked')?.value || 'all';
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
      const currentUser = getUser();
      if (currentUser && (
        (currentUser.nim && String(user.nim) === String(currentUser.nim)) ||
        (currentUser.id && String(user.id) === String(currentUser.id))
      )) {
        toastMessage = 'Tidak dapat menonaktifkan akun sendiri.';
        toastType = 'error';
        if (toastTimer) clearTimeout(toastTimer);
        refresh();
        toastTimer = setTimeout(() => {
          toastMessage = '';
          toastTimer = null;
          refresh();
        }, 3000);
        return;
      }
      const nextStatus = isActive(user) ? STATUS_AKUN.NONAKTIF : STATUS_AKUN.AKTIF;
      pendingStatusChange = {
        id: user.id,
        nama: nameOf(user),
        nextStatus,
      };
      modalMode = 'status-confirm';
      refresh();
      return;
    }

    if (action === 'cancel-status-change') {
      pendingStatusChange = null;
      modalMode = null;
      refresh();
      return;
    }

    if (action === 'confirm-status-change') {
      if (!pendingStatusChange) return;
      const statusChange = pendingStatusChange;
      try {
        await updateMockUser(statusChange.id, { statusAkun: statusChange.nextStatus });
        users = await getUsers();
        pendingStatusChange = null;
        modalMode = 'status-success';
        toastMessage = '';
        toastType = 'success';
      } catch (error) {
        pendingStatusChange = null;
        modalMode = null;
        toastMessage = error?.message || 'Status akun gagal diperbarui.';
        toastType = 'error';
        if (toastTimer) clearTimeout(toastTimer);
        refresh();
        toastTimer = setTimeout(() => {
          toastMessage = '';
          toastTimer = null;
          refresh();
        }, 3000);
        return;
      }
      refresh();
      return;
    }

    if (action === 'back-edit-form') {
      if (!pendingEditUser) return;
      selectedUser = { ...(selectedUser || {}), ...pendingEditUser.data };
      pendingEditUser = null;
      userFormError = '';
      nameFieldError = '';
      waFieldError = '';
      modalMode = 'edit';
      refresh();
      return;
    }

    if (action === 'confirm-edit-user') {
      if (!pendingEditUser) return;
      const editPayload = pendingEditUser;
      try {
        await updateMockUser(editPayload.id, editPayload.data);
        users = await getUsers();
        pendingEditUser = null;
        selectedUser = null;
        userFormError = '';
        nameFieldError = '';
        waFieldError = '';
        toastMessage = '';
        toastType = 'success';
        modalMode = 'edit-success';
      } catch (error) {
        selectedUser = { ...(selectedUser || {}), ...editPayload.data };
        pendingEditUser = null;
        userFormError = error?.message || 'Data pengguna gagal disimpan.';
        modalMode = 'edit';
      }
      refresh();
      return;
    }

    if (action === 'back-add-form') {
      modalMode = 'add';
      selectedUser = pendingAddUser ? { ...pendingAddUser } : (selectedUser || {});
      pendingAddUser = null;
      userFormError = '';
      nameFieldError = '';
      waFieldError = '';
      refresh();
      return;
    }

    if (action === 'confirm-add-user') {
      if (!pendingAddUser) return;
      const payload = { ...pendingAddUser };
      try {
        await addMockUser(payload);
        users = await getUsers();
        pendingAddUser = null;
        selectedUser = null;
        userFormError = '';
        waFieldError = '';
        toastMessage = '';
        toastType = 'success';
        modalMode = 'add-success';
      } catch (error) {
        pendingAddUser = null;
        selectedUser = { ...payload };
        userFormError = error?.message || 'Data pengguna gagal ditambahkan.';
        modalMode = 'add';
      }
      refresh();
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
        const rawWa = String(selectedRp.noWhatsapp || selectedRp.no_whatsapp || '').replace(/\D+/g, '');
        const intlWa = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : (rawWa.startsWith('62') ? rawWa : '62' + rawWa);
        rpProsesData.waUrl = `https://wa.me/${intlWa}?text=${encodeURIComponent(rpFormattedMessage)}`;

        // Refresh data agar baris di tabel langsung berstatus Dikonfirmasi
        await loadRpData();

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
    if (event.target.name === 'nama') {
      const input = event.target;
      const errorEl = rootElement.querySelector('#name-field-error');
      if (errorEl && !errorEl.classList.contains('hidden')) {
        if (input.value.trim()) {
          nameFieldError = '';
          errorEl.textContent = '';
          errorEl.classList.add('hidden');
          input.classList.remove('border-rose-400');
        } else {
          nameFieldError = 'Nama Pengguna wajib diisi.';
          errorEl.textContent = nameFieldError;
        }
      }
      return;
    }
    if (event.target.name === 'noWhatsapp') {
      const input = event.target;
      input.value = formatNomorWa(input.value);
      const digits = input.value.replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');
      const errorEl = rootElement.querySelector('#wa-field-error');
      const isAddForm = modalMode === 'add';

      if (errorEl && !errorEl.classList.contains('hidden')) {
        if (!digits && isAddForm) {
          waFieldError = 'No WhatsApp wajib diisi.';
          errorEl.textContent = waFieldError;
        } else if (digits.length > 0 && digits.length < 10 && isAddForm) {
          waFieldError = 'Nomor WhatsApp minimal 10 angka.';
          errorEl.textContent = waFieldError;
        } else if (digits.length >= 10 || (!digits && !isAddForm)) {
          waFieldError = '';
          errorEl.textContent = '';
          errorEl.classList.add('hidden');
          input.closest('.flex.items-center')?.classList.remove('border-rose-400');
        }
      }
      return;
    }
    if (event.target.name === 'nim') {
      const input = event.target;
      input.value = input.value.replace(/\D/g, '').slice(0, 12);
      const counterEl = rootElement.querySelector('#nim-digit-counter');
      if (counterEl) {
        counterEl.textContent = `${input.value.length}/12`;
        counterEl.className = input.value.length === 12
          ? 'text-xs font-semibold text-emerald-600'
          : 'text-xs font-medium text-slate-400';
      }
      const errEl = rootElement.querySelector('#nim-field-error');
      if (errEl && !errEl.classList.contains('hidden')) {
        if (!input.value) {
          errEl.textContent = 'NIM wajib diisi.';
        } else if (input.value.length === 12) {
          errEl.textContent = '';
          errEl.classList.add('hidden');
          input.classList.remove('border-rose-400');
        } else {
          errEl.textContent = 'NIM tidak valid';
        }
      } else if (input.value.length === 12) {
        errEl?.classList.add('hidden');
        input.classList.remove('border-rose-400');
      }
      return;
    }
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
    const nameFieldErr = rootElement.querySelector('#name-field-error');
    const nimFieldErr = rootElement.querySelector('#nim-field-error');
    const nameInput = form.querySelector('input[name="nama"]');
    const nimInput = form.querySelector('input[name="nim"]');
    const waInput = form.querySelector('input[name="noWhatsapp"]');
    const wasEditing = modalMode === 'edit';

    userFormError = '';
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }

    const nameVal = String(data.nama || '').trim();
    const nimVal = String(data.nim || '').trim();
    const rawWhatsapp = String(data.noWhatsapp || '').trim();
    const cleanWhatsappDigits = rawWhatsapp.replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');

    const nameMessage = !nameVal ? 'Nama Pengguna wajib diisi.' : '';
    const nimIsValid = /^\d{12}$/.test(nimVal);
    const nimMessage = !nimVal ? 'NIM wajib diisi.' : (!nimIsValid ? 'NIM tidak valid' : '');
    const waMessage = !wasEditing
      ? (!cleanWhatsappDigits ? 'No WhatsApp wajib diisi.' : (cleanWhatsappDigits.length < 10 ? 'Nomor WhatsApp minimal 10 angka.' : ''))
      : (cleanWhatsappDigits && cleanWhatsappDigits.length < 10 ? 'Nomor WhatsApp minimal 10 angka.' : '');

    // Tampilkan pesan ketiga field sekaligus, tepat di bawah masing-masing input.
    nameFieldError = nameMessage;
    if (nameFieldErr) {
      nameFieldErr.textContent = nameMessage;
      nameFieldErr.classList.toggle('hidden', !nameMessage);
    }
    if (nameInput) nameInput.classList.toggle('border-rose-400', Boolean(nameMessage));

    if (nimFieldErr) {
      nimFieldErr.textContent = nimMessage;
      nimFieldErr.classList.toggle('hidden', !nimMessage);
    }
    if (nimInput) nimInput.classList.toggle('border-rose-400', Boolean(nimMessage));

    waFieldError = waMessage;
    const waErrorEl = rootElement.querySelector('#wa-field-error');
    if (waErrorEl) {
      waErrorEl.textContent = waMessage;
      waErrorEl.classList.toggle('hidden', !waMessage);
    }
    const waWrapper = waInput?.closest('.flex.items-center');
    waWrapper?.classList.toggle('border-rose-400', Boolean(waMessage));

    data.nama = nameVal;
    if (nameMessage || nimMessage || waMessage) {
      if (nameMessage) nameInput?.focus();
      else if (nimMessage) nimInput?.focus();
      else waInput?.focus();
      return;
    }

    data.noWhatsapp = cleanWhatsappDigits ? `+62${cleanWhatsappDigits}` : '';

    if (wasEditing) {
      pendingEditUser = {
        id: selectedUser.id,
        data: { ...data },
      };
      selectedUser = { ...(selectedUser || {}), ...data };
      userFormError = '';
      nameFieldError = '';
      waFieldError = '';
      modalMode = 'edit-confirm';
      refresh();
      return;
    }

    pendingAddUser = { ...data };
    selectedUser = { ...data };
    waFieldError = '';
    userFormError = '';
    modalMode = 'add-confirm';
    refresh();
  };

  changeHandler = (event) => {
    const filterCheckbox = event.target?.matches?.('input[data-filter-checkbox]') ? event.target : null;
    if (filterCheckbox) {
      const groupName = filterCheckbox.dataset.filterGroup;
      const groupSelector = `input[data-filter-checkbox][data-filter-group="${groupName}"]`;

      // Tiap kelompok hanya boleh memilih satu opsi; klik ulang membatalkan pilihan.
      if (filterCheckbox.checked) {
        rootElement?.querySelectorAll(groupSelector).forEach((peer) => {
          if (peer !== filterCheckbox) peer.checked = false;
        });
      }

      rootElement?.querySelectorAll(groupSelector).forEach((checkbox) => {
        const option = checkbox.closest('[data-filter-option]');
        const indicator = option?.querySelector('[data-filter-indicator]');
        const check = option?.querySelector('[data-filter-check]');
        const checked = checkbox.checked;
        if (indicator) {
          indicator.className = `flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${checked ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}`;
        }
        if (check) {
          check.classList.toggle('block', checked);
          check.classList.toggle('hidden', !checked);
        }
      });
      return;
    }

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
  pendingStatusChange = null;
  pendingAddUser = null;
  pendingEditUser = null;
  userFormError = '';
  nameFieldError = '';
  waFieldError = '';
  isUsersLoading = false;
  isRpLoading = false;
}
