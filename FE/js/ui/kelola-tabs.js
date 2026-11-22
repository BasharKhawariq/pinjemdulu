/**
 * kelola-tabs.js — Komponen tab navigasi terpadu Kelola Inventaris & Kelola Kategori.
 * Menghubungkan halaman #/kelola/inventaris dan #/kelola/kategori secara instan.
 */

import { html } from "./html.js";

/**
 * Render tab button navigasi [Inventaris] [Kelola Kategori / Kategori].
 * @param {'inventaris'|'kategori'} activeTab
 * @returns {import('./html.js').SafeHtml}
 */
export function renderKelolaTabs(activeTab = "inventaris") {
  const isInventaris = activeTab === "inventaris";
  const isKategori = activeTab === "kategori";

  const tabBase =
    "shrink-0 cursor-pointer select-none rounded-lg px-4 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95";
  const activeClass = "bg-blue-100 text-slate-900";
  const inactiveClass = "text-slate-600 hover:bg-slate-50";

  return html`
    <nav class="mb-3 inline-flex max-w-full items-center gap-1 rounded-xl bg-white p-1.5" aria-label="Pilihan Kelola">
      <a
        href="#/kelola/inventaris"
        class="${tabBase} ${isInventaris ? activeClass : inactiveClass}"
        aria-current="${isInventaris ? "page" : "false"}"
      >
        Inventaris
      </a>
      <a
        href="#/kelola/kategori"
        class="${tabBase} ${isKategori ? activeClass : inactiveClass}"
        aria-current="${isKategori ? "page" : "false"}"
      >
        Kategori
      </a>
    </nav>
  `;
}
