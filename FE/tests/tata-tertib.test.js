import test from 'node:test';
import assert from 'node:assert/strict';

import { TATA_TERTIB } from '../js/data/tata-tertib.js';
import { render } from '../js/pages/tata-tertib.js';
import { resolveRoute } from '../js/lib/route-guard.js';
import { getPageTitle } from '../js/lib/navigation.js';

test('tata tertib: bagian A-D berurutan dan setiap bagian punya butir', () => {
  assert.deepEqual(TATA_TERTIB.bagian.map((b) => b.judul[0]), ['A', 'B', 'C', 'D']);
  for (const b of TATA_TERTIB.bagian) assert.ok(b.butir.length > 0, b.judul);
  assert.equal(TATA_TERTIB.bagian[0].butir.length, 6);
  assert.equal(TATA_TERTIB.bagian[1].butir.length, 5);
  assert.equal(TATA_TERTIB.bagian[2].butir.length, 5);
});

test('tata tertib: render memuat judul, pengantar, dan semua butir', () => {
  const out = render();
  assert.match(out, /Pahami Aturan Sebelum Meminjam/);
  assert.match(out, /Tata Tertib Peminjaman dan Pengembalian/);
  const jumlahButir = TATA_TERTIB.bagian.reduce((n, b) => n + b.butir.length, 0);
  assert.equal((out.match(/<li>/g) || []).length, jumlahButir);
  assert.equal((out.match(/<ol /g) || []).length, TATA_TERTIB.bagian.length);
});

test('tata tertib: rute dirender untuk pengguna login, judul header sesuai', () => {
  const user = { nim: '1', role: 'peminjam' };
  assert.deepEqual(resolveRoute({ hash: '#/tata-tertib', user }), { type: 'render', route: 'tata-tertib' });
  assert.deepEqual(resolveRoute({ hash: '#/tata-tertib', user: null }), { type: 'redirect', to: '#/login' });
  assert.equal(getPageTitle('#/tata-tertib').title, 'Tata Tertib');
});
