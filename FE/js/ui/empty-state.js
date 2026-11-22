/**
 * Komponen Empty State terstandarisasi dengan ilustrasi animasi (GIF) dan
 * pesan "Belum ada data untuk ditampilkan".
 */
import { escapeHtml } from './html.js';

export function renderEmptyState({
  message = 'Belum ada data untuk ditampilkan',
  colspan = null,
  classContainer = 'py-10 sm:py-14',
  imgClass = 'h-32 w-32 sm:h-36 sm:w-36',
} = {}) {
  const content = `
    <div class="pd-rise-in flex flex-col items-center justify-center px-4 text-center ${classContainer}">
      <img src="assets/animations/empty-state.gif" alt="Belum ada data" class="mx-auto ${imgClass} object-contain select-none pointer-events-none" />
      <p class="mt-4 text-sm font-medium text-slate-600 sm:text-base">${escapeHtml(message)}</p>
    </div>
  `;

  if (colspan) {
    return `<tr><td colspan="${colspan}" class="p-0 border-none bg-transparent">${content}</td></tr>`;
  }

  return content;
}
