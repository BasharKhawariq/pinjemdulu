/**
 * placeholder.js — Halaman placeholder "Segera hadir".
 */

import { html, escapeHtml } from '../ui/html.js';
import { cardClass, badgeClass, buttonClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { getPageTitle } from '../lib/navigation.js';

/**
 * Render halaman placeholder.
 * @param {object} [ctx]
 * @returns {string}
 */
export function render(ctx = {}) {
  const path = ctx.path || ctx.hash || '';
  const { title } = getPageTitle(path);
  const displayTitle = title || 'Halaman';

  return html`
    <section class="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div class="${cardClass('flex max-w-lg flex-col items-center p-8 text-center rounded-2xl shadow-sm')}">
        <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
          ${renderIcon('Sparkles', 'h-7 w-7 text-primary')}
        </div>
        <h2 class="mb-2 text-2xl font-bold tracking-tight text-zinc-900">${displayTitle}</h2>
        <span class="${badgeClass('info')} mb-4">Segera hadir</span>
        <p class="mb-6 text-sm text-zinc-500">
          Fitur ini sedang dalam tahap pengembangan dan akan segera hadir pada tahap berikutnya.
        </p>
        <a href="#/inventaris" class="${buttonClass({ variant: 'default', size: 'default' })}">
          Kembali ke Inventaris
        </a>
      </div>
    </section>
  `.toString();
}

export function mount() {}
