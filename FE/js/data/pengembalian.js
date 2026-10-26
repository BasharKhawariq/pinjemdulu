import { mockPeminjaman } from './peminjaman.js';
import { KONDISI_BARANG } from '../lib/constants.js';

export const mockPengembalian = [
  {
    id: 'kembali-1',
    peminjaman: mockPeminjaman[2],
    tanggal: '2026-09-22',
    kondisi: KONDISI_BARANG.BAIK,
    catatan: 'Dikembalikan lengkap.',
  },
];
