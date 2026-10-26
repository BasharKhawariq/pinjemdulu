import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import {
  buildMonthModel,
  getCalendarStatusText,
  moveFocusDate,
  NAMA_HARI,
  NAMA_BULAN,
} from '../js/lib/calendar-model.js';
import {
  mockInventaris,
  getMockPeminjamanAktifById,
  setMockToday,
} from '../js/data/inventaris.js';
import { _resetPeminjamanMockState } from '../js/services/peminjaman.js';

/* -------------------------------------------------------------------------- */
/*  (1) UJI PENERIMAAN: buildMonthModel vs TABEL KEBENARAN inv-3             */
/* -------------------------------------------------------------------------- */

test('UJI PENERIMAAN: buildMonthModel untuk inv-3 (Kabel HDMI, Okt 2026, today 2026-10-09) pada q = 1, 3, 5, 6', () => {
  const today = '2026-10-09';
  _resetPeminjamanMockState(today);
  setMockToday(today);

  const inv = mockInventaris.find((it) => it.idInventaris === 'inv-3');
  assert.ok(inv, 'inv-3 harus ditemukan');
  assert.equal(inv.totalBarang, 6);

  const bookings = getMockPeminjamanAktifById('inv-3');
  assert.equal(bookings.length, 2);

  for (const q of [1, 3, 5, 6]) {
    const model = buildMonthModel({
      year: 2026,
      month: 10,
      today,
      phase: 'start',
      jumlahPinjam: q,
      totalBarang: inv.totalBarang,
      bookings,
    });

    assert.equal(model.label, 'Oktober 2026');

    // Kumpulkan sel tanggal Oktober (inMonth: true)
    const oktDays = new Map();
    for (const week of model.weeks) {
      for (const day of week) {
        if (day.inMonth) {
          oktDays.set(day.iso, day);
        }
      }
    }
    assert.equal(oktDays.size, 31, 'Oktober harus memiliki 31 hari');

    // Hari sebelum H+2 (< 2026-10-11) selalu past dan disabled
    for (let d = 1; d <= 10; d++) {
      const iso = `2026-10-${String(d).padStart(2, '0')}`;
      const day = oktDays.get(iso);
      assert.equal(day.status, 'past', `${iso} harus berstatus past`);
      assert.equal(day.disabled, true, `${iso} harus disabled`);
    }

    // Hari 16-31 Okt: bebas penuh untuk semua q (sisa = 6, free, tidak disabled)
    for (let d = 16; d <= 31; d++) {
      const iso = `2026-10-${String(d).padStart(2, '0')}`;
      const day = oktDays.get(iso);
      assert.equal(day.status, 'free', `${iso} pada q=${q} harus free`);
      assert.equal(day.sisa, 6, `${iso} pada q=${q} sisa harus 6`);
      assert.equal(day.disabled, false, `${iso} pada q=${q} harus bisa dipilih`);
    }

    // Perilaku spesifik 11-15 Okt per nilai kuota q:
    if (q === 1) {
      // Pada q=1, semua hari 11-15 Okt bisa dipilih (disabled: false)
      const d11 = oktDays.get('2026-10-11');
      const d12 = oktDays.get('2026-10-12');
      const d13 = oktDays.get('2026-10-13');
      const d14 = oktDays.get('2026-10-14');
      const d15 = oktDays.get('2026-10-15');

      assert.equal(d11.sisa, 1);
      assert.equal(d11.disabled, false);
      assert.equal(d12.sisa, 1);
      assert.equal(d12.disabled, false);
      assert.equal(d13.sisa, 3);
      assert.equal(d13.disabled, false);
      assert.equal(d14.sisa, 3);
      assert.equal(d14.disabled, false);
      assert.equal(d15.sisa, 3);
      assert.equal(d15.disabled, false);
    } else if (q === 3) {
      // Pada q=3: 11 dan 12 Okt full (sisa 1 < 3), 13-15 Okt bisa dipilih (sisa 3 >= 3)
      const d11 = oktDays.get('2026-10-11');
      const d12 = oktDays.get('2026-10-12');
      const d13 = oktDays.get('2026-10-13');
      const d14 = oktDays.get('2026-10-14');
      const d15 = oktDays.get('2026-10-15');

      assert.equal(d11.status, 'full');
      assert.equal(d11.disabled, true);
      assert.equal(d12.status, 'full');
      assert.equal(d12.disabled, true);

      assert.equal(d13.sisa, 3);
      assert.equal(d13.disabled, false);
      assert.equal(d14.sisa, 3);
      assert.equal(d14.disabled, false);
      assert.equal(d15.sisa, 3);
      assert.equal(d15.disabled, false);
    } else if (q === 5 || q === 6) {
      // Pada q=5 dan 6: 11-15 Okt full dan disabled (sisa 1 atau 3 < q)
      for (const iso of ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']) {
        const day = oktDays.get(iso);
        assert.equal(day.status, 'full', `${iso} pada q=${q} harus full`);
        assert.equal(day.disabled, true, `${iso} pada q=${q} harus disabled`);
      }
    }
  }
});

