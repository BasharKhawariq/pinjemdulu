/**
 * search-input.js — Global Search Input untuk PinjemDulu.
 */

import { html, raw, escapeHtml } from './html.js';
import { renderIcon } from './icons.js';
import { cn } from '../lib/utils.js';

/**
 * Helper kelas dasar input pencarian.
 * @param {string} [extra='']
 * @returns {string}
 */
export function searchInputClass(extra = '') {
  const base =
    'flex h-11 w-full rounded-full border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';
  return cn(base, extra);
}

/**
 * Helper kelas tombol bersihkan pencarian (target sentuh 36px + focus ring).
 * @param {string} [extra='']
 * @returns {string}
 */
export function searchClearButtonClass(extra = '') {
  const base =
    'absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95';
  return cn(base, extra);
}

/**
 * Render tombol bersihkan pencarian (dipakai komponen & halaman kelola).
 * @param {object} [props]
 * @param {string} [props.clearAction='clear-search'] Nilai data-action tombol
 * @returns {import('./html.js').SafeHtml}
 */
export function renderSearchClearButton({ clearAction = 'clear-search' } = {}) {
  return html`
    <button
      type="button"
      data-action="${escapeHtml(clearAction)}"
      aria-label="Hapus kata kunci pencarian"
      class="${searchClearButtonClass()}"
    >
      ${renderIcon('X', 'h-4 w-4')}
    </button>
  `;
}

/**
 * Render elemen input pencarian lengkap dengan pembungkus dan ikon.
 * @param {object} props
 * @param {string} [props.id=''] ID input
 * @param {string} [props.name=''] Name input
 * @param {string} [props.value=''] Nilai saat ini
 * @param {string} [props.placeholder='Cari barang inventaris'] Placeholder
 * @param {string} [props.ariaLabel=''] Aksesibilitas aria-label
 * @param {string} [props.className=''] Kelas pembungkus container
 * @param {string} [props.inputClassName=''] Kelas ekstra pada input
 * @param {boolean} [props.dataSearch=false] Menambahkan atribut data-search
 * @param {boolean} [props.clearable=false] Menampilkan tombol bersihkan jika ada teks
 * @param {string} [props.clearAction='clear-search'] Nilai data-action untuk tombol hapus
 * @param {string} [props.wrapperId=''] ID opsional untuk pembungkus
 * @param {boolean} [props.disabled=false]
 * @returns {import('./html.js').SafeHtml}
 */
export function renderSearchInput({
  id = '',
  name = '',
  value = '',
  placeholder = 'Cari barang inventaris',
  ariaLabel = '',
  className = '',
  inputClassName = '',
  dataSearch = false,
  clearable = false,
  clearAction = 'clear-search',
  wrapperId = '',
  disabled = false,
} = {}) {
  const hasValue = Boolean(value && String(value).trim());
  const ph = placeholder || 'Cari barang inventaris';
  const label = ariaLabel || ph;

  return html`
    <div ${wrapperId ? raw(`id="${escapeHtml(wrapperId)}"`) : ''} class="relative ${className || 'w-full'}">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
        ${renderIcon('Search', 'h-5 w-5')}
      </span>
      <input
        type="search"
        ${id ? raw(`id="${escapeHtml(id)}"`) : ''}
        ${name ? raw(`name="${escapeHtml(name)}"`) : ''}
        ${dataSearch ? raw('data-search') : ''}
        value="${value || ''}"
        placeholder="${ph}"
        aria-label="${label}"
        ${disabled ? raw('disabled') : ''}
        class="${searchInputClass(inputClassName)}"
      />
      ${clearable && hasValue ? renderSearchClearButton({ clearAction }) : raw('')}
    </div>
  `;
}
