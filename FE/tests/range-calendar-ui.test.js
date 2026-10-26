import test from 'node:test';
import assert from 'node:assert/strict';
import { RangeCalendar, renderRangeCalendarTrigger } from '../js/ui/range-calendar.js';
import { mockInventaris, getMockPeminjamanAktifById, setMockToday } from '../js/data/inventaris.js';
import { _resetPeminjamanMockState } from '../js/services/peminjaman.js';

// Mock minimal DOM untuk pengujian UI komponen
class MockElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this._innerHTML = '';
    this.eventListeners = {};
    this.dialog = null;
    this.content = null;
    this.open = false;
    this.focused = false;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.dialog = null;
    this.content = null;
  }

  querySelector(sel) {
    if (sel === 'dialog') {
      if (!this.dialog) this.dialog = new MockElement('dialog');
      return this.dialog;
    }
    if (sel === '#calendar-content') {
      if (!this.content) this.content = new MockElement('div');
      return this.content;
    }
    if (sel.includes('data-date')) {
      const match = sel.match(/data-date="([^"]+)"/);
      if (match && this._innerHTML.includes(`data-date="${match[1]}"`)) {
        const el = new MockElement('button');
        return el;
      }
      return null;
    }
    return null;
  }

  querySelectorAll(sel) {
    return [];
  }

  addEventListener(event, cb) {
    this.eventListeners[event] = cb;
  }

  removeEventListener(event, cb) {
    delete this.eventListeners[event];
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
  }

  focus() {
    this.focused = true;
  }

  getAttribute(name) {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  TRIGGER & ACCESSIBILITY TESTS                                             */
/* -------------------------------------------------------------------------- */

test('renderRangeCalendarTrigger: menghasilkan tombol pemicu dropdown yang aksesibel', () => {
  const kosong = renderRangeCalendarTrigger({
    id: 'tgl-trigger',
    placeholder: 'Pilih tanggal peminjaman dan pengembalian',
  }).toString();

  assert.ok(kosong.includes('<button'));
  assert.ok(kosong.includes('id="tgl-trigger"'));
  assert.ok(kosong.includes('data-action="open-calendar"'));
  assert.ok(kosong.includes('aria-haspopup="dialog"'));
  assert.ok(kosong.includes('Pilih tanggal peminjaman dan pengembalian'));
  assert.equal(kosong.includes('data-action="hapus-tanggal"'), false, 'tombol hapus tidak muncul jika kosong');

  const terisi = renderRangeCalendarTrigger({
    id: 'tgl-trigger',
    value: '20 Okt 2026 – 30 Okt 2026',
    hasError: true,
    ariaDescribedBy: 'error-tgl',
  }).toString();

  assert.ok(terisi.includes('value="') === false, 'menggunakan elemen button bukan input value');
  assert.ok(terisi.includes('20 Okt 2026 – 30 Okt 2026'));
  assert.ok(terisi.includes('data-action="hapus-tanggal"'));
  assert.ok(terisi.includes('aria-label="Hapus tanggal"'));
  assert.ok(terisi.includes('aria-invalid="true"'));
  assert.ok(terisi.includes('aria-describedby="error-tgl"'));

  // Anti-escape test
  for (const snippet of ['&lt;button', '&lt;svg', '&lt;div', '&lt;span', '&amp;lt;']) {
    assert.equal(kosong.includes(snippet), false, `tidak boleh memuat raw snippet ${snippet}`);
    assert.equal(terisi.includes(snippet), false, `tidak boleh memuat raw snippet ${snippet}`);
  }
});

/* -------------------------------------------------------------------------- */
/*  RANGE CALENDAR INITIALIZATION & STRUCTURE                                 */
/* -------------------------------------------------------------------------- */

test('RangeCalendar: merender struktur dialog awal dan konten lengkap', () => {
  const root = new MockElement();
  const calendar = new RangeCalendar(root, {
    ctx: { today: '2026-10-01', totalBarang: 2, bookings: [] },
  });

  calendar.mount();
  assert.ok(root.innerHTML.includes('<dialog'));
  assert.ok(root.innerHTML.includes('id="calendar-content"'));

  const content = root.querySelector('#calendar-content').innerHTML;
  assert.ok(content.includes('Oktober 2026'));
  assert.ok(content.includes('Sen'));
  assert.ok(content.includes('Min'));
  assert.ok(content.includes('Legenda kalender'));
  assert.ok(content.includes('Bisa dipilih'));
  assert.ok(content.includes('Persiapan / Pengecekan'));
  assert.ok(content.includes('Sebagian terpakai'));
  assert.ok(content.includes('Terkunci / Tidak tersedia'));
});

/* -------------------------------------------------------------------------- */
/*  DATA-ACTION CONSISTENCY TEST                                              */
/* -------------------------------------------------------------------------- */

test('RangeCalendar: test konsistensi data-action kalender (hari, nav bulan, reset, terapkan, tutup, X)', () => {
  const root = new MockElement();
  const calendar = new RangeCalendar(root, {
    ctx: { today: '2026-10-01', totalBarang: 2, bookings: [] },
  });
  calendar.mount();

  const content = root.querySelector('#calendar-content').innerHTML;

  // Temukan semua data-action yang ada di markup
  const matches = [...content.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
  const actionSet = new Set(matches);

  const expectedActions = [
    'bulan-sebelumnya',
    'bulan-berikutnya',
    'tutup',
    'pilih-tanggal',
    'reset-pilihan',
    'terapkan',
  ];

  for (const act of expectedActions) {
    assert.ok(actionSet.has(act), `Kalender harus merender tombol dengan data-action="${act}"`);
  }
});

/* -------------------------------------------------------------------------- */
/*  DAY CELL ARIA-LABEL & VISUAL PATTERN                                      */
/* -------------------------------------------------------------------------- */

test('RangeCalendar: tiap sel hari punya aria-label tanggal lengkap + keadaan + alasan bila terkunci', () => {
  const root = new MockElement();
  const calendar = new RangeCalendar(root, {
    ctx: {
      today: '2026-10-09',
      totalBarang: 2,
      bookings: [
        { mulai: '2026-10-14', selesai: '2026-10-15', jumlahPinjam: 2, status: 'disetujui' },
      ],
    },
  });
  calendar.mount();

  const content = root.querySelector('#calendar-content').innerHTML;

  // Tanggal 9 Okt (hari ini) < H+2 -> terkunci
  assert.ok(content.includes('aria-label="09 Okt 2026: Terkunci (Kurang dari H+2)"'));

  // Tanggal 11 Okt (H+2, bebas) -> bisa dipilih
  assert.ok(content.includes('aria-label="11 Okt 2026: Bisa dipilih (sisa 2)"'));

  // Tanggal 13 Okt (buffer persiapan) -> terkunci dengan alasan
  assert.ok(content.includes('aria-label="13 Okt 2026: Terkunci (Hari persiapan peminjam lain)"'));

  // Tanggal 14 Okt (dipinjam penuh) -> terkunci dengan alasan
  assert.ok(content.includes('aria-label="14 Okt 2026: Terkunci (Dipinjam 2026-10-14 - 2026-10-15)"'));
});

/* -------------------------------------------------------------------------- */
/*  UJI PENERIMAAN: inv-3 TERHADAP MODEL YANG DIRENDER KALENDER BARU          */
/* -------------------------------------------------------------------------- */

test('UJI PENERIMAAN: model yang dirender RangeCalendar untuk inv-3 (today 2026-10-09) pada q = 1, 3, 5, 6', () => {
  const today = '2026-10-09';
  _resetPeminjamanMockState(today);
  setMockToday(today);

  const inv = mockInventaris.find((it) => it.idInventaris === 'inv-3');
  assert.ok(inv, 'inv-3 harus ditemukan');
  assert.equal(inv.totalBarang, 6);

  const bookings = getMockPeminjamanAktifById('inv-3');
  assert.equal(bookings.length, 2);

  const root = new MockElement();
  const calendar = new RangeCalendar(root, {
    ctx: {
      today,
      totalBarang: inv.totalBarang,
      bookings,
    },
  });
  calendar.mount();

  for (const q of [1, 3, 5, 6]) {
    calendar.updateJumlah(q);
    const content = root.querySelector('#calendar-content').innerHTML;

    // Helper untuk cek apakah tombol hari disabled di HTML
    const isDayDisabled = (iso) => {
      const regex = new RegExp(`<button[^>]*data-date="${iso}"[^>]*>`, 'g');
      const match = regex.exec(content);
      assert.ok(match, `Tombol untuk tanggal ${iso} harus ada di render HTML`);
      return match[0].includes('disabled');
    };

    // Hari sebelum H+2 (< 2026-10-11) selalu disabled
    for (let d = 1; d <= 10; d++) {
      const iso = `2026-10-${String(d).padStart(2, '0')}`;
      assert.equal(isDayDisabled(iso), true, `${iso} harus disabled sebelum H+2`);
    }

    // Hari 16-31 Okt: selalu bisa dipilih untuk semua q (sisa = 6)
    for (let d = 16; d <= 31; d++) {
      const iso = `2026-10-${String(d).padStart(2, '0')}`;
      assert.equal(isDayDisabled(iso), false, `${iso} pada q=${q} harus bisa dipilih`);
    }

    // Cek perilaku spesifik 11-15 Okt per q
    if (q === 1) {
      assert.equal(isDayDisabled('2026-10-11'), false);
      assert.equal(isDayDisabled('2026-10-12'), false);
      assert.equal(isDayDisabled('2026-10-13'), false);
      assert.equal(isDayDisabled('2026-10-14'), false);
      assert.equal(isDayDisabled('2026-10-15'), false);
    } else if (q === 3) {
      // 11 dan 12 Okt sisa 1 < 3 -> disabled
      assert.equal(isDayDisabled('2026-10-11'), true);
      assert.equal(isDayDisabled('2026-10-12'), true);
      // 13-15 Okt sisa 3 >= 3 -> bisa dipilih
      assert.equal(isDayDisabled('2026-10-13'), false);
      assert.equal(isDayDisabled('2026-10-14'), false);
      assert.equal(isDayDisabled('2026-10-15'), false);
    } else if (q === 5 || q === 6) {
      // 11-15 Okt sisa < q -> disabled
      assert.equal(isDayDisabled('2026-10-11'), true);
      assert.equal(isDayDisabled('2026-10-12'), true);
      assert.equal(isDayDisabled('2026-10-13'), true);
      assert.equal(isDayDisabled('2026-10-14'), true);
      assert.equal(isDayDisabled('2026-10-15'), true);
    }
  }
});

/* -------------------------------------------------------------------------- */
/*  INTERACTION, KEYBOARD & LIFECYCLE BEHAVIOR                                */
/* -------------------------------------------------------------------------- */

test('RangeCalendar: alur interaksi seleksi rentang, reset, terapkan, dan keyboard', () => {
  const root = new MockElement();
  let appliedState = null;
  let cancelled = false;

  const triggerBtn = new MockElement('button');

  const calendar = new RangeCalendar(root, {
    ctx: { today: '2026-10-01', totalBarang: 2, bookings: [] },
    onTerapkan: (state) => {
      appliedState = state;
    },
    onCancel: () => {
      cancelled = true;
    },
  });
  calendar.mount();

  // Buka dengan trigger
  calendar.open(triggerBtn);
  assert.equal(calendar.dialog.open, true);

  // Klik 1: mulai
  calendar.dispatch({ type: 'pilih-tanggal', payload: '2026-10-05' });
  assert.equal(calendar.state.mulai, '2026-10-05');
  assert.equal(calendar.state.selesai, null);

  // Terapkan belum bisa karena selesai belum terpilih
  const resTerapkanGagal = calendar.dispatch({ type: 'terapkan' });
  assert.equal(resTerapkanGagal.accepted, false);
  assert.equal(calendar.dialog.open, true);

  // Klik 2: tanggal yang sama -> rentang 1 hari
  calendar.dispatch({ type: 'pilih-tanggal', payload: '2026-10-05' });
  assert.equal(calendar.state.mulai, '2026-10-05');
  assert.equal(calendar.state.selesai, '2026-10-05');

  // Reset pilihan mengosongkan mulai dan selesai
  calendar.dispatch({ type: 'reset-pilihan' });
  assert.equal(calendar.state.mulai, null);
  assert.equal(calendar.state.selesai, null);

  // Pilih rentang baru: 2026-10-05 s/d 2026-10-08
  calendar.dispatch({ type: 'pilih-tanggal', payload: '2026-10-05' });
  calendar.dispatch({ type: 'pilih-tanggal', payload: '2026-10-08' });
  assert.equal(calendar.state.mulai, '2026-10-05');
  assert.equal(calendar.state.selesai, '2026-10-08');

  // Terapkan sekarang sukses
  const resTerapkanSukses = calendar.dispatch({ type: 'terapkan' });
  assert.equal(resTerapkanSukses.accepted, true);
  assert.equal(calendar.dialog.open, false);
  assert.equal(appliedState.mulai, '2026-10-05');
  assert.equal(appliedState.selesai, '2026-10-08');
  assert.equal(triggerBtn.focused, true, 'fokus dikembalikan ke tombol pemicu');

  // Tutup via Escape
  calendar.open(triggerBtn);
  triggerBtn.focused = false;
  calendar.handleKeyDown({ key: 'Escape', preventDefault() {} });
  assert.equal(calendar.dialog.open, false);
  assert.equal(cancelled, true);
  assert.equal(triggerBtn.focused, true);

  // Tutup via Backdrop click
  calendar.open(triggerBtn);
  triggerBtn.focused = false;
  calendar.handleClick({ target: calendar.dialog });
  assert.equal(calendar.dialog.open, false);
  assert.equal(triggerBtn.focused, true);
});

test('RangeCalendar: getToday() dapat diinjeksi via options', () => {
  const root = new MockElement();
  let todayInjected = '2026-11-01';

  const calendar = new RangeCalendar(root, {
    getToday: () => todayInjected,
    ctx: { totalBarang: 2, bookings: [] },
  });

  assert.equal(calendar.getToday(), '2026-11-01');

  todayInjected = '2026-12-01';
  assert.equal(calendar.getToday(), '2026-12-01');
});
