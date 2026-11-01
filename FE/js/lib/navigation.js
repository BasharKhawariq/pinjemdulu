import { ROLES } from './constants.js';

/**
 * Label tampilan peran (untuk sidebar, header, dsb.)
 */
export const ROLE_LABEL = Object.freeze({
  [ROLES.PEMINJAM]: 'Peminjam',
  [ROLES.PENANGGUNG_JAWAB]: 'PJ Inventaris',
});

const PENGAJUAN_SAYA_PEMINJAM_CHILDREN = Object.freeze([
  {
    key: 'nav-pengajuan-saya-peminjaman',
    label: 'Peminjaman',
    href: '#/pengajuan-saya/peminjaman',
    badge: 2,
  },
  {
    key: 'nav-pengajuan-saya-pengembalian',
    label: 'Pengembalian',
    href: '#/pengajuan-saya/pengembalian',
    badge: 2,
  },
]);

const PENGAJUAN_SAYA_PJ_CHILDREN = Object.freeze([
  {
    key: 'nav-pengajuan-saya-peminjaman',
    label: 'Peminjaman',
    href: '#/pengajuan-saya/peminjaman',
  },
  {
    key: 'nav-pengajuan-saya-pengembalian',
    label: 'Pengembalian',
    href: '#/pengajuan-saya/pengembalian',
  },
]);

const PENGELOLAAN_CHILDREN = Object.freeze([
  {
    key: 'nav-kelola-inventaris',
    label: 'Kelola Inventaris',
    href: '#/kelola/inventaris',
  },
  {
    key: 'nav-kelola-peminjaman',
    label: 'Kelola Peminjaman',
    href: '#/kelola/peminjaman',
  },
  {
    key: 'nav-kelola-pengembalian',
    label: 'Kelola Pengembalian',
    href: '#/kelola/pengembalian',
  },
  {
    key: 'nav-list-pengajuan-pj',
    label: 'List Pengajuan PJ',
    href: '#/kelola/pengajuan-pj',
  },
  {
    key: 'nav-kelola-pengguna',
    label: 'Kelola Pengguna',
    href: '#/kelola/pengguna',
  },
]);

/**
 * Konfigurasi menu Peminjam.
 */
const NAV_PEMINJAM = Object.freeze([
  {
    key: 'nav-dashboard',
    label: 'Dashboard',
    href: '#/dashboard-peminjam',
    icon: 'LayoutGrid',
  },
  {
    key: 'nav-inventaris',
    label: 'Inventaris',
    href: '#/inventaris',
    icon: 'Archive',
  },
  {
    key: 'nav-pengajuan-saya',
    label: 'Pengajuan Saya',
    type: 'group',
    icon: 'HandCoins',
    badge: 4,
    children: PENGAJUAN_SAYA_PEMINJAM_CHILDREN,
  },
  {
    key: 'nav-pengajuan-pj',
    label: 'Pengajuan PJ',
    href: '#/pengajuan-pj',
    icon: 'UserRoundPlus',
  },
  {
    key: 'nav-tata-tertib',
    label: 'Tata Tertib',
    href: '#/tata-tertib',
    icon: 'FileText',
  },
]);

/**
 * Konfigurasi menu Penanggung Jawab (PJ) sesuai desain SidebarPJNewest:
 * Dashboard, Inventaris, Pengajuan Saya (grup), Pengelolaan (grup), Pengajuan PJ, Tata Tertib.
 */
const NAV_PENANGGUNG_JAWAB = Object.freeze([
  {
    key: 'nav-dashboard',
    label: 'Dashboard',
    href: '#/dashboard-pj',
    icon: 'LayoutGrid',
  },
  {
    key: 'nav-inventaris',
    label: 'Inventaris',
    href: '#/inventaris',
    icon: 'Archive',
  },
  {
    key: 'nav-pengajuan-saya',
    label: 'Pengajuan Saya',
    type: 'group',
    icon: 'HandCoins',
    children: PENGAJUAN_SAYA_PJ_CHILDREN,
  },
  {
    key: 'nav-pengelolaan',
    label: 'Pengelolaan',
    type: 'group',
    icon: 'Sliders',
    children: PENGELOLAAN_CHILDREN,
  },
  {
    key: 'nav-pengajuan-pj',
    label: 'Pengajuan PJ',
    href: '#/pengajuan-pj',
    icon: 'UserRoundPlus',
  },
  {
    key: 'nav-tata-tertib',
    label: 'Tata Tertib',
    href: '#/tata-tertib',
    icon: 'FileText',
  },
]);

