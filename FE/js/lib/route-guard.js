/**
 * route-guard.js — Penjaga rute murni (Pure Route Guard).
 * Memetakan (hash, user) -> { type: 'redirect', to } atau { type: 'render', route, params }.
 */

import { ROLES } from './constants.js';

/**
 * Tentukan resolusi rute berdasarkan status autentikasi dan otorisasi.
 * @param {{ hash?: string, user?: object|null }} options
 * @returns {{ type: 'redirect', to: string } | { type: 'render', route: string, params?: object }}
 */
export function resolveRoute({ hash = '', user = null } = {}) {
  const rawHash = String(hash || '').trim();
  const cleanHash = rawHash.split('?')[0].replace(/\/+$/, '') || '#/';

  // 1. Belum login
  if (!user) {
    if (cleanHash === '#/login') {
      return { type: 'render', route: 'login' };
    }
    return { type: 'redirect', to: '#/login' };
  }

  // 2. Sudah login membuka #/login atau hash kosong / root
  if (cleanHash === '#/login' || cleanHash === '#/' || cleanHash === '' || cleanHash === '#') {
    return { type: 'redirect', to: '#/inventaris' };
  }

  // 3. Peminjam dilarang mengakses rute pengelolaan
  if (user.role === ROLES.PEMINJAM && cleanHash.startsWith('#/kelola')) {
    return { type: 'redirect', to: '#/inventaris' };
  }

  // 4. Pencocokan rute internal yang sah
  if (cleanHash === '#/dashboard-peminjam') {
    if (user.role === ROLES.PENANGGUNG_JAWAB) {
      return { type: 'redirect', to: '#/dashboard-pj' };
    }
    return { type: 'render', route: 'dashboard-peminjam' };
  }

  if (cleanHash === '#/dashboard-pj') {
    if (user.role === ROLES.PEMINJAM) {
      return { type: 'redirect', to: '#/dashboard-peminjam' };
    }
    return { type: 'render', route: 'dashboard-pj' };
  }

  if (cleanHash === '#/inventaris') {
    return { type: 'render', route: 'inventaris' };
  }

  if (cleanHash === '#/pengajuan-saya/peminjaman') {
    return { type: 'render', route: 'peminjaman' };
  }

  if (cleanHash === '#/pengajuan-saya/pengembalian') {
    return { type: 'render', route: 'pengembalian' };
  }

  if (cleanHash === '#/pengajuan-pj') {
    return { type: 'render', route: 'pengajuan-pj' };
  }

  if (cleanHash === '#/tata-tertib') {
    return { type: 'render', route: 'tata-tertib' };
  }

  const ajukanMatch = cleanHash.match(/^#\/inventaris\/([^/]+)\/ajukan$/);
  if (ajukanMatch) {
    return { type: 'render', route: 'ajukan', params: { id: decodeURIComponent(ajukanMatch[1]) } };
  }

  const detailMatch = cleanHash.match(/^#\/inventaris\/([^/]+)$/);
  if (detailMatch) {
    return { type: 'render', route: 'detail', params: { id: decodeURIComponent(detailMatch[1]) } };
  }

  if (cleanHash === '#/kelola/inventaris') {
    return { type: 'render', route: 'kelola-inventaris' };
  }

  if (cleanHash === '#/kelola/peminjaman') {
    return { type: 'render', route: 'kelola-peminjaman' };
  }

  if (cleanHash === '#/kelola/pengembalian') {
    return { type: 'render', route: 'kelola-pengembalian' };
  }

  if (cleanHash === '#/kelola/pengajuan-pj') {
    return { type: 'render', route: 'kelola-pengajuan-pj' };
  }

  if (cleanHash === '#/kelola/pengguna') {
    return { type: 'render', route: 'kelola-pengguna' };
  }

  if (cleanHash === '#/kelola/inventaris/tambah') {
    return { type: 'render', route: 'kelola-inventaris-tambah' };
  }

  const kelolaUbahMatch = cleanHash.match(/^#\/kelola\/inventaris\/([^/]+)\/ubah$/);
  if (kelolaUbahMatch) {
    return {
      type: 'render',
      route: 'kelola-inventaris-ubah',
      params: { id: decodeURIComponent(kelolaUbahMatch[1]) },
    };
  }

  if (cleanHash === '#/kelola/kategori') {
    return { type: 'render', route: 'kelola-kategori' };
  }

  // 5. Rute tidak dikenal
  return { type: 'render', route: 'notfound' };
}
