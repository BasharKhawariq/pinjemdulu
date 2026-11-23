import test from 'node:test';
import assert from 'node:assert/strict';

import { addMockUser, updateMockUser } from '../js/services/users.js';

test('addMockUser menolak nomor WhatsApp kosong atau terlalu pendek', async () => {
  await assert.rejects(
    addMockUser({ nim: '999000000001', nama: 'Uji Tanpa WA' }),
    /No WhatsApp wajib diisi/
  );
  await assert.rejects(
    addMockUser({ nim: '999000000002', nama: 'Uji WA Pendek', noWhatsapp: '08123' }),
    /minimal 10 angka/
  );
});

test('updateMockUser menolak pengosongan nomor WhatsApp', async () => {
  await assert.rejects(
    updateMockUser('999000000001', { noWhatsapp: '  ' }),
    /No WhatsApp wajib diisi/
  );
});
