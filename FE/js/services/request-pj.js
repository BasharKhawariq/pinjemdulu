import { mockRequestPj } from '../data/request-pj.js';
import { STATUS_REQUEST_PJ } from '../lib/constants.js';
import { delay } from './client.js';

export async function getRequestPj() {
  await delay(50);
  return [...mockRequestPj];
}

export async function updateMockRequestPjStatus(id, status, alasanPenolakan = null) {
  await delay(50);
  if (![STATUS_REQUEST_PJ.MENUNGGU, STATUS_REQUEST_PJ.DISETUJUI, STATUS_REQUEST_PJ.DITOLAK].includes(status)) {
    throw new Error('Status pengajuan PJ tidak valid.');
  }
  const row = mockRequestPj.find((item) => String(item.id) === String(id));
  if (!row) throw new Error('Pengajuan PJ tidak ditemukan.');
  row.status = status;
  if (status === STATUS_REQUEST_PJ.DITOLAK) row.alasanPenolakan = alasanPenolakan || 'Pengajuan ditolak oleh pengelola.';
  else row.alasanPenolakan = null;
  return { ...row };
}
