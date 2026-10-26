/**
 * router.js — Router hash client-side PinjemDulu terintegrasi dengan Route Guard.
 */

import { resolveRoute } from './lib/route-guard.js';
import * as LoginPage from './pages/login.js';
import * as DashboardPeminjamPage from './pages/dashboard-peminjam.js';
import * as InventarisPage from './pages/inventaris.js';
import * as DetailPage from './pages/detail.js';
import * as KelolaInventarisPage from './pages/kelola-inventaris.js';
import * as KelolaPeminjamanPage from './pages/kelola-peminjaman.js';
import * as KelolaPengembalianPage from './pages/kelola-pengembalian.js';
import * as KelolaPengajuanPjPage from './pages/kelola-pengajuan-pj.js';
import * as KelolaPenggunaPage from './pages/kelola-pengguna.js';
import * as KelolaInventarisFormPage from './pages/kelola-inventaris-form.js';
import * as KelolaKategoriPage from './pages/kelola-kategori.js';
import * as AjukanPage from './pages/ajukan.js';
import * as PeminjamanPage from './pages/peminjaman.js';
import * as PengembalianPage from './pages/pengembalian.js';
import * as PlaceholderPage from './pages/placeholder.js';
import * as NotFoundPage from './pages/notfound.js';

const MODULES = {
  login: LoginPage,
  'dashboard-peminjam': DashboardPeminjamPage,
  'dashboard-pj': PlaceholderPage,
  inventaris: InventarisPage,
  detail: DetailPage,
  ajukan: AjukanPage,
  peminjaman: PeminjamanPage,
  pengembalian: PengembalianPage,
  'kelola-inventaris': KelolaInventarisPage,
  'kelola-peminjaman': KelolaPeminjamanPage,
  'kelola-pengembalian': KelolaPengembalianPage,
  'kelola-pengajuan-pj': KelolaPengajuanPjPage,
  'kelola-pengguna': KelolaPenggunaPage,
  'kelola-inventaris-tambah': KelolaInventarisFormPage,
  'kelola-inventaris-ubah': KelolaInventarisFormPage,
  'kelola-kategori': KelolaKategoriPage,
  notfound: NotFoundPage,
};

/**
 * Ekstrak query parameters dari hash URL.
 * @param {string} hash
 * @returns {object}
 */
export function parseQueryParams(hash) {
  if (!hash || typeof hash !== 'string') return {};
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return {};

  const searchParams = new URLSearchParams(hash.slice(qIndex + 1));
  const result = {};
  for (const [key, value] of searchParams.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * Navigasikan ke path hash baru.
 * @param {string} targetPath
 * @param {boolean} [replace=false]
 */
export function navigate(targetPath, replace = false) {
  if (typeof window === 'undefined') return;

  const formatted = targetPath.startsWith('#') ? targetPath : `#${targetPath}`;
  if (replace) {
    const url = new URL(window.location.href);
    url.hash = formatted;
    window.location.replace(url.href);
  } else {
    window.location.hash = formatted;
  }
}

let currentPageModule = null;

/**
 * Tangani perubahan rute saat ini dengan Route Guard.
 * @param {HTMLElement} appRoot
 * @param {object} [ctx]
 * @param {() => void} [onRouteResolved]
 */
export async function handleRouteChange(appRoot, ctx = {}, onRouteResolved = null) {
  if (typeof window === 'undefined' || !appRoot) return;

  const currentHash = window.location.hash || '';
  const user = ctx.user || null;

  const resolution = resolveRoute({ hash: currentHash, user });
  if (resolution.type === 'redirect') {
    navigate(resolution.to, true);
    return;
  }

  const routeName = resolution.route;
  const targetModule = MODULES[routeName] || NotFoundPage;

  if (currentPageModule && typeof currentPageModule.unmount === 'function') {
    try {
      currentPageModule.unmount(appRoot);
    } catch {
      /* abaikan */
    }
  }

  currentPageModule = targetModule;

  const pageCtx = {
    ...ctx,
    route: routeName,
    path: currentHash,
    cleanPath: currentHash.split('?')[0],
    params: resolution.params || {},
    query: parseQueryParams(currentHash),
    user,
  };

  if (typeof targetModule.render === 'function') {
    appRoot.innerHTML = targetModule.render(pageCtx);
  }

  if (typeof targetModule.mount === 'function') {
    await targetModule.mount(appRoot, pageCtx);
  }

  if (onRouteResolved) {
    onRouteResolved(pageCtx);
  }
}
