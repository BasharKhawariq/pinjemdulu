import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeKategoriName,
  filterKategoriOptions,
  shouldShowCreateRow,
  moveHighlight,
} from '../js/lib/kategori-combobox.js';

describe('kategori-combobox pure functions', () => {
  describe('normalizeKategoriName', () => {
    it('merapikan spasi di awal, akhir, dan tengah', () => {
      assert.equal(normalizeKategoriName('  Elektronik   Komputer  '), 'Elektronik Komputer');
      assert.equal(normalizeKategoriName('Audio'), 'Audio');
      assert.equal(normalizeKategoriName('   '), '');
      assert.equal(normalizeKategoriName(null), '');
    });
  });

  describe('filterKategoriOptions', () => {
    const list = [
      { idKategori: '1', namaKategori: 'Elektronik' },
      { idKategori: '2', namaKategori: 'Audio' },
      { idKategori: '3', namaKategori: 'Alat Musik' },
    ];

    it('mengembalikan semua bila query kosong', () => {
      assert.deepEqual(filterKategoriOptions(list, ''), list);
      assert.deepEqual(filterKategoriOptions(list, '   '), list);
    });

    it('mencocokkan substring case-insensitive', () => {
      const res = filterKategoriOptions(list, 'mu');
      assert.equal(res.length, 1);
      assert.equal(res[0].namaKategori, 'Alat Musik');
    });

    it('mengembalikan array kosong bila tidak ada yang cocok', () => {
      const res = filterKategoriOptions(list, 'tidak-ada');
      assert.equal(res.length, 0);
    });
  });

  describe('shouldShowCreateRow', () => {
    const list = [
      { idKategori: '1', namaKategori: 'Elektronik' },
      { idKategori: '2', namaKategori: 'Audio' },
    ];

    it('menampilkan true bila query tidak cocok persis', () => {
      assert.equal(shouldShowCreateRow('Elektronik Baru', list), true);
      assert.equal(shouldShowCreateRow('Fotografi', list), true);
    });

    it('menampilkan false bila query cocok persis (case-insensitive)', () => {
      assert.equal(shouldShowCreateRow('Elektronik', list), false);
      assert.equal(shouldShowCreateRow('  elektronik  ', list), false);
      assert.equal(shouldShowCreateRow('AUDIO', list), false);
    });

    it('menampilkan false bila query kosong', () => {
      assert.equal(shouldShowCreateRow('', list), false);
      assert.equal(shouldShowCreateRow('   ', list), false);
    });
  });

  describe('moveHighlight', () => {
    it('memindahkan ke indeks berikutnya dan wrap-around', () => {
      assert.equal(moveHighlight(0, 3, 'next'), 1);
      assert.equal(moveHighlight(1, 3, 'next'), 2);
      assert.equal(moveHighlight(2, 3, 'next'), 0);
    });

    it('memindahkan ke indeks sebelumnya dan wrap-around', () => {
      assert.equal(moveHighlight(0, 3, 'prev'), 2);
      assert.equal(moveHighlight(2, 3, 'prev'), 1);
      assert.equal(moveHighlight(1, 3, 'prev'), 0);
    });

    it('mengatasi -1 (belum ada sorotan)', () => {
      assert.equal(moveHighlight(-1, 3, 'next'), 0);
      assert.equal(moveHighlight(-1, 3, 'prev'), 2);
    });
  });
});
