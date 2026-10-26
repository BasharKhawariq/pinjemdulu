import test from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_PEMINJAMAN } from '../js/lib/constants.js';
import {
  getEarliestStartDate,
  getBufferRange,
  getCommittedQuota,
  isStartDateDisabled,
  isEndDateDisabled,
  getMaxEndDate,
  isRangeAvailable,
  isBookingMenahan,
  canStartOn,
} from '../js/lib/date-rules.js';

/* ========================================================================== */
/*                                DATA CONTOH                                 */
/* ========================================================================== */

const T = { totalBarang: 1, today: '2026-10-01' };
const T31 = { totalBarang: 1, today: '2026-10-31' };

// Contoh A: totalBarang 1, booking aktif 2026-10-20..2026-10-30 jumlah 1.
// Hari pakai: 10-20 s.d. 10-30 (buffer: 10-19 dan 10-31).
const bookingA = {
  id: 'a',
  status: STATUS_PEMINJAMAN.DIPINJAM,
  mulai: '2026-10-20',
  selesai: '2026-10-30',
  jumlahPinjam: 1,
};
const bookingANonAktif = {
  id: 'bukan-a',
  status: STATUS_PEMINJAMAN.DIKEMBALIKAN,
  mulai: '2026-10-20',
  selesai: '2026-10-30',
  jumlahPinjam: 1,
};
const bookingADitolak = {
  id: 'a-tolak',
  status: STATUS_PEMINJAMAN.DITOLAK,
  mulai: '2026-10-20',
  selesai: '2026-10-30',
  jumlahPinjam: 1,
};

// Contoh B: totalBarang 3, satu booking aktif jumlah 2 pada 10-20..10-30.
const bookingB1 = {
  id: 'b1',
  status: STATUS_PEMINJAMAN.DIPINJAM,
  mulai: '2026-10-20',
  selesai: '2026-10-30',
  jumlahPinjam: 2,
};

// Contoh C: totalBarang 1, booking 1 selesai 10-10, booking 2 mulai 10-14.
// (Booking 2 mulai 10-14 artinya buffer 10-13).
// Versi booking C1 yang MASIH menahan barang (contoh celah):
const bookingC1Aktif = {
  id: 'c1-aktif',
  status: STATUS_PEMINJAMAN.DISETUJUI,
  mulai: '2026-10-05',
  selesai: '2026-10-10',
  jumlahPinjam: 1,
};
const bookingC2 = {
  id: 'c2',
  status: STATUS_PEMINJAMAN.DIAJUKAN,
  mulai: '2026-10-14',
  selesai: '2026-10-20',
  jumlahPinjam: 1,
};
const bookingC2Rapat = {
  id: 'c2-rapat',
  status: STATUS_PEMINJAMAN.DIAJUKAN,
  mulai: '2026-10-13',
  selesai: '2026-10-20',
  jumlahPinjam: 1,
};

/* ========================================================================== */
/*                                    TESTS                                   */
/* ========================================================================== */

/* --------------------------- 1. getEarliestStartDate ---------------------- */

test('getEarliestStartDate — hari ini 2026-10-01 → 2026-10-03', () => {
  assert.equal(getEarliestStartDate('2026-10-01'), '2026-10-03');
});

test('getEarliestStartDate — today 2026-10-31 → 2026-11-02 (pergantian bulan)', () => {
  assert.equal(getEarliestStartDate('2026-10-31'), '2026-11-02');
});

test('getEarliestStartDate — hari non-tengah malam hasilnya sama', () => {
  const pagi = new Date(2026, 9, 1, 8, 23, 11);
  const sore = new Date(2026, 9, 1, 19, 59, 59);
  assert.equal(getEarliestStartDate(pagi), getEarliestStartDate(sore));
  assert.equal(getEarliestStartDate(pagi), '2026-10-03');
});

/* ------------------------------ 2. getBufferRange ------------------------- */

test('getBufferRange — start 10-20, end 10-30 → 10-19 s.d. 10-31', () => {
  assert.deepEqual(getBufferRange('2026-10-20', '2026-10-30'), {
    from: '2026-10-19',
    to: '2026-10-31',
  });
});

/* ----------------------- 3. isBookingMenahan (status) -------------------- */

test('isBookingMenahan — benar untuk 5 status, salah untuk Ditolak/Dikembalikan', () => {
  const caseBenar = [
    STATUS_PEMINJAMAN.DIAJUKAN,
    STATUS_PEMINJAMAN.DISETUJUI,
    STATUS_PEMINJAMAN.DIPINJAM,
    STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    STATUS_PEMINJAMAN.TERLAMBAT,
  ];
  for (const s of caseBenar) {
    assert.equal(isBookingMenahan({ status: s }), true, s);
  }
  assert.equal(isBookingMenahan({ status: STATUS_PEMINJAMAN.DITOLAK }), false);
  assert.equal(isBookingMenahan({ status: STATUS_PEMINJAMAN.DIKEMBALIKAN }), false);
});

/* ========================================================================== */
/*                              CONTOH A  (kuota 1)                           */
/*  booking aktif: 2026-10-20 s.d. 2026-10-30, jumlah 1                      */
/*  hari pakai = 10-20 .. 10-30;  buffer = 10-19 dan 10-31                   */
/* ========================================================================== */

test('contoh A today 2026-10-01: getCommittedQuota — 10-18 = 0; 10-19 buffer = 1; 10-20 pakai = 1; 10-30 pakai = 1; 10-31 buffer = 1; 11-01 = 0', () => {
  const bs = [bookingA];
  assert.equal(getCommittedQuota('2026-10-18', bs, T.today), 0);
  assert.equal(getCommittedQuota('2026-10-19', bs, T.today), 1);
  assert.equal(getCommittedQuota('2026-10-20', bs, T.today), 1);
  assert.equal(getCommittedQuota('2026-10-25', bs, T.today), 1);
  assert.equal(getCommittedQuota('2026-10-30', bs, T.today), 1);
  assert.equal(getCommittedQuota('2026-10-31', bs, T.today), 1);
  assert.equal(getCommittedQuota('2026-11-01', bs, T.today), 0);
});

