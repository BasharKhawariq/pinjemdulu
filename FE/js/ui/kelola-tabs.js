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
    "inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer select-none";
  const activeClass = "bg-primary/10 text-primary font-semibold shadow-sm";
  const inactiveClass =
    "text-muted-foreground hover:bg-muted/50 hover:text-foreground";

  return html`
    <nav class="flex items-center gap-2" aria-label="Pilihan Kelola">
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
