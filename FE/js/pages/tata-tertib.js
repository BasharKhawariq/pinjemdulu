/**
 * Halaman Tata Tertib: aturan peminjaman dan pengembalian (konten statis).
 * Konten ada di js/data/tata-tertib.js.
 */
import { TATA_TERTIB } from '../data/tata-tertib.js';
import { escapeHtml } from '../ui/html.js';

function renderBagian(bagian, index) {
  return `
    <section aria-labelledby="tt-${bagian.id}" class="pd-rise-in mt-8" style="animation-delay:${Math.min(index, 11) * 40}ms">
      <h3 id="tt-${bagian.id}" class="scroll-mt-20 text-base font-semibold text-primary sm:text-lg">${escapeHtml(bagian.judul)}</h3>
      <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-justify text-sm leading-relaxed text-slate-800 marker:text-slate-700 sm:text-base">
        ${bagian.butir.map((teks) => `<li>${escapeHtml(teks)}</li>`).join('')}
      </ol>
    </section>`;
}

function renderDaftarIsi() {
  return `
    <nav aria-label="Daftar isi" class="mt-6">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar Isi</p>
      <div class="mt-3 flex flex-wrap gap-2">
        ${TATA_TERTIB.bagian
          .map(
            (bagian) => `<button type="button" data-tt-anchor="tt-${bagian.id}"
          class="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">${escapeHtml(bagian.judul)}</button>`
          )
          .join('')}
      </div>
    </nav>`;
}

export function render() {
  const t = TATA_TERTIB;
  return `
    <section class="pd-page-in w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
      <div class="mb-9">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">${escapeHtml(t.judul)}</h1>
        <p class="mt-1 text-sm text-slate-400">${escapeHtml(t.subjudul)}</p>
      </div>

      <article class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
        <div class="rounded-3xl bg-primary px-6 py-6 text-primary-foreground sm:px-8">
          <h2 class="text-xl font-semibold tracking-wide sm:text-2xl">${escapeHtml(t.heading)}</h2>
          <p class="mt-2 text-base leading-relaxed sm:text-lg">${escapeHtml(t.pengantar)}</p>
        </div>

        ${renderDaftarIsi()}

        ${t.bagian.map(renderBagian).join('')}
      </article>
    </section>`;
}

/**
 * Pasang navigasi daftar isi (scroll halus ke tiap bagian).
 * Memakai tombol + scrollIntoView, bukan anchor `href="#..."`, karena hash
 * dipakai untuk routing SPA (anchor biasa akan memicu rute tidak dikenal).
 * @param {HTMLElement} [root]
 */
export function mount(root) {
  if (!root) return;
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.querySelectorAll('[data-tt-anchor]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = root.querySelector(`#${button.getAttribute('data-tt-anchor')}`);
      if (!target) return;
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
}

export function unmount() {}
