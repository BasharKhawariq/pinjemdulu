/** Halaman profil pengguna aktif. */

import { getInitials } from '../lib/navigation.js';
import { ROLE_LABEL } from '../lib/navigation.js';
import { escapeHtml } from '../ui/html.js';
import { renderIcon } from '../ui/icons.js';
import { ROLES } from '../lib/constants.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { ubahPassword, ubahWhatsapp } from '../services/auth.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';

let rootElement = null;
let clickHandler = null;
let submitHandler = null;
let modalMode = null; // 'password-form', 'password-cancel', 'password-confirm', 'password-success', 'wa-form', 'wa-confirm', 'wa-success'
let passwordError = '';
let whatsappError = '';
let pendingPasswordLama = '';
let pendingPasswordBaru = '';
let pendingKonfirmasiPassword = '';
let pendingWhatsapp = '';

function organizationOf(user) {
  return (
    user?.displayOrganization ||
    user?.organisasi?.namaOrganisasi ||
    user?.organisasi?.nama ||
    user?.organisasi?.singkatan ||
    user?.namaOrganisasi ||
    (typeof user?.organisasi === 'string' ? user.organisasi : null) ||
    '—'
  );
}

function organizationBadge(organization, logoUrl = null) {
  return renderOrganisasiLogo(organization, logoUrl, 'h-5 w-5', 'bg-white shadow-xs');
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

function cleanWaPrefix(num) {
  if (!num) return '';
  return String(num).replace(/^\+?62\s*-?/, '').trim();
}

function renderModals(user) {
  if (!modalMode) return '';

  // 1. Password Success
  if (modalMode === 'password-success') {
    return renderModalComponent({
      id: 'modal-password-success',
      title: 'Ubah Password berhasil!',
      description: 'Anda telah berhasil merubah password',
      variant: 'success',
      actions: [{ label: 'Kembali', action: 'close-modal', className: 'w-full rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90' }],
    }).toString();
  }

  // 2. Password Confirm
  if (modalMode === 'password-confirm') {
    return renderModalComponent({
      id: 'modal-password-confirm',
      title: 'Ubah Password ?',
      description: 'Periksa kembali data yang akan anda kirim',
      variant: 'send',
      actions: [
        { label: 'Kembali', action: 'back-password-form', variant: 'outline', className: 'w-1/2 rounded-xl' },
        { label: 'Kirim', action: 'confirm-password', className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90' },
      ],
    }).toString();
  }

  // 3. Password Cancel confirmation
  if (modalMode === 'password-cancel') {
    return renderModalComponent({
      id: 'modal-password-cancel',
      title: 'Batal Kirim Form ?',
      description: 'Apakah anda yakin ingin batal mengubah password ?',
      variant: 'error',
      actions: [
        { label: 'Kembali', action: 'back-password-form', variant: 'outline', className: 'w-1/2 rounded-xl' },
        { label: 'Batalkan', action: 'close-modal', className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90' },
      ],
    }).toString();
  }

  // 4. Password Form
  if (modalMode === 'password-form') {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" data-modal-backdrop>
        <section role="dialog" aria-modal="true" aria-labelledby="password-form-title" class="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl sm:p-7">
          <h2 id="password-form-title" class="text-xl font-bold text-slate-900">Ubah Password</h2>
          <form id="password-form" class="mt-5 space-y-4" novalidate>
            ${passwordInput('password-lama', 'Password Saat Ini')}
            ${passwordInput('password-baru', 'Password Baru')}
            ${passwordInput('konfirmasi-password', 'Konfirmasi Password Baru')}
            <p id="password-form-error" class="text-xs text-rose-600 ${passwordError ? '' : 'hidden'}">${escapeHtml(passwordError)}</p>
            <div class="flex items-center justify-end gap-3 pt-3">
              <button type="button" data-action="cancel-password-modal"
                class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                Batal
              </button>
              <button type="submit"
                class="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Kirim
              </button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  // 5. WhatsApp Form
  if (modalMode === 'wa-form') {
    const rawWa = user?.noWhatsapp || user?.no_whatsapp || '';
    const cleanNum = cleanWaPrefix(rawWa);
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" data-modal-backdrop>
        <section role="dialog" aria-modal="true" aria-labelledby="wa-form-title" class="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl sm:p-7">
          <h2 id="wa-form-title" class="text-xl font-bold text-slate-900">Edit Nomor Whatsapp</h2>
          <form id="whatsapp-form" class="mt-5 space-y-4" novalidate>
            <div>
              <label for="edit-no-whatsapp" class="block text-xs font-medium text-slate-500 mb-1.5">Nomor Whatsapp<span class="text-rose-500">*</span></label>
              <div class="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <span class="inline-flex h-11 items-center border-r border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-600">+62</span>
                <input
                  id="edit-no-whatsapp"
                  name="noWhatsapp"
                  type="tel"
                  value="${escapeHtml(cleanNum)}"
                  placeholder="Masukkan nomor whatsapp anda"
                  required
                  class="h-11 flex-1 px-3 text-sm text-slate-800 outline-none"
                />
                <span class="pr-3 flex items-center justify-center">
                  <svg class="h-4 w-4 shrink-0 rounded-full border border-slate-200 overflow-hidden" viewBox="0 0 24 24">
                    <path d="M0,0 H24 V12 H0 Z" class="fill-rose-600" />
                    <path d="M0,12 H24 V24 H0 Z" class="fill-white" />
                  </svg>
                </span>
              </div>
              <p id="whatsapp-form-error" class="mt-1 text-xs text-rose-600 ${whatsappError ? '' : 'hidden'}">${escapeHtml(whatsappError)}</p>
            </div>
            <div class="flex items-center justify-end gap-3 pt-3">
              <button type="button" data-action="close-modal"
                class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                Batal
              </button>
              <button type="submit"
                class="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Edit
              </button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  // 6. WhatsApp Confirm
  if (modalMode === 'wa-confirm') {
    return renderModalComponent({
      id: 'modal-wa-confirm',
      title: 'Edit Nomor Whatsapp ?',
      description: 'Periksa kembali data yang akan anda kirim',
      variant: 'send',
      actions: [
        { label: 'Kembali', action: 'back-wa-form', variant: 'outline', className: 'w-1/2 rounded-xl' },
        { label: 'Kirim', action: 'confirm-wa', className: 'w-1/2 rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90' },
      ],
    }).toString();
  }

  // 7. WhatsApp Success
  if (modalMode === 'wa-success') {
    return renderModalComponent({
      id: 'modal-wa-success',
      title: 'Nomor Whatsapp berhasil diubah!',
      description: 'Nomor WhatsApp Anda telah berhasil diperbarui.',
      variant: 'success',
      actions: [{ label: 'Kembali', action: 'close-modal', className: 'w-full rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90' }],
    }).toString();
  }

  return '';
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
  const name = user.nama || user.namaPengguna || 'Pengguna';
  const organization = organizationOf(user);
  const logoUrl = user?.logoUrl || user?.organisasi?.logoUrl || null;
  const initials = getInitials(name) || 'PD';
  const waDisplay = user.noWhatsapp || user.no_whatsapp || '+62 812-3643-1837';

  return `
    <section class="mx-auto w-full max-w-[1080px] pb-10">
      <!-- Banner Header -->
      <div class="relative h-36 overflow-visible rounded-[24px] bg-gradient-to-br from-blue-700 via-primary to-blue-950 sm:h-40">
        <span class="absolute -right-4 -top-8 h-28 w-28 rounded-full bg-white/10"></span>
        <span class="absolute right-12 top-10 h-24 w-24 rounded-full bg-white/10"></span>
        <span class="absolute -bottom-10 -left-7 h-28 w-28 rounded-full bg-white/10"></span>
      </div>

      <div class="relative z-10 -mt-12 flex items-center gap-4 px-7 sm:px-10">
        <div class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-500 text-3xl font-semibold text-white shadow-md">
          ${escapeHtml(initials)}
        </div>
        <div class="min-w-0 mt-12">
          <h2 class="truncate text-xl font-semibold tracking-tight text-slate-900">${escapeHtml(name)}</h2>
          <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500 sm:text-sm">
            <span>${escapeHtml(user.nim || '—')}</span><span class="text-slate-300">•</span>${organizationBadge(organization, logoUrl)}<span>${escapeHtml(organization)}</span>
          </div>
        </div>
      </div>

      <!-- Card 1: Identitas Pengguna -->
      <article class="mt-9 rounded-2xl bg-white p-7 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-8">
        <h3 class="text-xl font-semibold tracking-tight text-slate-900">Identitas Pengguna</h3>
        <dl class="mt-5 space-y-5">
          ${field('Nama', escapeHtml(name))}
          ${field('NIM', escapeHtml(user.nim || '—'))}
          ${field('Organisasi', `<span class="inline-flex items-center gap-2">${organizationBadge(organization, logoUrl)}${escapeHtml(organization)}</span>`)}
          ${field('Role', `<span class="inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">${escapeHtml(roleLabel(user))}</span>`)}
        </dl>
      </article>

      <!-- Card 2: Informasi Akun (Password & Nomor Whatsapp) -->
      <article class="mt-6 rounded-2xl bg-white p-7 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-8">
        <h3 class="text-xl font-semibold tracking-tight text-slate-900">Informasi Akun</h3>
        <dl class="mt-5 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="grid gap-1.5 sm:grid-cols-[230px_1fr] sm:items-center">
              <dt class="text-base font-medium text-slate-500">Password</dt>
              <dd class="text-base font-medium tracking-widest text-slate-800">••••••••••</dd>
            </div>
            <button
              type="button"
              data-action="open-password-modal"
              aria-label="Ubah Password"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              ${renderIcon('Pencil', 'h-4 w-4')}
            </button>
          </div>
          <div class="flex items-center justify-between">
            <div class="grid gap-1.5 sm:grid-cols-[230px_1fr] sm:items-center">
              <dt class="text-base font-medium text-slate-500">Nomor Whatsapp</dt>
              <dd class="text-base font-medium text-slate-800">${escapeHtml(waDisplay)}</dd>
            </div>
            <button
              type="button"
              data-action="open-wa-modal"
              aria-label="Edit Nomor Whatsapp"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              ${renderIcon('Pencil', 'h-4 w-4')}
            </button>
          </div>
        </dl>
      </article>

      ${renderModals(user)}
    </section>
  `;
}

export function mount(root, ctx = {}) {
  rootElement = root;
  clickHandler = async (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'open-password-modal') {
      modalMode = 'password-form';
      passwordError = '';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'cancel-password-modal') {
      modalMode = 'password-cancel';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'back-password-form') {
      modalMode = 'password-form';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'confirm-password') {
      try {
        await ubahPassword({
          passwordLama: pendingPasswordLama,
          passwordBaru: pendingPasswordBaru,
          konfirmasiPassword: pendingKonfirmasiPassword,
        });
        modalMode = 'password-success';
        passwordError = '';
      } catch (err) {
        modalMode = 'password-form';
        passwordError = err?.message || 'Gagal mengubah password.';
      }
      rootElement.innerHTML = render(ctx);
    } else if (action === 'open-wa-modal') {
      modalMode = 'wa-form';
      whatsappError = '';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'back-wa-form') {
      modalMode = 'wa-form';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'confirm-wa') {
      try {
        await ubahWhatsapp({ noWhatsapp: pendingWhatsapp });
        modalMode = 'wa-success';
        whatsappError = '';
        if (ctx.user) ctx.user.noWhatsapp = pendingWhatsapp;
      } catch (err) {
        modalMode = 'wa-form';
        whatsappError = err?.message || 'Gagal mengubah nomor WhatsApp.';
      }
      rootElement.innerHTML = render(ctx);
    } else if (action === 'close-modal' || action === 'close-password-modal') {
      modalMode = null;
      passwordError = '';
      whatsappError = '';
      rootElement.innerHTML = render(ctx);
    } else if (action === 'toggle-password') {
      const input = rootElement.querySelector(`#${actionEl.dataset.target}`);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
  };

  submitHandler = (event) => {
    if (event.target.id === 'password-form') {
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
        pendingPasswordLama = current;
        pendingPasswordBaru = next;
        pendingKonfirmasiPassword = confirmation;
        passwordError = '';
        modalMode = 'password-confirm';
      }
      rootElement.innerHTML = render(ctx);
    } else if (event.target.id === 'whatsapp-form') {
      event.preventDefault();
      const form = new FormData(event.target);
      const waRaw = String(form.get('noWhatsapp') || '').trim();
      const digits = waRaw.replace(/[^0-9]/g, '');
      if (!digits || digits.length < 8) {
        whatsappError = 'Nomor WhatsApp tidak valid (minimal 8 angka).';
        rootElement.innerHTML = render(ctx);
        return;
      }
      pendingWhatsapp = `+62 ${waRaw.replace(/^\+?62\s*-?/, '')}`;
      whatsappError = '';
      modalMode = 'wa-confirm';
      rootElement.innerHTML = render(ctx);
    }
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
  whatsappError = '';
  pendingPasswordLama = '';
  pendingPasswordBaru = '';
  pendingKonfirmasiPassword = '';
  pendingWhatsapp = '';
}
