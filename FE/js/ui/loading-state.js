/**
 * loading-state.js — Komponen indikator loading dan spinner terstandarisasi untuk PinjemDulu.
 */

import { escapeHtml } from './html.js';

/**
 * Render elemen SVG spinner berputar halus.
 * @param {{ size?: string, color?: string, className?: string }} [options]
 * @returns {string}
 */
export function renderSpinner({
  size = 'h-6 w-6',
  color = 'text-primary',
  className = '',
} = {}) {
  return `
    <svg class="animate-spin ${size} ${color} ${className}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25"></circle>
      <path fill="currentColor" fill-opacity="0.75" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
  `.trim();
}

/**
 * Render baris tabel dengan spinner di tengah untuk status data sedang dimuat.
 * @param {{ colspan?: number, message?: string, minHeight?: string }} [options]
 * @returns {string}
 */
export function renderTableLoadingRow({
  colspan = 8,
  message = 'Memuat data...',
  minHeight = 'py-14',
} = {}) {
  return `
    <tr class="border-b-0">
      <td colspan="${colspan}" class="${minHeight} text-center">
        <div class="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
          ${renderSpinner({ size: 'h-7 w-7' })}
          <p class="text-xs font-medium text-slate-400">${escapeHtml(message)}</p>
          <span class="sr-only">Sedang memuat data dari server...</span>
        </div>
      </td>
    </tr>
  `.trim();
}

/**
 * Render kontainer vertikal (untuk grid kartu / halaman kosong) dengan spinner.
 * @param {{ message?: string, minHeight?: string }} [options]
 * @returns {string}
 */
export function renderContainerLoading({
  message = 'Memuat data...',
  minHeight = 'min-h-[260px]',
} = {}) {
  return `
    <div class="flex ${minHeight} w-full flex-col items-center justify-center gap-3 py-12 text-center" role="status" aria-live="polite">
      <div class="inline-flex h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-primary" aria-hidden="true"></div>
      <p class="text-sm font-medium text-slate-500">${escapeHtml(message)}</p>
      <span class="sr-only">Sedang memuat data...</span>
    </div>
  `.trim();
}

/**
 * Render markup label tombol yang sedang dalam proses submitting.
 * @param {string} [text='Memproses...']
 * @returns {string}
 */
export function renderButtonSpinner(text = 'Memproses...') {
  return `
    <span class="inline-flex items-center justify-center gap-2" role="status">
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true"></span>
      <span>${escapeHtml(text)}</span>
      <span class="sr-only">Sedang memproses</span>
    </span>
  `.trim();
}