test('contoh A: booking Ditolak / Dikembalikan TIDAK memblokir (kuota di tanggal 10-20 = 0)', () => {
  assert.equal(getCommittedQuota('2026-10-20', [bookingANonAktif], T.today), 0);
  assert.equal(getCommittedQuota('2026-10-20', [bookingADitolak], T.today), 0);
});

test('contoh A: kasus wajib — mulai 10-01 dan 10-02 disabled. 10-03 enabled', () => {
  const bs = [bookingA];
  assert.equal(isStartDateDisabled('2026-10-01', bs, T), true);
  assert.equal(isStartDateDisabled('2026-10-02', bs, T), true);
  assert.equal(isStartDateDisabled('2026-10-03', bs, T), false);
});

test('contoh A: kasus wajib — mulai 10-03, selesai 10-18 ok. Selesai 10-19 bentrok', () => {
  // Penjelasan bentrok di 10-19:
  // Pengajuan start=10-03 end=10-19 → di tanggal 10-19:
  //   d=10-19 adalah HARI PAKAI pengajuan baru (q=1) + buffer bookingA (MAX=1).
  //   Total = 1 (pakai baru) + 1 (MAX buffer bookingA) = 2 > kuota 1.
  const bs = [bookingA];
  const start = '2026-10-03';
  assert.equal(isEndDateDisabled('2026-10-18', start, bs, T), false);
  assert.equal(
    isEndDateDisabled('2026-10-19', start, bs, T),
    true,
    '10-19: hari pakai pengajuan baru (1) + MAX buffer bookingA (1) = 2 > kuota 1.'
  );
  const r1 = isRangeAvailable(start, '2026-10-18', bs, T);
  assert.equal(r1.ok, true, r1.reason);
  const r2 = isRangeAvailable(start, '2026-10-19', bs, T);
  assert.equal(r2.ok, false, 'range 10-03 s.d. 10-19 harus ditolak');
  assert.match(r2.reason || '', /2026-10-19/);
});

test('contoh A: getMaxEndDate("2026-10-03") = "2026-10-18"', () => {
  assert.equal(getMaxEndDate('2026-10-03', [bookingA], T), '2026-10-18');
});

test('contoh A: kasus wajib — mulai 10-18 enabled; 10-19 s.d. 10-31 disabled; 11-01 enabled', () => {
  // 10-18 (mulai=selesai=18, buffer 17 dan 19):
  //   d=17: committed=0, simulasi: baru pakai tidak, buffer baru MAX(1)=1 → total 1 ≤ 1 ✓
  //   d=18: committed=0, simulasi: baru pakai(1) → 1 ≤ 1 ✓
  //   d=19: committed=1 (buffer bookingA), simulasi: baru buffer MAX(bookingA=1, baru=1)=1 → 0 + 1 = 1 ≤ 1 ✓
  const bs = [bookingA];
  assert.equal(
    isStartDateDisabled('2026-10-18', bs, T),
    false,
    '10-18 ok (mulai=selesai=18; buffer 17 dan 19. 19 buffer bookingA, MAX(1)=1. Simulasi kuota d=19: A=0+B_max(bookingA=1, baru=1)=1. Total = 1 ≤ 1).'
  );
  // 10-19: mulai=selesai=19. Buffer 18 dan 20. d=20 adalah hari pakai bookingA = 1; baru: d=20 buffer saja. kuota d=20: 1 (bookingA pakai) + max(0, 1 baru) = 2 > 1.
  assert.equal(isStartDateDisabled('2026-10-19', bs, T), true);
  for (let d = 20; d <= 31; d++) {
    const ds = `2026-10-${String(d).padStart(2, '0')}`;
    assert.equal(isStartDateDisabled(ds, bs, T), true, `mulai ${ds} seharusnya disabled`);
  }
  assert.equal(isStartDateDisabled('2026-11-01', bs, T), false);
});

test('contoh A: mulai 10-18 dengan selesai 10-18 saja valid; selesai 10-19 tidak valid', () => {
  const bs = [bookingA];
  const ok = isRangeAvailable('2026-10-18', '2026-10-18', bs, T);
  assert.equal(ok.ok, true, ok.reason);
  const gagal = isRangeAvailable('2026-10-18', '2026-10-19', bs, T);
  assert.equal(gagal.ok, false);
});

// bookingA buffer 10-31 vs pengajuan start 11-01 buffer 10-31 adalah SAMA HANYA buffer →
// MAX(1,1)=1 ≤ 1. Maka celah ada dan pengajuan bisa "tak terbatas" sampai booking lain.
// Kita kembalikan Infinity = tanpa batas (null berarti start tidak valid).
test('contoh A: mulai 11-01 → getMaxEndDate = Infinity (tanpa batas)', () => {
  assert.equal(getMaxEndDate('2026-11-01', [bookingA], T), Infinity);
});

test('contoh A today 2026-10-31: earliest H+2 = 2026-11-02 → mulai 11-01 disabled, 11-02 enabled', () => {
  assert.equal(isStartDateDisabled('2026-11-01', [bookingA], T31), true);
  assert.equal(isStartDateDisabled('2026-11-02', [bookingA], T31), false);
});

/* ========================================================================== */
/*                              CONTOH B  (kuota 3)                           */
/*  booking aktif: 10-20..10-30, jumlahPinjam = 2. totalBarang = 3.           */
/*                                                                             */
/*  Hitung manual getCommittedQuota tanggal terkait:                           */
/*  ┌──────────┬──────────────┬──────────────┬──────────────┐                  */
/*  │  tanggal │ Σ pakai (A) │ MAX buffer   │ terpakai(d)  │                  */
/*  ├──────────┼──────────────┼──────────────┼──────────────┤                  */
/*  │ 10-19    │ 0            │ 2 (bookingB1)│ 2            │                  */
/*  │ 10-20    │ 2            │ 0            │ 2            │                  */
/*  │ 10-25    │ 2            │ 0            │ 2            │                  */
/*  │ 10-30    │ 2            │ 0            │ 2            │                  */
/*  │ 10-31    │ 0            │ 2 (bookingB1)│ 2            │                  */
/*  └──────────┴──────────────┴──────────────┴──────────────┘                  */
/*                                                                             */
/*  Jumlah pengajuan baru = 1:                                                 */
/*    Sisa kuota = 3 - (Σ existing + MAX existing_buffer_after_add_q)         */
/*    Di hari PAKAI bookingB1 (2 sisa): 1 pengajuan muat (2+1 = 3).           */
/*    Di hari BUFFER bookingB1 (2 sisa): 1 pengajuan buffer → MAX(2,1)=2.     */
/*      0 (pakai) + 2 = 2 ≤ 3, sisa 1 → MUAT.                                */
/*    Akibatnya: TIDAK ADA tanggal yang terkunci total akibat bookingB1       */
/*    untuk pengajuan jumlah 1.                                               */
/*                                                                             */
/*  Jumlah pengajuan baru = 2:                                                 */
/*    Mirip contoh A tapi dikalikan 2. Di tanggal 10-20: Σ pakai = 2+2=4 > 3. */
/*    Jadi perilaku persis seperti contoh A (kuota 3 - 2 = 1 sisa).           */
/*                                                                             */
/*  Jumlah pengajuan baru = 4:                                                 */
/*    Bahkan sendirian 4 > 3 totalBarang → SEMUA tanggal disabled.            */
/* ========================================================================== */

