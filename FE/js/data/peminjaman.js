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
  kondisiSesudah = null,
  deskripsiSesudah = null,
  tanggalPengembalian = null,
  sanksi = null,
  waktuTerlambat = null,
  diprosesOleh = null,
  peminjamCustom = null,
}) {
  const barang = mockInventaris[indeksInventaris];
  const p = peminjamCustom || peminjam;
  return {
    id: `pinjam-${nomor}`,
    idPeminjaman: nomor,
    pengguna: {
      nim: p.nim,
      nama: p.nama,
    },
    peminjam: p,
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
    tanggalPengembalian,
    status,
    alasanPenolakan,
    keperluan,
    jumlahPinjam: 1,
    kondisiSebelum,
    deskripsiSebelum,
    kondisiSesudah,
    deskripsiSesudah,
    sanksi,
    waktuTerlambat,
    diprosesOleh,
  };
}

/*
 * Data contoh Pengajuan Saya > Peminjaman dan Pengembalian sesuai desain UI:
 * Mencakup semua status: Diajukan, Disetujui, Dipinjam, Ditolak, Menunggu, Dikembalikan, Terlambat.
 */
export const INITIAL_MOCK_PEMINJAMAN = [
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
  buatPeminjaman({
    nomor: 3, indeksInventaris: 0, namaBarang: 'Proyektor Epson', namaOrganisasi: 'HMTI',
    pengajuan: '2026-10-10', mulai: '2026-10-20', selesai: '2026-10-17',
    tanggalPengembalian: '2026-10-25', status: STATUS_PEMINJAMAN.DIKEMBALIKAN,
    keperluan: 'Seminar BEM', diprosesOleh: 'Hanin Maizah',
    kondisiSebelum: 'baik', kondisiSesudah: 'baik', deskripsiSesudah: 'Lengkap dan berfungsi normal',
  }),
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
  buatPeminjaman({
    nomor: 11, indeksInventaris: 0, namaBarang: 'Proyektor Epson', namaOrganisasi: 'HMTI',
    pengajuan: '2026-10-15', mulai: '2026-10-20', selesai: '2026-10-17',
    status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN, keperluan: 'Seminar BEM',
    kondisiSebelum: 'baik', deskripsiSebelum: 'Kabel dan remote lengkap',
  }),
  buatPeminjaman({
    nomor: 12, indeksInventaris: 2, namaBarang: 'Kabel HDMI', namaOrganisasi: 'HME',
    pengajuan: '2026-10-10', mulai: '2026-10-20', selesai: '2026-10-17',
    tanggalPengembalian: '2026-10-25', status: STATUS_PEMINJAMAN.TERLAMBAT,
    waktuTerlambat: 3, keperluan: 'Seminar BEM', diprosesOleh: 'Hanin Maizah',
    sanksi: 'Sanksi Keterlambatan: Pembatasan peminjaman sementara selama 7 hari.',
    kondisiSebelum: 'baik', deskripsiSebelum: 'Kabel utuh',
  }),
  buatPeminjaman({
    nomor: 13, indeksInventaris: 5, namaBarang: 'Mikrofon Wireless', namaOrganisasi: 'THEATRISIC',
    pengajuan: '2026-10-15', mulai: '2026-10-20', selesai: '2026-10-25',
    status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN, keperluan: 'Seminar BEM',
    kondisiSebelum: 'baik', deskripsiSebelum: 'Mic dan receiver lengkap',
  }),
  buatPeminjaman({
    nomor: 14, indeksInventaris: 3, namaBarang: 'Tripod Kamera', namaOrganisasi: 'HMTI',
    pengajuan: '2026-09-28', mulai: '2026-10-01', selesai: '2026-10-03',
    tanggalPengembalian: '2026-10-03', status: STATUS_PEMINJAMAN.DIKEMBALIKAN,
    keperluan: 'Dokumentasi internal', diprosesOleh: 'Siti Rahma',
    kondisiSebelum: 'baik', kondisiSesudah: 'baik', deskripsiSesudah: 'Lengkap',
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