/**
 * Dapatkan daftar menu berdasarkan peran pengguna.
 * @param {string} [role]
 * @returns {Array<{ key: string, label: string, href: string, icon: string }>}
 */
export function getNavForRole(role) {
  if (role === ROLES.PEMINJAM) return NAV_PEMINJAM;
  if (role === ROLES.PENANGGUNG_JAWAB) return NAV_PENANGGUNG_JAWAB;
  return [];
}

/**
 * Normalisasi dan periksa apakah item menu aktif berdasarkan hash saat ini.
 * @param {string} itemHref
 * @param {string} currentHash
 * @returns {boolean}
 */
export function isActivePath(itemHref, currentHash) {
  if (!itemHref || !currentHash) return false;
  const normalize = (p) => {
    let s = String(p).trim();
    if (!s.startsWith('#')) {
      s = s.startsWith('/') ? `#${s}` : `#/${s}`;
    }
    return s.replace(/\/+$/, '') || '#/';
  };
  const target = normalize(itemHref);
  const current = normalize(currentHash);

  if (target === current) return true;
  return current.startsWith(`${target}/`);
}

/**
 * Ambil judul halaman dan ikon berdasarkan hash rute.
 * @param {string} [hash]
 * @returns {{ title: string, icon: string|null }}
 */
export function getPageTitle(hash = '') {
  const clean = String(hash || '').replace(/\?.*$/, '').replace(/\/$/, '') || '#/dashboard-peminjam';
  if (clean === '#/dashboard-peminjam' || clean === '#/dashboard-pj') return { title: 'Dashboard', icon: 'LayoutGrid' };
  if (clean === '#/inventaris') return { title: 'Inventaris', icon: 'Archive' };
  if (/^#\/inventaris\/[^/]+\/ajukan$/.test(clean)) return { title: 'Ajukan Peminjaman', icon: 'HandCoins' };
  if (/^#\/inventaris\/[^/]+$/.test(clean)) return { title: 'Inventaris', icon: 'Archive' };
  if (clean === '#/kelola/inventaris/tambah') return { title: 'Tambah Barang', icon: 'Sliders' };
  if (/^#\/kelola\/inventaris\/[^/]+\/ubah$/.test(clean)) return { title: 'Kelola Inventaris', icon: 'Sliders' };
  if (clean === '#/kelola/inventaris') return { title: 'Kelola Inventaris', icon: 'Sliders' };
  if (clean === '#/kelola/kategori') return { title: 'Kelola Kategori', icon: 'FolderTree' };
  if (clean === '#/kelola/peminjaman') return { title: 'Kelola Peminjaman', icon: 'Sliders' };
  if (clean === '#/kelola/pengembalian') return { title: 'Kelola Pengembalian', icon: 'Sliders' };
  if (clean === '#/kelola/pengajuan-pj') return { title: 'List Pengajuan PJ', icon: 'Sliders' };
  if (clean === '#/kelola/pengguna') return { title: 'Kelola Pengguna', icon: 'Sliders' };
  if (clean === '#/pengajuan-saya/peminjaman') return { title: 'Pengajuan Saya', icon: 'HandCoins' };
  if (clean === '#/pengajuan-saya/pengembalian') return { title: 'Pengajuan Saya', icon: 'HandCoins' };
  if (clean === '#/pengajuan-pj') return { title: 'Pengajuan PJ', icon: 'UserRoundPlus' };
  if (clean === '#/tata-tertib') return { title: 'Tata Tertib', icon: 'FileText' };
  if (clean === '#/login') return { title: 'Masuk', icon: null };
  return { title: 'PinjemDulu', icon: null };
}

/**
 * Ambil inisial 2 huruf kapital dari nama pengguna.
 * @param {string} [nama]
 * @returns {string}
 */
export function getInitials(nama) {
  if (!nama || typeof nama !== 'string') return '';
  const trimmed = nama.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Periksa hak akses peran terhadap suatu rute hash.
 * @param {string|null} role
 * @param {string} hash
 * @returns {boolean}
 */
export function canAccess(role, hash) {
  if (!role) {
    return hash === '#/login' || hash === '' || hash === '#/';
  }
  if (role === ROLES.PEMINJAM) {
    if (String(hash).startsWith('#/kelola')) return false;
    return true;
  }
  if (role === ROLES.PENANGGUNG_JAWAB) {
    return true;
  }
  return false;
}
