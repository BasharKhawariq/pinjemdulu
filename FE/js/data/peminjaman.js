import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { mockInventaris } from './inventaris.js';
import { mockUsers } from './users.js';

const peminjam = mockUsers[0];

const INITIAL_MOCK_PEMINJAMAN = [
  {
    id: 'pinjam-1',
    idPeminjaman: 1,
    pengguna: {
      nim: peminjam.nim,
      nama: peminjam.nama,
    },
    peminjam,
    inventaris: {
      idInventaris: mockInventaris[0].idInventaris,
      namaBarang: mockInventaris[0].namaBarang,
      namaOrganisasi: mockInventaris[0].namaOrganisasi,
      thumbnail: mockInventaris[0].thumbnail,
    },
    barang: mockInventaris[0],
    tanggalPengajuan: '2026-10-01T08:00:00',
    startDate: '2026-10-12',
    endDate: '2026-10-14',
    mulai: '2026-10-12',
    selesai: '2026-10-14',
    bufferStartDate: '2026-10-11',
    bufferEndDate: '2026-10-15',
    tanggalPengembalian: null,
    status: STATUS_PEMINJAMAN.DIAJUKAN,
    alasanPenolakan: null,
    keperluan: 'Rapat kerja BEM FT',
    jumlahPinjam: 1,
    kondisiSebelum: null,
    deskripsiSebelum: null,
    kondisiSesudah: null,
    deskripsiSesudah: null,
    sanksi: null,
  },
  {
    id: 'pinjam-2',
    idPeminjaman: 2,
    pengguna: {
      nim: peminjam.nim,
      nama: peminjam.nama,
    },
    peminjam,
    inventaris: {
      idInventaris: mockInventaris[3].idInventaris,
      namaBarang: mockInventaris[3].namaBarang,
      namaOrganisasi: mockInventaris[3].namaOrganisasi,
      thumbnail: mockInventaris[3].thumbnail,
    },
    barang: mockInventaris[3],
    tanggalPengajuan: '2026-10-02T09:00:00',
    startDate: '2026-10-06',
    endDate: '2026-10-09',
    mulai: '2026-10-06',
    selesai: '2026-10-09',
    bufferStartDate: '2026-10-05',
    bufferEndDate: '2026-10-10',
    tanggalPengembalian: null,
    status: STATUS_PEMINJAMAN.DIPINJAM,
    alasanPenolakan: null,
    keperluan: 'Dokumentasi acara kampus',
    jumlahPinjam: 1,
    kondisiSebelum: 'baik',
    deskripsiSebelum: 'Lensa bersih, baterai terpasang',
    kondisiSesudah: null,
    deskripsiSesudah: null,
    sanksi: null,
  },
  {
    id: 'pinjam-3',
    idPeminjaman: 3,
    pengguna: {
      nim: peminjam.nim,
      nama: peminjam.nama,
    },
    peminjam,
    inventaris: {
      idInventaris: mockInventaris[1].idInventaris,
      namaBarang: mockInventaris[1].namaBarang,
      namaOrganisasi: mockInventaris[1].namaOrganisasi,
      thumbnail: mockInventaris[1].thumbnail,
    },
    barang: mockInventaris[1],
    tanggalPengajuan: '2026-09-15T10:00:00',
    startDate: '2026-09-20',
    endDate: '2026-09-22',
    mulai: '2026-09-20',
    selesai: '2026-09-22',
    bufferStartDate: '2026-09-19',
    bufferEndDate: '2026-09-23',
    tanggalPengembalian: '2026-09-22',
    status: STATUS_PEMINJAMAN.DIKEMBALIKAN,
    alasanPenolakan: null,
    keperluan: 'Pelatihan internal',
    jumlahPinjam: 1,
    kondisiSebelum: 'baik',
    deskripsiSebelum: 'Kabel lengkap',
    kondisiSesudah: 'baik',
    deskripsiSesudah: 'Kembali lengkap',
    sanksi: null,
  },
];

const _peminjamanStore = [];

export function resetMockPeminjaman() {
  _peminjamanStore.length = 0;
  for (const item of INITIAL_MOCK_PEMINJAMAN) {
    _peminjamanStore.push({ ...item });
  }
}

// Inisialisasi awal
resetMockPeminjaman();

export const mockPeminjaman = _peminjamanStore;

export function addMockPeminjaman(peminjaman) {
  _peminjamanStore.unshift(peminjaman);
}

export function getNextPeminjamanId() {
  const maxId = _peminjamanStore.reduce((acc, curr) => {
    const num = Number(curr.idPeminjaman);
    return Number.isFinite(num) && num > acc ? num : acc;
  }, 0);
  return maxId + 1;
}
