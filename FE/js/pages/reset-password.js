/** Halaman reset password publik dari tautan request ubah password. */

import { html, raw, escapeHtml } from '../ui/html.js';
import { inputClass, labelClass, buttonClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { navigate } from '../router.js';

let modalMode = null;
let formError = '';
let currentRoot = null;
let clickHandler = null;
let submitHandler = null;
let currentToken = '';

function passwordField(id, label) {
  return html`
    <div>
      <label for="${id}" class="${labelClass('mb-2 block text-zinc-600')}">
        ${label}<span class="ml-0.5 text-rose-500">*</span>
      </label>
      <div class="relative">
        <input id="${id}" name="${id}" type="password" autocomplete="new-password" class="${inputClass('h-12 rounded-2xl px-4 py-3 pr-12')}" required />
        <button type="button" data-action="toggle-password" data-target="${id}" aria-label="Tampilkan password" class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600">
          ${renderIcon('Eye', 'h-5 w-5')}
        </button>
      </div>
    </div>
  `;
}

function renderModal() {
  if (modalMode === 'confirm') {
    return renderModalComponent({
      id: 'modal-reset-password-confirm',
      title: 'Ubah Password?',
      description: 'Periksa kembali data yang akan anda kirim',
      variant: 'send',
      actions: [
        { label: 'Kembali', action: 'back-reset-form', variant: 'outline' },
        { label: 'Kirim', action: 'confirm-reset-password' },
      ],
    }).toString();
  }
  if (modalMode === 'success') {
    return renderModalComponent({
      id: 'modal-reset-password-success',
      title: 'Ubah Password berhasil!',
      description: 'Anda telah berhasil mengubah password',
      variant: 'success',
      actions: [{ label: 'Kembali', action: 'back-to-login' }],
    }).toString();
  }
  return '';
}

export function render(ctx = {}) {
  const token = ctx.query?.token || '';
  currentToken = token;
  const invalidToken = !token;

  return html`
    <main class="min-h-screen w-full bg-primary text-zinc-900">
      <div class="flex min-h-screen w-full items-center justify-center px-5 py-10 sm:px-8">
        <section class="w-full max-w-[410px] rounded-2xl bg-white p-7 shadow-2xl sm:p-8">
          <a href="#/login" aria-label="PinjemDulu beranda" class="mb-10 inline-flex items-center gap-2.5">
            <img src="assets/img/Logo-PinjemDulu.png" alt="Logo PinjemDulu" class="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <span class="flex items-baseline text-[23px] font-extrabold tracking-tight">
              <span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span>
            </span>
          </a>

          <div class="mb-7">
            <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Ubah Password</h1>
            <p class="mt-1.5 text-xs leading-5 text-zinc-500">Perbarui password anda untuk menjaga keamanan akun</p>
          </div>

          ${invalidToken ? html`
            <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              Tautan ubah password tidak valid atau sudah kedaluwarsa.
            </div>
            <a href="#/login" class="${buttonClass({ variant: 'default', size: 'lg' })} mt-6 h-12 w-full rounded-xl">Kembali ke Login</a>
          ` : html`
            <form id="reset-password-form" novalidate class="space-y-5">
              ${passwordField('reset-password-baru', 'Password Baru')}
              ${passwordField('reset-konfirmasi-password', 'Konfirmasi Password')}
              <p id="reset-password-error" role="alert" class="text-xs text-rose-600 ${formError ? '' : 'hidden'}">${formError}</p>
              <button type="submit" class="${buttonClass({ variant: 'default', size: 'lg' })} h-12 w-full rounded-xl">Ubah Password</button>
            </form>
          `}
        </section>
      </div>
      ${raw(renderModal())}
    </main>
  `.toString();
}

export function mount(root, ctx = {}) {
  currentRoot = root;
  currentToken = ctx.query?.token || '';

  clickHandler = (event) => {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;
    const action = actionElement.dataset.action;

    if (action === 'toggle-password') {
      const input = root.querySelector(`#${actionElement.dataset.target}`);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
      return;
    }
    if (action === 'back-reset-form') {
      modalMode = null;
      root.innerHTML = render(ctx);
      return;
    }
    if (action === 'confirm-reset-password') {
      modalMode = 'success';
      root.innerHTML = render(ctx);
      return;
    }
    if (action === 'back-to-login') {
      modalMode = null;
      navigate('#/login');
    }
  };

  submitHandler = (event) => {
    if (event.target.id !== 'reset-password-form') return;
    event.preventDefault();
    const data = new FormData(event.target);
    const password = String(data.get('reset-password-baru') || '');
    const confirmation = String(data.get('reset-konfirmasi-password') || '');

    if (!password || !confirmation) {
      formError = 'Semua field password wajib diisi.';
    } else if (password.length < 8) {
      formError = 'Password baru minimal 8 karakter.';
    } else if (password !== confirmation) {
      formError = 'Konfirmasi password tidak cocok.';
    } else if (!currentToken) {
      formError = 'Tautan ubah password tidak valid atau sudah kedaluwarsa.';
    } else {
      formError = '';
      modalMode = 'confirm';
    }
    root.innerHTML = render(ctx);
  };

  root.addEventListener('click', clickHandler);
  root.addEventListener('submit', submitHandler);
}

export function unmount() {
  if (currentRoot && clickHandler) currentRoot.removeEventListener('click', clickHandler);
  if (currentRoot && submitHandler) currentRoot.removeEventListener('submit', submitHandler);
  currentRoot = null;
  clickHandler = null;
  submitHandler = null;
  modalMode = null;
  formError = '';
  currentToken = '';
}
