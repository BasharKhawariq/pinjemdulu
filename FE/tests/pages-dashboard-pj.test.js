import test from 'node:test';
import assert from 'node:assert/strict';

import * as DashboardPjPage from '../js/pages/dashboard-pj.js';
import { ROLES } from '../js/lib/constants.js';

class MockElement {
  constructor() {
    this.innerHTML = '';
    this.listeners = {};
  }
  addEventListener(evt, fn) {
    this.listeners[evt] = fn;
  }
  removeEventListener(evt, fn) {
    delete this.listeners[evt];
  }
  querySelector() {
    return null;
  }
  async triggerClick(dataset = {}) {
    const event = {
      target: {
        closest: (s) => (s === '[data-action]' ? { dataset } : null),
        matches: () => false,
      },
    };
    if (this.listeners.click) {
      await this.listeners.click(event);
    }
  }
}

test('pages-dashboard-pj: render merender sapaan PJ, kartu ringkasan, tabel Pengelolaan, dan tabel Pengajuan Saya', () => {
  const user = { nama: 'PJ HIMANIA', nim: '12345678', role: ROLES.PENANGGUNG_JAWAB };
  const html = DashboardPjPage.render({ user });
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Halo, PJ HIMANIA'));
  assert.ok(html.includes('Pengelolaan'));
  assert.ok(html.includes('Kelola Peminjaman'));
  assert.ok(html.includes('Kelola Pengembalian'));
  assert.ok(html.includes('Pengajuan Saya'));
  assert.ok(html.includes('data-action="switch-management-tab"'));
  assert.ok(html.includes('data-action="switch-tab"'));
  assert.ok(html.includes('data-card-list'), 'Dashboard PJ menampilkan daftar card untuk mobile');
  assert.ok(html.includes('hidden w-full overflow-x-auto md:block'), 'Tabel desktop tetap tersedia');
});

test('pages-dashboard-pj: tab beralih dengan baik antara Kelola Peminjaman dan Kelola Pengembalian', async () => {
  const root = new MockElement();
  const user = { nama: 'PJ HIMANIA', nim: '12345678', role: ROLES.PENANGGUNG_JAWAB };
  await DashboardPjPage.mount(root, { user });

  // Peminjaman awal
  assert.ok(root.innerHTML.includes('data-tab="peminjaman" aria-selected="true"'));

  // Beralih ke Pengembalian
  await root.triggerClick({ action: 'switch-management-tab', tab: 'pengembalian' });
  assert.ok(root.innerHTML.includes('data-tab="pengembalian" aria-selected="true"'));
  assert.ok(root.innerHTML.includes('Tanggal Pengembalian'));

  // Beralih kembali ke Peminjaman
  await root.triggerClick({ action: 'switch-management-tab', tab: 'peminjaman' });
  assert.ok(root.innerHTML.includes('data-tab="peminjaman" aria-selected="true"'));

  DashboardPjPage.unmount(root);
});

test('pages-dashboard-pj: tab beralih dengan baik pada tabel Pengajuan Saya (Peminjaman ke Pengembalian)', async () => {
  const root = new MockElement();
  const user = { nama: 'PJ HIMANIA', nim: '12345678', role: ROLES.PENANGGUNG_JAWAB };
  await DashboardPjPage.mount(root, { user });

  // Peminjaman awal
  assert.ok(root.innerHTML.includes('data-action="switch-tab"\n              data-tab="peminjaman"\n              aria-selected="true"'));

  // Beralih ke Pengembalian
  await root.triggerClick({ action: 'switch-tab', tab: 'pengembalian' });
  assert.ok(root.innerHTML.includes('data-action="switch-tab"\n              data-tab="pengembalian"\n              aria-selected="true"'));

  // Beralih kembali ke Peminjaman
  await root.triggerClick({ action: 'switch-tab', tab: 'peminjaman' });
  assert.ok(root.innerHTML.includes('data-action="switch-tab"\n              data-tab="peminjaman"\n              aria-selected="true"'));

  DashboardPjPage.unmount(root);
});
