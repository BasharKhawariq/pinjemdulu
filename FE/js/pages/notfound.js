/**
 * notfound.js — Halaman 404 Tidak Ditemukan.
 */

import { html, escapeHtml } from '../ui/html.js';
import { cardClass, buttonClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';

/**
 * Render halaman 404.
 * @param {object} [ctx]
 * @returns {string}
 */
export function render(ctx = {}) {
  const message = ctx.message || 'Halaman atau inventaris yang Anda cari tidak dapat ditemukan.';

  return html`
    <section class="pd-page-in flex min-h-[60dvh] w-full items-center justify-center p-4">
      <div class="${cardClass('pd-rise-in flex max-w-lg flex-col items-center p-8 text-center rounded-2xl shadow-sm')}">
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          ${renderIcon('AlertCircle', 'h-7 w-7 text-rose-600')}
        </div>
        <h2 id="notfound-title" class="mb-2 text-2xl font-bold tracking-tight text-zinc-900">
          Halaman tidak ditemukan
        </h2>
        <p class="mb-6 text-sm text-zinc-500">
          ${message}
        </p>
        <a href="#/inventaris" class="${buttonClass({ variant: 'default', size: 'default' })} button-hover-soft-neutral">
          Kembali ke Inventaris
        </a>
      </div>
    </section>
  `.toString();
}

/**
 * Pasang fokus pada judul untuk aksesibilitas.
 * @param {HTMLElement} [root]
 */
export function mount(root) {
  const title = root?.querySelector('#notfound-title');
  if (title) {
    title.setAttribute('tabindex', '-1');
    title.focus();
  }
}
