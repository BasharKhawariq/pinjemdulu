/** Halaman Pengelolaan > Kelola Pengguna. */
import { getUsers, updateMockUser, addMockUser } from '../services/users.js';
import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { renderIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/html.js';

const DEMO_ORDER = ['Bintang Putra', 'Berbinar Neira', 'Gama Punta', 'Gentala Arka', 'Hanin Maizah', 'Jingga Pratama', 'Maitri Sakti', 'Maria Khalda', 'Rion Ardian', 'Tiara Ayudya'];
const PAGE_SIZE = 10;
const ORGANISASI_LIST = ['BEM', 'HMTI', 'HME', 'HIMANIA', 'RISPOL', 'HMS', 'THEATRISIC', 'PP'];
let users = [];
let searchTerm = '';
let roleFilter = 'all';
let showFilters = false;
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
    return `<img src="${escapeHtml(logo)}" alt="Logo ${escapeHtml(org)}" class="h-3.5 w-3.5 shrink-0 rounded-full object-cover" onerror="this.style.display='none';this.nextElementSibling?.classList.remove('hidden');" /><span class="hidden inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${orgBadgeClass(org)}" aria-hidden="true">${escapeHtml(orgInitial(org))}</span>`;
  }
  return `<span class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${orgBadgeClass(org)}" aria-hidden="true" title="Logo ${escapeHtml(org)}">${escapeHtml(orgInitial(org))}</span>`;
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
function visibleUsers() {
  const q = searchTerm.trim().toLowerCase();
  return users
    .filter((user) => user.managementList !== false)
    .filter((user) => roleFilter === 'all' || user.role === roleFilter)
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
      <td class="whitespace-nowrap px-3 py-3 text-center text-[10px] text-slate-400">${start + index + 1}</td>
      <td class="min-w-[185px] px-3 py-2.5"><div class="flex items-center gap-2"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-[10px] font-semibold text-white">${escapeHtml(initials(nameOf(user)))}</span><div class="min-w-0"><div class="truncate text-[10px] font-medium text-slate-500">${escapeHtml(nameOf(user))}</div><div class="mt-0.5 flex items-center gap-1.5 text-[9px] text-slate-600">${renderOrgLogo(user)}<span class="truncate">${escapeHtml(organizationOf(user))}</span></div></div></div></td>
      <td class="whitespace-nowrap px-3 py-3 text-[10px] text-slate-400">${escapeHtml(user.nim || '—')}</td>
      <td class="px-3 py-3 text-center"><button type="button" data-action="toggle" data-id="${escapeHtml(user.id)}" aria-label="${active ? 'Nonaktifkan' : 'Aktifkan'} akun ${escapeHtml(nameOf(user))}" aria-pressed="${active}" class="relative inline-flex h-[17px] w-[30px] items-center rounded-full transition ${active ? 'bg-primary' : 'bg-slate-200'}"><span class="inline-block h-[13px] w-[13px] rounded-full bg-white shadow-sm transition ${active ? 'translate-x-[14px]' : 'translate-x-[2px]'}"></span></button></td>
      <td class="px-3 py-3"><span class="inline-flex whitespace-nowrap rounded-lg px-2 py-1.5 text-[9px] font-medium ${roleClass}">${escapeHtml(roleLabel(user.role))}</span></td>
      <td class="whitespace-nowrap px-3 py-3"><div class="flex items-center justify-center gap-1"><button type="button" data-action="edit" data-id="${escapeHtml(user.id)}" title="Edit pengguna" aria-label="Edit pengguna" class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Pencil', 'h-3.5 w-3.5')}</button><button type="button" data-action="detail" data-id="${escapeHtml(user.id)}" title="Detail pengguna" aria-label="Detail pengguna" class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">${renderIcon('Info', 'h-3.5 w-3.5')}</button></div></td>
    </tr>`;
  }).join('');
}
function renderPagination() {
  const pages = Math.max(1, Math.ceil(visibleUsers().length / PAGE_SIZE));
  return `<div class="flex items-center justify-end gap-2"><button type="button" data-action="prev" aria-label="Halaman sebelumnya" ${currentPage <= 1 ? 'disabled' : ''} class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-40">${renderIcon('ChevronLeft', 'h-4 w-4')}</button><span class="flex h-8 min-w-8 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-white">${currentPage}</span><button type="button" data-action="next" aria-label="Halaman berikutnya" ${currentPage >= pages ? 'disabled' : ''} class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-40">${renderIcon('ChevronRight', 'h-4 w-4')}</button></div>`;
}
function renderModal() {
  if (!modalMode || !selectedUser) return '';
  const u = selectedUser;
  if (modalMode === 'detail') {
    const roleClass = normalizeRole(u.role) === ROLES.PENANGGUNG_JAWAB ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700';
    return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 class="text-xl font-bold tracking-tight text-slate-900">Detail Pengguna</h2><div class="mt-6 space-y-4"><div><span class="mb-2 block text-xs font-semibold text-slate-900">Nama Peminjam</span><div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"><span class="text-sm font-medium text-slate-800 break-words">${escapeHtml(nameOf(u))}</span><div class="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600">${renderOrgLogo(u)}<span>${escapeHtml(organizationOf(u))}</span></div></div></div><div><span class="mb-2 block text-xs font-semibold text-slate-900">NIM</span><div class="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] break-all">${escapeHtml(u.nim || '—')}</div></div><div><span class="mb-2 block text-xs font-semibold text-slate-900">Role</span><div><span class="inline-flex rounded-xl px-4 py-1.5 text-xs font-medium ${roleClass}">${escapeHtml(roleLabel(u.role))}</span></div></div></div><div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">Tutup</button></div></section></div>`;
  }
  const editing = modalMode === 'edit';
  const currentRole = editing ? normalizeRole(u?.role) : ROLES.PEMINJAM;
  const isPeminjam = currentRole === ROLES.PEMINJAM;
  const isPj = currentRole === ROLES.PENANGGUNG_JAWAB;
  return `<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 sm:p-6" data-modal-backdrop><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" class="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all"><h2 id="user-form-title" class="text-xl font-bold tracking-tight text-slate-900">${editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2><form id="user-form" class="mt-6 space-y-4"><div><label class="mb-2 block text-xs font-semibold text-slate-900">Nama Peminjam</label><input name="nama" type="text" value="${escapeHtml(editing ? (u.nama || '') : '')}" placeholder="Nama Peminjam" required class="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /></div><div><label class="mb-2 block text-xs font-semibold text-slate-900">NIM</label><input name="nim" type="text" value="${escapeHtml(editing ? (u.nim || '') : '')}" placeholder="NIM" required class="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" /></div><div><label class="mb-2 block text-xs font-semibold text-slate-900">Organisasi</label><div class="relative"><select name="displayOrganization" class="w-full appearance-none rounded-2xl border border-slate-100 bg-white px-4 py-3.5 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer">${ORGANISASI_LIST.map((org) => `<option value="${escapeHtml(org)}" ${(editing ? organizationOf(u) : 'HIMANIA') === org ? 'selected' : ''}>${escapeHtml(org)}</option>`).join('')}</select><span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">${renderIcon('ChevronDown', 'h-4 w-4 stroke-[2.2]')}</span></div></div><div><span class="mb-3 block text-xs font-semibold text-slate-900">Role</span><div class="space-y-3" id="role-radio-group"><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PEMINJAM}" ${isPeminjam ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPeminjam ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPeminjam ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Peminjam</span></label><label class="flex cursor-pointer items-center gap-3" data-role-label><input type="radio" name="role" value="${ROLES.PENANGGUNG_JAWAB}" ${isPj ? 'checked' : ''} class="sr-only" /><span data-role-indicator class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isPj ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'}"><svg data-role-check class="h-3 w-3 stroke-[3] ${isPj ? 'block' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="text-sm font-medium text-slate-800">Penanggung Jawab</span></label></div></div><div id="user-form-error" class="hidden rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700"></div><div class="mt-8 flex items-center justify-end gap-5"><button type="button" data-action="close-modal" class="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Batal</button><button type="submit" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90">${editing ? 'Edit' : 'Tambah'}</button></div></form></section></div>`;
}
function renderContent() {
  const filtered = visibleUsers();
  return `<section class="w-full px-5 pb-8 pt-5 sm:px-6 lg:px-7"><div class="rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-3"><div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 class="text-base font-semibold text-slate-900">List Pengguna</h1><div class="flex items-center justify-end gap-2"><label class="flex h-9 w-10 items-center justify-center rounded-full bg-white text-slate-400 focus-within:w-[190px] focus-within:bg-slate-50 sm:transition-all"><span class="shrink-0">${renderIcon('Search', 'h-4 w-4')}</span><input id="search-users" type="search" value="${escapeHtml(searchTerm)}" placeholder="Cari nama pengguna" class="w-0 min-w-0 bg-transparent text-[11px] outline-none placeholder:text-slate-400 focus:w-full focus:pl-2" /></label><button type="button" data-action="filter" title="Filter pengguna" aria-label="Filter pengguna" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100">${renderIcon('Funnel', 'h-4 w-4')}</button><button type="button" data-action="add" class="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3.5 text-[11px] font-medium text-white hover:bg-primary/90">Tambah Pengguna</button></div></div>
    ${showFilters ? `<div class="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3"><span class="text-xs text-slate-500">Filter role:</span><button type="button" data-action="role-filter" data-role="all" class="rounded-lg px-3 py-1.5 text-xs ${roleFilter === 'all' ? 'bg-primary text-white' : 'bg-white text-slate-600'}">Semua</button><button type="button" data-action="role-filter" data-role="${ROLES.PEMINJAM}" class="rounded-lg px-3 py-1.5 text-xs ${roleFilter === ROLES.PEMINJAM ? 'bg-primary text-white' : 'bg-white text-slate-600'}">Peminjam</button><button type="button" data-action="role-filter" data-role="${ROLES.PENANGGUNG_JAWAB}" class="rounded-lg px-3 py-1.5 text-xs ${roleFilter === ROLES.PENANGGUNG_JAWAB ? 'bg-primary text-white' : 'bg-white text-slate-600'}">Penanggung Jawab</button></div>` : ''}
    ${toastMessage ? `<div role="status" class="mb-3 rounded-lg px-4 py-2 text-sm ${toastType === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">${escapeHtml(toastMessage)}</div>` : ''}
    <div class="w-full overflow-x-auto"><table class="w-full min-w-[680px] border-collapse text-left"><thead><tr class="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><th class="px-3 py-3 text-center">No</th><th class="px-3 py-3">Nama</th><th class="px-3 py-3">NIM</th><th class="px-3 py-3 text-center">Status</th><th class="px-3 py-3">Role</th><th class="px-3 py-3 text-center">Aksi</th></tr></thead><tbody>${renderRows()}</tbody></table></div>
    <div class="mt-4 flex items-center justify-between gap-3"><p class="text-[10px] text-slate-400">Menampilkan ${filtered.length ? Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length) : 0}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} dari ${filtered.length} pengguna</p>${renderPagination()}</div></div></section>${renderModal()}`;
}
function refresh() { if (rootElement) rootElement.innerHTML = renderContent(); }
export function render() { return renderContent(); }
export async function mount(root) {
  rootElement = root;
  searchTerm = ''; roleFilter = 'all'; showFilters = false; currentPage = 1; modalMode = null; selectedUser = null; toastMessage = '';
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
    if (action === 'filter') { showFilters = !showFilters; refresh(); return; }
    if (action === 'role-filter') { roleFilter = button.dataset.role || 'all'; currentPage = 1; refresh(); return; }
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
      modalMode = null; selectedUser = null; toastType = 'success';
      toastMessage = wasEditing ? 'Data pengguna berhasil diperbarui.' : 'Pengguna berhasil ditambahkan.';
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
