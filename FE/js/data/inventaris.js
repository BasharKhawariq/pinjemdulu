/**
 * Data mock INVENTARIS + PEMINJAMAN AKTIF (booking) per idInventaris.
 *
 * KONTRAK DATA Inventaris (API-CONTRACT.md § Inventaris):
 *   idInventaris, idKategori, namaKategori, idOrganisasi, namaOrganisasi,
 *   namaBarang, lokasi, totalBarang, sisaHariIni, kondisi,
 *   deskripsiBarang, thumbnail.
 *
 * Booking (untuk getPeminjamanAktif):
 *   startDate, endDate, bufferStartDate, bufferEndDate, jumlahPinjam,
 *   status, keperluan, namaOrganisasi.
 *
 * Booking dibuat RELATIF terhadap hari ini (offset hari dari today) agar
 * demo tetap hidup kapan pun dijalankan. sisaHariIni DIHITUNG menggunakan
 * fungsi getCommittedQuota(...) dari lib/date-rules.js, BUKAN angka statis.
 */

import { KONDISI_BARANG, STATUS_PEMINJAMAN } from '../lib/constants.js';
import { getCommittedQuota } from '../lib/date-rules.js';
import { mockKategori } from './kategori.js';
import { mockOrganisasi } from './organisasi.js';

/* -------------------------------------------------------------------------- */
/*                          HELPER TANGGAL RELATIF                           */
/* -------------------------------------------------------------------------- */

/**
 * @param {number} offset (hari dari hari ini; boleh negatif)
 * @returns {string} "YYYY-MM-DD" (zona lokal)
 */
function addDaysStr(offset) {
  const d = _mockTodayOverride ? new Date(_mockTodayOverride) : new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return addDaysStr(0);
}

/**
 * Tambah hari ke string YYYY-MM-DD + kembalikan YYYY-MM-DD.
 * (Zona lokal; aman tidak bergeser timezone.)
 */
