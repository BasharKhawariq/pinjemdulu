import test from 'node:test';
import assert from 'node:assert/strict';

import { createCaptcha, checkCaptcha } from '../js/lib/captcha.js';

test('captcha: createCaptcha menghasilkan teks 4 huruf kecil dan captchaId dengan awalan cap-', () => {
  const cap = createCaptcha();
  assert.ok(typeof cap.captchaId === 'string' && cap.captchaId.startsWith('cap-'));
  assert.ok(typeof cap.text === 'string');
  assert.equal(cap.text.length, 4);
  assert.match(cap.text, /^[a-z]{4}$/);
});

test('captcha: createCaptcha deterministik dengan RNG yang diinjeksi', () => {
  // Index 0: a, Index 1: b, Index 2: c, Index 3: d
  const values = [0 / 26, 1 / 26, 2 / 26, 3 / 26, 0.5];
  let callCount = 0;
  const mockRng = () => values[callCount++ % values.length];

  const cap = createCaptcha(mockRng);
  assert.equal(cap.text, 'abcd');
});

test('captcha: checkCaptcha tidak peka huruf besar/kecil dan mengabaikan spasi tepi', () => {
  assert.equal(checkCaptcha('abcd', 'abcd'), true);
  assert.equal(checkCaptcha('abcd', 'ABCD'), true);
  assert.equal(checkCaptcha('abcd', '  AbCd  '), true);
  assert.equal(checkCaptcha('abcd', 'wxyz'), false);
  assert.equal(checkCaptcha('abcd', ''), false);
  assert.equal(checkCaptcha('', 'abcd'), false);
  assert.equal(checkCaptcha(null, 'abcd'), false);
  assert.equal(checkCaptcha('abcd', undefined), false);
});
