import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateNamaBarang,
  validateJumlahUnit,
  validateKategori,
  validateKondisi,
  validateFotoFile,
  validateInventarisInput,
  isFormDirty,
  hasActiveBookings,
  getMinTotalBarang,
  addDaysToISO,
  MAKS_FOTO_BYTES,
} from '../js/lib/inventaris-form.js';
import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';

test('inventaris-form: validateNamaBarang menolak string kosong, spasi saja, dan > 100 karakter', () => {
  assert.equal(validateNamaBarang(''), 'Nama barang wajib diisi.');
  assert.equal(validateNamaBarang('   '), 'Nama barang wajib diisi.');
  assert.equal(validateNamaBarang(null), 'Nama barang wajib diisi.');
  assert.equal(validateNamaBarang('a'.repeat(101)), 'Nama barang maksimal 100 karakter.');
  assert.equal(validateNamaBarang('Proyektor Epson EB-X500'), null);
});

test('inventaris-form: validateJumlahUnit menolak kosong, desimal, <= 0, > 999, dan < minTotal', () => {
  assert.equal(validateJumlahUnit(''), 'Jumlah unit wajib diisi.');
  assert.equal(validateJumlahUnit(null), 'Jumlah unit wajib diisi.');
  assert.equal(validateJumlahUnit(0), 'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.');
  assert.equal(validateJumlahUnit(-5), 'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.');
  assert.equal(validateJumlahUnit(2.5), 'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.');
  assert.equal(validateJumlahUnit(1000), 'Jumlah unit harus berupa bilangan bulat antara 1 sampai 999.');

  // minTotal enforcement
  assert.equal(
    validateJumlahUnit(3, 5),
    'Jumlah tidak boleh kurang dari 5 unit karena masih dipakai peminjaman aktif atau terjadwal.'
  );
  assert.equal(validateJumlahUnit(5, 5), null);
  assert.equal(validateJumlahUnit(10, 5), null);
});

test('inventaris-form: validateKategori menolak nilai kosong atau null', () => {
  assert.equal(validateKategori(''), 'Kategori wajib dipilih.');
  assert.equal(validateKategori(null), 'Kategori wajib dipilih.');
  assert.equal(validateKategori('kat-1'), null);
});

test('inventaris-form: validateKondisi menolak kondisi tidak dikenal', () => {
  assert.equal(validateKondisi(''), 'Kondisi barang wajib dipilih.');
  assert.equal(validateKondisi('bagus-sekali'), 'Kondisi barang tidak valid.');
  assert.equal(validateKondisi('baik'), null);
  assert.equal(validateKondisi('rusak'), null);
});

test('inventaris-form: validateFotoFile menerima null/undefined, menolak format bukan JPG/PNG dan ukuran > 2MB', () => {
  assert.equal(validateFotoFile(null), null);
  assert.equal(validateFotoFile(undefined), null);

  assert.equal(validateFotoFile({ type: 'application/pdf', size: 1000 }), 'File harus berformat JPG atau PNG.');
  assert.equal(validateFotoFile({ type: 'image/gif', size: 1000 }), 'File harus berformat JPG atau PNG.');

  assert.equal(
    validateFotoFile({ type: 'image/jpeg', size: MAKS_FOTO_BYTES + 1 }),
    'Ukuran file maksimal 2 MB.'
  );
  assert.equal(validateFotoFile({ type: 'image/jpeg', size: 1024 * 500 }), null);
  assert.equal(validateFotoFile({ type: 'image/png', size: 1024 * 1024 }), null);
});

test('inventaris-form: validateInventarisInput validasi komprehensif', () => {
  const invalid = validateInventarisInput({});
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.namaBarang);
  assert.ok(invalid.errors.totalBarang);
  assert.ok(invalid.errors.idKategori);
  assert.ok(invalid.errors.kondisi);

  const valid = validateInventarisInput({
    namaBarang: 'Kamera Sony A7 III',
    totalBarang: 2,
    idKategori: 'kat-1',
    kondisi: 'baik',
    deskripsi: 'Kamera mirrorless lengkap dengan lensa kit.',
  });
  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});
});

