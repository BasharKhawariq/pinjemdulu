import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_USE_MOCK = 'true';

import {
  MAKS_UKURAN_LAMPIRAN,
  validateLampiran,
  filterPengajuanPj,
  namaOrganisasiPemohon,
} from '../js/lib/pengajuan-pj.js';
import { getRequestPjSaya, createRequestPj } from '../js/services/request-pj.js';
import { mockRequestPj } from '../js/data/request-pj.js';
import { mockUsers } from '../js/data/users.js';
import { resolveRoute } from '../js/lib/route-guard.js';
import { STATUS_REQUEST_PJ } from '../js/lib/constants.js';

const maitri = mockUsers[0];

test('validateLampiran: wajib ada berkas', () => {
  assert.match(validateLampiran(null), /wajib/);
  assert.match(validateLampiran({}), /wajib/);
});

test('validateLampiran: hanya JPG, PNG, PDF', () => {
  assert.equal(validateLampiran({ name: 'surat.PDF', size: 1000 }), '');
  assert.equal(validateLampiran({ name: 'surat.jpeg', size: 1000 }), '');
  assert.match(validateLampiran({ name: 'surat.docx', size: 1000 }), /JPG, PNG, atau PDF/);
});

test('validateLampiran: batas 2MB (tepat 2MB lolos, lebih ditolak)', () => {
  assert.equal(validateLampiran({ name: 'a.jpg', size: MAKS_UKURAN_LAMPIRAN }), '');
  assert.match(validateLampiran({ name: 'a.jpg', size: MAKS_UKURAN_LAMPIRAN + 1 }), /2MB/);
  assert.match(validateLampiran({ name: 'a.jpg', size: 0 }), /kosong/);
});

test('filterPengajuanPj: menyaring per NIM dan status', () => {
  const rows = [
    { pemohon: { nim: '1' }, status: 'menunggu' },
    { pemohon: { nim: '1' }, status: 'ditolak' },
    { pemohon: { nim: '2' }, status: 'menunggu' },
  ];
  assert.equal(filterPengajuanPj(rows, { nim: '1', status: 'menunggu' }).length, 1);
  assert.equal(filterPengajuanPj(rows, { nim: '2' }).length, 1);
});

test('namaOrganisasiPemohon: urutan prioritas dan fallback', () => {
  assert.equal(namaOrganisasiPemohon({}, { namaOrganisasi: 'HMS' }), 'HMS');
  assert.equal(namaOrganisasiPemohon({ displayOrganization: 'HMTI' }), 'HMTI');
  assert.equal(namaOrganisasiPemohon({}), '—');
});

test('data mock: peminjam punya pengajuan di setiap tab', async () => {
  const rows = await getRequestPjSaya(maitri.nim);
  for (const status of Object.values(STATUS_REQUEST_PJ)) {
    assert.ok(rows.some((r) => r.status === status), `harus ada status ${status}`);
  }
});

test('createRequestPj: membuat pengajuan Menunggu milik pemohon', async () => {
  const sebelum = mockRequestPj.length;
  const baru = await createRequestPj({ lampiran: { name: 'surat.pdf', size: 2048 } }, maitri);
  assert.equal(baru.status, STATUS_REQUEST_PJ.MENUNGGU);
  assert.equal(baru.pemohon.nim, maitri.nim);
  assert.equal(baru.lampiran.nama, 'surat.pdf');
  assert.equal(mockRequestPj.length, sebelum + 1);
  assert.equal(mockRequestPj[0].id, baru.id);
  mockRequestPj.shift();
});

test('createRequestPj: 422 bila lampiran tidak valid, 401 bila tanpa pemohon', async () => {
  const sebelum = mockRequestPj.length;
  await assert.rejects(
    () => createRequestPj({ lampiran: { name: 'x.exe', size: 10 } }, maitri),
    (err) => err.status === 422 && err.code === 'VALIDASI_GAGAL' && Boolean(err.errors.lampiran),
  );
  await assert.rejects(
    () => createRequestPj({ lampiran: { name: 'x.pdf', size: 10 } }, null),
    (err) => err.status === 401 && err.code === 'UNAUTHORIZED',
  );
  assert.equal(mockRequestPj.length, sebelum);
});

test('route-guard: #/pengajuan-pj dirender untuk pengguna login, login bila belum', () => {
  assert.deepEqual(resolveRoute({ hash: '#/pengajuan-pj', user: maitri }), { type: 'render', route: 'pengajuan-pj' });
  assert.deepEqual(resolveRoute({ hash: '#/pengajuan-pj', user: null }), { type: 'redirect', to: '#/login' });
});
