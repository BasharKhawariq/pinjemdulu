import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getNavForRole,
  isActivePath,
  getPageTitle,
  getInitials,
  ROLE_LABEL,
  canAccess,
} from '../js/lib/navigation.js';
import { ROLES } from '../js/lib/constants.js';

/* ========================================================================== */
/*                                ROLE_LABEL                                  */
/* ========================================================================== */

test('ROLE_LABEL: label sesuai peran (Peminjam / PJ Inventaris)', () => {
  assert.equal(ROLE_LABEL[ROLES.PEMINJAM], 'Peminjam');
  assert.equal(ROLE_LABEL[ROLES.PENANGGUNG_JAWAB], 'PJ Inventaris');
});

/* ========================================================================== */
/*                                getNavForRole                               */
/* ========================================================================== */

test('getNavForRole: peminjam berisi menu lengkap peminjam tanpa menu kelola', () => {
  const nav = getNavForRole(ROLES.PEMINJAM);
  assert.equal(nav.length, 5);

  assert.equal(nav[0].label, 'Dashboard');
  assert.equal(nav[0].href, '#/dashboard-peminjam');
  assert.equal(nav[0].icon, 'LayoutGrid');

  assert.equal(nav[1].label, 'Inventaris');
  assert.equal(nav[1].href, '#/inventaris');
  assert.equal(nav[1].icon, 'Archive');

  assert.equal(nav[2].label, 'Pengajuan Saya');
  assert.equal(nav[2].type, 'group');
  assert.equal(nav[2].icon, 'HandCoins');
  assert.equal(nav[2].children.length, 2);

  assert.equal(nav[3].label, 'Pengajuan PJ');
  assert.equal(nav[3].href, '#/pengajuan-pj');

  assert.equal(nav[4].label, 'Tata Tertib');
  assert.equal(nav[4].href, '#/tata-tertib');

  // Peminjam TIDAK dapat grup pengelolaan
  const hasKelola = nav.some((i) => i.key === 'nav-pengelolaan');
  assert.equal(hasKelola, false);
});

test('getNavForRole: PJ berisi Dashboard, Inventaris, Pengajuan Saya, Pengelolaan, Pengajuan PJ, Tata Tertib', () => {
  const nav = getNavForRole(ROLES.PENANGGUNG_JAWAB);
  assert.equal(nav.length, 6);

  assert.equal(nav[0].label, 'Dashboard');
  assert.equal(nav[0].href, '#/dashboard-pj');
  assert.equal(nav[0].icon, 'LayoutGrid');

  assert.equal(nav[1].label, 'Inventaris');
  assert.equal(nav[1].href, '#/inventaris');
  assert.equal(nav[1].icon, 'Archive');

  assert.equal(nav[2].label, 'Pengajuan Saya');
  assert.equal(nav[2].type, 'group');
  assert.equal(nav[2].icon, 'HandCoins');

  assert.equal(nav[3].label, 'Pengelolaan');
  assert.equal(nav[3].type, 'group');
  assert.equal(nav[3].icon, 'Sliders');
  assert.equal(nav[3].children.length, 5);
  assert.equal(nav[3].children[0].label, 'Kelola Inventaris');
  assert.equal(nav[3].children[0].href, '#/kelola/inventaris');

  assert.equal(nav[4].label, 'Pengajuan PJ');
  assert.equal(nav[4].href, '#/pengajuan-pj');

  assert.equal(nav[5].label, 'Tata Tertib');
  assert.equal(nav[5].href, '#/tata-tertib');
});

test('getNavForRole: role tidak dikenal mengembalikan array kosong', () => {
  assert.deepEqual(getNavForRole('superadmin'), []);
  assert.deepEqual(getNavForRole(undefined), []);
  assert.deepEqual(getNavForRole(null), []);
});

/* ========================================================================== */
/*                                isActivePath                                */
/* ========================================================================== */

