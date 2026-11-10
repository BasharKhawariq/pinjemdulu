/**
 * organisasi-badge.js — Komponen dan utilitas terpadu untuk menampilkan logo dan nama OKI.
 * Menyediakan fallback anggun jika logo gagal dimuat (menampilkan inisial huruf dengan warna khas).
 */

import { escapeHtml, raw } from './html.js';

/**
 * 22 Organisasi Kemahasiswaan Intra (OKI) resmi Polinema.
 */
export const DAFTAR_OKI_RESMI = [
  'BEM',
  'BKM',
  'DPM',
  'HIMANIA',
  'HMA',
  'HME',
  'HMM',
  'HMS',
  'HMTI',
  'HMTK',
  'KMK St. YOHANES',
  'LPM KOMPEN',
  'OLAHRAGA',
  'OPA GANENDRA GIRI',
  'PASTI',
  'PL FM',
  'PP',
  'RISPOL',
  'SATMENWA',
  'TALITA KUM',
  'THEATRISIC',
  'USMA',
];

/**
 * Warna latar dan teks untuk badge inisial fallback tiap OKI (Tailwind class utuh).
 */
export const ORG_COLORS = {
  BEM: 'bg-indigo-600 text-white',
  BKM: 'bg-cyan-700 text-white',
  DPM: 'bg-purple-700 text-white',
  HIMANIA: 'bg-blue-600 text-white',
  HMA: 'bg-emerald-700 text-white',
  HME: 'bg-fuchsia-600 text-white',
  HMM: 'bg-red-700 text-white',
  HMS: 'bg-slate-800 text-white',
  HMTI: 'bg-amber-400 text-amber-950',
  HMTK: 'bg-teal-600 text-white',
  'KMK St. YOHANES': 'bg-sky-600 text-white',
  'LPM KOMPEN': 'bg-zinc-700 text-white',
  OLAHRAGA: 'bg-orange-600 text-white',
  'OPA GANENDRA GIRI': 'bg-green-800 text-white',
  PASTI: 'bg-blue-800 text-white',
  'PL FM': 'bg-rose-600 text-white',
  PP: 'bg-orange-500 text-white',
  RISPOL: 'bg-teal-700 text-white',
  SATMENWA: 'bg-stone-800 text-white',
  'TALITA KUM': 'bg-violet-600 text-white',
  THEATRISIC: 'bg-rose-500 text-white',
  USMA: 'bg-amber-600 text-white',
};

/**
 * Normalisasi nama atau singkatan organisasi menjadi singkatan resmi.
 * @param {string|object} org
 * @returns {string}
 */
export function getOrganisasiSingkatan(org) {
  if (!org) return '';
  if (typeof org === 'object') {
    return (
      org.singkatan ||
      org.namaOrganisasi ||
      org.nama ||
      org.displayOrganization ||
      ''
    );
  }
  const clean = String(org).trim();
  const upper = clean.toUpperCase();

  // Pencocokan langsung dengan singkatan resmi
  const found = DAFTAR_OKI_RESMI.find((o) => o.toUpperCase() === upper);
  if (found) return found;

  // Pencocokan singkatan dalam tanda kurung misalnya: "Himpunan Mahasiswa Teknologi Informasi (HMTI)"
  const bracketMatch = clean.match(/\(([^)]+)\)/);
  if (bracketMatch) {
    const candidate = bracketMatch[1].trim();
    const foundCandidate = DAFTAR_OKI_RESMI.find(
      (o) => o.toUpperCase() === candidate.toUpperCase()
    );
    if (foundCandidate) return foundCandidate;
  }

  // Pencocokan substring kata
  for (const oki of DAFTAR_OKI_RESMI) {
    if (upper.includes(oki.toUpperCase())) {
      return oki;
    }
  }

  return clean;
}

/**
 * Dapatkan nama tampilan organisasi.
 * @param {string|object} org
 * @returns {string}
 */
export function getOrganisasiDisplayName(org) {
  if (!org) return '';
  if (typeof org === 'object') {
    return (
      org.namaOrganisasi ||
      org.nama ||
      org.singkatan ||
      org.displayOrganization ||
      ''
    );
  }
  return String(org).trim();
}