const B = (jumlah) => ({ totalBarang: 3, today: '2026-10-01', jumlah });

test('contoh B: committedQuota sesuai tabel manual di atas', () => {
  const bs = [bookingB1];
  assert.equal(getCommittedQuota('2026-10-19', bs, '2026-10-01'), 2);
  assert.equal(getCommittedQuota('2026-10-20', bs, '2026-10-01'), 2);
  assert.equal(getCommittedQuota('2026-10-25', bs, '2026-10-01'), 2);
  assert.equal(getCommittedQuota('2026-10-30', bs, '2026-10-01'), 2);
  assert.equal(getCommittedQuota('2026-10-31', bs, '2026-10-01'), 2);
  assert.equal(getCommittedQuota('2026-11-01', bs, '2026-10-01'), 0);
});

test('contoh B: jumlah 1 → tidak ada tanggal yang terkunci akibat booking (10-19, 10-20, 10-25, 10-31 semuanya start enabled)', () => {
  const bs = [bookingB1];
  const opt = B(1);
  assert.equal(isStartDateDisabled('2026-10-19', bs, opt), false);
  assert.equal(isStartDateDisabled('2026-10-20', bs, opt), false);
  assert.equal(isStartDateDisabled('2026-10-25', bs, opt), false);
  assert.equal(isStartDateDisabled('2026-10-31', bs, opt), false);
  // range 10-19 s.d. 10-31 penuh jumlah 1 → ok (tidak bentrok total 3)
  const ok = isRangeAvailable('2026-10-19', '2026-10-31', bs, opt);
  assert.equal(ok.ok, true, ok.reason);
});

test('contoh B: jumlah 2 → perilaku persis contoh A. getMaxEndDate(10-03) = 10-18; start 10-20 disabled', () => {
  const bs = [bookingB1];
  const opt = B(2);
  assert.equal(getMaxEndDate('2026-10-03', bs, opt), '2026-10-18');
  assert.equal(isStartDateDisabled('2026-10-20', bs, opt), true);
  const ok = isRangeAvailable('2026-10-03', '2026-10-18', bs, opt);
  assert.equal(ok.ok, true, ok.reason);
  const gagal = isRangeAvailable('2026-10-03', '2026-10-19', bs, opt);
  assert.equal(gagal.ok, false);
});

test('contoh B: jumlah 4 → SEMUA disabled (bahkan start 11-01 > earliest sekalipun)', () => {
  const bs = [bookingB1];
  const opt = B(4);
  assert.equal(isStartDateDisabled('2026-11-01', bs, opt), true, 'jumlah > totalBarang');
  // start tidak valid → kembalikan null (bukan Infinity)
  assert.equal(getMaxEndDate('2026-11-01', bs, opt), null);
  const r = isRangeAvailable('2026-11-01', '2026-11-05', bs, opt);
  assert.equal(r.ok, false);
  assert.match(r.reason || '', /Jumlah pinjam \(4\)/);
});

/* ========================================================================== */
/*                                 CONTOH C  (celah)                          */
/*  totalBarang 1.                                                            */
/*  C1 aktif DISETUJUI: 10-05 s.d. 10-10 (buffer 10-04 & 10-11).             */
/*  C2 DIAJUKAN: 10-14 s.d. 10-20 (buffer 10-13 & 10-21).                    */
/*                                                                             */
/*  Hari-hari di sekitar celah (10-10 s.d. 10-14):                            */
/*                                                                             */
/*  ┌────────┬───────────────────┬───────────────────┬────────────────┐       */
/*  │  hari  │ C1 (pakai/buffer) │ C2 (pakai/buffer) │ terpakai(d)    │       */
/*  ├────────┼───────────────────┼───────────────────┼────────────────┤       */
/*  │ 10-10  │ pakai (1)         │ -                 │ 1              │       */
/*  │ 10-11  │ buffer (1)        │ -                 │ 1              │       */
/*  │ 10-12  │ -                 │ -                 │ 0              │       */
/*  │ 10-13  │ -                 │ buffer (1)        │ 1              │       */
/*  │ 10-14  │ -                 │ pakai (1)         │ 1              │       */
/*  └────────┴───────────────────┴───────────────────┴────────────────┘       */
/*                                                                             */
/*  Satu-satunya hari terpakai=0 adalah 10-12 →                                */
/*  Pengajuan jumlah 1 tanggal 12 (mulai=selesai=12) → buffer 11 dan 13.      */
/*  d=11: existing buffer C1=1 → MAX(1, baru_buffer 1) = 1 → 0 + 1 = 1 ≤ 1 ✓  */
/*  d=12: baru pakai 1 → 0 + 1 = 1 ≤ 1 ✓                                      */
/*  d=13: existing buffer C2=1 → MAX(1, baru_buffer 1) = 1 → 0 + 1 = 1 ≤ 1 ✓  */
/*  Jadi: SATU-SATUNYA tanggal mulai valid = 10-12, selesai maksimal 10-12.   */
/*                                                                             */
/*  Jika booking 2 dimajukan ke 10-13 (buffer 10-12 & 10-20) →                */
/*  tanggal 10-12 menjadi buffer C2 = 1 → tidak ada celah.                    */
/* ========================================================================== */

