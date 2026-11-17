/**
 * navbar.js — Header aplikasi (bilah atas) PinjemDulu.
 */

import { renderIcon } from './icons.js';
import { escapeHtml } from './html.js';
import { renderSpinner } from './loading-state.js';

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
    <header class="relative border-b border-zinc-100 bg-white px-4 py-4 sm:px-7">
      <div id="global-progress-bar" class="pointer-events-none absolute left-0 right-0 top-0 h-0.5 overflow-hidden bg-transparent opacity-0 transition-opacity duration-200">
        <div class="h-full w-full bg-primary animate-pulse"></div>
      </div>
      <div class="flex min-w-0 items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-center gap-3">
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

        <div id="navbar-loading-indicator" role="status" aria-live="polite" class="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-all duration-200">
          ${renderSpinner({ size: 'h-3.5 w-3.5' })}
          <span class="hidden text-[11px] font-medium text-slate-600 sm:inline">Memuat...</span>
          <span class="sr-only">Sedang memproses data API</span>
        </div>
      </div>
    </header>
  `;
}