/**
 * Mendapatkan URL logo organisasi.
 * Mengutamakan explicitUrl jika valid, lalu file lokal di assets/img/oki/<SINGKATAN>.png.
 * @param {string|object} org
 * @param {string|null} [explicitUrl]
 * @returns {string|null}
 */
export function getOrganisasiLogoUrl(org, explicitUrl = null) {
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim() !== '') {
    return explicitUrl;
  }
  if (org && typeof org === 'object') {
    if (org.logoUrl) return org.logoUrl;
    if (org.logo) return org.logo;
    if (org.icon && typeof org.icon === 'string' && org.icon.startsWith('http')) return org.icon;
  }
  const singkatan = getOrganisasiSingkatan(org);
  if (!singkatan) return null;
  const matched = DAFTAR_OKI_RESMI.find((o) => o.toUpperCase() === singkatan.toUpperCase());
  if (matched) {
    return `assets/img/oki/${encodeURIComponent(matched)}.png`;
  }
  return null;
}

/**
 * Dapatkan warna fallback untuk inisial OKI.
 * @param {string} singkatan
 * @returns {string}
 */
export function getOrganisasiColorClass(singkatan) {
  const key = String(singkatan || '').trim().toUpperCase();
  for (const [k, v] of Object.entries(ORG_COLORS)) {
    if (k.toUpperCase() === key) return v;
  }
  return 'bg-slate-200 text-slate-700';
}

/**
 * Render elemen icon / gambar logo OKI dengan fallback inisial otomatis via onerror.
 * @param {string|object} org
 * @param {string|null} [explicitUrl]
 * @param {string} [sizeClass] e.g. 'h-4 w-4'
 * @param {string} [extraClass]
 * @returns {string}
 */
export function renderOrganisasiLogo(org, explicitUrl = null, sizeClass = 'h-4 w-4', extraClass = '') {
  const singkatan = getOrganisasiSingkatan(org) || 'OKI';
  const logoUrl = getOrganisasiLogoUrl(org, explicitUrl);
  const initial = singkatan.slice(0, 1).toUpperCase() || 'O';
  const colorCls = getOrganisasiColorClass(singkatan);

  if (logoUrl) {
    return `<span class="inline-flex shrink-0 items-center justify-center relative"><img src="${escapeHtml(logoUrl)}" alt="Logo ${escapeHtml(singkatan)}" class="${sizeClass} shrink-0 rounded-full object-contain ${extraClass}" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.classList.remove('hidden');" /><span class="hidden inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${colorCls} ${extraClass}" aria-hidden="true">${escapeHtml(initial)}</span></span>`;
  }

  return `<span class="inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${colorCls} ${extraClass}" aria-hidden="true">${escapeHtml(initial)}</span>`;
}

/**
 * Render OrganisasiBadge lengkap (Logo + Nama) untuk card katalog, tabel, atau header.
 * @param {string|object} org
 * @param {object} [options]
 * @param {string|null} [options.logoUrl]
 * @param {string} [options.size] 'sm' | 'md' | 'lg'
 * @param {string} [options.className]
 * @param {string} [options.textClass]
 * @param {boolean} [options.asSafeHtml]
 * @returns {string|import('./html.js').SafeHtml}
 */
export function renderOrganisasiBadge(org, {
  logoUrl = null,
  size = 'md',
  className = '',
  textClass = '',
  asSafeHtml = false,
} = {}) {
  const displayName = getOrganisasiDisplayName(org);
  if (!displayName) return asSafeHtml ? raw('') : '';

  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSizeClass = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-xs' : 'text-xs';
  const logoMarkup = renderOrganisasiLogo(org, logoUrl, sizeClass);

  const markup = `<span class="inline-flex items-center gap-1.5 font-medium text-slate-700 ${className}">${logoMarkup}<span class="truncate ${textSizeClass} ${textClass}">${escapeHtml(displayName)}</span></span>`;

  return asSafeHtml ? raw(markup) : markup;
}
