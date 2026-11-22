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

/** Path animasi Lottie "businessman flies up with rocket" untuk indikator loading. */
export const LOADING_LOTTIE_SRC = 'assets/animations/loading-rocket.json';

/**
 * Render kontainer animasi Lottie untuk indikator loading.
 * Elemen ber-atribut `data-pd-lottie` akan dipasangkan player oleh main.js.
 * Spinner CSS di dalamnya hanya menjadi fallback bila player belum/gagal termuat.
 * @param {{ className?: string, label?: string }} [options]
 * @returns {string}
 */
export function renderLottieAnimation({
  className = 'h-16 w-28 sm:h-20 sm:w-36',
  label = 'Memuat',
} = {}) {
  return `
    <span class="inline-flex items-center justify-center ${className}" data-pd-lottie="${LOADING_LOTTIE_SRC}" role="img" aria-label="${escapeHtml(label)}">
      ${renderSpinner({ size: 'h-7 w-7' })}
    </span>
  `.trim();
}

/**
 * Render baris tabel dengan animasi loading di tengah untuk status data sedang dimuat.
 * @param {{ colspan?: number, message?: string, minHeight?: string }} [options]
 * @returns {string}
 */
export function renderTableLoadingRow({
  colspan = 8,
  message = 'Memuat data...',
  minHeight = 'py-10 sm:py-14',
} = {}) {
  return `
    <tr class="border-b-0">
      <td colspan="${colspan}" class="${minHeight} px-4 text-center">
        <div class="pd-fade-in flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
          ${renderLottieAnimation({ className: 'h-16 w-28 sm:h-20 sm:w-36' })}
          <p class="text-xs font-medium text-slate-400">${escapeHtml(message)}</p>
          <span class="sr-only">Sedang memuat data dari server...</span>
        </div>
      </td>
    </tr>
  `.trim();
}

/**
 * Render kontainer vertikal (untuk grid kartu / halaman kosong) dengan animasi loading.
 * @param {{ message?: string, minHeight?: string }} [options]
 * @returns {string}
 */
export function renderContainerLoading({
  message = 'Memuat data...',
  minHeight = 'min-h-[220px] sm:min-h-[260px]',
} = {}) {
  return `
    <div class="pd-fade-in flex ${minHeight} w-full flex-col items-center justify-center gap-2 px-4 py-10 text-center sm:py-12" role="status" aria-live="polite">
      ${renderLottieAnimation({ className: 'h-24 w-40 sm:h-28 sm:w-48' })}
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
