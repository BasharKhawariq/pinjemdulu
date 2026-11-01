/**
 * Halaman Tata Tertib: aturan peminjaman dan pengembalian (konten statis).
 * Konten ada di js/data/tata-tertib.js.
 */
import { TATA_TERTIB } from '../data/tata-tertib.js';
import { escapeHtml } from '../ui/html.js';

function renderBagian(bagian) {
  return `
    <section aria-labelledby="tt-${bagian.id}" class="mt-7">
      <h3 id="tt-${bagian.id}" class="text-[13px] font-semibold text-slate-900">${escapeHtml(bagian.judul)}</h3>
      <ol class="mt-2 list-decimal space-y-0.5 pl-5 text-justify text-[12px] leading-relaxed text-slate-800 marker:text-slate-700">
        ${bagian.butir.map((teks) => `<li>${escapeHtml(teks)}</li>`).join('')}
      </ol>
    </section>`;
}

export function render() {
  const t = TATA_TERTIB;
  return `
    <section class="min-h-[calc(100vh-112px)] rounded-none bg-background -m-4 p-4 sm:-m-7 sm:p-7">
      <article class="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-7">
        <span class="inline-flex rounded-full border border-blue-400 bg-blue-100 px-3 py-1 text-[11px] font-medium text-blue-950">${escapeHtml(t.label)}</span>
        <h1 class="mt-4 text-2xl font-semibold leading-tight text-slate-900 sm:text-[26px]">${escapeHtml(t.judul)}</h1>
        <p class="mt-2 text-[13px] text-slate-400">${escapeHtml(t.subjudul)}</p>

        <h2 class="mt-7 text-[13px] font-semibold tracking-wide text-slate-900">${escapeHtml(t.heading)}</h2>
        <p class="mt-2 text-justify text-[12px] leading-relaxed text-slate-800">${escapeHtml(t.pengantar)}</p>

        ${t.bagian.map(renderBagian).join('')}
      </article>
    </section>`;
}

export function mount() {}
export function unmount() {}
