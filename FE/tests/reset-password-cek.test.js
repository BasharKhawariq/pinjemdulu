import test from 'node:test';
import assert from 'node:assert/strict';
import { setMockEnabled } from '../js/services/client.js';
import { cekTokenReset } from '../js/services/auth.js';
import * as ResetPasswordPage from '../js/pages/reset-password.js';

test.beforeEach(() => setMockEnabled(true));
test.afterEach(() => setMockEnabled(null));

test('cekTokenReset (mock): token valid mengembalikan { valid: true }', async () => {
  const res = await cekTokenReset({ token: 'token-bagus-123' });
  assert.equal(res.valid, true);
});

test('cekTokenReset (mock): token kosong ditolak dengan TAUTAN_TIDAK_VALID', async () => {
  await assert.rejects(() => cekTokenReset({ token: '' }), (err) => {
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'TAUTAN_TIDAK_VALID');
    return true;
  });
});

test('cekTokenReset (mock): token yang sudah dipakai/kedaluwarsa ditolak', async () => {
  for (const token of ['dipakai-1', 'expired-1', 'kedaluwarsa-1', 'invalid-1']) {
    await assert.rejects(() => cekTokenReset({ token }), (err) => err.code === 'TAUTAN_TIDAK_VALID');
  }
});

test('halaman reset password: tanpa token langsung menampilkan alert tautan tidak valid', async () => {
  const root = { innerHTML: '', addEventListener() {}, removeEventListener() {} };
  const ctx = { query: {} };
  root.innerHTML = ResetPasswordPage.render(ctx);
  await ResetPasswordPage.mount(root, ctx);
  assert.ok(root.innerHTML.includes('role="alert"'));
  assert.ok(root.innerHTML.includes('Tautan tidak valid, sudah dipakai atau kedaluwarsa'));
  assert.ok(!root.innerHTML.includes('id="reset-password-form"'));
  ResetPasswordPage.unmount(root);
});

test('halaman reset password: token yang sudah dipakai menampilkan alert tanpa form', async () => {
  const root = { innerHTML: '', addEventListener() {}, removeEventListener() {} };
  const ctx = { query: { token: 'dipakai-sebelumnya' } };
  root.innerHTML = ResetPasswordPage.render(ctx);
  await ResetPasswordPage.mount(root, ctx);
  assert.ok(root.innerHTML.includes('reset-password-token-alert'));
  assert.ok(root.innerHTML.includes('Tautan tidak valid, sudah dipakai atau kedaluwarsa'));
  assert.ok(!root.innerHTML.includes('id="reset-password-form"'));
  ResetPasswordPage.unmount(root);
});

test('halaman reset password: token valid menampilkan form tanpa alert', async () => {
  const root = { innerHTML: '', addEventListener() {}, removeEventListener() {} };
  const ctx = { query: { token: 'token-bagus-123' } };
  root.innerHTML = ResetPasswordPage.render(ctx);
  await ResetPasswordPage.mount(root, ctx);
  assert.ok(root.innerHTML.includes('id="reset-password-form"'));
  assert.ok(!root.innerHTML.includes('reset-password-token-alert'));
  ResetPasswordPage.unmount(root);
});
