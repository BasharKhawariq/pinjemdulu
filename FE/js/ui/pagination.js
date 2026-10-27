/**
 * pagination.js — Komponen paginasi bersama dengan desain squircle (rounded-2xl).
 * Memenuhi spesifikasi UI: squircle 40x40px, border abu-abu untuk prev/next/inactive,
 * dan background primary navy untuk halaman aktif.
 */
import { renderIcon } from './icons.js';
import { escapeHtml } from './html.js';

/**
 * Menghasilkan daftar nomor halaman dengan elipsis.
 * @param {number} current
 * @param {number} total
 * @param {number} [max=5]
 * @returns {Array<number|string>}
 */
export function buildPageList(current, total, max = 5) {
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [1];
  let left = Math.max(2, current - 1);
  let right = Math.min(total - 1, current + 1);
  if (current <= 3) {
    right = Math.min(4, total - 1);
  }
  if (current >= total - 2) {
    left = Math.max(total - 3, 2);
  }
  if (left > 2) pages.push('…');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

/**
 * Render elemen paginasi squircle konsisten.
 * @param {object} [options]
 * @param {number} [options.currentPage=1] - Halaman aktif (1-indexed).
 * @param {number} [options.totalPages=1] - Total halaman.
 * @param {string} [options.action='change-page'] - Data action untuk nomor halaman.
 * @param {string} [options.prevAction] - Data action untuk tombol sebelumnya.
 * @param {string} [options.nextAction] - Data action untuk tombol berikutnya.
 * @param {string} [options.attrType='data-action'] - Atribut aksi ('data-action' atau 'data-page').
 * @param {boolean} [options.showNumbers=true] - Menampilkan tombol angka halaman atau hanya active indicator.
 * @param {string} [options.className=''] - Kelas CSS wrapper.
 * @returns {string}
 */
export function renderPagination({
  currentPage = 1,
  totalPages = 1,
  action = 'change-page',
  prevAction = null,
  nextAction = null,
  attrType = 'data-action',
  showNumbers = true,
  className = '',
} = {}) {
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;
  const prevAct = prevAction || (attrType === 'data-page' ? 'prev' : action);
  const nextAct = nextAction || (attrType === 'data-page' ? 'next' : action);

  const prevPageNum = Math.max(1, currentPage - 1);
  const nextPageNum = Math.min(totalPages, currentPage + 1);

  const prevAttr =
    attrType === 'data-page'
      ? `data-page="${escapeHtml(prevAct)}"`
      : `data-action="${escapeHtml(prevAct)}" data-page="${prevPageNum}"`;

  const nextAttr =
    attrType === 'data-page'
      ? `data-page="${escapeHtml(nextAct)}"`
      : `data-action="${escapeHtml(nextAct)}" data-page="${nextPageNum}"`;

  const btnPrev = `<button type="button" ${prevAttr} ${
    isFirst ? 'disabled aria-disabled="true"' : ''
  } aria-label="Halaman sebelumnya" class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none">${renderIcon('ChevronLeft', 'h-4 w-4')}</button>`;

  const btnNext = `<button type="button" ${nextAttr} ${
    isLast ? 'disabled aria-disabled="true"' : ''
  } aria-label="Halaman berikutnya" class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none">${renderIcon('ChevronRight', 'h-4 w-4')}</button>`;

  let contentPages = '';
  if (showNumbers) {
    const pages = buildPageList(currentPage, totalPages);
    contentPages = pages
      .map((p) => {
        if (p === '…') {
          return `<span class="flex h-10 w-10 items-center justify-center text-xs text-slate-400" aria-hidden="true">…</span>`;
        }
        const isActive = p === currentPage;
        const pageAttr =
          attrType === 'data-page'
            ? `data-page="${p}"`
            : `data-action="${escapeHtml(action)}" data-page="${p}"`;
        if (isActive) {
          return `<button type="button" ${pageAttr} aria-current="page" class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-colors shadow-sm">${p}</button>`;
        }
        return `<button type="button" ${pageAttr} aria-label="Halaman ${p}" class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">${p}</button>`;
      })
      .join('');
  } else {
    contentPages = `<span class="flex h-10 min-w-10 items-center justify-center rounded-2xl bg-primary px-3 text-sm font-semibold text-white shadow-sm">${currentPage}</span>`;
  }

  return `<div class="flex items-center gap-2 ${className}">${btnPrev}${contentPages}${btnNext}</div>`;
}
