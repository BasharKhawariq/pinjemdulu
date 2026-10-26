import test from 'node:test';
import assert from 'node:assert/strict';

import { login, logout, getUser, _resetSession } from '../js/state/session.js';

test.beforeEach(() => {
  _resetSession();
});

test('session: getUser mengembalikan null saat sesi kosong', () => {
  assert.equal(getUser(), null);
});

test('session: login menyimpan pengguna ke sesi dan getUser mengembalikannya', () => {
  const dummyUser = {
    id: 'user-1',
    nama: 'Maitri Sakti',
    email: 'maitri.sakti@mailinator.com',
    role: 'peminjam',
  };

  const loggedIn = login(dummyUser);
  assert.deepEqual(loggedIn, dummyUser);

  const current = getUser();
  assert.deepEqual(current, dummyUser);
});

test('session: logout menghapus data sesi', () => {
  const dummyUser = {
    id: 'user-2',
    nama: 'Siti Rahma',
    role: 'penanggung_jawab',
  };

  login(dummyUser);
  assert.ok(getUser() !== null);

  logout();
  assert.equal(getUser(), null);
});

test('session: login menolak data pengguna tidak valid', () => {
  assert.throws(() => login(null), /tidak valid/);
  assert.throws(() => login('bukan-objek'), /tidak valid/);
});