const CT = { totalBarang: 1, today: '2026-10-01' };

test('contoh C: committedQuota sesuai tabel', () => {
  const bs = [bookingC1Aktif, bookingC2];
  assert.equal(getCommittedQuota('2026-10-10', bs, CT.today), 1);
  assert.equal(getCommittedQuota('2026-10-11', bs, CT.today), 1);
  assert.equal(getCommittedQuota('2026-10-12', bs, CT.today), 0);
  assert.equal(getCommittedQuota('2026-10-13', bs, CT.today), 1);
  assert.equal(getCommittedQuota('2026-10-14', bs, CT.today), 1);
});

test('contoh C (selisih 4): tepat satu tanggal mulai valid 10-12 dengan selesai 10-12', () => {
  const bs = [bookingC1Aktif, bookingC2];
  // Semua tanggal di sekitar harus disabled kecuali 10-12
  assert.equal(isStartDateDisabled('2026-10-10', bs, CT), true);
  assert.equal(isStartDateDisabled('2026-10-11', bs, CT), true);
  assert.equal(isStartDateDisabled('2026-10-12', bs, CT), false, '10-12 adalah satu-satunya celah');
  assert.equal(isStartDateDisabled('2026-10-13', bs, CT), true);
  assert.equal(isStartDateDisabled('2026-10-14', bs, CT), true);

  // getMaxEndDate(10-12) = 10-12. Selesai 13 tidak valid (buffer 14 adalah hari pakai C2).
  assert.equal(getMaxEndDate('2026-10-12', bs, CT), '2026-10-12');

  // Range valid: 10-12 s.d. 10-12
  const r = isRangeAvailable('2026-10-12', '2026-10-12', bs, CT);
  assert.equal(r.ok, true, r.reason);
});

test('contoh C (selisih 3): booking2 mulai 10-13 → TIDAK ADA tanggal valid di celah', () => {
  const bs = [bookingC1Aktif, bookingC2Rapat];
  // Tanggal 10-12 menjadi buffer C2Rapat (10-12) → terpakai(10-12) = 1
  assert.equal(getCommittedQuota('2026-10-12', bs, CT.today), 1);
  assert.equal(isStartDateDisabled('2026-10-12', bs, CT), true);
  // 11 masih buffer C1, 12 buffer C2, 13 hari pakai C2 → tanpa celah.
  assert.equal(isStartDateDisabled('2026-10-10', bs, CT), true);
  assert.equal(isStartDateDisabled('2026-10-11', bs, CT), true);
  assert.equal(isStartDateDisabled('2026-10-13', bs, CT), true);
});

/* ========================================================================== */
/*                    TEST BARU #1: 2 booking aktif, kuota 3                  */
/*  totalBarang = 3                                                           */
/*  bookingD1 DIPINJAM: 10-15 s.d. 10-18, jumlah 1 (buffer 14 & 19)          */
/*  bookingD2 DIAJUKAN: 10-22 s.d. 10-25, jumlah 2 (buffer 21 & 26)          */
/*                                                                             */
/*  Tabel getCommittedQuota tanggal-tanggal sekitar "celah" 10-19 s.d. 10-21: */
/*                                                                             */
/*  ┌─────────┬──────────────────────┬──────────────────────┬──────────────┐  */
/*  │  hari   │ bookingD1 (jml=1)   │ bookingD2 (jml=2)   │ terpakai(d)  │  */
/*  ├─────────┼──────────────────────┼──────────────────────┼──────────────┤  */
/*  │ 10-18   │ pakai (1)           │ -                    │ 1            │  */
/*  │ 10-19   │ buffer (1)          │ -                    │ 1            │  */
/*  │ 10-20   │ -                    │ -                    │ 0            │  */
/*  │ 10-21   │ -                    │ buffer (2)           │ 2            │  */
/*  │ 10-22   │ -                    │ pakai (2)            │ 2            │  */
/*  │ 10-26   │ -                    │ buffer (2)           │ 2            │  */
/*  └─────────┴──────────────────────┴──────────────────────┴──────────────┘  */
/*                                                                             */
/*  Pengujian isStartDateDisabled jumlah=1 (totalBarang=3):                   */
/*    mulai=10-19: simulasi start=end=19 → [18, 19, 20]                       */
/*      d=18: existing pakaiD1(1) + baru MAX buffer(1) → 1 + 1 = 2 ≤ 3 ✓      */
/*      d=19: existing MAX buffer(1) + baru pakai(1) → 1 + 1 = 2 ≤ 3 ✓        */
/*      d=20: existing 0 + baru MAX buffer(1) → 0 + 1 = 1 ≤ 3 ✓               */
/*      → enabled (FALSE)                                                     */
/*                                                                             */
/*    mulai=10-21: simulasi start=end=21 → [20, 21, 22]                       */
/*      d=21: existing MAX bufferD2(2) + baru pakai(1) → 2 + 1 = 3 ≤ 3 ✓      */
/*      d=22: existing pakaiD2(2) + baru MAX buffer(1) → 2 + 1 = 3 ≤ 3 ✓      */
/*      → enabled (FALSE)                                                     */
/*                                                                             */
/*  Pengujian isStartDateDisabled jumlah=2 (totalBarang=3):                   */
/*    mulai=10-19: d=19 → existing MAX(1) + baru pakai(2) = 1 + 2 = 3 ≤ 3 ✓   */
/*                   d=18 → existing pakai(1) + baru MAX(2) = 1 + 2 = 3 ≤ 3 ✓ */
/*                   d=20 → 0 + MAX(2) = 2 ≤ 3 ✓                              */
/*                   → enabled (FALSE)                                        */
/*    mulai=10-21: d=21 → existing MAX(2) + baru pakai(2) = 2 + 2 = 4 > 3 ✗   */
/*                   → disabled (TRUE)                                        */
/*                                                                             */
/*  Booking buffer BERBAGI: d=19 (D1 buffer 1) + d=21 (D2 buffer 2)           */
/*  = masing-masing MAX terpisah, tidak dijumlah lintas booking.              */
/* ========================================================================== */