test('inventaris-form: isFormDirty mendeteksi perubahan nilai form', () => {
  const initial = {
    namaBarang: 'Kabel HDMI',
    totalBarang: 5,
    idKategori: 'kat-1',
    kondisi: 'baik',
    deskripsi: 'Panjang 2m',
  };

  assert.equal(isFormDirty(initial, initial), false);
  assert.equal(isFormDirty({ ...initial, namaBarang: 'Kabel VGA' }, initial), true);
  assert.equal(isFormDirty({ ...initial, totalBarang: 6 }, initial), true);
  assert.equal(isFormDirty({ ...initial, idKategori: 'kat-2' }, initial), true);
  assert.equal(isFormDirty({ ...initial, kondisi: 'rusak' }, initial), true);
  assert.equal(isFormDirty({ ...initial, deskripsi: 'Panjang 3m' }, initial), true);
  assert.equal(isFormDirty({ ...initial, fotoFile: { size: 100 } }, initial), true);
  assert.equal(isFormDirty({ ...initial, fotoRemoved: true }, initial), true);
});

test('inventaris-form: hasActiveBookings mendeteksi seluruh status dari STATUS_MENAHAN_BARANG', () => {
  // Status non-menahan: ditolak dan dikembalikan (selesai)
  const nonMenahan = [
    { idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.DITOLAK },
    { idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.DIKEMBALIKAN },
  ];
  assert.equal(hasActiveBookings('inv-1', nonMenahan), false);

  // Seluruh 5 status menahan barang:
  // 1. DIAJUKAN (menunggu_persetujuan)
  assert.equal(hasActiveBookings('inv-1', [{ idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.DIAJUKAN }]), true);
  // 2. DISETUJUI (disetujui)
  assert.equal(hasActiveBookings('inv-1', [{ idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.DISETUJUI }]), true);
  // 3. DIPINJAM (sedang_dipinjam)
  assert.equal(hasActiveBookings('inv-1', [{ idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.DIPINJAM }]), true);
  // 4. MENUNGGU_KONFIRMASI_PENGEMBALIAN (menunggu_pengembalian)
  assert.equal(hasActiveBookings('inv-1', [{ idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN }]), true);
  // 5. TERLAMBAT (terlambat)
  assert.equal(hasActiveBookings('inv-1', [{ idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.TERLAMBAT }]), true);

  // Memastikan idInventaris yang berbeda tidak memicu true
  assert.equal(hasActiveBookings('inv-2', [{ idInventaris: 'inv-1', status: STATUS_PEMINJAMAN.TERLAMBAT }]), false);
});

test('inventaris-form: getMinTotalBarang menghitung puncak kuota terpakai termasuk menunggu_pengembalian dan terlambat', () => {
  const today = '2026-10-09';
  const bookings = [
    {
      idInventaris: 'inv-1',
      startDate: '2026-10-12',
      endDate: '2026-10-15',
      jumlahPinjam: 3,
      status: STATUS_PEMINJAMAN.DISETUJUI,
    },
    {
      idInventaris: 'inv-1',
      startDate: '2026-10-14',
      endDate: '2026-10-18',
      jumlahPinjam: 2,
      status: STATUS_PEMINJAMAN.DIPINJAM,
    },
  ];

  // Pada 14-15 Okt, kedua booking tumpang tindih: 3 + 2 = 5
  const min = getMinTotalBarang('inv-1', bookings, today);
  assert.equal(min, 5);

  // Uji status MENUNGGU_KONFIRMASI_PENGEMBALIAN tetap menahan kuota
  const bookingPengembalian = [
    {
      idInventaris: 'inv-kembali',
      startDate: '2026-10-06',
      endDate: '2026-10-09',
      jumlahPinjam: 4,
      status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    },
  ];
  assert.equal(getMinTotalBarang('inv-kembali', bookingPengembalian, today), 4);

  // Uji status TERLAMBAT memperpanjang kuota terpakai sampai hari ini
  const bookingTerlambat = [
    {
      idInventaris: 'inv-telat',
      startDate: '2026-10-01',
      endDate: '2026-10-05', // tanggal selesai sudah lewat tapi status terlambat
      jumlahPinjam: 2,
      status: STATUS_PEMINJAMAN.TERLAMBAT,
    },
  ];
  assert.equal(getMinTotalBarang('inv-telat', bookingTerlambat, today), 2);

  // Tanpa booking aktif
  assert.equal(getMinTotalBarang('inv-99', bookings, today), 0);
  assert.equal(getMinTotalBarang('inv-1', [], today), 0);
});

test('inventaris-form: addDaysToISO menambah hari secara akurat', () => {
  assert.equal(addDaysToISO('2026-10-09', 1), '2026-10-10');
  assert.equal(addDaysToISO('2026-10-31', 1), '2026-11-01');
  assert.equal(addDaysToISO('2024-02-28', 1), '2024-02-29'); // tahun kabisat
});
