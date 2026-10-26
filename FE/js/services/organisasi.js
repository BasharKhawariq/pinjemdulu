/**
 * Service ORGANISASI dengan persistensi store.js.
 */

import { mockOrganisasi } from '../data/organisasi.js';
import * as store from '../state/store.js';
import { delay } from './client.js';

const ORGANISASI_STORE_KEY = 'data:organisasi';

export async function getOrganisasi() {
  await delay(80);
  const list = store.load(ORGANISASI_STORE_KEY, () => mockOrganisasi.map((o) => ({ ...o })));
  return list.map((o) => ({
    idOrganisasi: o.idOrganisasi,
    namaOrganisasi: o.namaOrganisasi,
    icon: o.icon ?? null,
  }));
}
