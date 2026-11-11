/**
 * Komponen Empty State terstandarisasi dengan animasi search Lottie/GIF
 * Menampilkan animasi kaca pembesar dan pesan "Belum ada data untuk ditampilkan".
 */
export function renderEmptyState({
  message = 'Belum ada data untuk ditampilkan',
  colspan = null,
  classContainer = 'py-10 sm:py-14',
  imgClass = 'h-32 w-32 sm:h-36 sm:w-36',
} = {}) {
  const content = `
    <div class="flex flex-col items-center justify-center text-center ${classContainer}">
      <img src="assets/animations/empty-state.gif" alt="Belum ada data" class="mx-auto ${imgClass} object-contain select-none pointer-events-none" />
      <p class="mt-4 text-sm font-medium text-slate-600 sm:text-base">${message}</p>
    </div>
  `;

  if (colspan) {
    return `<tr><td colspan="${colspan}" class="p-0 border-none bg-transparent">${content}</td></tr>`;
  }

  return content;
}

