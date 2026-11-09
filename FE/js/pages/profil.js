/** Halaman profil pengguna aktif. */

import { getInitials } from '../lib/navigation.js';
import { ROLE_LABEL } from '../lib/navigation.js';
import { escapeHtml } from '../ui/html.js';
import { renderIcon } from '../ui/icons.js';
import { ROLES } from '../lib/constants.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';

let rootElement = null;
let clickHandler = null;
let submitHandler = null;
let modalMode = null;
let passwordError = '';

function organizationOf(user) {
  return user?.displayOrganization || user?.organisasi?.namaOrganisasi || user?.namaOrganisasi || '—';
}

function organizationBadge(organization) {
  const key = String(organization || '').toUpperCase();
  const classes = {
    HMTI: 'bg-amber-400 text-amber-950',
    HME: 'bg-fuchsia-600 text-white',
    HMS: 'bg-emerald-600 text-white',
    HIMANIA: 'bg-blue-600 text-white',
    BEM: 'bg-indigo-600 text-white',
  };
  return `<span class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${classes[key] || 'bg-slate-200 text-slate-700'}">${escapeHtml(String(organization || 'O').slice(0, 1).toUpperCase())}</span>`;
}

function roleLabel(user) {
  return ROLE_LABEL[user?.role] || (user?.role === ROLES.PEMINJAM ? 'Peminjam' : 'PJ Inventaris');
}

function field(label, value) {
  return `
    <div class="grid gap-1.5 sm:grid-cols-[230px_1fr] sm:items-center">
      <dt class="text-base font-medium text-slate-500">${escapeHtml(label)}</dt>
      <dd class="text-base font-medium text-slate-800">${value}</dd>
    </div>
  `;
}

