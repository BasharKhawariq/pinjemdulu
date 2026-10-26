import test from 'node:test';
import assert from 'node:assert/strict';

import * as store from '../js/state/store.js';
import {
  compressImageToDataUrl,
  MAKS_FOTO_DATA_URI_BYTES,
} from '../js/pages/kelola-inventaris-form.js';

test('store: load, save, remove, reset bekerja pada fallback memoryStore', () => {
  store.reset();

  // Test load with seed
  const seeded = store.load('test-key', { foo: 'bar' });
  assert.deepEqual(seeded, { foo: 'bar' });

  // Test load existing
  const loaded = store.load('test-key');
  assert.deepEqual(loaded, { foo: 'bar' });

  // Test save overwrite
  store.save('test-key', { foo: 'updated' });
  assert.deepEqual(store.load('test-key'), { foo: 'updated' });

  // Test remove
  store.remove('test-key');
  assert.equal(store.load('test-key'), null);
});

test('store: isQuotaExceededError mendeteksi berbagai jenis error kuota penyimpanan browser', () => {
  assert.equal(store.isQuotaExceededError(null), false);
  assert.equal(store.isQuotaExceededError(undefined), false);
  assert.equal(store.isQuotaExceededError(new Error('Generic error')), false);

  const err1 = new Error('Quota exceeded');
  err1.name = 'QuotaExceededError';
  assert.equal(store.isQuotaExceededError(err1), true);

  const err2 = new Error('Firefox quota reached');
  err2.name = 'NS_ERROR_DOM_QUOTA_REACHED';
  assert.equal(store.isQuotaExceededError(err2), true);

  const err3 = new Error('Chrome code 22');
  err3.code = 22;
  assert.equal(store.isQuotaExceededError(err3), true);

  const err4 = new Error('The quota has been exceeded.');
  assert.equal(store.isQuotaExceededError(err4), true);
});

test('foto: MAKS_FOTO_DATA_URI_BYTES bernilai 250 KB dan compressImageToDataUrl fallback aman', async () => {
  assert.equal(MAKS_FOTO_DATA_URI_BYTES, 250 * 1024);

  // Pada Node.js test runner tanpa Canvas/Image bawaan, fallback mengembalikan mock data URL
  const res = await compressImageToDataUrl(null);
  assert.ok(typeof res === 'string');
  assert.ok(res.startsWith('data:image/jpeg;base64,'));
});
