/**
 * filter.js — Global Filter Component (FilterButton & FilterModal) untuk PinjemDulu.
 */

import { html, raw, escapeHtml } from './html.js';
import { renderIcon } from './icons.js';
import { buttonClass } from './classes.js';
import { cn } from '../lib/utils.js';

/**
 * Helper kelas tombol filter bulat standar.
 * Pada hover: background biru primary, ikon dan border berwarna putih.
 */
export function filterButtonClass(extra = '') {
  const base =
    'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:bg-primary hover:text-white hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  return cn(base, extra);
}

/**
 * Render tombol filter global.
 * @param {object} props
 * @param {string} [props.id='']
 * @param {string} [props.action='open-filter-dialog']
 * @param {string} [props.title='Filter']
 * @param {string} [props.ariaLabel='']
 * @param {number} [props.countActive=0]
 * @param {string} [props.className='']
 * @param {string} [props.iconName='Funnel']
 * @returns {import('./html.js').SafeHtml}
 */
export function renderFilterButton({
  id = '',
  action = 'open-filter-dialog',
  title = 'Filter',
  ariaLabel = '',
  countActive = 0,
  className = '',
  iconName = 'Funnel',
} = {}) {
  const label = ariaLabel || title;
  const showBadge = countActive > 0;
  const badgeText = countActive > 9 ? '9+' : String(countActive);

  return html`
    <button
      type="button"
      ${id ? raw(`id="${escapeHtml(id)}"`) : raw('')}
      data-action="${escapeHtml(action)}"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(title)}"
      class="${filterButtonClass(className)}"
    >
      ${renderIcon(iconName, 'h-4 w-4 transition-colors')}
      <span
        ${id ? raw(`id="${escapeHtml(id)}-badge"`) : raw('')}
        class="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground border border-background ${showBadge ? '' : 'hidden'}"
        aria-hidden="true"
      >
        ${badgeText}
      </span>
    </button>
  `;
}

/**
 * Render modal dialog filter global (dialog native).
 * @param {object} props
 * @param {string} props.id ID dialog native
 * @param {string} props.title Judul modal filter
 * @param {number} [props.countActive=0] Jumlah filter aktif
 * @param {string} [props.closeAction='close-filter-dialog']
 * @param {string} [props.resetAction='reset-filter-dialog']
 * @param {string} [props.applyAction='apply-filter-dialog']
 * @param {string} [props.formId='']
 * @param {string|import('./html.js').SafeHtml} props.bodyContent Konten formulir filter
 * @param {string} [props.maxWidth='max-w-sm']
 * @returns {import('./html.js').SafeHtml}
 */
export function renderFilterModal({
  id = 'dialog-filter',
  title = 'Filter',
  countActive = 0,
  closeAction = 'close-filter-dialog',
  resetAction = 'reset-filter-dialog',
  applyAction = 'apply-filter-dialog',
  formId = '',
  bodyContent = '',
  maxWidth = 'max-w-sm',
} = {}) {
  const titleId = `${id}-title`;
  const fId = formId || `${id}-form`;

  return html`
    <dialog id="${id}" aria-labelledby="${titleId}" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full ${maxWidth} rounded-2xl border border-border bg-background p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <div class="flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <div class="flex items-center gap-2.5">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              ${renderIcon('Funnel', 'h-4 w-4')}
            </span>
            <div class="flex items-center gap-2">
              <h2 id="${titleId}" class="text-base font-semibold leading-tight text-foreground">
                ${title}
              </h2>
              ${countActive > 0 ? html`<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">${countActive}</span>` : raw('')}
            </div>
          </div>
          <button
            type="button"
            data-action="${closeAction}"
            aria-label="Tutup filter"
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ${renderIcon('X', 'h-4 w-4')}
          </button>
        </div>

        <!-- Body Form Filter -->
        <form id="${fId}" class="space-y-4 px-5 py-4">
          ${raw(typeof bodyContent === 'string' ? bodyContent : bodyContent.toString())}
        </form>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            type="button"
            data-action="${resetAction}"
            class="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Reset
          </button>
          <div class="flex gap-2">
            <button
              type="button"
              data-action="${applyAction}"
              class="${buttonClass({ variant: 'default', size: 'sm' })}"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </dialog>
  `;
}

// Kompatibilitas PascalCase
export const FilterButton = renderFilterButton;
export const FilterModal = renderFilterModal;
