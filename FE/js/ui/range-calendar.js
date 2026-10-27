/**
 * range-calendar.js — Komponen UI Kalender Rentang PinjemDulu.
 * Mengelola tampilan dan interaksi kalender untuk pemilihan rentang tanggal.
 */

import { html, raw, escapeHtml } from './html.js';
import { renderIcon } from './icons.js';
import { buttonClass, inputClass, iconButtonClass, cn } from './classes.js';
import {
  buildMonthModel,
  getCalendarStatusText,
  NAMA_HARI,
  moveFocusDate,
} from '../lib/calendar-model.js';
import { initCalendarState, reduceCalendarAction } from '../lib/range-calendar-state.js';
import { formatTanggal, isoToDate, dateToISO } from '../lib/format.js';
import { getEarliestStartDate, getMaxEndDate } from '../lib/date-rules.js';

/**
 * Render pemicu kalender (tombol selebar input + ikon kalender di kiri, chevron di kanan, dan tombol hapus tanggal jika terisi).
 *
 * @param {object} props
 * @returns {import('./html.js').SafeHtml}
 */
export function renderRangeCalendarTrigger({
  value = '',
  placeholder = 'Pilih tanggal peminjaman dan pengembalian',
  id = 'calendar-trigger',
  ariaDescribedBy = '',
  hasError = false,
} = {}) {
  const isFilled = Boolean(value && String(value).trim());

  return html`
    <div class="relative w-full">
      <button
        type="button"
        id="${id}"
        data-action="open-calendar"
        aria-haspopup="dialog"
        aria-expanded="false"
        ${ariaDescribedBy ? raw(`aria-describedby="${escapeHtml(ariaDescribedBy)}"`) : ''}
        ${hasError ? raw('aria-invalid="true"') : ''}
        class="${cn(
          inputClass('w-full flex items-center justify-between text-left cursor-pointer pl-10 pr-10 bg-white font-normal'),
          !isFilled ? 'text-zinc-400' : 'text-zinc-900',
          hasError ? 'border-destructive focus:ring-destructive' : ''
        )}"
      >
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          ${renderIcon('CalendarDays', 'h-5 w-5')}
        </span>
        <span class="truncate">${isFilled ? value : placeholder}</span>
        <span class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
          ${renderIcon('ChevronDown', 'h-4 w-4')}
        </span>
      </button>

      ${isFilled
        ? html`
            <button
              type="button"
              data-action="hapus-tanggal"
              aria-label="Hapus tanggal"
              class="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              ${renderIcon('X', 'h-4 w-4')}
            </button>
          `
        : ''}
    </div>
  `;
}

/**
 * Komponen Kalender Rentang.
 */