/* -------------------------------------------------------------------------- */
/*  (2) STRUKTUR KALENDER: MINGGU SENIN, KABISAT, GANTI TAHUN, HARI LUAR BULAN */
/* -------------------------------------------------------------------------- */

test('struktur kalender: minggu dimulai Senin dan label Sen-Min', () => {
  assert.deepEqual(NAMA_HARI, ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']);
  const model = buildMonthModel({
    year: 2026,
    month: 10,
    today: '2026-10-09',
  });

  // Setiap minggu selalu tepat 7 hari
  for (const week of model.weeks) {
    assert.equal(week.length, 7);
  }

  // Hari pertama di minggu pertama harus hari Senin
  const firstDay = model.weeks[0][0];
  assert.equal(firstDay.iso, '2026-09-28'); // Senin 28 Sep 2026
  assert.equal(firstDay.inMonth, false);

  // Kamis 1 Okt 2026 berada di indeks ke-3 (Sen=0, Sel=1, Rab=2, Kam=3)
  const kamis1Okt = model.weeks[0][3];
  assert.equal(kamis1Okt.iso, '2026-10-01');
  assert.equal(kamis1Okt.inMonth, true);
  assert.equal(kamis1Okt.day, 1);
});

test('struktur kalender: tahun kabisat (Feb 2024 punya 29 hari vs Feb 2025 punya 28 hari)', () => {
  const feb2024 = buildMonthModel({
    year: 2024,
    month: 2,
    today: '2024-01-01',
  });
  let count2024 = 0;
  for (const week of feb2024.weeks) {
    for (const day of week) {
      if (day.inMonth) count2024++;
    }
  }
  assert.equal(count2024, 29, 'Februari 2024 harus memiliki 29 hari');
  assert.equal(feb2024.label, 'Februari 2024');

  const feb2025 = buildMonthModel({
    year: 2025,
    month: 2,
    today: '2025-01-01',
  });
  let count2025 = 0;
  for (const week of feb2025.weeks) {
    for (const day of week) {
      if (day.inMonth) count2025++;
    }
  }
  assert.equal(count2025, 28, 'Februari 2025 harus memiliki 28 hari');
  assert.equal(feb2025.label, 'Februari 2025');
});

test('struktur kalender: pergantian tahun (Desember 2026 & Januari 2027)', () => {
  const des2026 = buildMonthModel({
    year: 2026,
    month: 12,
    today: '2026-12-01',
  });
  assert.equal(des2026.label, 'Desember 2026');

  // Cek apakah ada hari Januari 2027 di akhir grid Desember
  const lastWeekDes = des2026.weeks[des2026.weeks.length - 1];
  const lastDayGrid = lastWeekDes[lastWeekDes.length - 1];
  assert.equal(lastDayGrid.inMonth, false);
  assert.ok(lastDayGrid.iso.startsWith('2027-01-'));

  const jan2027 = buildMonthModel({
    year: 2027,
    month: 1,
    today: '2027-01-01',
  });
  assert.equal(jan2027.label, 'Januari 2027');
  // Cek hari Desember 2026 di awal grid Januari
  const firstWeekJan = jan2027.weeks[0];
  const firstDayGrid = firstWeekJan[0];
  if (!firstDayGrid.inMonth) {
    assert.ok(firstDayGrid.iso.startsWith('2026-12-'));
  }
});

/* -------------------------------------------------------------------------- */
/*  (3) TEKS STATUS ARIA-LIVE UNTUK SEMUA FASE                                */
/* -------------------------------------------------------------------------- */

test('getCalendarStatusText: teks status aria-live sesuai fase dan pemicu buka', () => {
  // 1. Fase mulai (belum ada tanggal mulai)
  const t1 = getCalendarStatusText({
    start: null,
    end: null,
    earliest: '2026-10-11',
  });
  assert.equal(t1, 'Pilih tanggal mulai. Paling cepat 11 Okt 2026.');

  // 2. Dibuka dari field Pengembalian tanpa tanggal mulai
  const t2 = getCalendarStatusText({
    start: null,
    end: null,
    earliest: '2026-10-11',
    openedFrom: 'end',
  });
  assert.equal(t2, 'Pilih tanggal mulai terlebih dahulu');

  // 3. Fase kembali (tanggal mulai ada, tanggal kembali belum, ada batas maxEnd)
  const t3 = getCalendarStatusText({
    start: '2026-10-15',
    end: null,
    maxEnd: '2026-10-20',
  });
  assert.equal(t3, 'Mulai 15 Okt 2026. Pilih tanggal kembali (paling lambat 20 Okt 2026).');

  // 4. Fase kembali tanpa batas maxEnd (Infinity)
  const t4 = getCalendarStatusText({
    start: '2026-10-15',
    end: null,
    maxEnd: Infinity,
  });
  assert.equal(t4, 'Mulai 15 Okt 2026. Pilih tanggal kembali.');

  // 5. Fase selesai (rentang lengkap)
  const t5 = getCalendarStatusText({
    start: '2026-10-15',
    end: '2026-10-18',
  });
  assert.equal(t5, 'Pinjam 15 Okt 2026 - 18 Okt 2026. Barang disiapkan 14 Okt 2026.');
});

/* -------------------------------------------------------------------------- */
/*  (4) moveFocusDate: KEYBOARD NAVIGATION (PANAH, HOME, END, PAGEUP/DOWN)    */
/* -------------------------------------------------------------------------- */

test('moveFocusDate: navigasi keyboard seluruh tombol WAI-ARIA', () => {
  const base = '2026-10-15'; // Kamis

  // Panah kiri / kanan (±1 hari)
  assert.equal(moveFocusDate(base, 'ArrowLeft'), '2026-10-14');
  assert.equal(moveFocusDate(base, 'ArrowRight'), '2026-10-16');

  // Panah atas / bawah (±7 hari)
  assert.equal(moveFocusDate(base, 'ArrowUp'), '2026-10-08');
  assert.equal(moveFocusDate(base, 'ArrowDown'), '2026-10-22');

  // Home: Senin pekan yang sama
  assert.equal(moveFocusDate(base, 'Home'), '2026-10-12');

  // End: Minggu pekan yang sama
  assert.equal(moveFocusDate(base, 'End'), '2026-10-18');

  // PageUp: 1 bulan sebelumnya
  assert.equal(moveFocusDate(base, 'PageUp'), '2026-09-15');

  // PageDown: 1 bulan setelahnya
  assert.equal(moveFocusDate(base, 'PageDown'), '2026-11-15');

  // Clamping hari saat pindah bulan (31 Maret -> 28 Februari pada 2026)
  assert.equal(moveFocusDate('2026-03-31', 'PageUp'), '2026-02-28');
  assert.equal(moveFocusDate('2026-01-31', 'PageDown'), '2026-02-28');

  // Pergantian tahun dengan PageUp / PageDown
  assert.equal(moveFocusDate('2026-01-15', 'PageUp'), '2025-12-15');
  assert.equal(moveFocusDate('2026-12-15', 'PageDown'), '2027-01-15');
});

/* -------------------------------------------------------------------------- */
/*  (6) UJI KINERJA: 12 BULAN UNTUK BARANG TERBERAT (inv-10) < 2 DETIK        */
/* -------------------------------------------------------------------------- */

test('uji kinerja: buildMonthModel 12 bulan berturut-turut untuk inv-10 selesai < 2 detik', () => {
  const today = '2026-10-09';
  _resetPeminjamanMockState(today);
  setMockToday(today);

  const inv10 = mockInventaris.find((it) => it.idInventaris === 'inv-10');
  assert.ok(inv10, 'inv-10 harus ada');
  const bookings = getMockPeminjamanAktifById('inv-10');

  const tStart = performance.now();

  for (let m = 1; m <= 12; m++) {
    const model = buildMonthModel({
      year: 2026,
      month: m,
      today,
      phase: 'start',
      jumlahPinjam: 5,
      totalBarang: inv10.totalBarang,
      bookings,
    });
    assert.ok(model.weeks.length >= 4);
  }

  const durationMs = performance.now() - tStart;
  assert.ok(
    durationMs < 2000,
    `Waktu eksekusi 12 bulan (${durationMs.toFixed(2)} ms) harus di bawah 2000 ms`
  );
});
