import test from 'node:test';
import assert from 'node:assert/strict';

import { login, getCaptcha, _resetAuthMockState } from '../js/services/auth.js';

test.beforeEach(() => {
  _resetAuthMockState();
});

test('auth-service: email tak terdaftar menghasilkan galat 401', async () => {
  const cap = getCaptcha();
  await assert.rejects(
    () =>
      login({
        email: 'unknown@kampus.ac.id',
        password: 'password123',
        captchaId: cap.captchaId,
        captchaAnswer: cap.text,
      }),
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /Email tidak terdaftar/);
      return true;
    }
  );
});

test('auth-service: akun nonaktif menghasilkan galat 403', async () => {
  const cap = getCaptcha();
  await assert.rejects(
    () =>
      login({
        email: 'auliaputri@mailinator.com',
        password: 'password123',
        captchaId: cap.captchaId,
        captchaAnswer: cap.text,
      }),
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /Akun nonaktif/);
      return true;
    }
  );
});

test('auth-service: captcha salah atau kedaluwarsa menghasilkan galat 422', async () => {
  const cap = getCaptcha();
  await assert.rejects(
    () =>
      login({
        email: 'maitri.sakti@mailinator.com',
        password: 'password123',
        captchaId: cap.captchaId,
        captchaAnswer: 'salah',
      }),
    (err) => {
      assert.equal(err.statusCode, 422);
      assert.ok(err.errors?.captchaAnswer);
      return true;
    }
  );
});

test('auth-service: captcha benar tidak peka huruf besar/kecil dan abaikan spasi tepi', async () => {
  const cap = getCaptcha();
  const res = await login({
    email: 'maitri.sakti@mailinator.com',
    password: 'password123',
    captchaId: cap.captchaId,
    captchaAnswer: `  ${cap.text.toUpperCase()}  `,
  });

  assert.ok(res.user);
  assert.equal(res.user.nama, 'Maitri Sakti');
});

test('auth-service: email tidak peka huruf besar/kecil (case-insensitive)', async () => {
  const cap = getCaptcha();
  const res = await login({
    email: '  MAITRI.SAKTI@MAILINATOR.COM  ',
    password: 'password123',
    captchaId: cap.captchaId,
    captchaAnswer: cap.text,
  });

  assert.ok(res.user);
  assert.equal(res.user.id, 'user-1');
});

test('auth-service: captchaId MOCK-QUICKLOGIN melewati pemeriksaan captcha', async () => {
  const res = await login({
    email: 'siti.rahma@bemft.uma.ac.id',
    password: '',
    captchaId: 'MOCK-QUICKLOGIN',
    captchaAnswer: '',
  });

  assert.ok(res.user);
  assert.equal(res.user.nama, 'Siti Rahma');
  assert.equal(res.user.role, 'penanggung_jawab');
});

test('auth-service: hasil login tidak mengembalikan field sensitif (password, secret)', async () => {
  const res = await login({
    email: 'budi.santoso@ukmfoto.uma.ac.id',
    password: 'secretPassword123',
    captchaId: 'MOCK-QUICKLOGIN',
  });

  assert.ok(res.user);
  assert.equal('password' in res.user, false);
  assert.equal('hash' in res.user, false);
  assert.equal('token' in res.user, false);
  assert.ok(res.user.email);
  assert.ok(res.user.nama);
  assert.ok(res.user.role);
});