const bookingD1 = {
  id: 'd1',
  status: STATUS_PEMINJAMAN.DIPINJAM,
  mulai: '2026-10-15',
  selesai: '2026-10-18',
  jumlahPinjam: 1,
};
const bookingD2 = {
  id: 'd2',
  status: STATUS_PEMINJAMAN.DIAJUKAN,
  mulai: '2026-10-22',
  selesai: '2026-10-25',
  jumlahPinjam: 2,
};
const DT1 = { totalBarang: 3, today: '2026-10-01', jumlah: 1 };
const DT2 = { totalBarang: 3, today: '2026-10-01', jumlah: 2 };

test('baru #1: 2 booking aktif jumlah beda — getCommittedQuota sesuai tabel manual', () => {
  const bs = [bookingD1, bookingD2];
  assert.equal(getCommittedQuota('2026-10-18', bs, DT1.today), 1);
  assert.equal(getCommittedQuota('2026-10-19', bs, DT1.today), 1);
  assert.equal(getCommittedQuota('2026-10-20', bs, DT1.today), 0);
  assert.equal(getCommittedQuota('2026-10-21', bs, DT1.today), 2);
  assert.equal(getCommittedQuota('2026-10-22', bs, DT1.today), 2);
  assert.equal(getCommittedQuota('2026-10-26', bs, DT1.today), 2);
});

test('baru #1: 2 booking aktif jumlah beda — isStartDateDisabled jumlah=1', () => {
  const bs = [bookingD1, bookingD2];
  // 10-19 & 10-21 keduanya enabled untuk jumlah 1
  assert.equal(
    isStartDateDisabled('2026-10-19', bs, DT1),
    false,
    'mulai 10-19 jumlah 1 harus enabled'
  );
  assert.equal(
    isStartDateDisabled('2026-10-21', bs, DT1),
    false,
    'mulai 10-21 jumlah 1 harus enabled'
  );
});

test('baru #1: 2 booking aktif jumlah beda — isStartDateDisabled jumlah=2', () => {
  const bs = [bookingD1, bookingD2];
  assert.equal(
    isStartDateDisabled('2026-10-19', bs, DT2),
    false,
    'mulai 10-19 jumlah 2 harus enabled (d=19: 1+2=3 ≤ 3)'
  );
  assert.equal(
    isStartDateDisabled('2026-10-21', bs, DT2),
    true,
    'mulai 10-21 jumlah 2 harus disabled (d=21: 2 existing buffer + 2 pakai baru = 4 > 3)'
  );
});

/* ========================================================================== */
/*              TEST BARU #2: DIPINJAM selesai lewat tapi blm TERLAMBAT       */
/*                                                                             */
/*  bookingE: status DIPINJAM, mulai 10-01, selesai 10-05.                    */
/*  Hari ini = 10-10 (sudah lewat selesai 5 hari), tapi status BELUM diubah   */
/*  ke TERLAMBAT (masih DIPINJAM).                                            */
/*                                                                             */
/*  Perilaku SEKARANG (sesuai kode): isBookingMenahan → true (DIPINJAM ada    */
/*  di STATUS_MENAHAN_BARANG). Tetapi getEffectiveRanges TIDAK memperpanjang   */
/*  hari pakai (hanya status TERLAMBAT yang punya logika perpanjangan).       */
/*  Jadi hari pakai EFEKTIF = tetap [10-01 s.d. 10-05], buffer [09-30, 10-06].*/
/*                                                                             */
/*  Tabel:                                                                     */
/*  ┌─────────┬────────────────────────┬──────────────┐                       */
/*  │  hari   │ bookingE (status DIPINJAM) │ terpakai(d)│                      */
/*  ├─────────┼────────────────────────┼──────────────┤                       */
/*  │ 10-05   │ pakai (1)              │ 1            │                       */
/*  │ 10-06   │ buffer (1)             │ 1            │                       */
/*  │ 10-08   │ -                      │ 0            │                       */
/*  │ 10-10   │ -                      │ 0            │                       */
/*  │ 10-11   │ -                      │ 0            │                       */
/*  └─────────┴────────────────────────┴──────────────┘                       */
/*                                                                             */
/*  Komentar: ini CELAH keamanan. Tanggal 10-06 sd 10-10 KALENDAR dianggap   */
/*  kosong, padahal barang sebenarnya MASIH di tangan peminjam. Perbaikan:    */
/*  a) backend harus mengubah status ke TERLAMBAT secara otomatis saat        */
/*     selesai < today dan barang belum dikonfirmasi kembali. ATAU            */
/*  b) saat baca data dari API (getPeminjamanAktifByInventaris), FE harus     */
/*     memperlakukan DIPINJAM yang selesai < today sebagai TERLAMBAT.         */
/*  Ini TERKAIT keputusan terbuka #3 AGENTS.md: siapa yang update status      */
/*  menjadi TERLAMBAT (cron backend? PJ saat buka halaman pengembalian?).     */
/* ========================================================================== */

const bookingE = {
  id: 'e',
  status: STATUS_PEMINJAMAN.DIPINJAM,
  mulai: '2026-10-01',
  selesai: '2026-10-05',
  jumlahPinjam: 1,
};
const ET = { totalBarang: 1, today: '2026-10-10' };

test('baru #2: DIPINJAM selesai lewat tapi status blm TERLAMBAT — perilaku sekarang', () => {
  const bs = [bookingE];
  // Tanggal 10-05 (hari pakai terakhir) masih 1
  assert.equal(getCommittedQuota('2026-10-05', bs, ET.today), 1);
  // Tanggal 10-06 (buffer end) masih 1
  assert.equal(getCommittedQuota('2026-10-06', bs, ET.today), 1);
  // Tanggal 10-08 / 10-10 / 10-11 dianggap 0 PADAHAL barang blm kembali.
  // CATATAN: ini CELAH s/d ada mekanisme ubah status → TERLAMBAT otomatis.
  assert.equal(getCommittedQuota('2026-10-08', bs, ET.today), 0);
  assert.equal(getCommittedQuota('2026-10-10', bs, ET.today), 0);
  // Akibatnya tanggal 10-08 (kurang dari H+2 = 12) masih disabled karena earliest.
  // Tapi 10-12 akan dianggap enabled → padahal barang kemungkinan masih dipakai.
  const opt12 = { ...ET, today: '2026-10-10' };
  assert.equal(
    isStartDateDisabled('2026-10-12', bs, opt12),
    false,
    'TANPA TERLAMBAT: 10-12 dianggap enabled, padahal barang blm tentu kembali. Harus ditangani saat baca data / backend cron.'
  );
});

