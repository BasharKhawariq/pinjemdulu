/**
 * tests/quota-oracle.test.js — Pembanding NAIF Independen Aturan Kuota & Kalender.
 *
 * Ditulis LANGSUNG dari teks aturan bisnis (docs/API-CONTRACT.md § Aturan bisnis & Enum):
 * 1. H+2: start >= today + 2.
 * 2. Hari pakai = [start, end], hari persiapan = start − 1, hari pengecekan = end + 1.
 * 3. Buffer boleh berbagi hari: terpakai(d) = Σ jumlahPinjam (hari pakai mencakup d) +
 *    MAX jumlahPinjam (hari d HANYA buffer).
 * 4. Pengajuan (q, s, e) valid bila terpakai(d) <= totalBarang untuk SEMUA d ∈ [s − 1, e + 1].
 * 5. Status menahan: menunggu_persetujuan, disetujui, sedang_dipinjam, menunggu_pengembalian, terlambat.
 *    Status tidak menahan: ditolak, selesai.
 * 6. Terlambat: hari pakai diperpanjang sampai today, hari pengecekan = today + 1.
 * 7. Pengembalian lebih awal: menunggu_pengembalian tetap menahan kuota sampai bufferEndDate.
 *
 * PENTING: File ini TIDAK mengimpor date-rules.js untuk implementasi oracle-nya.
 * Oracle sepenuhnya mandiri dengan aritmatika hari netral.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mockInventaris,
  getMockPeminjamanAktifById,
  setMockToday,
} from '../js/data/inventaris.js';
import { STATUS_MENAHAN_BARANG, STATUS_PEMINJAMAN } from '../js/lib/constants.js';
import {
  canStartOn,
  isRangeAvailable,
  getMaxEndDate,
  getDayStatus,
  isStartDateDisabled,
  isEndDateDisabled,
  getMaxUnitsForRange,
} from '../js/lib/date-rules.js';
import { createPeminjaman, _resetPeminjamanMockState } from '../js/services/peminjaman.js';

/* -------------------------------------------------------------------------- */
/*                    NAIVE ORACLE PURE HELPER (NETRAL)                       */
/* -------------------------------------------------------------------------- */

function parseISOToDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function dayToISO(dayNum) {
  const d = new Date(dayNum * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso, n) {
  return dayToISO(parseISOToDay(iso) + n);
}

/**
 * Normalisasi rentang efektif satu booking sesuai aturan kontrak.
 */
function getNaiveBookingRanges(b, todayISO) {
  const startDay = parseISOToDay(b.startDate || b.mulai);
  let endDay = parseISOToDay(b.endDate || b.selesai);
  const todayDay = parseISOToDay(todayISO);
  const isTerlambat = b.status === STATUS_PEMINJAMAN.TERLAMBAT || b.status === 'terlambat';

  if (isTerlambat && endDay < todayDay) {
    endDay = todayDay;
  }

  let bufStartDay = b.bufferStartDate ? parseISOToDay(b.bufferStartDate) : startDay - 1;
  let bufEndDay = b.bufferEndDate ? parseISOToDay(b.bufferEndDate) : endDay + 1;

  if (isTerlambat && bufEndDay < todayDay + 1) {
    bufEndDay = todayDay + 1;
  }

  return { startDay, endDay, bufStartDay, bufEndDay };
}

/**
 * Hitung kuota terpakai naif pada satu hari, opsional dengan simulasi pengajuan baru.
 */
function naiveTerpakai(dayNum, bookings, todayISO, newReq = null) {
  let sumPakai = 0;
  let maxBuffer = 0;

  for (const b of bookings) {
    if (!STATUS_MENAHAN_BARANG.includes(b.status)) continue;
    const { startDay, endDay, bufStartDay, bufEndDay } = getNaiveBookingRanges(b, todayISO);
    const q = Number(b.jumlahPinjam) || 1;

    const inPakai = dayNum >= startDay && dayNum <= endDay;
    const inBuf = dayNum >= bufStartDay && dayNum <= bufEndDay;

    if (inPakai) {
      sumPakai += q;
    } else if (inBuf) {
      if (q > maxBuffer) maxBuffer = q;
    }
  }

  if (newReq) {
    const { startDay, endDay, q } = newReq;
    const inPakai = dayNum >= startDay && dayNum <= endDay;
    const isBufferDay = dayNum === startDay - 1 || dayNum === endDay + 1;

    if (inPakai) {
      sumPakai += q;
    } else if (isBufferDay) {
      if (q > maxBuffer) maxBuffer = q;
    }
  }

  return sumPakai + maxBuffer;
}

/**
 * Validasi naif ketersediaan rentang [startDay, endDay] untuk kuota q.
 */
function naiveIsRangeAvailable(startISO, endISO, q, totalBarang, bookings, todayISO) {
  const startDay = parseISOToDay(startISO);
  const endDay = parseISOToDay(endISO);
  const todayDay = parseISOToDay(todayISO);

  if (startDay < todayDay + 2) return false; // Aturan 1: H+2
  if (endDay < startDay) return false;
  if (q > totalBarang || q <= 0) return false;

  const newReq = { startDay, endDay, q };
  const fromDay = startDay - 1;
  const toDay = endDay + 1;

  for (let d = fromDay; d <= toDay; d++) {
    const used = naiveTerpakai(d, bookings, todayISO, newReq);
    if (used > totalBarang) return false;
  }
  return true;
}

/**
 * Validasi naif apakah tanggal mulai startISO sah.
 */
function naiveCanStartOn(startISO, q, totalBarang, bookings, todayISO) {
  return naiveIsRangeAvailable(startISO, startISO, q, totalBarang, bookings, todayISO);
}

/**
 * Cari batas tanggal selesai terbesar yang valid untuk tanggal mulai startISO.
 */
function naiveGetMaxEndDate(startISO, q, totalBarang, bookings, todayISO, horizon = 366) {
  if (!naiveCanStartOn(startISO, q, totalBarang, bookings, todayISO)) {
    return null;
  }

  const startDay = parseISOToDay(startISO);
  let lastValidDay = startDay;

  for (let i = 1; i < horizon; i++) {
    const nextEndDay = startDay + i;
    const req = { startDay, endDay: nextEndDay, q };
    // Cukup periksa hari yang menjadi hari pakai baru (nextEndDay) dan buffer baru (nextEndDay + 1)
    if (naiveTerpakai(nextEndDay, bookings, todayISO, req) > totalBarang) {
      break;
    }
    if (naiveTerpakai(nextEndDay + 1, bookings, todayISO, req) > totalBarang) {
      break;
    }
    lastValidDay = nextEndDay;
  }

  if (lastValidDay === startDay + horizon - 1) {
    return Infinity;
  }
  return dayToISO(lastValidDay);
}

/**
 * Hitung jumlah unit terbesar naif yang masih valid untuk seluruh rentang [startISO, endISO].
 */
function naiveGetMaxUnitsForRange(startISO, endISO, totalBarang, bookings, todayISO) {
  const startDay = parseISOToDay(startISO);
  const endDay = parseISOToDay(endISO);
  const todayDay = parseISOToDay(todayISO);

  if (startDay < todayDay + 2 || endDay < startDay || totalBarang <= 0) {
    return 0;
  }

  let maxUnits = totalBarang;
  for (let d = startDay - 1; d <= endDay + 1; d++) {
    const isPakai = d >= startDay && d <= endDay;
    let limit;
    if (isPakai) {
      const committed = naiveTerpakai(d, bookings, todayISO, null);
      limit = totalBarang - committed;
    } else {
      // Pada hari buffer, pengajuan baru dihitung dengan maxBuffer
      let sumPakaiExisting = 0;
      for (const b of bookings) {
        if (!STATUS_MENAHAN_BARANG.includes(b.status)) continue;
        const { startDay: s, endDay: e } = getNaiveBookingRanges(b, todayISO);
        if (d >= s && d <= e) {
          sumPakaiExisting += Number(b.jumlahPinjam) || 1;
        }
      }
      limit = totalBarang - sumPakaiExisting;
    }
    if (limit < maxUnits) {
      maxUnits = limit;
    }
  }

  return Math.max(0, maxUnits);
}

/* -------------------------------------------------------------------------- */
/*                         TEST SUITE 1: DATA MOCK                            */
/* -------------------------------------------------------------------------- */

const TEST_TODAY = '2026-10-09';

for (const inv of mockInventaris) {
  test(`oracle vs date-rules: ${inv.idInventaris} (${inv.namaBarang})`, { timeout: 15000 }, () => {
    const bookings = getMockPeminjamanAktifById(inv.idInventaris);
    const total = inv.totalBarang;

    for (let q = 1; q <= total; q++) {
      for (let offset = 0; offset < 35; offset++) {
        const sISO = addDaysISO(TEST_TODAY, offset);

        // 1. canStartOn vs naiveCanStartOn
        const nCanStart = naiveCanStartOn(sISO, q, total, bookings, TEST_TODAY);
        const rCanStart = canStartOn(bookings, total, q, sISO, TEST_TODAY);
        assert.equal(
          rCanStart,
          nCanStart,
          `canStartOn selisih pada ${inv.idInventaris}, s=${sISO}, q=${q}`
        );

        // 2. isStartDateDisabled
        const rStartDisabled = isStartDateDisabled(sISO, bookings, {
          totalBarang: total,
          jumlah: q,
          today: TEST_TODAY,
        });
        assert.equal(
          rStartDisabled,
          !nCanStart,
          `isStartDateDisabled selisih pada ${inv.idInventaris}, s=${sISO}, q=${q}`
        );

        // 3. getMaxEndDate
        const nMaxEnd = naiveGetMaxEndDate(sISO, q, total, bookings, TEST_TODAY);
        const rMaxEnd = getMaxEndDate(sISO, bookings, {
          totalBarang: total,
          jumlah: q,
          today: TEST_TODAY,
        });
        assert.equal(
          rMaxEnd,
          nMaxEnd,
          `getMaxEndDate selisih pada ${inv.idInventaris}, s=${sISO}, q=${q}`
        );

        if (rCanStart) {
          for (let endOffset = 0; endOffset < 15; endOffset++) {
            const eISO = addDaysISO(sISO, endOffset);

            // 4. isRangeAvailable vs naiveIsRangeAvailable
            const nRangeAvail = naiveIsRangeAvailable(sISO, eISO, q, total, bookings, TEST_TODAY);
            const rRangeAvail = isRangeAvailable(sISO, eISO, bookings, {
              totalBarang: total,
              jumlah: q,
              today: TEST_TODAY,
            }).ok;
            assert.equal(
              rRangeAvail,
              nRangeAvail,
              `isRangeAvailable selisih pada ${inv.idInventaris}, [${sISO}, ${eISO}], q=${q}`
            );

            // 5. isEndDateDisabled
            const rEndDisabled = isEndDateDisabled(eISO, sISO, bookings, {
              totalBarang: total,
              jumlah: q,
              today: TEST_TODAY,
            });
            assert.equal(
              rEndDisabled,
              !nRangeAvail,
              `isEndDateDisabled selisih pada ${inv.idInventaris}, [${sISO}, ${eISO}], q=${q}`
            );

            // 6. getMaxUnitsForRange konsistensi
            const maxUnits = getMaxUnitsForRange(sISO, eISO, {
              bookings,
              totalBarang: total,
              today: TEST_TODAY,
            });
            const naiveMaxU = naiveGetMaxUnitsForRange(sISO, eISO, total, bookings, TEST_TODAY);
            assert.equal(
              maxUnits,
              naiveMaxU,
              `getMaxUnitsForRange selisih pada ${inv.idInventaris}, [${sISO}, ${eISO}]`
            );
            assert.equal(
              q <= maxUnits,
              nRangeAvail,
              `Konsistensi q <= maxUnits (${q} <= ${maxUnits}) !== rangeAvail (${nRangeAvail}) pada ${inv.idInventaris}`
            );
          }
        }
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                     TEST SUITE 2: SKENARIO SINTETIS                        */
/* -------------------------------------------------------------------------- */

test('skenario sintetis 1: booking menunggu_persetujuan menahan kuota sama seperti disetujui', () => {
  const today = '2026-10-01';
  // 1 unit total. Satu booking berstatus menunggu_persetujuan (diajukan)
  const bookingsMenunggu = [
    {
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.DIAJUKAN, // menunggu_persetujuan
    },
  ];

  // 1 unit total. Satu booking berstatus disetujui pada tanggal yang sama
  const bookingsDisetujui = [
    {
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.DISETUJUI,
    },
  ];

  for (let offset = 2; offset <= 12; offset++) {
    const s = addDaysISO(today, offset);
    const canStartMenunggu = canStartOn(bookingsMenunggu, 1, 1, s, today);
    const canStartDisetujui = canStartOn(bookingsDisetujui, 1, 1, s, today);

    // Keduanya harus identik dalam menahan kuota
    assert.equal(
      canStartMenunggu,
      canStartDisetujui,
      `Perbedaan kuota antara menunggu_persetujuan dan disetujui pada ${s}`
    );

    const maxEndMenunggu = getMaxEndDate(s, bookingsMenunggu, { totalBarang: 1, jumlah: 1, today });
    const maxEndDisetujui = getMaxEndDate(s, bookingsDisetujui, {
      totalBarang: 1,
      jumlah: 1,
      today,
    });
    assert.equal(maxEndMenunggu, maxEndDisetujui);
  }

  // Uji persaingan unit terakhir: 2 unit total, 1 disetujui, 1 diajukan -> unit habis
  const bookingsBersaing = [
    {
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.DISETUJUI,
    },
    {
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.DIAJUKAN,
    },
  ];
  assert.equal(canStartOn(bookingsBersaing, 2, 1, '2026-10-05', today), false);

  // Tooltip hari yang terkunci karena menunggu_persetujuan harus memuat teks yang jelas
  const dayStatusMenunggu = getDayStatus('2026-10-06', {
    bookings: bookingsMenunggu,
    totalBarang: 1,
    jumlahPinjam: 1,
    today,
  });
  assert.equal(dayStatusMenunggu.status, 'full');
  assert.equal(dayStatusMenunggu.reason, 'Sedang diajukan peminjam lain (menunggu persetujuan)');
});

test('skenario sintetis 2: booking bersebelahan (end + 1 bertemu start - 1) berbagi buffer', () => {
  const today = '2026-10-01';
  // Booking A selesai 10-05 (buffer check = 10-06). Booking B mulai 10-07 (buffer prep = 10-06).
  const bookings = [
    {
      startDate: '2026-10-03',
      endDate: '2026-10-05',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.DISETUJUI,
    },
    {
      startDate: '2026-10-07',
      endDate: '2026-10-09',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.DISETUJUI,
    },
  ];

  // Pada 10-06, buffer check A dan buffer prep B berbagi hari (MAX = 1). Total 1 unit -> terpakai = 1.
  assert.equal(naiveTerpakai(parseISOToDay('2026-10-06'), bookings, today), 1);

  // Jika total 1 unit, peminjam ketiga C tidak bisa mulai di 10-06
  assert.equal(canStartOn(bookings, 1, 1, '2026-10-06', today), false);

  // Jika total 2 unit, peminjam ketiga C BISA mulai di 10-06 (unit ke-2 bebas)
  assert.equal(canStartOn(bookings, 2, 1, '2026-10-06', today), true);
});

test('skenario sintetis 3: booking terlambat memperpanjang hari pakai sampai today dan buffer today + 1', () => {
  const today = '2026-10-09';
  // Booking seharusnya selesai 10-05, tetapi status terlambat
  const bookings = [
    {
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.TERLAMBAT,
    },
  ];

  // Hari pakai diperpanjang sampai 10-09, hari pengecekan menjadi 10-10
  // Peminjam baru paling awal mulai 10-11 (H+2)
  assert.equal(canStartOn(bookings, 1, 1, '2026-10-11', today), true);

  // Pada 10-10, buffer check dari terlambat menahan 1 unit
  assert.equal(naiveTerpakai(parseISOToDay('2026-10-10'), bookings, today), 1);
});

test('skenario sintetis 4: booking menunggu_pengembalian tetap menahan kuota sampai bufferEndDate', () => {
  const today = '2026-10-09';
  const bookings = [
    {
      startDate: '2026-10-05',
      endDate: '2026-10-12',
      bufferStartDate: '2026-10-04',
      bufferEndDate: '2026-10-13',
      jumlahPinjam: 1,
      status: STATUS_PEMINJAMAN.MENUNGGU_KONFIRMASI_PENGEMBALIAN,
    },
  ];

  // Sampai 10-12 masih hari pakai, 10-13 hari pengecekan
  assert.equal(canStartOn(bookings, 1, 1, '2026-10-11', today), false);
  assert.equal(canStartOn(bookings, 1, 1, '2026-10-12', today), false);
  // Paling cepat mulai 10-14 (buffer check 10-13 dibagi dengan buffer prep peminjam baru di 10-13)
  assert.equal(canStartOn(bookings, 1, 1, '2026-10-14', today), true);
});

test('skenario sintetis 5: multi-unit bertumpuk dengan jumlah kuota berbeda', () => {
  const today = '2026-10-01';
  const total = 5;
  const bookings = [
    {
      startDate: '2026-10-05',
      endDate: '2026-10-08',
      jumlahPinjam: 2,
      status: STATUS_PEMINJAMAN.DISETUJUI,
    },
    {
      startDate: '2026-10-07',
      endDate: '2026-10-10',
      jumlahPinjam: 2,
      status: STATUS_PEMINJAMAN.DIAJUKAN,
    },
  ];

  // Pada 10-05 dan 10-06: 2 unit terpakai oleh B1 (sisa 3).
  // Namun rentang [10-05, 10-06] memiliki hari pengecekan (buffer) di 10-07.
  // Pada 10-07, B1 (2u) dan B2 (2u) sama-sama pakai (total 4u terpakai, sisa 1u).
  // Maka [10-05, 10-06] dibatasi oleh buffer di 10-07 menjadi maks 1 unit:
  assert.equal(
    getMaxUnitsForRange('2026-10-05', '2026-10-06', { bookings, totalBarang: total, today }),
    1
  );
  assert.equal(
    getMaxUnitsForRange('2026-10-07', '2026-10-08', { bookings, totalBarang: total, today }),
    1
  );
  assert.equal(
    getMaxUnitsForRange('2026-10-05', '2026-10-10', { bookings, totalBarang: total, today }),
    1
  );

  // Sedangkan rentang [10-03, 10-04] (buffer [10-02, 10-05]):
  // di 10-05 hanya B1 yang pakai (2u), sisa kuota = 3 unit:
  assert.equal(
    getMaxUnitsForRange('2026-10-03', '2026-10-04', { bookings, totalBarang: total, today }),
    3
  );
});

/* -------------------------------------------------------------------------- */
/*                  TEST SUITE 3: PROPERTY TEST CREATEPEMINJAMAN              */
/* -------------------------------------------------------------------------- */

test('property test: hari berstatus free atau partial yang valid SELALU diterima createPeminjaman', async () => {
  _resetPeminjamanMockState(TEST_TODAY);
  const today = TEST_TODAY;
  setMockToday(today);
  const inv = mockInventaris.find((it) => it.idInventaris === 'inv-3'); // Kabel HDMI
  const bookings = getMockPeminjamanAktifById('inv-3');

  // Uji tanggal-tanggal dalam 30 hari ke depan
  for (let offset = 2; offset < 25; offset++) {
    const sISO = addDaysISO(today, offset);
    const dayStat = getDayStatus(sISO, {
      bookings,
      totalBarang: inv.totalBarang,
      jumlahPinjam: 1,
      today,
      phase: 'start',
    });

    if (dayStat.status === 'free' || (dayStat.status === 'partial' && !dayStat.disabled)) {
      // Buat pengajuan 1 hari untuk 1 unit
      const res = await createPeminjaman({
        idInventaris: 'inv-3',
        startDate: sISO,
        endDate: sISO,
        jumlahPinjam: 1,
        keperluan: 'Uji Properti Kuota Mock',
      });
      assert.ok(res?.idPeminjaman, `Pengajuan gagal pada hari yang dinyatakan tersedia: ${sISO}`);
    }
  }
});

/* -------------------------------------------------------------------------- */
/*                  TEST SUITE 4: TABEL KEBENARAN INV-3                       */
/* -------------------------------------------------------------------------- */

test('tabel kebenaran inv-3 (Kabel HDMI) 1-31 Okt 2026 (today 2026-10-09)', () => {
  _resetPeminjamanMockState(TEST_TODAY);
  const inv = mockInventaris.find((it) => it.idInventaris === 'inv-3');
  const bookings = getMockPeminjamanAktifById('inv-3');
  const today = '2026-10-09';
  setMockToday(today);

  function classify(dayISO, q) {
    if (dayISO < '2026-10-11') return 'past';
    const can = canStartOn(bookings, inv.totalBarang, q, dayISO, today);
    const committed = naiveTerpakai(parseISOToDay(dayISO), bookings, today, null);
    if (can) {
      if (committed === 0) return 'free';
      return 'partial';
    }
    return 'full';
  }

  // Verifikasi perilaku spesifik 11-15 Okt pada q = 1, 3, 5, 6
  // q = 1: 11-15 Okt semuanya partial (ada sisa unit dan muat kuota)
  for (const d of ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']) {
    assert.equal(classify(d, 1), 'partial');
  }

  // q = 3: 11 dan 12 Okt full (sisa 1 < 3), 13-15 Okt partial (sisa 3 >= 3)
  assert.equal(classify('2026-10-11', 3), 'full');
  assert.equal(classify('2026-10-12', 3), 'full');
  assert.equal(classify('2026-10-13', 3), 'partial');
  assert.equal(classify('2026-10-14', 3), 'partial');
  assert.equal(classify('2026-10-15', 3), 'partial');

  // q = 5 dan 6: 11-15 Okt full
  for (const d of ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']) {
    assert.equal(classify(d, 5), 'full');
    assert.equal(classify(d, 6), 'full');
  }

  // 16-31 Okt: bebas penuh untuk semua q (1, 3, 5, 6)
  for (let d = 16; d <= 31; d++) {
    const dayISO = `2026-10-${d}`;
    assert.equal(classify(dayISO, 1), 'free');
    assert.equal(classify(dayISO, 3), 'free');
    assert.equal(classify(dayISO, 5), 'free');
    assert.equal(classify(dayISO, 6), 'free');
  }
});
