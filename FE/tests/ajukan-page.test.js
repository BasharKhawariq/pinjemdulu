import test from 'node:test';
import assert from 'node:assert/strict';
import { getAjukanGate, hitungRingkasan, getMaxJumlah } from '../js/lib/ajukan-page.js';
import { ROLES } from '../js/lib/constants.js';

test('getAjukanGate memblokir barang tidak ada atau rusak', () => {
  assert.deepEqual(getAjukanGate(null, null), { canAjukan: false, reason: 'Barang tidak ditemukan.' });
  
  const rusak = { kondisi: 'rusak' };
  assert.deepEqual(getAjukanGate(null, rusak), { canAjukan: false, reason: 'Barang dalam kondisi rusak tidak dapat dipinjam.' });
});

test('getAjukanGate memblokir PJ meminjam barang OKI sendiri', () => {
  const user = { role: ROLES.PENANGGUNG_JAWAB, idOrganisasi: 'oki-1' };
  const item = { idOrganisasi: 'oki-1', kondisi: 'baik' };
  
  assert.deepEqual(getAjukanGate(user, item), { canAjukan: false, reason: 'Barang milik OKI Anda tidak dapat dipinjam.' });
  
  const itemLain = { idOrganisasi: 'oki-2', kondisi: 'baik' };
  assert.deepEqual(getAjukanGate(user, itemLain), { canAjukan: true });
});

test('hitungRingkasan menghitung lama pinjam dan buffer dengan benar', () => {
  const res = hitungRingkasan('2026-10-10', '2026-10-12');
  assert.equal(res.lama, 3);
  assert.equal(res.mulai, '10 Okt 2026');
  assert.equal(res.selesai, '12 Okt 2026');
  assert.equal(res.persiapan, '09 Okt 2026');
  assert.equal(res.pengecekan, '13 Okt 2026');
});

test('getMaxJumlah mengembalikan totalBarang jika tanggal belum dipilih', () => {
  assert.equal(getMaxJumlah(null, null, { totalBarang: 5 }), 5);
});

test('getMaxJumlah menghitung sisa kuota jika tanggal dipilih', () => {
  const ctx = {
    totalBarang: 5,
    today: '2026-10-01',
    bookings: [
      { mulai: '2026-10-10', selesai: '2026-10-12', jumlahPinjam: 3, status: 'disetujui' }
    ]
  };
  // Rentang 10-12 bertabrakan dengan booking (3 unit). Sisa 5-3 = 2.
  assert.equal(getMaxJumlah('2026-10-10', '2026-10-12', ctx), 2);
});