/* ========================================================================== */
/*          TEST BARU #3: pengembalian lebih awal (MENUNGGU vs DIKEMBALIKAN)  */
/*                                                                             */
/*  Kondisi: barang seharusnya dipinjam 10-20 s.d. 10-30, tapi dikembalikan   */
/*  lebih awal, misal tanggal 10-25.                                           */
/*                                                                             */
/*  Kasus F1 — status = MENUNGGU_KONFIRMASI_PENGEMBALIAN:                     */
/*    isBookingMenahan = true (MENUNGGU_KONFIRMASI ada di STATUS_MENAHAN).    */
/*    Rentang efektif: per aturan kode saat ini, HANYA status TERLAMBAT yang  */
/*    diubah rentangnya. Jadi selesai TETAP 10-30, buffer TETAP 10-31.        */
/*    → KALENDER TERKUNCI SAMPAI 10-31 (seolah-olah barang masih dipakai).    */
/*    Komentar: MENUNGGU berarti PEMINJAM sudah klik "kembalikan" tapi PJ     */
/*    belum verifikasi kondisi. Barang dianggap "masih dipegang" sampai PJ    */
/*    konfirmasi → ubah status ke DIKEMBALIKAN.                                */
/*    Ini mengikuti keputusan terbuka #3 AGENTS.md: kontrak API perlu         */
/*    menyatakan apakah MENUNGGU_KONFIRMASI tetap pakai range asli atau       */
/*    pakai range tanggal "kembali sebenarnya".                               */
/*                                                                             */
/*  Kasus F2 — status = DIKEMBALIKAN (setelah PJ konfirmasi, kembali 10-25):  */
/*    isBookingMenahan = false.                                                */
/*    → KALENDER TERBEBAS SEGERA (tanggal 10-26 s.d. buffer s/d 10-31 TIDAK   */
/*    dihitung sbg kuota terpakai).                                            */
/*    Komentar: PJ yang bertugas memverifikasi & klik "konfirmasi pengembalian*/
/*    tepat waktu agar kuota kembali tersedia untuk peminjam berikutnya.      */
/*    Ini mengikuti keputusan terbuka #3 AGENTS.md.                           */
/*                                                                             */
/*  Tabel:                                                                     */
/*  ┌─────────┬───────────────────────┬───────────────────────┐               */
/*  │  hari   │ F1 (MENUNGGU_KONF)   │ F2 (DIKEMBALIKAN)    │               */
/*  │         │ terpakai(d)          │ terpakai(d)          │               */
/*  ├─────────┼───────────────────────┼───────────────────────┤               */
/*  │ 10-24   │ pakai (1) = 1        │ 0 (status nonaktif)   │               */
/*  │ 10-25   │ pakai (1) = 1        │ 0                     │               */
/*  │ 10-26   │ pakai (1) = 1        │ 0                     │               */
/*  │ 10-30   │ pakai (1) = 1        │ 0                     │               */
/*  │ 10-31   │ buffer (1) = 1       │ 0                     │               */
/*  │ 11-01   │ 0                    │ 0                     │               */
/*  └─────────┴───────────────────────┴───────────────────────┘               */
/* ========================================================================== */

const bookingF1_Menunggu = {
  id: 'f1',
  status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
  mulai: '2026-10-20',
  selesai: '2026-10-30', // rentang ASLI, barang dikembalikan sebenarnya tgl 25 tapi TIDAK disimpan di model saat ini
  jumlahPinjam: 1,
};
const bookingF2_Dikembalikan = {
  id: 'f2',
  status: STATUS_PEMINJAMAN.DIKEMBALIKAN,
  mulai: '2026-10-20',
  selesai: '2026-10-30',
  jumlahPinjam: 1,
};
const FT = { totalBarang: 1, today: '2026-10-10' };

test('baru #3a: MENUNGGU_KONFIRMASI_PENGEMBALIAN — kalender TETAP terkunci sampai 10-31', () => {
  const bs = [bookingF1_Menunggu];
  assert.equal(getCommittedQuota('2026-10-24', bs, FT.today), 1, 'masih pakai');
  assert.equal(
    getCommittedQuota('2026-10-26', bs, FT.today),
    1,
    'Catatan: MENUNGGU_KONF masih terkunci 10-26 sesuai range ASLI (10-30).' +
      ' Sesuai keputusan terbuka #3 AGENTS.md: kontrak API perlu menentukan apakah' +
      ' MENUNGGU_KONF tetap pakai range asli atau tanggal kembali sebenarnya.'
  );
  assert.equal(getCommittedQuota('2026-10-30', bs, FT.today), 1);
  assert.equal(
    getCommittedQuota('2026-10-31', bs, FT.today),
    1,
    'buffer end masih terkunci, menunggu konfirmasi PJ'
  );
  assert.equal(getCommittedQuota('2026-11-01', bs, FT.today), 0);
  // Akibatnya: mulai 10-26 disabled
  assert.equal(
    isStartDateDisabled('2026-10-26', bs, FT),
    true,
    'mulai 10-26 disabled — MENUNGGU_KONF masih menahan kuota sampai PJ konfirmasi'
  );
});

test('baru #3b: DIKEMBALIKAN — kalender TERBEBAS SEGERA', () => {
  const bs = [bookingF2_Dikembalikan];
  assert.equal(getCommittedQuota('2026-10-24', bs, FT.today), 0);
  assert.equal(
    getCommittedQuota('2026-10-26', bs, FT.today),
    0,
    'DIKEMBALIKAN tidak menahan kuota, tanggal 26 langsung bebas.'
  );
  assert.equal(getCommittedQuota('2026-10-30', bs, FT.today), 0);
  assert.equal(getCommittedQuota('2026-10-31', bs, FT.today), 0);
  // Akibatnya: mulai 10-26 enabled (jika ≥ H+2). Hari ini 10-10 → earliest = 12, so 26 enabled.
  assert.equal(isStartDateDisabled('2026-10-26', bs, FT), false);
});

