import test from 'node:test';
import assert from 'node:assert/strict';

import { isMockEnabled, setMockEnabled, getApiBaseUrl, apiFetch, delay } from '../js/services/client.js';
import { getToken, setToken, login as setSessionUser, getUser, logout, _resetSession } from '../js/state/session.js';
import { login, getMe, checkSession, ubahPassword, lupaPassword, resetPassword } from '../js/services/auth.js';
import { resolveRoute } from '../js/lib/route-guard.js';
import { getNavForRole } from '../js/lib/navigation.js';

test.beforeEach(() => {
  _resetSession();
  setMockEnabled(true);
});

test.afterEach(() => {
  _resetSession();
  setMockEnabled(true);
});

test('client: isMockEnabled dan setMockEnabled bekerja sesuai toggle', () => {
  setMockEnabled(true);
  assert.equal(isMockEnabled(), true);

  setMockEnabled(false);
  assert.equal(isMockEnabled(), false);

  setMockEnabled(null); // Reset ke default
  assert.equal(typeof isMockEnabled(), 'boolean');
});

test('client: getApiBaseUrl mengembalikan URL backend yang valid', () => {
  const url = getApiBaseUrl();
  assert.ok(url.startsWith('http://') || url.startsWith('https://'));
  assert.equal(url.endsWith('/'), false, 'URL tidak boleh berakhiran slash');
});

test('session: token management (getToken, setToken, session integration)', () => {
  assert.equal(getToken(), null, 'Awalnya token kosong');

  setToken('sample-jwt-token-12345');
  assert.equal(getToken(), 'sample-jwt-token-12345');

  // Login dengan user yang menyertakan token
  const testUser = {
    nim: '2441720001',
    namaPengguna: 'PJ HMTI',
    role: 'penanggung_jawab',
    isPj: true,
  };

  setSessionUser(testUser, 'jwt-token-from-login');
  assert.equal(getToken(), 'jwt-token-from-login');
  assert.equal(getUser()?.nim, '2441720001');

  // Logout harus menghapus user dan token
  logout();
  assert.equal(getUser(), null);
  assert.equal(getToken(), null);
});

test('client: apiFetch sukses memanggil endpoint publik BE (/api/health)', async () => {
  setMockEnabled(false);

  const res = await apiFetch('/api/health');
  assert.equal(res?.status, 'ok');
  assert.ok(res?.waktu, 'Harus memiliki waktu ISO');
});

