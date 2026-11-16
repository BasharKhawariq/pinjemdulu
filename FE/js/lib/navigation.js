import { ROLES, STATUS_PEMINJAMAN, STATUS_REQUEST_PJ } from './constants.js';
import { mockPeminjaman } from '../data/peminjaman.js';
import { mockRequestPj } from '../data/request-pj.js';
import { isMockEnabled } from '../services/client.js';

let liveBadgeCounts = {
  'nav-pengajuan-saya-peminjaman': 0,
  'nav-pengajuan-saya-pengembalian': 0,
  'nav-kelola-peminjaman': 0,
  'nav-kelola-pengembalian': 0,
  'nav-list-pengajuan-pj': 0,
  'nav-kelola-pengguna': 0,
};

export function setLiveBadgeCounts(counts) {
  liveBadgeCounts = { ...liveBadgeCounts, ...(counts || {}) };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pd:notifications-changed'));
  }
}

export function resetLiveBadgeCounts() {
  liveBadgeCounts = {
    'nav-pengajuan-saya-peminjaman': 0,
    'nav-pengajuan-saya-pengembalian': 0,
    'nav-kelola-peminjaman': 0,
    'nav-kelola-pengembalian': 0,
    'nav-list-pengajuan-pj': 0,
    'nav-kelola-pengguna': 0,
  };
}

/**
 * Label tampilan peran (untuk sidebar, header, dsb.)
 */

const NOTIFICATION_READ_STORAGE_KEY = 'pd:v1:notifications-read';

