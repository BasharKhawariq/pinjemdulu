/** Halaman Pengelolaan > Kelola Pengguna. */
import { getUsers, updateMockUser, addMockUser } from '../services/users.js';
import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';
import { renderSearchInput } from '../ui/search-input.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { renderFilterButton, renderFilterModal } from '../ui/filter.js';
import { selectClass } from '../ui/classes.js';

const DEMO_ORDER = ['Bintang Putra', 'Berbinar Neira', 'Gama Punta', 'Gentala Arka', 'Hanin Maizah', 'Jingga Pratama', 'Maitri Sakti', 'Maria Khalda', 'Rion Ardian', 'Tiara Ayudya'];
const PAGE_SIZE = 10;
const ORGANISASI_LIST = ['BEM', 'HMTI', 'HME', 'HIMANIA', 'RISPOL', 'HMS', 'THEATRISIC', 'PP'];
let users = [];
let searchTerm = '';
let roleFilter = 'all';
let statusFilter = 'all';
let currentPage = 1;
let modalMode = null;
let selectedUser = null;
let toastMessage = '';
let toastType = 'success';
let rootElement = null;
let clickHandler = null;
let inputHandler = null;
let submitHandler = null;
let changeHandler = null;

function nameOf(user) { return user?.nama || 'Pengguna'; }
function initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'P'; }
function organizationOf(user) { return user?.displayOrganization || user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || '—'; }
function orgLogoOf(user) { return user?.logoOrganisasi || user?.organisasiLogo || user?.organisasi?.icon || user?.organisasi?.logo || null; }
function orgInitial(org) { const s = String(org || '').trim(); return s ? s.slice(0, 1).toUpperCase() : 'O'; }
function orgBadgeClass(org) {
  const key = String(org || '').trim().toUpperCase();
  if (key === 'HMTI') return 'bg-amber-400 text-amber-950';
  if (key === 'HME') return 'bg-fuchsia-600 text-white';
  if (key === 'HMS') return 'bg-emerald-600 text-white';
  if (key === 'HIMANIA') return 'bg-blue-600 text-white';
  if (key === 'BEM') return 'bg-indigo-600 text-white';
  if (key === 'THEATRISIC') return 'bg-rose-500 text-white';
  if (key === 'RISPOL') return 'bg-teal-600 text-white';
  if (key === 'PP') return 'bg-orange-500 text-white';
  return 'bg-slate-200 text-slate-700';
}
function renderOrgLogo(user) {
  const org = organizationOf(user);
  const logo = orgLogoOf(user);
  if (logo) {
    return `<img src="${escapeHtml(logo)}" alt="Logo ${escapeHtml(org)}" class="h-4 w-4 shrink-0 rounded-full object-cover" onerror="this.style.display='none';this.nextElementSibling?.classList.remove('hidden');" /><span class="hidden inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${orgBadgeClass(org)}" aria-hidden="true">${escapeHtml(orgInitial(org))}</span>`;
  }
  return `<span class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${orgBadgeClass(org)}" aria-hidden="true" title="Logo ${escapeHtml(org)}">${escapeHtml(orgInitial(org))}</span>`;
}
function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === ROLES.PENANGGUNG_JAWAB || r === 'penanggung jawab' || r === 'pj') {
    return ROLES.PENANGGUNG_JAWAB;
  }
  return ROLES.PEMINJAM;
}
function roleLabel(role) { return normalizeRole(role) === ROLES.PENANGGUNG_JAWAB ? 'Penanggung Jawab' : 'Peminjam'; }
function statusOf(user) { return user.statusAkun || user.status_akun || STATUS_AKUN.AKTIF; }
function isActive(user) { return statusOf(user) === STATUS_AKUN.AKTIF; }
function countActiveFilters() {
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
    .filter((user) => !q || `${user.nama} ${user.nim} ${user.email || ''} ${organizationOf(user)} ${roleLabel(user.role)}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const ai = DEMO_ORDER.indexOf(a.nama); const bi = DEMO_ORDER.indexOf(b.nama);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return String(a.nama).localeCompare(String(b.nama));
    });
}
function renderRows() {
  const filtered = visibleUsers();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  if (!pageRows.length) return `<tr><td colspan="6" class="px-5 py-16 text-center text-sm text-slate-400">${renderIcon('Search', 'mr-2 inline h-4 w-4')}Pengguna tidak ditemukan.</td></tr>`;
  return pageRows.map((user, index) => {
    const active = isActive(user);
    const roleClass = user.role === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';
    return `<tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-500">${start + index + 1}</td>
      <td class="min-w-[190px] px-4 py-3"><div class="flex items-center gap-2.5"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-xs font-semibold text-white">${escapeHtml(initials(nameOf(user)))}</span><div class="min-w-0"><div class="truncate text-xs font-medium text-slate-500">${escapeHtml(nameOf(user))}</div><div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">${renderOrgLogo(user)}<span class="truncate">${escapeHtml(organizationOf(user))}</span></div></div></div></td>
      <td class="whitespace-nowrap px-4 py-3.5 text-center text-xs text-slate-400">${escapeHtml(user.nim || '—')}</td>
      <td class="px-4 py-3.5 text-center"><button type="button" data-action="toggle" data-id="${escapeHtml(user.id)}" aria-label="${active ? 'Nonaktifkan' : 'Aktifkan'} akun ${escapeHtml(nameOf(user))}" aria-pressed="${active}" class="relative inline-flex h-5 w-9 items-center rounded-full transition ${active ? 'bg-primary' : 'bg-slate-200'}"><span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${active ? 'translate-x-[18px]' : 'translate-x-[2px]'}"></span></button></td>
      <td class="px-4 py-3.5 text-center"><span class="inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(user.role))}</span></td>
      <td class="whitespace-nowrap px-4 py-3.5"><div class="flex items-center justify-center gap-0"><button type="button" data-action="edit" data-id="${escapeHtml(user.id)}" title="Edit pengguna" aria-label="Edit pengguna" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Pencil', 'h-4 w-4')}</button><button type="button" data-action="detail" data-id="${escapeHtml(user.id)}" title="Detail pengguna" aria-label="Detail pengguna" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Info', 'h-4 w-4')}</button></div></td>
    </tr>`;
  }).join('');
}
import { renderPagination as renderSharedPagination } from '../ui/pagination.js';

function renderPagination() {
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
function renderModal() {
  if (!modalMode) return '';
  if (modalMode === 'success-edit') {
    return renderModalComponent({
      id: 'modal-success-edit-user',
      title: 'Data Pengguna Berhasil Diperbarui!',
      description: 'Perubahan data pengguna telah berhasil disimpan ke dalam sistem.',
      variant: 'success',
      actions: [
        { label: 'Tutup', action: 'close-modal', variant: 'default' }
      ]
    });
  }
  if (!selectedUser) return '';
  const u = selectedUser;
  if (modalMode === 'detail') {
    const roleClass = normalizeRole(u.role) === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 class="text-xl font-semibold tracking-tight text-slate-900">Detail Pengguna</h2><div class="mt-6 space-y-4"><div><span class="mb-2 block text-sm font-medium text-slate-900">Nama Peminjam</span><div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"><span class="text-sm font-medium text-slate-800 break-words">${escapeHtml(nameOf(u))}</span><div class="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600">${renderOrgLogo(u)}<span>${escapeHtml(organizationOf(u))}</span></div></div></div><div><span class="mb-2 block text-sm font-medium text-slate-900">NIM</span><div class="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] break-all">${escapeHtml(u.nim || '—')}</div></div><div><span class="mb-2 block text-sm font-medium text-slate-900">Role</span><div><span class="inline-flex rounded-xl px-4 py-1.5 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(u.role))}</span></div></div></div><div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">Tutup</button></div></section></div>`;
  }
  const editing = modalMode === 'edit';
  const currentRole = editing ? normalizeRole(u?.role) : ROLES.PEMINJAM;
  const isPeminjam = currentRole === ROLES.PEMINJAM;
  const isPj = currentRole === ROLES.PENANGGUNG_JAWAB;
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 id="user-form-title" class="text-xl font-semibold tracking-tight text-slate-900">${editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2><form id="user-form" class="mt-6 space-y-4"><div><label class="mb-2 block text-sm font-medium text-slate-900">Nama Peminjam</label><input name="nama" type="text" value="${escapeHtml(editing ? (u.nama || '') : '')}" placeholder="Nama Peminjam" required class="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /></div><div><label class="mb-2 block text-sm font-medium text-slate-900">NIM</label><input name="nim" type="text" value="${escapeHtml(editing ? (u.nim || '') : '')}" placeholder="NIM" required class="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /></div><div><label class="mb-2 block text-sm font-medium text-slate-900">Organisasi</label><div class="relative"><select name="displayOrganization" class="${selectClass('appearance-none pr-10 cursor-pointer')}">${ORGANISASI_LIST.map((org) => `<option value="${escapeHtml(org)}" ${(editing ? organizationOf(u) : 'HIMANIA') === org ? 'selected' : ''}>${escapeHtml(org)}</option>`).join('')}</select><span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">${renderIcon('ChevronDown', 'h-4 w-4 stroke-[2.2]')}</span></div></div><div><span class="mb-3 block text-sm font-medium text-slate-900">Role</span><div class="space-y-3" id="role-radio-group"><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PEMINJAM}" ${isPeminjam ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPeminjam ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPeminjam ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Peminjam</span></label><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PENANGGUNG_JAWAB}" ${isPj ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPj ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPj ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Penanggung Jawab</span></label></div></div><div id="user-form-error" class="hidden rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700"></div><div class="mt-8 flex items-center justify-end gap-5"><button type="button" data-action="close-modal" class="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Batal</button><button type="submit" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">${editing ? 'Edit' : 'Tambah'}</button></div></form></section></div>`;
}
function renderContent() {
  const filtered = visibleUsers();
  const nAktif = countActiveFilters();
  return `<section class="w-full px-5 pb-8 pt-6 sm:px-6 lg:px-7">
    <div class="mb-6">
      <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Kelola Pengguna</h1>
      <p class="mt-1 text-sm text-slate-400">Pantau dan kelola akun pengguna, hak akses, dan perannya dalam sistem.</p>
    </div>
    <div class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-5">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-base font-semibold text-slate-900">List Pengguna</h2>
        <div class="flex items-center justify-end gap-2.5">
          ${renderSearchInput({ id: 'search-users', value: searchTerm, placeholder: 'Cari nama pengguna', ariaLabel: 'Cari nama pengguna', className: 'w-full sm:w-64' })}
          ${renderFilterButton({
            id: 'btn-filter-pengguna',
            action: 'open-filter-dialog',
            title: 'Filter pengguna',
            ariaLabel: 'Filter pengguna',
            countActive: nAktif,
          })}
          <button type="button" data-action="add" class="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary/90">Tambah Pengguna</button>
        </div>
      </div>
      ${toastMessage ? `<div role="status" class="mb-3 rounded-lg px-4 py-2 text-sm ${toastType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">${escapeHtml(toastMessage)}</div>` : ''}
        <div class="w-full overflow-x-auto">
          <table class="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr class="border-b border-slate-100 text-sm font-medium leading-[140%] tracking-normal text-slate-400">
              <th class="px-4 py-3.5 text-center font-semibold">No</th>
              <th class="px-4 py-3.5 font-semibold">Nama</th>
              <th class="px-4 py-3.5 text-center font-semibold">NIM</th>
              <th class="px-4 py-3.5 text-center font-semibold">Status</th>
              <th class="px-4 py-3.5 text-center font-semibold">Role</th>
              <th class="px-4 py-3.5 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows()}
            </tbody>
            </table>
        </div>
      <div class="mt-4 flex items-center justify-between gap-3"><p class="text-xs text-slate-500">Menampilkan ${filtered.length ? Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length) : 0}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} dari ${filtered.length} pengguna</p>${renderPagination()}</div>
    </div>
  </section>
  ${renderModal()}
  ${renderFilterModal({
    id: 'dialog-filter-pengguna',
    title: 'Filter Pengguna',
    countActive: nAktif,
    closeAction: 'close-filter-dialog',
    resetAction: 'reset-filter-dialog',
    applyAction: 'apply-filter-dialog',
    formId: 'form-filter-pengguna',
    bodyContent: `
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
    `,
  })}`;
}
function refresh() { if (rootElement) rootElement.innerHTML = renderContent(); }
export function render() { return renderContent(); }
export async function mount(root) {
  rootElement = root;
  searchTerm = ''; roleFilter = 'all'; statusFilter = 'all'; currentPage = 1; modalMode = null; selectedUser = null; toastMessage = '';
  users = await getUsers();
  rootElement.innerHTML = renderContent();
  clickHandler = async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      const backdrop = event.target.closest('[data-modal-backdrop]');
      if (backdrop && event.target === backdrop) { modalMode = null; selectedUser = null; refresh(); }
      return;
    }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'close-modal') { modalMode = null; selectedUser = null; refresh(); return; }
    if (action === 'add') { modalMode = 'add'; selectedUser = {}; refresh(); return; }
    if (action === 'edit' || action === 'detail') { selectedUser = users.find((user) => String(user.id) === String(id)) || null; modalMode = action; refresh(); return; }
    if (action === 'open-filter-dialog') {
      rootElement.querySelector('#dialog-filter-pengguna')?.showModal();
      return;
    }
    if (action === 'close-filter-dialog') {
      rootElement.querySelector('#dialog-filter-pengguna')?.close();
      return;
    }
    if (action === 'reset-filter-dialog') {
      roleFilter = 'all';
      statusFilter = 'all';
      currentPage = 1;
      rootElement.querySelector('#dialog-filter-pengguna')?.close();
      refresh();
      return;
    }
    if (action === 'apply-filter-dialog') {
      const rVal = rootElement.querySelector('#filter-user-role')?.value || 'all';
      const sVal = rootElement.querySelector('#filter-user-status')?.value || 'all';
      roleFilter = rVal;
      statusFilter = sVal;
      currentPage = 1;
      rootElement.querySelector('#dialog-filter-pengguna')?.close();
      refresh();
      return;
    }
    if (action === 'prev') { currentPage = Math.max(1, currentPage - 1); refresh(); return; }
    if (action === 'next') { currentPage = Math.min(Math.max(1, Math.ceil(visibleUsers().length / PAGE_SIZE)), currentPage + 1); refresh(); return; }
    if (action === 'toggle') {
      const user = users.find((item) => String(item.id) === String(id));
      if (!user) return;
      const nextStatus = isActive(user) ? STATUS_AKUN.NONAKTIF : STATUS_AKUN.AKTIF;
      try { await updateMockUser(id, { statusAkun: nextStatus }); toastMessage = `Akun ${user.nama} sekarang ${nextStatus === STATUS_AKUN.AKTIF ? 'aktif' : 'nonaktif'}.`; toastType = 'success'; users = await getUsers(); }
      catch (error) { toastMessage = error.message || 'Status akun gagal diperbarui.'; toastType = 'error'; }
      refresh(); return;
    }
  };
  inputHandler = (event) => {
    if (event.target.id !== 'search-users') return;
    const input = event.target;
    const pos = input.selectionStart;
    searchTerm = input.value;
    currentPage = 1;
    refresh();
    const replacement = rootElement.querySelector('#search-users');
    if (replacement) { replacement.focus(); try { replacement.setSelectionRange(pos, pos); } catch {} }
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
      if (errorBox) { errorBox.textContent = error.message || 'Data pengguna gagal disimpan.'; errorBox.classList.remove('hidden'); }
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
  rootElement = null; clickHandler = null; inputHandler = null; submitHandler = null; changeHandler = null;
}
