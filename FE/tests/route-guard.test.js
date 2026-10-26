import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRoute } from '../js/lib/route-guard.js';
import { ROLES } from '../js/lib/constants.js';

const peminjam = { id: 'user-1', nama: 'Maitri', role: ROLES.PEMINJAM };
const pj = { id: 'user-2', nama: 'Siti', role: ROLES.PENANGGUNG_JAWAB };

test('route-guard: belum login membuka rute internal dialihkan ke #/login', () => {
  assert.deepEqual(resolveRoute({ hash: '#/inventaris', user: null }), {
    type: 'redirect',
    to: '#/login',
  });
  assert.deepEqual(resolveRoute({ hash: '#/dashboard-peminjam', user: null }), {
    type: 'redirect',
    to: '#/login',
  });
  assert.deepEqual(resolveRoute({ hash: '#/kelola/inventaris', user: null }), {
    type: 'redirect',
    to: '#/login',
  });
});

test('route-guard: belum login membuka #/login dirender rute login', () => {
  assert.deepEqual(resolveRoute({ hash: '#/login', user: null }), {
    type: 'render',
    route: 'login',
  });
});

test('route-guard: sudah login membuka #/login atau hash kosong dialihkan ke #/inventaris', () => {
  assert.deepEqual(resolveRoute({ hash: '#/login', user: peminjam }), {
    type: 'redirect',
    to: '#/inventaris',
  });
  assert.deepEqual(resolveRoute({ hash: '', user: peminjam }), {
    type: 'redirect',
    to: '#/inventaris',
  });
  assert.deepEqual(resolveRoute({ hash: '#', user: peminjam }), {
    type: 'redirect',
    to: '#/inventaris',
  });
  assert.deepEqual(resolveRoute({ hash: '#/', user: pj }), {
    type: 'redirect',
    to: '#/inventaris',
  });
});

test('route-guard: peminjam dilarang mengakses rute #/kelola/* dialihkan ke #/inventaris', () => {
  assert.deepEqual(resolveRoute({ hash: '#/kelola/inventaris', user: peminjam }), {
    type: 'redirect',
    to: '#/inventaris',
  });
  assert.deepEqual(resolveRoute({ hash: '#/kelola/kategori', user: peminjam }), {
    type: 'redirect',
    to: '#/inventaris',
  });
});

test('route-guard: PJ diizinkan mengakses rute #/kelola/*', () => {
  assert.deepEqual(resolveRoute({ hash: '#/kelola/inventaris', user: pj }), {
    type: 'render',
    route: 'kelola-inventaris',
  });
  assert.deepEqual(resolveRoute({ hash: '#/kelola/kategori', user: pj }), {
    type: 'render',
    route: 'kelola-kategori',
  });
});

test('route-guard: rute inventaris dan sub-halamannya dirender dengan parameter', () => {
  assert.deepEqual(resolveRoute({ hash: '#/inventaris', user: peminjam }), {
    type: 'render',
    route: 'inventaris',
  });

  const detailRes = resolveRoute({ hash: '#/inventaris/inv-7', user: peminjam });
  assert.deepEqual(detailRes, {
    type: 'render',
    route: 'detail',
    params: { id: 'inv-7' },
  });

  const ajukanRes = resolveRoute({ hash: '#/inventaris/inv-3/ajukan', user: peminjam });
  assert.deepEqual(ajukanRes, {
    type: 'render',
    route: 'ajukan',
    params: { id: 'inv-3' },
  });
});

test('route-guard: rute tidak dikenal menghasilkan rute notfound', () => {
  assert.deepEqual(resolveRoute({ hash: '#/rute-acak-ngawur', user: peminjam }), {
    type: 'render',
    route: 'notfound',
  });
});

test('resolveRoute: dashboard dipisah per peran', () => {
  const peminjam = { role: ROLES.PEMINJAM };
  const pj = { role: ROLES.PENANGGUNG_JAWAB };
  assert.deepEqual(resolveRoute({ hash: '#/dashboard-peminjam', user: peminjam }), { type: 'render', route: 'dashboard-peminjam' });
  assert.deepEqual(resolveRoute({ hash: '#/dashboard-pj', user: pj }), { type: 'render', route: 'dashboard-pj' });
  assert.deepEqual(resolveRoute({ hash: '#/dashboard-pj', user: peminjam }), { type: 'redirect', to: '#/dashboard-peminjam' });
  assert.deepEqual(resolveRoute({ hash: '#/dashboard-peminjam', user: pj }), { type: 'redirect', to: '#/dashboard-pj' });
});
