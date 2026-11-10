/**
 * Service ORGANISASI dengan persistensi store.js dan integrasi API Backend.
 */

import { mockOrganisasi } from '../data/organisasi.js';
import * as store from '../state/store.js';
import { delay, isMockEnabled, apiFetch } from './client.js';

const ORGANISASI_STORE_KEY = 'data:organisasi';

export async function getOrganisasi() {
  if (!isMockEnabled()) {
    const res = await apiFetch('/api/organisasi');
    const list = Array.isArray(res) ? res : res?.data || [];
    return list.map((o) => ({
      idOrganisasi: o.idOrganisasi,
      namaOrganisasi: o.namaOrganisasi,
      singkatan: o.singkatan || o.namaOrganisasi,
      logoUrl: o.logoUrl || null,
      icon: o.icon ?? null,
    }));
  }

  await delay(80);
  const list = store.load(ORGANISASI_STORE_KEY, () => mockOrganisasi.map((o) => ({ ...o })));
  return list.map((o) => ({
    idOrganisasi: o.idOrganisasi,
    namaOrganisasi: o.namaOrganisasi,
    icon: o.icon ?? null,
  }));
}