export class RangeCalendar {
  constructor(root, options = {}) {
    this.root = root;
    this.options = {
      initialState: {},
      ctx: {
        bookings: [],
        totalBarang: 1,
        today: dateToISO(new Date()),
      },
      getToday: null,
      onTerapkan: () => {},
      onCancel: () => {},
      ...options,
    };

    const today = this.getToday();
    this.state = initCalendarState({
      today,
      ...this.options.initialState,
    });

    this.dialog = null;
    this.triggerEl = null;
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  getToday() {
    if (typeof this.options.getToday === 'function') {
      return this.options.getToday();
    }
    return this.options.ctx?.today || dateToISO(new Date());
  }

  /**
   * Inisialisasi DOM dan event listeners.
   */
  mount() {
    this.renderInitialStructure();
    this.dialog = this.root.querySelector('dialog');
    this.root.addEventListener('click', this.boundHandleClick);
    this.dialog.addEventListener('keydown', this.boundHandleKeyDown);
    this.updateUI();
  }

  unmount() {
    this.root.removeEventListener('click', this.boundHandleClick);
    this.dialog?.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  dispatch(action) {
    const today = this.getToday();
    const effectiveCtx = {
      ...this.options.ctx,
      today,
    };

    const res = reduceCalendarAction(this.state, action, effectiveCtx);
    this.state = res.state;

    if (action.type === 'buka') {
      this.dialog.showModal();
    } else if (action.type === 'tutup' || (action.type === 'terapkan' && res.accepted)) {
      this.dialog.close();
      if (this.triggerEl) {
        this.triggerEl.focus?.();
      }
      if (action.type === 'terapkan') {
        this.options.onTerapkan(this.state);
      } else {
        this.options.onCancel();
      }
    }

    this.updateUI();
    return res;
  }

  renderInitialStructure() {
    this.root.innerHTML = html`
      <dialog
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 z-50 w-full max-w-[380px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        aria-labelledby="calendar-title"
      >
        <div id="calendar-content" class="flex flex-col">
          <!-- Konten dinamis di sini -->
        </div>
      </dialog>
    `.toString();
  }

  updateUI() {
    const content = this.root.querySelector('#calendar-content');
    if (!content) return;

    const today = this.getToday();
    const effectiveCtx = {
      ...this.options.ctx,
      today,
    };

    const { year, month } = this.state.bulanTampil;
    const model = buildMonthModel({
      year,
      month,
      today,
      start: this.state.mulai,
      end: this.state.selesai,
      jumlahPinjam: this.state.jumlah,
      totalBarang: effectiveCtx.totalBarang,
      bookings: effectiveCtx.bookings,
    });

    const earliest = getEarliestStartDate(today);
    const maxEnd = this.state.mulai
      ? getMaxEndDate(this.state.mulai, effectiveCtx.bookings, {
          totalBarang: effectiveCtx.totalBarang,
          jumlah: this.state.jumlah,
          today,
        })
      : null;

    const statusAria = getCalendarStatusText({
      start: this.state.mulai,
      end: this.state.selesai,
      maxEnd,
      earliest,
    });

    const adaPilihan = Boolean(this.state.mulai || this.state.selesai);
    const selesaiTerpilih = Boolean(this.state.mulai && this.state.selesai);

    content.innerHTML = html`
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-100 p-4">
        <div>
          <h2 id="calendar-title" class="text-sm font-semibold text-zinc-900">
            ${model.label}
          </h2>
          <p class="text-xs text-zinc-500">
            Pilih rentang tanggal (minimal H+2)
          </p>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            data-action="bulan-sebelumnya"
            class="${iconButtonClass()}"
            aria-label="Bulan sebelumnya"
          >
            ${renderIcon('ChevronLeft', 'h-4 w-4')}
          </button>
          <button
            type="button"
            data-action="bulan-berikutnya"
            class="${iconButtonClass()}"
            aria-label="Bulan berikutnya"
          >
            ${renderIcon('ChevronRight', 'h-4 w-4')}
          </button>
          <button
            type="button"
            data-action="tutup"
            class="${iconButtonClass()}"
            aria-label="Tutup"
          >
            ${renderIcon('X', 'h-4 w-4')}
          </button>
        </div>
      </div>

      <!-- Grid Kalender -->
      <div class="p-4">
        <!-- Nama Hari -->
        <div class="mb-2 grid grid-cols-7 text-center">
          ${NAMA_HARI.map(
            (h) => html`
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                ${h}
              </span>
            `
          )}
        </div>

        <!-- Grid Tanggal -->
        <div class="grid grid-cols-7 gap-y-1 text-center" role="grid" aria-labelledby="calendar-title">
          ${model.weeks.map((week) =>
            week.map((day) => this.renderDay(day, this.state.fokusTanggal, today))
          )}
        </div>
      </div>

      <!-- Status Info / Aria Live -->
      <div class="bg-zinc-50/50 px-4 py-3 text-center border-t border-zinc-100">
        <p class="text-[11px] font-medium leading-relaxed text-zinc-600" aria-live="polite">
          ${statusAria}
        </p>
      </div>

      <!-- Legenda Kalender -->
      <div class="border-t border-zinc-100 bg-zinc-50/25 px-4 py-2.5 text-[10px] text-zinc-600" aria-label="Legenda kalender">
        <div class="grid grid-cols-2 gap-x-2 gap-y-1">
          <div class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full border border-zinc-300 bg-white inline-block" aria-hidden="true"></span>
            <span>Bisa dipilih</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-day-booked inline-block" aria-hidden="true"></span>
            <span>Dipinjam</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-day-buffer inline-block" aria-hidden="true"></span>
            <span>Persiapan / Pengecekan</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="relative flex h-2.5 w-2.5 items-center justify-center rounded-full bg-zinc-100 border border-zinc-300 inline-block" aria-hidden="true">
              <span class="h-1 w-1 rounded-full bg-day-partial"></span>
            </span>
            <span>Sebagian terpakai</span>
          </div>
          <div class="flex items-center gap-1.5 col-span-2">
            <span class="h-2.5 w-2.5 rounded-full bg-day-blocked inline-block" aria-hidden="true"></span>
            <span>Terkunci / Tidak tersedia</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-zinc-100 p-4">
        <div>
          <button
            type="button"
            data-action="reset-pilihan"
            ${!adaPilihan ? raw('disabled') : ''}
            class="${buttonClass({ variant: 'ghost', size: 'sm' })} text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-action="tutup"
            class="${buttonClass({ variant: 'outline', size: 'sm' })}"
          >
            Batal
          </button>
          <button
            type="button"
            data-action="terapkan"
            ${!selesaiTerpilih ? raw('disabled') : ''}
            class="${buttonClass({ variant: 'default', size: 'sm' })} px-5 bg-primary text-white disabled:opacity-40"
          >
            Terapkan
          </button>
        </div>
      </div>
    `.toString();
  }

  renderDay(day, fokusTanggal, today) {
    if (!day.inMonth) {
      return html`<div class="h-9 w-9"></div>`;
    }

    const isFokus = day.iso === fokusTanggal;
    const isToday = day.iso === today;

    // Logika warna & pola berdasarkan status & seleksi
    let bgClass = 'hover:bg-zinc-100 text-zinc-700';
    let rangeClass = '';

    if (day.disabled) {
      if (day.status === 'booked') {
        bgClass = 'bg-day-booked/60 text-day-booked-foreground cursor-not-allowed opacity-60';
      } else if (day.status === 'buffer_prep' || day.status === 'buffer_check') {
        bgClass = 'bg-day-buffer/60 text-day-buffer-foreground cursor-not-allowed opacity-60';
      } else {
        bgClass = 'bg-day-blocked text-day-blocked-foreground cursor-not-allowed opacity-40';
      }
    } else if (day.isStart || day.isEnd) {
      bgClass = 'bg-primary text-white font-bold rounded-full z-10';
    } else if (day.inRange) {
      bgClass = 'bg-primary/10 text-primary font-medium';
      rangeClass = 'absolute inset-y-0 -inset-x-0.5 bg-primary/10';
    } else if (day.status === 'buffer_prep' || day.status === 'buffer_check') {
      bgClass = 'bg-day-buffer/40 text-day-buffer-foreground hover:bg-day-buffer/60';
    } else if (day.status === 'partial') {
      bgClass = 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200';
    }

    // Bangun aria-label lengkap: tanggal + keadaan + alasan bila terkunci
    let labelKeadaan = day.sisa != null ? `Bisa dipilih (sisa ${day.sisa})` : 'Bisa dipilih';
    if (day.disabled) {
      labelKeadaan = `Terkunci${day.reason ? ` (${day.reason})` : ''}`;
    } else if (day.isStart) {
      labelKeadaan = 'Mulai dipinjam';
    } else if (day.isEnd) {
      labelKeadaan = 'Selesai dipinjam';
    } else if (day.inRange) {
      labelKeadaan = 'Rentang dipinjam';
    } else if (day.status === 'partial') {
      labelKeadaan = `Sebagian terpakai (sisa ${day.sisa})`;
    } else if (day.status === 'buffer_prep') {
      labelKeadaan = 'Masa persiapan peminjam lain';
    } else if (day.status === 'buffer_check') {
      labelKeadaan = 'Masa pengecekan peminjam lain';
    } else if (day.status === 'booked') {
      labelKeadaan = 'Dipinjam';
    }

    const tglFormatted = formatTanggal(day.iso);
    const ariaLabel = `${tglFormatted}: ${labelKeadaan}`;

    return html`
      <div class="relative h-9 w-9 p-0.5" role="gridcell">
        ${day.inRange && !day.isStart && !day.isEnd ? html`<div class="${rangeClass}"></div>` : ''}
        ${day.inRange && day.isStart ? html`<div class="absolute inset-y-0 right-0 w-1/2 bg-primary/10"></div>` : ''}
        ${day.inRange && day.isEnd ? html`<div class="absolute inset-y-0 left-0 w-1/2 bg-primary/10"></div>` : ''}
        
        <button
          type="button"
          data-action="pilih-tanggal"
          data-date="${day.iso}"
          ${day.disabled ? raw('disabled') : ''}
          tabindex="${isFokus ? '0' : '-1'}"
          aria-label="${ariaLabel}"
          title="${ariaLabel}"
          class="${cn(
            'relative flex h-full w-full items-center justify-center text-[13px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-full',
            bgClass,
            isToday && !day.isStart && !day.isEnd ? 'ring-1 ring-zinc-300 ring-offset-1' : ''
          )}"
        >
          ${day.day}
          ${day.status === 'partial' && !day.disabled && !day.isStart && !day.isEnd
            ? html`<span class="absolute bottom-1 h-1 w-1 rounded-full bg-day-partial" aria-hidden="true"></span>`
            : ''}
        </button>
      </div>
    `;
  }

  handleClick(e) {
    // Backdrop click
    if (e.target === this.dialog) {
      this.close();
      return;
    }

    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const payload = btn.getAttribute('data-date');

    this.dispatch({ type: action, payload });
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
    if (keys.includes(e.key)) {
      e.preventDefault();
      this.dispatch({ type: 'fokus-pindah', payload: e.key });
      
      // Kembalikan fokus ke tombol yang baru
      setTimeout(() => {
        const btn = this.dialog?.querySelector(`button[data-date="${this.state.fokusTanggal}"]`);
        btn?.focus();
      }, 0);
    }
  }

  /**
   * Helper untuk sinkronisasi jumlah unit dari luar kalender.
   */
  updateJumlah(n) {
    return this.dispatch({ type: 'jumlah-berubah', payload: n });
  }

  open(triggerEl = null) {
    this.triggerEl = triggerEl;
    this.dispatch({ type: 'buka' });
  }

  close() {
    this.dispatch({ type: 'tutup' });
  }
}