function readNotificationState() {
  try {
    return JSON.parse(window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function notificationItemId(item) {
  return String(item?.id ?? item?.idPeminjaman ?? item?.idPengembalian ?? item?.idRequest ?? '');
}

function notificationReadKey(item) {
  const id = notificationItemId(item);
  const status = String(item?.status || '').trim().toLowerCase();
  return id ? `${id}::${status}` : '';
}

/** Tandai seluruh data pada tab/status yang dibuka sebagai sudah dibaca. */
export function markNotificationsRead(groupKey, statuses, items = null) {
  if (!isMockEnabled()) return;
  const source = items || (groupKey === 'request-pj' ? mockRequestPj : mockPeminjaman);
  const normalized = new Set(statuses.map((value) => String(value).trim().toLowerCase()));
  const matchedKeys = source
    .filter((item) => normalized.has(String(item.status || '').trim().toLowerCase()))
    .map(notificationReadKey)
    .filter(Boolean);
  if (!matchedKeys.length) return;
  const state = readNotificationState();
  const current = new Set(Array.isArray(state[groupKey]) ? state[groupKey] : []);
  matchedKeys.forEach((key) => current.add(key));
  state[groupKey] = [...current];
  try {
    window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage dapat tidak tersedia pada mode privat tertentu */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pd:notifications-changed'));
  }
}

function countUnreadStatus(items, statuses, groupKey) {
  const normalized = new Set(statuses.map((status) => String(status).trim().toLowerCase()));
  const state = readNotificationState();
  const readIds = new Set(Array.isArray(state[groupKey]) ? state[groupKey] : []);
  return items.filter((item) => {
    const readKey = notificationReadKey(item);
    return normalized.has(String(item.status || '').trim().toLowerCase()) && (!readKey || !readIds.has(readKey));
  }).length;
}

export const ROLE_LABEL = Object.freeze({
  [ROLES.PEMINJAM]: 'Peminjam',
  [ROLES.PENANGGUNG_JAWAB]: 'PJ Inventaris',
});

const PENGAJUAN_SAYA_PEMINJAM_CHILDREN = Object.freeze([
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
function withBadges(items, counts) {
  return items.map((item) => {
    // Hapus badge bawaan/hasil render sebelumnya agar nilainya selalu mengikuti data terbaru.
    const { badge: _oldBadge, ...itemWithoutBadge } = item;
    if (!item.children) return itemWithoutBadge;

    const children = item.children.map((child) => {
      const { badge: _oldChildBadge, ...childWithoutBadge } = child;
      const count = Math.max(0, Number(counts[child.key]) || 0);
      return count > 0 ? { ...childWithoutBadge, badge: count } : childWithoutBadge;
    });
    const total = children.reduce((sum, child) => sum + (Number(child.badge) || 0), 0);

    // Jangan render badge sama sekali jika total notifikasi nol.
    return total > 0
      ? { ...itemWithoutBadge, children, badge: total }
      : { ...itemWithoutBadge, children };
  });
}

/**
 * Menu dengan badge notifikasi yang dihitung dari data mock aktif.
 * Peminjam: Peminjaman = Disetujui + Ditolak; Pengembalian = Ditolak.
 * PJ: Kelola Peminjaman = Diajukan; Kelola Pengembalian = Menunggu;
 * List Pengajuan PJ = Menunggu.
 */
export function getNavForRole(role) {
  let counts = {};

  if (isMockEnabled()) {
    const peminjamanSaya = countUnreadStatus(mockPeminjaman, [
      STATUS_PEMINJAMAN.DISETUJUI, STATUS_PEMINJAMAN.DIPINJAM, STATUS_PEMINJAMAN.DITOLAK,
    ], 'peminjaman-saya');
    const pengembalianSaya = countUnreadStatus(mockPeminjaman, [
      STATUS_PEMINJAMAN.DIKEMBALIKAN, STATUS_PEMINJAMAN.TERLAMBAT, STATUS_PEMINJAMAN.DITOLAK,
    ], 'pengembalian-saya');
    const diajukan = countUnreadStatus(mockPeminjaman, [STATUS_PEMINJAMAN.DIAJUKAN], 'kelola-peminjaman');
    const menungguPengembalian = countUnreadStatus(mockPeminjaman, [
      STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    ], 'kelola-pengembalian');
    const requestMenunggu = countUnreadStatus(mockRequestPj, [STATUS_REQUEST_PJ.MENUNGGU], 'request-pj');

    counts = {
      'nav-pengajuan-saya-peminjaman': peminjamanSaya,
      'nav-pengajuan-saya-pengembalian': pengembalianSaya,
      'nav-kelola-peminjaman': diajukan,
      'nav-kelola-pengembalian': menungguPengembalian,
      'nav-list-pengajuan-pj': requestMenunggu,
      'nav-kelola-pengguna': 0,
    };
  } else {
    counts = liveBadgeCounts;
  }

  if (role === ROLES.PEMINJAM) {
    return withBadges(NAV_PEMINJAM, counts);
  }
  if (role === ROLES.PENANGGUNG_JAWAB) {
    return withBadges(NAV_PENANGGUNG_JAWAB, counts);
  }
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
  if (clean === '#/kelola/inventaris/tambah') return { title: 'Tambah Barang', icon: 'Inbox' };
  if (/^#\/kelola\/inventaris\/[^/]+\/ubah$/.test(clean)) return { title: 'Kelola Inventaris', icon: 'Inbox' };
  if (clean === '#/kelola/inventaris') return { title: 'Kelola Inventaris', icon: 'Inbox' };
  if (clean === '#/kelola/kategori') return { title: 'Kelola Kategori', icon: 'FolderTree' };
  if (clean === '#/kelola/peminjaman') return { title: 'Kelola Peminjaman', icon: 'Sliders' };
  if (clean === '#/kelola/pengembalian') return { title: 'Kelola Pengembalian', icon: 'Sliders' };
  if (clean === '#/kelola/pengajuan-pj') return { title: 'List Pengajuan PJ', icon: 'Sliders' };
  if (clean === '#/kelola/pengguna') return { title: 'Kelola Pengguna', icon: 'CircleUserRound' };
  if (clean === '#/pengajuan-saya/peminjaman') return { title: 'Pengajuan Saya', icon: 'HandCoins' };
  if (clean === '#/pengajuan-saya/pengembalian') return { title: 'Pengajuan Saya', icon: 'HandCoins' };
  if (clean === '#/pengajuan-pj') return { title: 'Pengajuan PJ', icon: 'UserRoundPlus' };
  if (clean === '#/tata-tertib') return { title: 'Tata Tertib', icon: 'FileText' };
  if (clean === '#/profil') return { title: 'Profil Pengguna', icon: 'CircleUserRound' };
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
