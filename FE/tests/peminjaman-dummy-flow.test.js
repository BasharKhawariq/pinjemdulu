import test from 'node:test';
import assert from 'node:assert/strict';

import { INITIAL_MOCK_PEMINJAMAN } from '../js/data/peminjaman.js';
import { getPeminjaman } from '../js/services/peminjaman.js';
import { ajukanPengembalian } from '../js/services/pengembalian.js';
import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';
import { canAjukanPengembalian, getRowActions } from '../js/lib/peminjaman-aksi.js';
import { renderStatusChip } from '../js/ui/status-chip.js';
import * as KelolaPengembalianPage from '../js/pages/kelola-pengembalian.js';

test('dummy data: mencakup semua status peminjaman dan pengembalian', () => {
  const statuses = INITIAL_MOCK_PEMINJAMAN.map((p) => p.status);
  
  // Status peminjaman inti
  assert.ok(statuses.includes(STATUS_PEMINJAMAN.DIAJUKAN), 'memiliki status diajukan/menunggu');
  assert.ok(statuses.includes(STATUS_PEMINJAMAN.DISETUJUI), 'memiliki status disetujui');
  assert.ok(statuses.includes(STATUS_PEMINJAMAN.DIPINJAM), 'memiliki status dipinjam');
  assert.ok(statuses.includes(STATUS_PEMINJAMAN.DITOLAK), 'memiliki status ditolak');

  // Status pengembalian
  assert.ok(
    statuses.includes(STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN) || statuses.includes('menunggu_pengembalian'),
    'memiliki status menunggu pengembalian'
  );
  assert.ok(statuses.includes(STATUS_PEMINJAMAN.DIKEMBALIKAN), 'memiliki status dikembalikan');
  assert.ok(statuses.includes(STATUS_PEMINJAMAN.TERLAMBAT), 'memiliki status terlambat');
});

test('dummy data: barang, tanggal, dan jumlah realistis', () => {
  for (const item of INITIAL_MOCK_PEMINJAMAN) {
    assert.ok(item.id, 'memiliki id');
    assert.ok(item.inventaris?.namaBarang, 'memiliki nama barang');
    assert.ok(item.inventaris?.namaOrganisasi, 'memiliki nama organisasi barang');
    assert.ok(item.startDate, 'memiliki tanggal mulai');
    assert.ok(item.endDate, 'memiliki tanggal selesai');
    assert.ok(item.jumlahPinjam >= 1, 'memiliki jumlah unit pinjam minimal 1');
    assert.ok(item.pengguna?.nama, 'memiliki nama peminjam');
    assert.ok(item.pengguna?.nim, 'memiliki NIM peminjam');
    assert.ok(item.keperluan, 'memiliki keperluan peminjaman');
  }
});

test('tombol aksi: hanya status dipinjam yang memiliki aksi kembalikan', () => {
  assert.deepEqual(getRowActions(STATUS_PEMINJAMAN.DIPINJAM), ['kembali', 'detail']);
  assert.equal(canAjukanPengembalian(STATUS_PEMINJAMAN.DIPINJAM), true);

  // Status lain hanya detail
  const nonReturnStatuses = [
    STATUS_PEMINJAMAN.DIAJUKAN,
    STATUS_PEMINJAMAN.DISETUJUI,
    STATUS_PEMINJAMAN.DITOLAK,
    STATUS_PEMINJAMAN.DIKEMBALIKAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
    STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
  ];

  for (const s of nonReturnStatuses) {
    assert.deepEqual(getRowActions(s), ['detail'], `status ${s} hanya punya aksi detail`);
    assert.equal(canAjukanPengembalian(s), false, `status ${s} tidak boleh ajukan pengembalian`);
  }
});

test('alur pengembalian: ajukanPengembalian pada item dipinjam memperbarui status', async () => {
  const all = await getPeminjaman();
  const dipinjamItem = all.find((r) => r.status === STATUS_PEMINJAMAN.DIPINJAM);
  assert.ok(dipinjamItem, 'ada item berstatus dipinjam');

  const res = await ajukanPengembalian(dipinjamItem.id);
  assert.ok(res, 'hasil ajukan pengembalian sukses');
  assert.ok(
    res.status === STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN || res.status === 'menunggu_pengembalian',
    'status berubah menjadi menunggu konfirmasi pengembalian'
  );
  assert.ok(res.tanggalPengembalian, 'tanggal pengembalian tercatat');
});

test('status chip: renderStatusChip merender chip dengan kelas dan label yang sesuai', () => {
  const chipDiajukan = renderStatusChip(STATUS_PEMINJAMAN.DIAJUKAN);
  assert.ok(chipDiajukan.includes('bg-blue-100'));
  assert.ok(chipDiajukan.includes('text-blue-700'));
  assert.ok(chipDiajukan.includes('Diajukan'));

  const chipDisetujui = renderStatusChip(STATUS_PEMINJAMAN.DISETUJUI);
  assert.ok(chipDisetujui.includes('bg-emerald-100'));
  assert.ok(chipDisetujui.includes('text-emerald-700'));
  assert.ok(chipDisetujui.includes('Disetujui'));

  const chipDipinjam = renderStatusChip(STATUS_PEMINJAMAN.DIPINJAM);
  assert.ok(chipDipinjam.includes('bg-purple-100'));
  assert.ok(chipDipinjam.includes('text-purple-700'));
  assert.ok(chipDipinjam.includes('Dipinjam'));

  const chipDitolak = renderStatusChip(STATUS_PEMINJAMAN.DITOLAK);
  assert.ok(chipDitolak.includes('bg-rose-100'));
  assert.ok(chipDitolak.includes('text-rose-800'));
  assert.ok(chipDitolak.includes('Ditolak'));
});

test('kelola-pengembalian: Form Pengembalian dirender sebagai halaman penuh w-full bukan dialog modal', async () => {
  class MockRoot {
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
    querySelector(sel) {
      if (sel === 'tbody') return { innerHTML: '' };
      if (sel === '#form-tanggal-pengembalian') return { value: '2026-10-28' };
      if (sel === '#form-sanksi') return { value: '' };
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

  const root = new MockRoot();
  await KelolaPengembalianPage.mount(root);

  // Buka konfirmasi approve -> buka form pengembalian
  await root.triggerClick({ action: 'confirm', id: 'pinjam-11' });
  await root.triggerClick({ action: 'open-form-approve' });

  // Harus merender tampilan halaman form dengan w-full
  assert.ok(root.innerHTML.includes('Form Pengembalian'));
  assert.ok(root.innerHTML.includes('w-full'), 'menggunakan w-full pada container');
  assert.equal(
    root.innerHTML.includes('<section role="dialog" aria-modal="true" class="w-full max-w-2xl my-8 rounded-2xl bg-white'),
    false,
    'bukan modal dialog role="dialog"'
  );

  KelolaPengembalianPage.unmount();
});
