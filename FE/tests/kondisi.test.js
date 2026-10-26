import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeKondisi } from '../js/lib/kondisi.js';

test('normalizeKondisi memakai model dua nilai', () => {
  assert.equal(normalizeKondisi('baik'), 'baik');
  assert.equal(normalizeKondisi('rusak'), 'rusak');
  assert.equal(normalizeKondisi('rusak_ringan'), 'rusak');
  assert.equal(normalizeKondisi('rusak_berat'), 'rusak');
  assert.equal(normalizeKondisi('  RUSAK  '), 'rusak');
  assert.equal(normalizeKondisi(''), null);
  assert.equal(normalizeKondisi('tidak_dikenal'), null);
  assert.equal(normalizeKondisi(null), null);
});
