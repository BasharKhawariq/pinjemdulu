import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDetailViewModel,
  getAjukanButtonStatus,
  filterAndSortJadwal,
  ALASAN_TOMBOL_AJUKAN,
} from '../js/lib/detail-inventaris.js';
import { ROLES, STATUS_PEMINJAMAN } from '../js/lib/constants.js';

const mockInvBaik = {
  idInventaris: 'inv-1',
  namaBarang: 'Proyektor Epson',
  namaKategori: 'Elektronik',
  idOrganisasi: 'oki-bem',
  namaOrganisasi: 'BEM Polinema',
  totalBarang: 5,
  sisaHariIni: 3,
  kondisi: 'baik',
  deskripsiBarang: 'Proyektor kualitas HD.',
};

test('detail-inventaris: getDetailViewModel mengembalikan null jika barang tidak ada', () => {
  assert.equal(getDetailViewModel(null), null);
  assert.equal(getDetailViewModel(undefined), null);
});

test('detail-inventaris: tombol dinonaktifkan jika kondisi rusak (INVENTARIS_RUSAK)', () => {
  const invRusak = { ...mockInvBaik, kondisi: 'rusak' };
  const user = { role: ROLES.PEMINJAM, idOrganisasi: 'oki-hmti' };

  const status = getAjukanButtonStatus(invRusak, user);
  assert.equal(status.enabled, false);
  assert.equal(status.code, 'INVENTARIS_RUSAK');
  assert.equal(status.alasan, ALASAN_TOMBOL_AJUKAN.INVENTARIS_RUSAK);

  const vm = getDetailViewModel(invRusak, [], user);
  assert.equal(vm.ajukanStatus.enabled, false);
  assert.equal(vm.ajukanStatus.code, 'INVENTARIS_RUSAK');
  assert.equal(vm.sisaHariIni, 0); // barang rusak tidak tersedia
  assert.equal(vm.tersedia, false);
});

test('detail-inventaris: tombol dinonaktifkan jika PJ mencoba meminjam barang OKI sendiri (OKI_SENDIRI)', () => {
  const userPJ = {
    role: ROLES.PENANGGUNG_JAWAB,
    organisasi: { idOrganisasi: 'oki-bem', namaOrganisasi: 'BEM Polinema' },
  };

  const status = getAjukanButtonStatus(mockInvBaik, userPJ);
  assert.equal(status.enabled, false);
  assert.equal(status.code, 'OKI_SENDIRI');
  assert.equal(status.alasan, ALASAN_TOMBOL_AJUKAN.OKI_SENDIRI);
});

test('detail-inventaris: PJ dari OKI LAIN diizinkan meminjam barang OKI lain', () => {
  const userPJBeda = {
    role: ROLES.PENANGGUNG_JAWAB,
    organisasi: { idOrganisasi: 'oki-hmti', namaOrganisasi: 'HMTI' },
  };

  const status = getAjukanButtonStatus(mockInvBaik, userPJBeda);
  assert.equal(status.enabled, true);
  assert.equal(status.code, null);
  assert.equal(status.alasan, '');
});

test('detail-inventaris: tombol dinonaktifkan jika stok master habis (STOK_HABIS bila totalBarang 0)', () => {
  const invHabis = { ...mockInvBaik, totalBarang: 0, sisaHariIni: 0 };
  const user = { role: ROLES.PEMINJAM, idOrganisasi: 'oki-hmti' };

  const status = getAjukanButtonStatus(invHabis, user);
  assert.equal(status.enabled, false);
  assert.equal(status.code, 'STOK_HABIS');
  assert.equal(status.alasan, ALASAN_TOMBOL_AJUKAN.STOK_HABIS);
});

test('detail-inventaris: tombol tetap aktif jika sisaHariIni 0 tetapi totalBarang > 0', () => {
  const invSisaNol = { ...mockInvBaik, totalBarang: 5, sisaHariIni: 0 };
  const user = { role: ROLES.PEMINJAM, idOrganisasi: 'oki-hmti' };

  const status = getAjukanButtonStatus(invSisaNol, user);
  assert.equal(status.enabled, true);
  assert.equal(status.code, null);
  assert.equal(status.alasan, '');
});

test('detail-inventaris: filterAndSortJadwal hanya menyertakan status menahan dan mengurutkan berdasarkan tanggal mulai', () => {
  const rawJadwal = [
    {
      id: 'j-3',
      startDate: '2026-10-25',
      endDate: '2026-10-28',
      status: STATUS_PEMINJAMAN.DISETUJUI,
      jumlahPinjam: 1,
      keperluan: 'Seminar Nasional',
      namaOrganisasi: 'HMTI',
      namaPeminjam: 'Budi Rahasia', // data pribadi
      nim: '2141720000', // data pribadi
    },
    {
      id: 'j-ignore-ditolak',
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      status: STATUS_PEMINJAMAN.DITOLAK,
      jumlahPinjam: 2,
    },
    {
      id: 'j-1',
      startDate: '2026-10-15',
      endDate: '2026-10-18',
      status: STATUS_PEMINJAMAN.DIAJUKAN,
      jumlahPinjam: 2,
      keperluan: 'Workshop Robotik',
      namaOrganisasi: 'UKM Robotika',
    },
    {
      id: 'j-ignore-selesai',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      status: STATUS_PEMINJAMAN.DIKEMBALIKAN,
      jumlahPinjam: 1,
    },
  ];

  const hasil = filterAndSortJadwal(rawJadwal);
  assert.equal(hasil.length, 2);

  // j-1 (15 Okt) harus muncul sebelum j-3 (25 Okt)
  assert.equal(hasil[0].id, 'j-1');
  assert.equal(hasil[0].startDate, '2026-10-15');
  assert.equal(hasil[0].keperluan, 'Workshop Robotik');

  assert.equal(hasil[1].id, 'j-3');
  assert.equal(hasil[1].startDate, '2026-10-25');
  assert.equal(hasil[1].keperluan, 'Seminar Nasional');

  // Pastikan data pribadi tidak disertakan di objek hasil sanitasi
  assert.equal('namaPeminjam' in hasil[1], false);
  assert.equal('nim' in hasil[1], false);
});
