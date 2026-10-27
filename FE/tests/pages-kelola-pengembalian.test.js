import test from 'node:test';
import assert from 'node:assert/strict';

import * as KelolaPengembalianPage from '../js/pages/kelola-pengembalian.js';

test('pages-kelola-pengembalian: render merender judul, search input, filter button, tabel, dan filter modal', () => {
  const html = KelolaPengembalianPage.render();
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Kelola Pengembalian'));
  assert.ok(html.includes('search-pengembalian'));
  assert.ok(html.includes('btn-filter-pengembalian'));
  assert.ok(html.includes('dialog-filter-pengembalian'));
  assert.ok(html.includes('Filter Kelola Pengembalian'));
  assert.ok(html.includes('OKI Peminjam'));
  assert.ok(html.includes('Tanggal Peminjaman'));
  assert.ok(html.includes('Status'));
  assert.ok(html.includes('Pilih OKI'));
  assert.ok(html.includes('Pilih Tanggal'));
  assert.ok(html.includes('Pilih status'));
  assert.ok(html.includes('Menunggu Konfirmasi'));
  assert.ok(html.includes('Terlambat'));
  assert.ok(html.includes('Dikembalikan'));
  assert.ok(html.includes('Ditolak'));
  assert.ok(html.includes('Reset'));
  assert.ok(html.includes('Terapkan'));
});

test('pages-kelola-pengembalian: alur modal detail, form persetujuan, dan form penolakan', async () => {
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
    querySelector(sel) {
      if (sel === 'tbody') return { innerHTML: '' };
      if (sel === '#form-tanggal-pengembalian') return { value: '2026-10-25' };
      if (sel === '#form-sanksi') return { value: 'Terlambat 1 hari' };
      if (sel === '#form-alasan-penolakan') return { value: 'Barang tidak sesuai' };
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

  const root = new MockElement();
  await KelolaPengembalianPage.mount(root);
  assert.ok(root.innerHTML.includes('Kelola Pengembalian'));

  // Test 1: Buka Detail Modal
  await root.triggerClick({ action: 'detail', id: 'pinjam-11' });
  assert.ok(root.innerHTML.includes('Detail Pengembalian'));
  assert.ok(root.innerHTML.includes('Nama Peminjam'));
  assert.ok(root.innerHTML.includes('NIM'));
  assert.ok(root.innerHTML.includes('Barang Dipinjam'));
  assert.ok(root.innerHTML.includes('Jumlah Unit'));
  assert.ok(root.innerHTML.includes('Tanggal Mulai'));
  assert.ok(root.innerHTML.includes('Tanggal Selesai'));
  assert.ok(root.innerHTML.includes('Tanggal Pengembalian'));
  assert.ok(root.innerHTML.includes('Keperluan Peminjaman Barang'));
  assert.ok(root.innerHTML.includes('Tutup'));

  // Tutup Modal Detail
  await root.triggerClick({ action: 'close-modal' });
  assert.equal(root.innerHTML.includes('Detail Pengembalian'), false);

  // Test 2: Alur Persetujuan (Approval)
  await root.triggerClick({ action: 'confirm', id: 'pinjam-11' });
  assert.ok(root.innerHTML.includes('Setujui pengajuan pengembalian?'));
  assert.ok(root.innerHTML.includes('Jika setuju, anda akan diarahkan ke form konfirmasi pengembalian'));

  // Lanjut ke Form Pengembalian
  await root.triggerClick({ action: 'open-form-approve' });
  assert.ok(root.innerHTML.includes('Form Pengembalian'));
  assert.ok(root.innerHTML.includes('Nama Peminjam'));
  assert.ok(root.innerHTML.includes('OKI Peminjam'));
  assert.ok(root.innerHTML.includes('Tanggal Pengembalian'));
  assert.ok(root.innerHTML.includes('Sanksi'));

  // Batal form -> Batal Kirim Form ?
  await root.triggerClick({ action: 'prompt-cancel-form' });
  assert.ok(root.innerHTML.includes('Batal Kirim Form ?'));
  assert.ok(root.innerHTML.includes('Apakah anda yakin ingin batal menyetujui pengembalian ?'));

  // Kembali ke form
  await root.triggerClick({ action: 'back-to-form-approve' });
  assert.ok(root.innerHTML.includes('Form Pengembalian'));

  // Kirim -> Kirim Form Pengembalian ?
  await root.triggerClick({ action: 'prompt-submit-form' });
  assert.ok(root.innerHTML.includes('Kirim Form Pengembalian ?'));
  assert.ok(root.innerHTML.includes('Periksa kembali data pengajuan yang akan anda kirim'));

  // Eksekusi submit -> Sukses
  await root.triggerClick({ action: 'execute-approve' });
  assert.ok(root.innerHTML.includes('Pengembalian Berhasil!'));

  // Tutup sukses dialog
  await root.triggerClick({ action: 'close-modal' });

  // Test 3: Alur Penolakan (Rejection)
  await root.triggerClick({ action: 'late', id: 'pinjam-12' });
  assert.ok(root.innerHTML.includes('Tolak pengajuan pengembalian?'));
  assert.ok(root.innerHTML.includes('Periksa kembali data pengajuan yang akan anda tolak'));

  // Lanjut ke modal form alasan penolakan
  await root.triggerClick({ action: 'open-form-reject' });
  assert.ok(root.innerHTML.includes('Pengembalian Ditolak'));
  assert.ok(root.innerHTML.includes('Alasan Penolakan'));
  assert.ok(root.innerHTML.includes('Masukkan alasan penolakan'));

  // Eksekusi tolak -> Sukses tolak
  await root.triggerClick({ action: 'execute-reject' });
  assert.ok(root.innerHTML.includes('Pengembalian Berhasil Ditolak!'));
  assert.ok(root.innerHTML.includes('Persetujuan pengembalian dan data berhasil ditolak.'));

  // Tutup dialog
  await root.triggerClick({ action: 'close-modal' });

  KelolaPengembalianPage.unmount();
});