/* ========================================================================== */
/*               TEST BARU #4: isEndDateDisabled melebihi getMaxEndDate       */
/*                                                                             */
/*  Kasus A: bookingA (20-30 Okt kuota 1). getMaxEndDate(10-03) = 10-18.      */
/*           end=10-18 → tidak disabled (FALSE)                               */
/*           end=10-19 → disabled (TRUE)  (+1 dari max)                       */
/*           end=10-20 → disabled (TRUE)  (jauh di atas max)                  */
/*                                                                             */
/*  Kasus C: celah bookingC1Aktif + bookingC2.                                */
/*           getMaxEndDate(10-12) = 10-12 (hanya satu hari).                  */
/*           end=10-12 → false                                                */
/*           end=10-13 → true (buffer baru d=14 adalah hari pakai C2=1 +      */
/*                              MAX buffer baru=1 → total 2 > kuota 1)        */
/*           end=10-20 → true (jauh di atas, melewati bookingC2 sepenuhnya)   */
/* ========================================================================== */

test('baru #4a: isEndDateDisabled contoh A — melebihi getMaxEndDate', () => {
  const bs = [bookingA];
  const start = '2026-10-03';
  assert.equal(getMaxEndDate(start, bs, T), '2026-10-18', 'prekondisi: batas max = 10-18');
  assert.equal(
    isEndDateDisabled('2026-10-18', start, bs, T),
    false,
    'tepat di batas → tidak disabled'
  );
  assert.equal(
    isEndDateDisabled('2026-10-19', start, bs, T),
    true,
    '+1 hari dari max → bentrok (lihat penjelasan test contoh A bentrok di 10-19)'
  );
  assert.equal(
    isEndDateDisabled('2026-10-20', start, bs, T),
    true,
    'jauh di atas max → tetap disabled'
  );
});

test('baru #4b: isEndDateDisabled contoh C — melebihi getMaxEndDate', () => {
  const bs = [bookingC1Aktif, bookingC2];
  const start = '2026-10-12';
  assert.equal(
    getMaxEndDate(start, bs, CT),
    '2026-10-12',
    'prekondisi: batas max = 10-12 (hanya 1 hari celah)'
  );
  assert.equal(
    isEndDateDisabled('2026-10-12', start, bs, CT),
    false,
    'tepat di batas → tidak disabled'
  );
  assert.equal(
    isEndDateDisabled('2026-10-13', start, bs, CT),
    true,
    '+1 hari dari max → d=14: pakai C2(1) + buffer baru MAX(1) = 2 > 1'
  );
  assert.equal(
    isEndDateDisabled('2026-10-20', start, bs, CT),
    true,
    'jauh di atas max (sampai akhir bookingC2) → tetap disabled'
  );
});

/* ========================================================================== */
/*                         Edge case: buffer field eksplisit                  */
/* ========================================================================== */

test('bufferStartDate / bufferEndDate eksplisit — dihargai di atas rumus start−1 / end+1', () => {
  // Booking normal: 10-20..10-22, jumlah 1. Default buffer 19 & 23.
  // Kita atur buffer: start=10-17, end=10-25 (luar biasa lebar).
  const book = {
    id: 'eb',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-20',
    selesai: '2026-10-22',
    jumlahPinjam: 1,
    bufferStartDate: '2026-10-17',
    bufferEndDate: '2026-10-25',
  };
  const bs = [book];
  // 10-17 = buffer (defaultnya 19). Harus committed 1.
  assert.equal(getCommittedQuota('2026-10-17', bs, CT.today), 1);
  // 10-18 = buffer (seharusnya tidak buffer default). Tetap 1.
  assert.equal(getCommittedQuota('2026-10-18', bs, CT.today), 1);
  // 10-20 = pakai → 1
  assert.equal(getCommittedQuota('2026-10-20', bs, CT.today), 1);
  // 10-23 = default bukan buffer, tapi eksplisit buffer → 1
  assert.equal(getCommittedQuota('2026-10-23', bs, CT.today), 1);
  // 10-25 = buffer end eksplisit → 1
  assert.equal(getCommittedQuota('2026-10-25', bs, CT.today), 1);
  // 10-26 bukan → 0
  assert.equal(getCommittedQuota('2026-10-26', bs, CT.today), 0);
  // Akibatnya mulai 10-18 disabled.
  assert.equal(isStartDateDisabled('2026-10-18', bs, CT), true);
});

/* ========================================================================== */
/*                         Edge case: status Terlambat                        */
/* ========================================================================== */

test('Terlambat: hari pakai diperpanjang sampai today, pengecekan today+1', () => {
  // Booking seharusnya selesai 10-05. Hari ini 10-10, status Terlambat.
  // → Hari pakai efektif: 10-01 .. 10-10 (today). Pengecekan = 10-11.
  const terlambat = {
    id: 't1',
    status: STATUS_PEMINJAMAN.TERLAMBAT,
    mulai: '2026-10-01',
    selesai: '2026-10-05',
    jumlahPinjam: 1,
  };
  const bs = [terlambat];
  const today = '2026-10-10';
  assert.equal(getCommittedQuota('2026-10-05', bs, today), 1);
  assert.equal(
    getCommittedQuota('2026-10-08', bs, today),
    1,
    '10-08 masuk hari pakai diperpanjang'
  );
  assert.equal(getCommittedQuota('2026-10-10', bs, today), 1, 'today = 10-10 masuk hari pakai');
  assert.equal(getCommittedQuota('2026-10-11', bs, today), 1, 'today+1 = 10-11 hari pengecekan');
  assert.equal(getCommittedQuota('2026-10-12', bs, today), 0);
});

/* ========================================================================== */
/*                         pergantian bulan, tahun, kabisat                   */
/* ========================================================================== */

test('pergantian tahun (akhir Desember)', () => {
  // Booking sampai akhir tahun 2026. Pengajuan 2027-01-03 (earliest H+2 dari 01-01).
  const book = {
    id: 'tahun',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-12-20',
    selesai: '2026-12-28',
    jumlahPinjam: 1,
  };
  const opt = { totalBarang: 1, today: '2027-01-01' };
  assert.equal(getEarliestStartDate('2027-01-01'), '2027-01-03');
  assert.equal(getCommittedQuota('2026-12-29', [book], '2027-01-01'), 1); // buffer
  assert.equal(getCommittedQuota('2026-12-30', [book], '2027-01-01'), 0);
  assert.equal(isStartDateDisabled('2027-01-03', [book], opt), false);
  assert.equal(isRangeAvailable('2027-01-03', '2027-01-10', [book], opt).ok, true);
});