test('client: apiFetch menangani error 404 dari BE secara terstruktur', async () => {
  setMockEnabled(false);

  await assert.rejects(
    async () => {
      await apiFetch('/api/endpoint-yang-pasti-tidak-ada-404');
    },
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('client: apiFetch menyematkan header Authorization saat token ada', async () => {
  setMockEnabled(false);
  setToken('fake-invalid-token');

  // Memanggil endpoint terproteksi dengan token palsu harus mengembalikan 401
  await assert.rejects(
    async () => {
      await apiFetch('/api/me');
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    }
  );
});

test('auth (real API): login kredensial salah menghasilkan error 401', async () => {
  setMockEnabled(false);

  await assert.rejects(
    async () => {
      await login({
        nim: '2441720001',
        password: 'password_salah_total',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    }
  );
});

test('auth (real API): login sukses dengan akun PJ HMTI, token tersimpan dan getMe berhasil', async () => {
  setMockEnabled(false);

  const loginRes = await login({
    nim: '2441720001',
    password: '2441720001', // Password default = NIM
  });

  assert.ok(loginRes?.token, 'Harus menghasilkan JWT token');
  assert.equal(getToken(), loginRes.token, 'Token harus otomatis tersimpan di state session');
  assert.equal(loginRes.user?.nim, '2441720001');
  assert.equal(loginRes.user?.isPj, true);
  assert.equal(loginRes.user?.role, 'penanggung_jawab');
  assert.equal(loginRes.user?.namaPengguna, 'Rizky Pratama');
  assert.equal(loginRes.user?.organisasi?.singkatan, 'HMTI');

  // Uji /api/me menggunakan token yang sudah tersimpan
  const meRes = await getMe();
  assert.ok(meRes?.user, 'getMe harus mengembalikan profil pengguna aktif');
  assert.equal(meRes.user?.nim, '2441720001');
  assert.equal(meRes.user?.isPj, true);
  assert.equal(meRes.user?.role, 'penanggung_jawab');
});

test('auth (real API): login sukses dengan akun Peminjam HMTI', async () => {
  setMockEnabled(false);

  const loginRes = await login({
    nim: '2441720011',
    password: '2441720011', // Password default = NIM
  });

  assert.ok(loginRes?.token, 'Harus menghasilkan JWT token');
  assert.equal(loginRes.user?.nim, '2441720011');
  assert.equal(loginRes.user?.isPj, false);
  assert.equal(loginRes.user?.role, 'peminjam');
  assert.equal(loginRes.user?.organisasi?.singkatan, 'HMTI');
});

test('auth (real API): login sukses dengan akun PJ BEM & Peminjam BEM', async () => {
  setMockEnabled(false);

  // 1. PJ BEM (2441720002)
  const pjBem = await login({
    nim: '2441720002',
    password: '2441720002',
  });
  assert.ok(pjBem?.token);
  assert.equal(pjBem.user?.nim, '2441720002');
  assert.equal(pjBem.user?.isPj, true);
  assert.equal(pjBem.user?.role, 'penanggung_jawab');
  assert.equal(pjBem.user?.organisasi?.singkatan, 'BEM');

  // 2. Peminjam BEM (2441720013)
  const peminjamBem = await login({
    nim: '2441720013',
    password: '2441720013',
  });
  assert.ok(peminjamBem?.token);
  assert.equal(peminjamBem.user?.nim, '2441720013');
  assert.equal(peminjamBem.user?.isPj, false);
  assert.equal(peminjamBem.user?.role, 'peminjam');
  assert.equal(peminjamBem.user?.organisasi?.singkatan, 'BEM');
});

test('auth (real API): checkSession memvalidasi sesi aktif atau null jika tidak ada token', async () => {
  setMockEnabled(false);

  // Tanpa token -> null
  _resetSession();
  const noSession = await checkSession();
  assert.equal(noSession, null);

  // Login dulu sebagai peminjam HMTI
  await login({
    nim: '2441720011',
    password: '2441720011',
  });

  const sessionUser = await checkSession();
  assert.ok(sessionUser, 'Harus mengembalikan pengguna aktif');
  assert.equal(sessionUser?.nim, '2441720011');
});

test('auth (real API): lupaPassword mengirim permintaan atau menolak NIM tak terdaftar', async () => {
  setMockEnabled(false);

  // 1. NIM tidak terdaftar -> 404
  await assert.rejects(
    async () => {
      await lupaPassword({
        nim: '9999999999',
        noWhatsapp: '081234567890',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );

  // 2. NIM terdaftar -> sukses 201
  const res = await lupaPassword({
    nim: '2441720011',
    noWhatsapp: '081234567890',
  });
  assert.ok(res?.message, 'Harus mengembalikan pesan sukses');
});

test('auth (real API): resetPassword menolak token kedaluwarsa atau palsu (400)', async () => {
  setMockEnabled(false);

  await assert.rejects(
    async () => {
      await resetPassword({
        token: 'token-kedaluwarsa-atau-palsu-12345',
        passwordBaru: 'passwordBaru123',
        konfirmasiPassword: 'passwordBaru123',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test('auth (real API): ubahPassword menolak jika password lama salah', async () => {
  setMockEnabled(false);

  // Login sebagai PJ HMTI
  await login({
    nim: '2441720001',
    password: '2441720001',
  });

  await assert.rejects(
    async () => {
      await ubahPassword({
        passwordLama: 'passwordSalahTotal123',
        passwordBaru: 'passwordBaru12345',
        konfirmasiPassword: 'passwordBaru12345',
      });
    },
    (err) => {
      assert.ok(err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 422);
      return true;
    }
  );
});

test('auth & navigation (real API): navigasi sidebar dan rute guard menyesuaikan role PJ vs Peminjam', async () => {
  setMockEnabled(false);

  // 1. Uji Login PJ HMTI
  const pjLogin = await login({
    nim: '2441720001',
    password: '2441720001',
  });
  const pjUser = pjLogin.user;

  // Navigasi PJ harus memiliki grup pengelolaan dan rute dashboard PJ
  const pjNav = getNavForRole(pjUser.role);
  assert.equal(pjNav[0].href, '#/dashboard-pj');
  const hasKelolaGroup = pjNav.some((item) => item.key === 'nav-pengelolaan');
  assert.equal(hasKelolaGroup, true, 'PJ wajib melihat grup pengelolaan');

  // Route guard: PJ boleh mengakses rute kelola
  const pjKelolaRoute = resolveRoute({ hash: '#/kelola/inventaris', user: pjUser });
  assert.equal(pjKelolaRoute.type, 'render');
  assert.equal(pjKelolaRoute.route, 'kelola-inventaris');

  // 2. Uji Login Peminjam HMTI
  const peminjamLogin = await login({
    nim: '2441720011',
    password: '2441720011',
  });
  const peminjamUser = peminjamLogin.user;

  // Navigasi Peminjam harus mengarah ke dashboard peminjam dan TIDAK ada grup kelola
  const peminjamNav = getNavForRole(peminjamUser.role);
  assert.equal(peminjamNav[0].href, '#/dashboard-peminjam');
  const peminjamHasKelola = peminjamNav.some((item) => item.key === 'nav-pengelolaan');
  assert.equal(peminjamHasKelola, false, 'Peminjam dilarang melihat grup pengelolaan');

  // Route guard: Peminjam membuka rute kelola otomatis dialihkan ke #/inventaris
  const peminjamKelolaRoute = resolveRoute({ hash: '#/kelola/inventaris', user: peminjamUser });
  assert.equal(peminjamKelolaRoute.type, 'redirect');
  assert.equal(peminjamKelolaRoute.to, '#/inventaris');
});

test('auth & profile shape (real API): organisasi memiliki namaOrganisasi, singkatan, nama, dan logoUrl', async () => {
  setMockEnabled(false);

  const loginRes = await login({
    nim: '2441720001',
    password: '2441720001',
    captchaId: 'MOCK-QUICKLOGIN',
  });

  const { user } = loginRes;
  assert.equal(user.nama, 'Rizky Pratama');
  assert.equal(user.namaPengguna, 'Rizky Pratama');
  assert.ok(user.organisasi, 'User harus memiliki objek organisasi');
  assert.equal(user.organisasi.nama, 'HMTI');
  assert.equal(user.organisasi.namaOrganisasi, 'HMTI');
  assert.equal(user.organisasi.singkatan, 'HMTI');
  assert.ok(user.organisasi.logoUrl.includes('HMTI.png'), 'Logo URL harus mengarah ke berkas logo HMTI');
});
