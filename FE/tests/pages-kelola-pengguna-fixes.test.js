import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNomorWa, formatWaDisplay } from '../js/pages/kelola-pengguna.js';

test('formatNomorWa: memformat digit telepon dengan pemisah strip', () => {
  assert.equal(formatNomorWa(''), '');
  assert.equal(formatNomorWa('812'), '812');
  assert.equal(formatNomorWa('8123'), '812-3');
  assert.equal(formatNomorWa('8123456'), '812-3456');
  assert.equal(formatNomorWa('81234567'), '812-3456-7');
  assert.equal(formatNomorWa('81234567890'), '812-3456-7890');
  assert.equal(formatNomorWa('081234567895'), '812-3456-7895');
  assert.equal(formatNomorWa('+6281234567895'), '812-3456-7895');
  assert.equal(formatNomorWa('6281234567895'), '812-3456-7895');
  assert.equal(formatNomorWa('812-3456-7895'), '812-3456-7895');
});

test('formatWaDisplay: memformat nomor telepon dengan awalan +62 dan pemisah strip', () => {
  assert.equal(formatWaDisplay(''), '—');
  assert.equal(formatWaDisplay(null), '—');
  assert.equal(formatWaDisplay('081234567890'), '+62 812-3456-7890');
  assert.equal(formatWaDisplay('+6281234567890'), '+62 812-3456-7890');
  assert.equal(formatWaDisplay('81234567895'), '+62 812-3456-7895');
});

test('Validasi NIM 12 digit', () => {
  const isValidNim = (val) => /^\d{12}$/.test(String(val || '').trim());

  assert.equal(isValidNim('6554433'), false, 'NIM 7 digit harus ditolak');
  assert.equal(isValidNim('12345678'), false, 'NIM 8 digit harus ditolak');
  assert.equal(isValidNim('0987654321'), false, 'NIM 10 digit harus ditolak');
  assert.equal(isValidNim('254107020001abc'), false, 'NIM dengan huruf harus ditolak');
  assert.equal(isValidNim('254107020001'), true, 'NIM 12 digit numerik harus valid');
  assert.equal(isValidNim('254107020164'), true, 'NIM 12 digit numerik harus valid');
});

test('NIM digit counter formatting helper', () => {
  const formatCounter = (val) => {
    const len = String(val || '').replace(/\D/g, '').slice(0, 12).length;
    return {
      text: `${len}/12`,
      isComplete: len === 12
    };
  };

  assert.deepEqual(formatCounter(''), { text: '0/12', isComplete: false });
  assert.deepEqual(formatCounter('6554433'), { text: '7/12', isComplete: false });
  assert.deepEqual(formatCounter('254107020164'), { text: '12/12', isComplete: true });
});