test('tahun kabisat: Februari 2028', () => {
  const book = {
    id: 'kab',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2028-02-25',
    selesai: '2028-02-28',
    jumlahPinjam: 1,
  };
  const today = '2028-02-01';
  // buffer book berakhir 2028-02-29 karena end+1 = 29 kabisat.
  assert.equal(getCommittedQuota('2028-02-29', [book], today), 1, '29 Feb buffer');
  assert.equal(getCommittedQuota('2028-03-01', [book], today), 0);
  // earliest = 02-03. Pengajuan mulai 2028-03-01 → enabled.
  const opt = { totalBarang: 1, today };
  assert.equal(isStartDateDisabled('2028-03-01', [book], opt), false);
});

/* ========================================================================== */
/*                     isEndDateDisabled — endDate < startDate wajib true     */
/* ========================================================================== */

test('isEndDateDisabled — end < start wajib true', () => {
  assert.equal(isEndDateDisabled('2026-10-02', '2026-10-10', [], T), true);
});

test('getMaxEndDate untuk start yang invalid harus null', () => {
  const bs = [bookingA];
  // 10-01 = < earliest.
  assert.equal(getMaxEndDate('2026-10-01', bs, T), null);
});

/* ========================================================================== */
/*              isRangeAvailable — reason jelas (bahasa Indonesia)            */
/* ========================================================================== */

test('isRangeAvailable — reason lengkap: disebut tanggal + sisa kuota + jumlah butuh', () => {
  const bs = [bookingA];
  const r = isRangeAvailable('2026-10-03', '2026-10-19', bs, T);
  assert.equal(r.ok, false);
  assert.match(r.reason || '', /2026-10-19/);
  assert.match(r.reason || '', /Tersedia 0/);
  assert.match(r.reason || '', /membutuhkan 1/);
});

/* ========================================================================== */
/*                               canStartOn Tests                             */
/* ========================================================================== */

test('canStartOn — batas awal H+2 (today: 2026-10-01)', () => {
  // H+0 (2026-10-01) -> false
  assert.equal(canStartOn([], 1, 1, '2026-10-01', '2026-10-01'), false);
  // H+1 (2026-10-02) -> false
  assert.equal(canStartOn([], 1, 1, '2026-10-02', '2026-10-01'), false);
  // H+2 (2026-10-03) -> true
  assert.equal(canStartOn([], 1, 1, '2026-10-03', '2026-10-01'), true);
  // Bentuk objek opsi
  assert.equal(
    canStartOn('2026-10-03', [], { totalBarang: 1, jumlah: 1, today: '2026-10-01' }),
    true
  );
});

test('canStartOn — buffer berbagi hari diperbolehkan jika kuota cukup', () => {
  const book = {
    id: 'b-buf',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-05',
    selesai: '2026-10-10',
    jumlahPinjam: 1,
  };
  assert.equal(canStartOn([book], 1, 1, '2026-10-12', '2026-10-01'), true);
});

test('canStartOn — buffer tidak boleh jatuh di hari pakai booking lain jika kuota penuh', () => {
  const book = {
    id: 'b-buf',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-05',
    selesai: '2026-10-10',
    jumlahPinjam: 1,
  };
  assert.equal(canStartOn([book], 1, 1, '2026-10-11', '2026-10-01'), false);
});

test('canStartOn — kuota penuh', () => {
  const b1 = {
    id: '1',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-20',
    selesai: '2026-10-25',
    jumlahPinjam: 1,
  };
  const b2 = {
    id: '2',
    status: STATUS_PEMINJAMAN.DISETUJUI,
    mulai: '2026-10-20',
    selesai: '2026-10-25',
    jumlahPinjam: 1,
  };
  assert.equal(canStartOn([b1, b2], 2, 1, '2026-10-22', '2026-10-01'), false);
});

test('canStartOn — jumlah > sisa barang', () => {
  const b = {
    id: '1',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-20',
    selesai: '2026-10-25',
    jumlahPinjam: 2,
  };
  assert.equal(canStartOn([b], 3, 1, '2026-10-22', '2026-10-01'), true);
  assert.equal(canStartOn([b], 3, 2, '2026-10-22', '2026-10-01'), false);
  assert.equal(canStartOn([b], 3, 4, '2026-10-22', '2026-10-01'), false);
});

test('canStartOn — booking terlambat memanjang sampai hari ini', () => {
  const bookTerlambat = {
    id: 'late',
    status: STATUS_PEMINJAMAN.TERLAMBAT,
    mulai: '2026-10-01',
    selesai: '2026-10-03',
    jumlahPinjam: 1,
  };
  assert.equal(canStartOn([bookTerlambat], 1, 1, '2026-10-07', '2026-10-05'), true);
  assert.equal(canStartOn([bookTerlambat], 1, 1, '2026-10-06', '2026-10-05'), false);
});

test('canStartOn — rentang satu hari mengecek start-1, start, start+1', () => {
  const b = {
    id: '1',
    status: STATUS_PEMINJAMAN.DIPINJAM,
    mulai: '2026-10-15',
    selesai: '2026-10-18',
    jumlahPinjam: 1,
  };
  assert.equal(canStartOn([b], 1, 1, '2026-10-14', '2026-10-01'), false);
  assert.equal(canStartOn([b], 1, 1, '2026-10-13', '2026-10-01'), true);
});

test('MAX_HORIZON_DAYS: konstan 366 hari dan membatasi rentang berlebih', async () => {
  const { MAX_HORIZON_DAYS } = await import('../js/lib/date-rules.js');
  assert.equal(MAX_HORIZON_DAYS, 366);

  // isRangeAvailable menolak rentang melebihi horizon
  const r = isRangeAvailable('2026-10-03', '2028-10-03', [], {
    totalBarang: 1,
    today: '2026-10-01',
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /horizon/);
});
