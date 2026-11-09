/**
 * Halaman Tata Tertib: aturan peminjaman dan pengembalian (konten statis).
 * Konten ada di js/data/tata-tertib.js.
 */
import { TATA_TERTIB } from '../data/tata-tertib.js';
import { escapeHtml } from '../ui/html.js';

function renderBagian(bagian) {
  return `
    <section aria-labelledby="tt-${bagian.id}" class="mt-8">
      <h3 id="tt-${bagian.id}" class="text-lg font-semibold text-primary">${escapeHtml(bagian.judul)}</h3>
      <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-justify text-base leading-relaxed text-slate-800 marker:text-slate-700">
        ${bagian.butir.map((teks) => `<li>${escapeHtml(teks)}</li>`).join('')}
      </ol>
    </section>`;
}

export function render() {
  const t = TATA_TERTIB;
  return `
    <section class="w-full px-5 pb-8 pt-8 sm:px-6 lg:px-7">
      <div class="mb-9">
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">${escapeHtml(t.judul)}</h1>
        <p class="mt-1 text-sm text-slate-400">${escapeHtml(t.subjudul)}</p>
      </div>

      <article class="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.025)] sm:p-6">
        <div class="rounded-3xl bg-primary px-6 py-6 text-primary-foreground sm:px-8">
          <h2 class="text-2xl font-semibold tracking-wide">${escapeHtml(t.heading)}</h2>
          <p class="mt-2 text-base leading-relaxed sm:text-lg">${escapeHtml(t.pengantar)}</p>
        </div>

        ${t.bagian.map(renderBagian).join('')}
      </article>
    </section>`;
}

export function mount() {}
export function unmount() {}