function shiftDateStr(str, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return str;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/* -------------------------------------------------------------------------- */
/*                            SPESIFIKASI BOOKING                             */
/* -------------------------------------------------------------------------- */
/*
 * Setiap inventaris punya spesifikasi booking (offset relatif ke today).
 * Untuk satu inventaris, totalBarang harus berarti, dan sisaHariIni dihitung
 * dari getCommittedQuota(today, bookings, today).
 *
 * Kita sengaja buat satu inventaris (Proyektor BEM) HABIS (sisaHariIni = 0)
 * dengan satu booking penuh semua unit, dan sebagian inventaris lain
 * sebagian terpakai.
 */

const KAT = Object.fromEntries(mockKategori.map((k) => [k.namaKategori, k]));
const OKI = Object.fromEntries(mockOrganisasi.map((o) => [o.namaOrganisasi, o]));

/*
 * Spesifikasi inventaris (12+). Minimal 12 barang.
 */
const INVENTARIS_SPESIFIKASI = [
  {
    idInventaris: 'inv-1',
    kategori: 'Elektronik',
    organisasi: 'BEM',
    namaBarang: 'Proyektor Epson EB-X500',
    lokasi: 'Sekretariat BEM Lt. 2',
    totalBarang: 2,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Proyektor 3LCD dengan resolusi XGA 1024×768, brightness 3.600 ANSI lumens, rasio kontras 16.000:1. Mendukung input HDMI, VGA, dan USB-C. Catu daya internal dan kabel HDMI 2 meter sudah tersedia dalam paket.',
    thumbnail: 'assets/inventaris/proyektor.svg',
    // Booking: HARI INI sampai besok, SEMUA 2 unit dipakai BEM (sisa = 0).
    bookings: [
      {
        startOffset: 0,
        endOffset: 1,
        jumlahPinjam: 2,
        status: STATUS_PEMINJAMAN.DIPINJAM,
        keperluan: 'Rapat Pengurus Harian BEM',
        namaOrganisasiPeminjam: 'BEM',
      },
    ],
  },
  {
    idInventaris: 'inv-2',
    kategori: 'Audio',
    organisasi: 'BEM',
    namaBarang: 'Speaker Portable JBL Xtreme',
    lokasi: 'Sekretariat BEM Lt. 2',
    totalBarang: 3,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Speaker Bluetooth portable dengan daya 40W, tahan air IP67, battery life hingga 15 jam. Termasuk kabel charger USB-C dan audio 3.5 mm.',
    thumbnail: 'assets/inventaris/speaker.svg',
    bookings: [
      {
        startOffset: 1,
        endOffset: 3,
        jumlahPinjam: 1,
        status: STATUS_PEMINJAMAN.DISETUJUI,
        keperluan: 'Roadshow Penerimaan Anggota Baru',
        namaOrganisasiPeminjam: 'HMTI',
      },
    ],
  },
  {
    idInventaris: 'inv-3',
    kategori: 'Elektronik',
    organisasi: 'HMTI',
    namaBarang: 'Kabel HDMI 2 Meter',
    lokasi: 'Sekretariat HMTI',
    totalBarang: 6,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Kabel HDMI high speed ver 2.0, panjang 2 meter, mendukung resolusi 4K@60Hz dan HDR. Panjang kabel cukup untuk jarak meja ke proyektor di ruang kelas standar.',
    thumbnail: 'assets/inventaris/kabel.svg',
    bookings: [
      {
        startOffset: -1,
        endOffset: 2,
        jumlahPinjam: 2,
        status: STATUS_PEMINJAMAN.DIPINJAM,
        keperluan: 'Workshop Web Programming',
        namaOrganisasiPeminjam: 'HMTI',
      },
      {
        startOffset: 3,
        endOffset: 5,
        jumlahPinjam: 3,
        status: STATUS_PEMINJAMAN.DIAJUKAN,
        keperluan: 'Pelatihan Desain Grafis',
        namaOrganisasiPeminjam: 'HMS',
      },
    ],
  },
  {
    idInventaris: 'inv-4',
    kategori: 'Audio',
    organisasi: 'HMTI',
    namaBarang: 'Mikrofon Wireless Shure',
    lokasi: 'Sekretariat HMTI',
    totalBarang: 2,
    kondisi: KONDISI_BARANG.RUSAK,
    deskripsiBarang:
      'Mic wireless handheld (dynamic, UHF) + receiver. Frekuensi aman, baterai tahan 8 jam pemakaian. Catatan kondisi: busa mic nomor 2 sedikit robek (sudah dilapisi ulang).',
    thumbnail: null,
    bookings: [
      {
        startOffset: 4,
        endOffset: 6,
        jumlahPinjam: 2,
        status: STATUS_PEMINJAMAN.DISETUJUI,
        keperluan: 'Seminar Nasional Teknologi',
        namaOrganisasiPeminjam: 'HMTI',
      },
    ],
  },
  {
    idInventaris: 'inv-5',
    kategori: 'Dokumentasi',
    organisasi: 'HMS',
    namaBarang: 'Camera Canon EOS 700D',
    lokasi: 'Sekretariat HMS',
    totalBarang: 1,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Kamera DSLR APS-C 18 MP + kit lens 18-55mm IS II. Termasuk baterai LP-E8 (2 buah), charger, strap, dan memory card 32 GB SDHC Class 10.',
    thumbnail: 'assets/inventaris/kamera.svg',
    bookings: [
      {
        startOffset: -2,
        endOffset: 0,
        jumlahPinjam: 1,
        status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
        keperluan: 'Dokumentasi Lustrum HMS',
        namaOrganisasiPeminjam: 'HMS',
      },
    ],
  },
  {
    idInventaris: 'inv-6',
    kategori: 'Alat Musik',
    organisasi: 'THEATRISIC',
    namaBarang: 'Gitar Akustik Yamaha F310',
    lokasi: 'Sekretariat THEATRISIC',
    totalBarang: 2,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Gitar akustik steel string 41-inch dreadnought, tonewood spruce top, meranti back & sides, fretboard rosewood. Termasuk soft case standar dan capo aluminium.',
    thumbnail: 'assets/inventaris/gitar.svg',
    bookings: [],
  },
  {
    idInventaris: 'inv-7',
    kategori: 'Audio',
    organisasi: 'PP',
    namaBarang: 'Megaphone Speaker TOA 45W',
    lokasi: 'Sekretariat PP',
    totalBarang: 4,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Pengeras suara genggam (megaphone) TOA ZR-45S dengan output 45W, rekam suara 60 detik, sirine bawaan, dan slot USB/SD card untuk musik. Baterai cas internal tahan 6 jam.',
    thumbnail: 'assets/inventaris/megaphone.svg',
    bookings: [
      {
        startOffset: 2,
        endOffset: 2,
        jumlahPinjam: 2,
        status: STATUS_PEMINJAMAN.DISETUJUI,
        keperluan: 'Lomba Cerdas C Antar Fakultas',
        namaOrganisasiPeminjam: 'PP',
      },
    ],
  },
  {
    idInventaris: 'inv-8',
    kategori: 'Audio',
    organisasi: 'HME',
    namaBarang: 'Mixer Audio Yamaha MG12',
    lokasi: 'Sekretariat HME',
    totalBarang: 1,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Analog mixer 12 channel: 4 mic preamp D-PRE, 4 stereo line, efek internal SPX reverb, equalizer 3-band per channel, output main XLR dan monitor.',
    thumbnail: null,
    bookings: [
      {
        startOffset: 7,
        endOffset: 9,
        jumlahPinjam: 1,
        status: STATUS_PEMINJAMAN.DIAJUKAN,
        keperluan: 'Pentas Malam Puncak Dies Natalis',
        namaOrganisasiPeminjam: 'THEATRISIC',
      },
    ],
  },
  {
    idInventaris: 'inv-9',
    kategori: 'Furnitur',
    organisasi: 'BEM',
    namaBarang: 'Meja Lipat Portable',
    lokasi: 'Gudang BEM',
    totalBarang: 10,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Meja lipat portable rangka besi dengan top kayu 120×60 cm. Tinggi 75 cm, berat 9 kg per unit, mudah dibawa dan ditumpuk. Cocok untuk stand acara, bazaar, atau posko.',
    thumbnail: null,
    bookings: [
      {
        startOffset: 5,
        endOffset: 5,
        jumlahPinjam: 6,
        status: STATUS_PEMINJAMAN.DISETUJUI,
        keperluan: 'Bazaar Kewirausahaan OKI',
        namaOrganisasiPeminjam: 'BEM',
      },
    ],
  },
  {
    idInventaris: 'inv-10',
    kategori: 'Furnitur',
    organisasi: 'RISPOL',
    namaBarang: 'Kursi Lipat Plastik',
    lokasi: 'Gudang RISPOL',
    totalBarang: 40,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Kursi lipat plastik HDPE anti-UV, rangka besi powder coating. Berat 3.8 kg per buah, beban maks 100 kg. Digandeng mudah untuk diangkut beramai-ramai.',
    thumbnail: null,
    bookings: [
      {
        startOffset: 0,
        endOffset: 0,
        jumlahPinjam: 30,
        status: STATUS_PEMINJAMAN.DIPINJAM,
        keperluan: 'Rapat Pleno OKI Se-Fakultas',
        namaOrganisasiPeminjam: 'RISPOL',
      },
    ],
  },
  {
    idInventaris: 'inv-11',
    kategori: 'Dokumentasi',
    organisasi: 'HIMANIA',
    namaBarang: 'Tripod Alumunium Excellio',
    lokasi: 'Sekretariat HIMANIA',
    totalBarang: 4,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Tripod aluminium 4 section, tinggi maks 165 cm, berat 1.5 kg, beban maks 5 kg. Kepala ball-head 360 derajat, quick release plate, dan tas jinjing.',
    thumbnail: null,
    bookings: [
      {
        startOffset: 10,
        endOffset: 12,
        jumlahPinjam: 2,
        status: STATUS_PEMINJAMAN.DIAJUKAN,
        keperluan: 'Dokumentasi Studi Banding',
        namaOrganisasiPeminjam: 'HIMANIA',
      },
    ],
  },
  {
    idInventaris: 'inv-12',
    kategori: 'Elektronik',
    organisasi: 'RISPOL',
    namaBarang: 'Laser Pointer Presentasi',
    lokasi: 'Sekretariat RISPOL',
    totalBarang: 5,
    kondisi: KONDISI_BARANG.BAIK,
    deskripsiBarang:
      'Laser pointer merah dengan next/prev slide (wireless 2.4 GHz USB receiver), jarak hingga 30 meter. Baterai AAA 2 buah per unit.',
    thumbnail: null,
    bookings: [],
  },
  {
    idInventaris: 'inv-13',
    kategori: 'Alat Musik',
    organisasi: 'HMS',
    namaBarang: 'Keyboard Yamaha PSR-E373',
    lokasi: 'Ruang Musik HMS',
    totalBarang: 1,
    kondisi: KONDISI_BARANG.RUSAK,
    deskripsiBarang:
      'Keyboard arranger 61 kunci sentuh responsif, 622 suara, 205 gaya irama, efek reverb & chorus. Catatan kondisi: tombol D# di oktaf bawah sesekali macet (sudah dilumasi, perlu perawatan berikutnya).',
    thumbnail: null,
    bookings: [
      {
        startOffset: 14,
        endOffset: 16,
        jumlahPinjam: 1,
        status: STATUS_PEMINJAMAN.DISETUJUI,
        keperluan: 'Pentas Musik Islami',
        namaOrganisasiPeminjam: 'PP',
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                      FABRIKASI INVENTARIS + BOOKING                       */
/* -------------------------------------------------------------------------- */

/**
 * Terjemahkan spesifikasi booking offset-based → booking penuh absolute dates.
 * Mengembalikan { bookings: array untuk getPeminjamanAktif,
 *                 bookingsForQuota: array untuk getCommittedQuota }
 */
function materializeBookings(specList) {
  const absolute = [];
  for (const s of specList) {
    const startDate = addDaysStr(s.startOffset);
    const endDate = addDaysStr(s.endOffset);
    const bufferStartDate = shiftDateStr(startDate, -1);
    const bufferEndDate = shiftDateStr(endDate, 1);
    absolute.push({
      startDate,
      endDate,
      bufferStartDate,
      bufferEndDate,
      jumlahPinjam: s.jumlahPinjam,
      status: s.status,
      keperluan: s.keperluan,
      namaOrganisasi: s.namaOrganisasiPeminjam,
      // Teman untuk date-rules (mulai/selesai adalah alias) agar
      // getCommittedQuota() berjalan tanpa ubah date-rules.js.
      mulai: startDate,
      selesai: endDate,
    });
  }
  return absolute;
}

const _peminjamanAktifById = {}; // idInventaris → array booking (absolute)
const _inventarisData = [];
let _mockTodayOverride = null;

export function getMockToday() {
  return _mockTodayOverride || todayStr();
}

export function setMockToday(dateStr) {
  _mockTodayOverride = dateStr || null;
  recalculateAllSisa();
}

export function recalculateSisa(idInventaris) {
  const inv = _inventarisData.find((it) => it.idInventaris === idInventaris);
  if (!inv) return;
  const today = getMockToday();
  const bookings = _peminjamanAktifById[idInventaris] || [];
  const terpakai = getCommittedQuota(today, bookings, today);
  inv.sisaHariIni = Math.max(0, inv.totalBarang - terpakai);
}

export function recalculateAllSisa() {
  for (const inv of _inventarisData) {
    recalculateSisa(inv.idInventaris);
  }
}

/**
 * Bangun ulang mock inventaris dan daftar booking ke kondisi awal.
 */
export function resetMockInventarisAndBookings(todayOverride = null) {
  _mockTodayOverride = todayOverride;
  const today = getMockToday();
  _inventarisData.length = 0;
  for (const key of Object.keys(_peminjamanAktifById)) {
    delete _peminjamanAktifById[key];
  }

  for (const sp of INVENTARIS_SPESIFIKASI) {
    const kat = KAT[sp.kategori];
    const oki = OKI[sp.organisasi];
    if (!kat || !oki) continue;

    const bookings = materializeBookings(sp.bookings || []);
    const terpakai = getCommittedQuota(today, bookings, today);
    const sisa = Math.max(0, sp.totalBarang - terpakai);

    const inv = {
      idInventaris: sp.idInventaris,
      idKategori: kat.idKategori,
      namaKategori: kat.namaKategori,
      idOrganisasi: oki.idOrganisasi,
      namaOrganisasi: oki.namaOrganisasi,
      namaBarang: sp.namaBarang,
      lokasi: sp.lokasi,
      totalBarang: sp.totalBarang,
      sisaHariIni: sisa,
      kondisi: sp.kondisi,
      deskripsiBarang: sp.deskripsiBarang,
      thumbnail: sp.thumbnail,
    };
    _inventarisData.push(inv);
    _peminjamanAktifById[sp.idInventaris] = bookings.map((b) => ({ ...b }));
  }
}

// Inisialisasi awal
resetMockInventarisAndBookings();

/* -------------------------------------------------------------------------- */
/*                         EKSPOR YANG DIPAKAI SERVICE                       */
/* -------------------------------------------------------------------------- */

export const mockInventaris = _inventarisData;

/**
 * Tambah booking baru ke inventaris tertentu dan mutakhirkan sisaHariIni.
 * @param {string} idInventaris
 * @param {object} booking
 */
export function addMockBooking(idInventaris, booking) {
  if (!_peminjamanAktifById[idInventaris]) {
    _peminjamanAktifById[idInventaris] = [];
  }
  const fullBooking = {
    ...booking,
    mulai: booking.startDate,
    selesai: booking.endDate,
  };
  _peminjamanAktifById[idInventaris].push(fullBooking);
  recalculateSisa(idInventaris);
}

/**
 * Dapatkan daftar peminjaman aktif (booking) untuk satu idInventaris.
 * Urut menurut startDate ASC.
 *
 * @param {string} idInventaris
 * @returns {Array<object>}
 */
export function getMockPeminjamanAktifById(idInventaris) {
  const list = _peminjamanAktifById[idInventaris] || [];
  return [...list]
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
    .map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
      bufferStartDate: b.bufferStartDate,
      bufferEndDate: b.bufferEndDate,
      jumlahPinjam: b.jumlahPinjam,
      status: b.status,
      keperluan: b.keperluan,
      namaOrganisasi: b.namaOrganisasi,
      // alias pendamping untuk internal date-rules
      mulai: b.startDate,
      selesai: b.endDate,
    }));
}

/**
 * Helper untuk test: rebuild data.
 * @internal
 */
export function _rebuildInventarisAndBookings() {
  resetMockInventarisAndBookings();
  return { inventaris: mockInventaris.length, oki: mockOrganisasi.length };
}

/**
 * Hapus inventaris dari store mock (jika id ditemukan), bersihkan booking aktif.
 * Dipakai service `deleteInventaris` Kelola Inventaris PJ.
 *
 * @param {string} idInventaris
 * @returns {boolean} true jika ditemukan dan dihapus.
 */
export function deleteMockInventarisById(idInventaris) {
  const idx = _inventarisData.findIndex((it) => it.idInventaris === idInventaris);
  if (idx === -1) return false;
  _inventarisData.splice(idx, 1);
  if (Object.prototype.hasOwnProperty.call(_peminjamanAktifById, idInventaris)) {
    delete _peminjamanAktifById[idInventaris];
  }
  return true;
}

/**
 * Tambah inventaris baru ke store mock.
 * @param {object} item
 * @returns {object}
 */
export function addMockInventaris(item) {
  _inventarisData.push(item);
  _peminjamanAktifById[item.idInventaris] = [];
  recalculateSisa(item.idInventaris);
  return item;
}

/**
 * Update inventaris di store mock.
 * @param {string} idInventaris
 * @param {object} updates
 * @returns {object|null}
 */
export function updateMockInventaris(idInventaris, updates) {
  const inv = _inventarisData.find((it) => it.idInventaris === idInventaris);
  if (!inv) return null;
  Object.assign(inv, updates);
  recalculateSisa(idInventaris);
  return inv;
}