function renderPasswordModal() {
  if (!modalMode) return '';
  if (modalMode === 'success') {
    return renderModalComponent({
      id: 'modal-password-success',
      title: 'Ubah Password berhasil!',
      description: 'Anda telah berhasil mengubah password',
      variant: 'success',
      actions: [{ label: 'Kembali', action: 'close-password-modal', className: 'w-full rounded-xl bg-primary text-white transition-colors hover:brightness-110' }],
    }).toString();
  }
  if (modalMode === 'confirm') {
    return renderModalComponent({
      id: 'modal-password-confirm',
      title: 'Ubah Password?',
      description: 'Periksa kembali data yang akan anda kirim',
      variant: 'send',
      actions: [
        { label: 'Kembali', action: 'back-password-form', variant: 'outline', className: 'w-1/2 rounded-xl' },
        { label: 'Kirim', action: 'confirm-password', className: 'w-1/2 rounded-xl bg-primary text-white transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/30' },
      ],
    }).toString();
  }
  if (modalMode === 'cancel') {
    return renderModalComponent({
      id: 'modal-password-cancel',
      title: 'Batalkan Ubah Password?',
      description: 'Apakah anda yakin ingin membatalkan perubahan password?',
      variant: 'cancel',
      gifContainerClassName: 'mb-4 inline-flex h-32 w-32 items-center justify-center',
      titleClassName: 'text-2xl font-bold text-slate-900',
      descriptionClassName: 'mt-2 text-base text-slate-500',
      actions: [
        { label: 'Kembali', action: 'back-password-form', variant: 'outline', className: 'w-1/2 rounded-xl' },
        { label: 'Batalkan', action: 'close-password-modal', variant: 'default', className: 'w-1/2 rounded-xl bg-red-700 text-white transition-colors hover:bg-red-800 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-red-300' },
      ],
    }).toString();
  }
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" data-modal-backdrop>
      <section role="dialog" aria-modal="true" aria-labelledby="password-form-title" class="w-full max-w-md rounded-2xl bg-white p-5 text-left shadow-2xl sm:p-7">
        <div class="flex items-center justify-between">
          <h2 id="password-form-title" class="text-lg font-bold text-slate-900">Ubah Password</h2>
          <button type="button" data-action="cancel-password-modal" aria-label="Tutup" class="rounded-lg p-2 text-slate-400 hover:bg-slate-50">${renderIcon('X', 'h-5 w-5')}</button>
        </div>
        <form id="password-form" class="mt-5 space-y-4" novalidate>
          ${passwordInput('password-lama', 'Password Saat Ini')}
          ${passwordInput('password-baru', 'Password Baru')}
          ${passwordInput('konfirmasi-password', 'Konfirmasi Password Baru')}
          <p id="password-form-error" class="text-xs text-rose-600 ${passwordError ? '' : 'hidden'}">${escapeHtml(passwordError)}</p>
          <div class="flex justify-end gap-3 pt-2">
          <button type="button" data-action="cancel-password-modal"
              class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-700 hover:bg-rose-700 hover:text-white">
              Batal
          </button>
          <button type="submit"
              class="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110">
              Kirim
          </button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function passwordInput(id, label) {
  return `
    <label for="${id}" class="block text-xs font-medium text-slate-500">${escapeHtml(label)}<span class="text-rose-500">*</span>
      <span class="relative mt-1.5 block">
        <input id="${id}" name="${id}" type="password" required class="h-10 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
        <button type="button" data-action="toggle-password" data-target="${id}" aria-label="Tampilkan password" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400">${renderIcon('Eye', 'h-4 w-4')}</button>
      </span>
    </label>
  `;
}

export function render(ctx = {}) {
  const user = ctx.user || {};
  const name = user.nama || 'Pengguna';
  const organization = organizationOf(user);
  const initials = getInitials(name) || 'PD';
  return `
    <section class="mx-auto w-full max-w-[1080px] pb-10">
      <div class="relative h-36 overflow-visible rounded-[24px] bg-gradient-to-br from-blue-700 via-primary to-blue-950 sm:h-40">
        <span class="absolute -right-4 -top-8 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="absolute right-12 top-10 h-24 w-24 rounded-full bg-white/10"></span>
        <span class="absolute -bottom-10 -left-7 h-28 w-28 rounded-full bg-white/10"></span>
      </div>
      <div class="relative z-10 -mt-12 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-7 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:px-10">
        <div class="row-span-2 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-500 text-3xl font-semibold text-white shadow-md sm:row-span-1">${escapeHtml(initials)}</div>
        <div class="min-w-0" style="transform: translateY(30px)">
          <h2 class="truncate text-xl font-semibold tracking-tight text-slate-700 sm:text-xl">${escapeHtml(name)}</h2>
          <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500 sm:text-sm">
            <span>${escapeHtml(user.nim || '—')}</span><span class="text-slate-300">•</span>${organizationBadge(organization)}<span>${escapeHtml(organization)}</span>
          </div>
        </div>
          <button 
            type="button" 
            data-action="open-password-modal" 
            class="inline-flex h-10 items-center justify-center justify-self-start rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-110 sm:justify-self-end" 
            style="transform: translate(38px, 28px)">Ubah Password
          </button>
      </div>
      <article class="mt-9 rounded-2xl bg-white p-7 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-8">
        <h3 class="text-2xl font-semibold tracking-tight text-slate-900">Detail Pengguna</h3>
        <dl class="mt-5 space-y-5">
          ${field('Nama', escapeHtml(name))}
          ${field('NIM', escapeHtml(user.nim || '—'))}
          ${field('Organisasi', `<span class="inline-flex items-center gap-2">${organizationBadge(organization)}${escapeHtml(organization)}</span>`)}
          ${field('Role', `<span class="inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">${escapeHtml(roleLabel(user))}</span>`)}
        </dl>
      </article>
      ${renderPasswordModal()}
    </section>
  `;
}

export function mount(root, ctx = {}) {
  rootElement = root;
  clickHandler = (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === 'open-password-modal') {
      modalMode = 'form';
      passwordError = '';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'cancel-password-modal') {
      modalMode = 'cancel';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'close-password-modal') {
      modalMode = null;
      passwordError = '';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'back-password-form') {
      modalMode = 'form';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'confirm-password') {
      modalMode = 'success';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'toggle-password') {
      const input = rootElement.querySelector(`#${actionEl.dataset.target}`);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
  };
  submitHandler = (event) => {
    if (event.target.id !== 'password-form') return;
    event.preventDefault();
    const form = new FormData(event.target);
    const current = String(form.get('password-lama') || '').trim();
    const next = String(form.get('password-baru') || '').trim();
    const confirmation = String(form.get('konfirmasi-password') || '').trim();
    if (!current || !next || !confirmation) {
      passwordError = 'Semua field password wajib diisi.';
    } else if (next.length < 8) {
      passwordError = 'Password baru minimal 8 karakter.';
    } else if (next !== confirmation) {
      passwordError = 'Konfirmasi password baru tidak cocok.';
    } else {
      passwordError = '';
      modalMode = 'confirm';
    }
    rootElement.innerHTML = render(ctx);
  };
  root.addEventListener('click', clickHandler);
  root.addEventListener('submit', submitHandler);
}

export function unmount() {
  if (rootElement && clickHandler) rootElement.removeEventListener('click', clickHandler);
  if (rootElement && submitHandler) rootElement.removeEventListener('submit', submitHandler);
  rootElement = null;
  clickHandler = null;
  submitHandler = null;
  modalMode = null;
  passwordError = '';
}
