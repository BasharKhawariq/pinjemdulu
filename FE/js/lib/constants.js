export const ROLES = {
  PEMINJAM: 'peminjam',
  PENANGGUNG_JAWAB: 'penanggung_jawab',
};

/* -------------------------------------------------------------------------- */
/*                           STATUS PEMINJAMAN (API)                         */
/* -------------------------------------------------------------------------- */
/*
 * Nilai KUNCI konstanta dipertahankan agar pemakaian di kode lain tidak rusak
 * (tetap `STATUS_PEMINJAMAN.DIAJUKAN`, dll).
 * NILAI (value) diubah menjadi snake_case sesuai kontrak API.
 */

export const STATUS_PEMINJAMAN = {
  DIAJUKAN: 'menunggu_persetujuan',
  DISETUJUI: 'disetujui',
  DITOLAK: 'ditolak',
  DIPINJAM: 'sedang_dipinjam',
  MENUNGGU_KONFIRMASI_PENGEMBALIAN: 'menunggu_pengembalian',
  DIKEMBALIKAN: 'selesai',
  TERLAMBAT: 'terlambat',
};

/**
 * Label Bahasa Indonesia yang DITAMPILKAN di UI. Bisa berbeda menurut konteks
 * (lihat tabel Label tampilan API-CONTRACT.md).
 */
export const LABEL_STATUS_PEMINJAMAN = {
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  DIPINJAM: 'Dipinjam',
  MENUNGGU_KONFIRMASI_PENGEMBALIAN: 'Menunggu',
  DIKEMBALIKAN: 'Dikembalikan',
  TERLAMBAT: 'Terlambat',
};

/**
 * Map terbalik: nilai API (snake_case) → kunci internal (DIAJUKAN, dll).
 * Digunakan `getStatusLabel` / `resolveVariant` saat diberi input string
 * status mentah dari service atau mock.
 */
const _STATUS_KEY_BY_VALUE = Object.freeze(
  Object.fromEntries(Object.entries(STATUS_PEMINJAMAN).map(([k, v]) => [v, k]))
);

/**
 * Label umum (bukan per konteks). Bila status tampil di luar tab Peminjaman
 * atau Pengembalian (misal kartu status umum), label ini yang dipakai.
 */
const LABEL_UMUM = {
  [STATUS_PEMINJAMAN.DIAJUKAN]: 'Menunggu Persetujuan',
  [STATUS_PEMINJAMAN.DISETUJUI]: 'Disetujui',
  [STATUS_PEMINJAMAN.DITOLAK]: 'Ditolak',
  [STATUS_PEMINJAMAN.DIPINJAM]: 'Dipinjam',
  [STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN]: 'Menunggu Pengembalian',
  [STATUS_PEMINJAMAN.DIKEMBALIKAN]: 'Selesai',
  [STATUS_PEMINJAMAN.TERLAMBAT]: 'Terlambat',
};

/**
 * Dapatkan label tampilan untuk suatu nilai status, menurut konteks halaman.
 *
 * - `konteks = 'peminjaman'` (default) → label sesuai tab Pengajuan Saya >
 *   Peminjaman: Diajukan | Disetujui | Ditolak | Dipinjam. Status milik
 *   tab Pengembalian ditampilkan dengan label umum (TIDAK melempar error).
 * - `konteks = 'pengembalian'` → label sesuai tab Pengajuan Saya >
 *   Pengembalian: Menunggu | Dikembalikan | Terlambat.
 *
 * @param {string} status   Nilai status (snake_case) sesuai kontrak.
 * @param {'peminjaman'|'pengembalian'} [konteks='peminjaman']
 * @returns {string}
 */
export function getStatusLabel(status, konteks = 'peminjaman') {
  if (typeof status !== 'string' || status.length === 0) return status ?? '';
  const key = _STATUS_KEY_BY_VALUE[status];
  if (!key) return status;

  // 1) Ada label spesifik untuk konteks ini?
  if (konteks === 'peminjaman') {
    if (key === 'DIAJUKAN' || key === 'DISETUJUI' || key === 'DITOLAK' || key === 'DIPINJAM') {
      return LABEL_STATUS_PEMINJAMAN[key];
    }
  } else if (konteks === 'pengembalian') {
    if (
      key === 'MENUNGGU_KONFIRMASI_PENGEMBALIAN' ||
      key === 'DIKEMBALIKAN' ||
      key === 'TERLAMBAT'
    ) {
      return LABEL_STATUS_PEMINJAMAN[key];
    }
  }

  // 2) Fallback: label umum (tetap human-readable, bukan snake_case mentah).
  return LABEL_UMUM[status] || status;
}

