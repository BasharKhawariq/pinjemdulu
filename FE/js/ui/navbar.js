/**
 * navbar.js — Header aplikasi (bilah atas) PinjemDulu.
 */

import { renderIcon } from './icons.js';
import { escapeHtml } from './html.js';

/**
 * Render markup header / navbar.
 * @param {{ title: string, icon: string|null }} props
 * @returns {string}
 */
export function renderNavbar({ title = '', icon = null } = {}) {
  const safeTitle = escapeHtml(title || 'PinjemDulu');
  const iconHtml = icon
    ? `<span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary">${renderIcon(icon, 'h-5 w-5')}</span>`
    : '';

  return `
    <header class="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 px-4 py-4 backdrop-blur sm:px-7">
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          data-action="open-drawer"
          aria-label="Buka menu"
          class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 md:hidden"
        >
          ${renderIcon('Menu', 'h-6 w-6')}
        </button>

        <div class="flex min-w-0 flex-1 items-center gap-3">
          ${iconHtml}
          <h1 class="min-w-0 truncate text-xl font-semibold text-zinc-900 sm:text-2xl">
            ${safeTitle}
          </h1>
        </div>
      </div>
    </header>
  `;
}