test('isActivePath: cocok persis dan prefix sub-halaman', () => {
  assert.equal(isActivePath('#/inventaris', '#/inventaris'), true);
  assert.equal(isActivePath('#/inventaris', '#/inventaris/inv-1'), true);
  assert.equal(isActivePath('#/inventaris', '#/inventaris/inv-1/ajukan'), true);
  assert.equal(isActivePath('#/dashboard-peminjam', '#/dashboard-peminjam'), true);
});

test('isActivePath: menolak sibling dengan nama awalan mirip', () => {
  assert.equal(isActivePath('#/inventaris', '#/inventaris-lama'), false);
  assert.equal(isActivePath('#/kelola', '#/kelola-lain'), false);
});

test('isActivePath: menoleransi trailing slash dan format path biasa', () => {
  assert.equal(isActivePath('#/inventaris/', '#/inventaris'), true);
  assert.equal(isActivePath('/inventaris', '/inventaris/inv-1'), true);
});

/* ========================================================================== */
/*                                getPageTitle                                */
/* ========================================================================== */

test('getPageTitle: mengembalikan judul dan icon yang sesuai', () => {
  const d = getPageTitle('#/dashboard-peminjam');
  assert.equal(d.title, 'Dashboard');
  assert.equal(d.icon, 'LayoutGrid');

  const inv = getPageTitle('#/inventaris');
  assert.equal(inv.title, 'Inventaris');
  assert.equal(inv.icon, 'Archive');

  const detail = getPageTitle('#/inventaris/inv-1');
  assert.equal(detail.title, 'Inventaris');

  const ajukan = getPageTitle('#/inventaris/inv-1/ajukan');
  assert.equal(ajukan.title, 'Ajukan Peminjaman');

  const kelola = getPageTitle('#/kelola/inventaris');
  assert.equal(kelola.title, 'Kelola Inventaris');
  assert.equal(kelola.icon, 'Sliders');

  const kategori = getPageTitle('#/kelola/kategori');
  assert.equal(kategori.title, 'Kelola Kategori');
  assert.equal(kategori.icon, 'FolderTree');
});

/* ========================================================================== */
/*                                 canAccess                                  */
/* ========================================================================== */

test('canAccess: peminjam dilarang akses rute kelola', () => {
  assert.equal(canAccess(ROLES.PEMINJAM, '#/inventaris'), true);
  assert.equal(canAccess(ROLES.PEMINJAM, '#/dashboard-peminjam'), true);
  assert.equal(canAccess(ROLES.PEMINJAM, '#/kelola/inventaris'), false);
  assert.equal(canAccess(ROLES.PEMINJAM, '#/kelola/kategori'), false);
});

test('canAccess: PJ diizinkan akses rute kelola dan katalog', () => {
  assert.equal(canAccess(ROLES.PENANGGUNG_JAWAB, '#/inventaris'), true);
  assert.equal(canAccess(ROLES.PENANGGUNG_JAWAB, '#/dashboard-pj'), true);
  assert.equal(canAccess(ROLES.PENANGGUNG_JAWAB, '#/kelola/inventaris'), true);
  assert.equal(canAccess(ROLES.PENANGGUNG_JAWAB, '#/kelola/kategori'), true);
});

test('canAccess: tamu tanpa role dilarang akses rute internal selain login', () => {
  assert.equal(canAccess(null, '#/login'), true);
  assert.equal(canAccess(null, '#/inventaris'), false);
  assert.equal(canAccess(undefined, '#/dashboard-peminjam'), false);
});

/* ========================================================================== */
/*                                 getInitials                                */
/* ========================================================================== */

test('getInitials: menghasilkan inisial 2 huruf kapital', () => {
  assert.equal(getInitials('Maitri Sakti'), 'MS');
  assert.equal(getInitials('Budi Santoso'), 'BS');
  assert.equal(getInitials('Budi'), 'BU');
  assert.equal(getInitials('  dua   spasi  '), 'DS');
  assert.equal(getInitials(''), '');
});
