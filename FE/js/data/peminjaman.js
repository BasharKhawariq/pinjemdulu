import { STATUS_PEMINJAMAN } from '../lib/constants.js';
import { mockInventaris } from './inventaris.js';
import { mockUsers } from './users.js';

const peminjam = mockUsers[0];

/** Geser tanggal ISO (YYYY-MM-DD) sebanyak `hari` hari. */
function geserTanggal(iso, hari) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

/**
 * Bangun satu data peminjaman mock. Nama barang dan organisasi pada `inventaris`
 * adalah salinan (snapshot) yang tampil di halaman Pengajuan Saya; `indeksInventaris`
 * hanya menunjuk barang asli di mockInventaris.
 */
function buatPeminjaman({
  nomor,
  indeksInventaris,
  namaBarang,
  namaOrganisasi,
  pengajuan,
  mulai,
  selesai,
  status,
  keperluan,
  alasanPenolakan = null,
  kondisiSebelum = null,
  deskripsiSebelum = null,
}) {
  const barang = mockInventaris[indeksInventaris];
  return {
    id: `pinjam-${nomor}`,
    idPeminjaman: nomor,
    pengguna: {
      nim: peminjam.nim,
      nama: peminjam.nama,
    },
    peminjam,
    inventaris: {
      idInventaris: barang.idInventaris,
      namaBarang,
      namaOrganisasi,
      thumbnail: barang.thumbnail,
    },
    barang,
    tanggalPengajuan: `${pengajuan}T08:00:00`,
    startDate: mulai,
    endDate: selesai,
    mulai,
    selesai,
    bufferStartDate: geserTanggal(mulai, -1),
    bufferEndDate: geserTanggal(selesai, 1),
    tanggalPengembalian: null,
    status,
    alasanPenolakan,
    keperluan,
    jumlahPinjam: 1,
    kondisiSebelum,
    deskripsiSebelum,
    kondisiSesudah: null,
    deskripsiSesudah: null,
    sanksi: null,
  };
}

/*
 * Data contoh Pengajuan Saya > Peminjaman, mengikuti desain Figma:
 *   Diajukan  : pinjam-1, 4, 5, 6      Disetujui : pinjam-7, 8
 *   Dipinjam  : pinjam-2, 9            Ditolak   : pinjam-10
 * pinjam-3 (selesai) tidak tampil di halaman ini; urutannya (indeks 2) dipakai data/pengembalian.js.
 */
const INITIAL_MOCK_PEMINJAMAN = [
  buatPeminjaman({
    nomor: 1, indeksInventaris: 0, namaBarang: 'Proyektor Epson', namaOrganisasi: 'HMTI',
    pengajuan: '2026-10-17', mulai: '2026-10-20', selesai: '2026-10-25',
    status: STATUS_PEMINJAMAN.DIAJUKAN, keperluan: 'Seminar BEM',
  }),
  buatPeminjaman({
    nomor: 2, indeksInventaris: 4, namaBarang: 'Camera Canon 700D', namaOrganisasi: 'HMS',
    pengajuan: '2026-10-17', mulai: '2026-10-20', selesai: '2026-10-25',
    status: STATUS_PEMINJAMAN.DIPINJAM, keperluan: 'Dokumentasi acara kampus',
    kondisiSebelum: 'baik', deskripsiSebelum: 'Lensa bersih, baterai terpasang',
  }),
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
  buatPeminjaman({
    nomor: 4, indeksInventaris: 2, namaBarang: 'Kabel HDMI', namaOrganisasi: 'HME',
    pengajuan: '2026-08-12', mulai: '2026-08-15', selesai: '2026-08-20',
    status: STATUS_PEMINJAMAN.DIAJUKAN, keperluan: 'Workshop HME',
  }),
  buatPeminjaman({
    nomor: 5, indeksInventaris: 4, namaBarang: 'Camera Canon 700D', namaOrganisasi: 'HMS',
    pengajuan: '2026-07-04', mulai: '2026-07-07', selesai: '2026-07-12',
    status: STATUS_PEMINJAMAN.DIAJUKAN, keperluan: 'Dokumentasi kegiatan HMS',
  }),
  buatPeminjaman({
    nomor: 6, indeksInventaris: 1, namaBarang: 'Speaker Portable', namaOrganisasi: 'HIMANIA',
    pengajuan: '2026-04-23', mulai: '2026-04-26', selesai: '2026-04-30',
    status: STATUS_PEMINJAMAN.DIAJUKAN, keperluan: 'Pentas seni HIMANIA',
  }),
  buatPeminjaman({
    nomor: 7, indeksInventaris: 0, namaBarang: 'Proyektor Epson', namaOrganisasi: 'HMTI',
    pengajuan: '2026-10-17', mulai: '2026-10-20', selesai: '2026-10-25',
    status: STATUS_PEMINJAMAN.DISETUJUI, keperluan: 'Seminar BEM',
  }),
  buatPeminjaman({
    nomor: 8, indeksInventaris: 2, namaBarang: 'Kabel HDMI', namaOrganisasi: 'HME',
    pengajuan: '2026-08-12', mulai: '2026-08-15', selesai: '2026-08-20',
    status: STATUS_PEMINJAMAN.DISETUJUI, keperluan: 'Workshop HME',
  }),
  buatPeminjaman({
    nomor: 9, indeksInventaris: 1, namaBarang: 'Speaker Portable', namaOrganisasi: 'HIMANIA',
    pengajuan: '2026-08-12', mulai: '2026-08-15', selesai: '2026-08-20',
    status: STATUS_PEMINJAMAN.DIPINJAM, keperluan: 'Pentas seni HIMANIA',
    kondisiSebelum: 'baik', deskripsiSebelum: 'Speaker berfungsi normal',
  }),
  buatPeminjaman({
    nomor: 10, indeksInventaris: 0, namaBarang: 'Proyektor Epson', namaOrganisasi: 'HMTI',
    pengajuan: '2026-10-17', mulai: '2026-10-20', selesai: '2026-10-25',
    status: STATUS_PEMINJAMAN.DITOLAK, keperluan: 'Seminar BEM',
    alasanPenolakan: 'Peminjaman tidak dapat diproses karena alasan operasional',
  }),
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