/* -------------------------------------------------------------------------- */
/*                           Variant Badge & warna                            */
/* -------------------------------------------------------------------------- */

export const STATUS_PEMINJAMAN_VARIANT = {
  [STATUS_PEMINJAMAN.DIAJUKAN]: 'info',
  [STATUS_PEMINJAMAN.DISETUJUI]: 'success',
  [STATUS_PEMINJAMAN.DITOLAK]: 'danger',
  [STATUS_PEMINJAMAN.DIPINJAM]: 'warning',
  [STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN]: 'warning',
  [STATUS_PEMINJAMAN.DIKEMBALIKAN]: 'success',
  [STATUS_PEMINJAMAN.TERLAMBAT]: 'danger',
};

export const BADGE_VARIANT_DEFAULT = 'default';

/* -------------------------------------------------------------------------- */
/*                              STATUS MENAHAN                                */
/* -------------------------------------------------------------------------- */
/*
 * Sesuai kontrak API § Enum: status yang menahan barang (ikut hitung kuota):
 *   menunggu_persetujuan, disetujui, sedang_dipinjam,
 *   menunggu_pengembalian, terlambat.
 * Yang TIDAK menahan: ditolak, selesai.
 */

export const STATUS_MENAHAN_BARANG = [
  STATUS_PEMINJAMAN.DIAJUKAN,
  STATUS_PEMINJAMAN.DISETUJUI,
  STATUS_PEMINJAMAN.DIPINJAM,
  STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
  STATUS_PEMINJAMAN.TERLAMBAT,
];

/* -------------------------------------------------------------------------- */
/*                               Lain-lain                                    */
/* -------------------------------------------------------------------------- */

export const KONDISI_BARANG = {
  BAIK: 'baik',
  RUSAK: 'rusak',
};

/**
 * Label tampilan Bahasa Indonesia untuk kondisi barang.
 * Dipetakan agar komponen tidak menulis string literal kondisi.
 */
export const LABEL_KONDISI = {
  [KONDISI_BARANG.BAIK]: 'Baik',
  [KONDISI_BARANG.RUSAK]: 'Rusak',
};

export const STATUS_AKUN = {
  AKTIF: 'aktif',
  NONAKTIF: 'nonaktif',
};

export const STATUS_REQUEST_PJ = {
  MENUNGGU: 'menunggu',
  DISETUJUI: 'disetujui',
  DITOLAK: 'ditolak',
};

export const STATUS_REQUEST_PJ_VARIANT = {
  [STATUS_REQUEST_PJ.MENUNGGU]: 'warning',
  [STATUS_REQUEST_PJ.DISETUJUI]: 'success',
  [STATUS_REQUEST_PJ.DITOLAK]: 'danger',
};

export const MAKS_DURASI_HARI = null;
export const MAKS_HARI_KE_DEPAN = null;

export const NAV_PEMINJAM = [
  { title: 'Dashboard', href: '/peminjam/dashboard' },
  { title: 'Inventaris', href: '/peminjam/inventaris' },
  { title: 'Pengajuan', href: '/peminjam/pengajuan' },
  { title: 'Status', href: '/peminjam/status' },
  { title: 'Pengembalian', href: '/peminjam/pengembalian' },
  { title: 'Riwayat', href: '/peminjam/riwayat' },
  { title: 'Request PJ', href: '/peminjam/request-pj' },
  { title: 'Tata Tertib', href: '/peminjam/tata-tertib' },
];

export const NAV_PJ = [
  { title: 'Dashboard', href: '/pj/dashboard' },
  { title: 'Inventaris', href: '/pj/inventaris' },
  { title: 'Peminjaman', href: '/pj/peminjaman' },
  { title: 'Jadwal', href: '/pj/jadwal' },
  { title: 'Pengembalian', href: '/pj/pengembalian' },
  { title: 'Laporan', href: '/pj/laporan' },
  { title: 'Request PJ', href: '/pj/request-pj' },
  { title: 'Pengguna', href: '/pj/pengguna' },
];

export const AUTH_STORAGE_KEY = 'pinjam-dulu-user';
