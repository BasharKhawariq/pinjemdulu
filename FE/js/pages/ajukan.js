/**
 * ajukan.js — Halaman formulir pengajuan peminjaman inventaris (#/inventaris/:id/ajukan).
 * Menampilkan: Nama Lengkap, NIM, OKI Peminjam, Barang Dipinjam, Jumlah Unit, Tanggal Peminjaman, Keperluan.
 * Dilengkapi dialog konfirmasi kirim, dialog konfirmasi batal, dan dialog sukses.
 */

import { html, raw, escapeHtml } from '../ui/html.js';
import { renderIcon } from '../ui/icons.js';
import { buttonClass, inputClass, iconButtonClass, cn } from '../ui/classes.js';
import { getInventarisById, getPeminjamanAktif } from '../services/inventaris.js';
import { createPeminjaman, getSystemToday } from '../services/peminjaman.js';
import { getUser } from '../state/session.js';
import { normalizeKondisi } from '../lib/kondisi.js';
import { LABEL_KONDISI } from '../lib/constants.js';
import {
  getAjukanGate,
  hitungRingkasan,
  getMaxJumlah,
  mapServiceErrorsToForm,
  formatRentangTanggal,
} from '../lib/ajukan-page.js';
import { INITIAL_AJUKAN_STATE, reduceAjukanAction } from '../lib/ajukan-state.js';
import { RangeCalendar, renderRangeCalendarTrigger } from '../ui/range-calendar.js';
import { getEarliestStartDate } from '../lib/date-rules.js';
import { formatTanggal } from '../lib/format.js';
import { navigate } from '../router.js';

/**
 * Render halaman pengajuan peminjaman (murni string SafeHtml).
 *
 * @param {object} props
 * @returns {import('../ui/html.js').SafeHtml}
 */
export function render({
  item = null,
  user = null,
  bookings = [],
  formState = INITIAL_AJUKAN_STATE,
  today = '2026-10-09',
  catalogQuery = '',
  loading = false,
  error = null,
  gate = null,
} = {}) {
  // 1. Keadaan Memuat (Skeleton)
  if (loading) {
    return html`
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6 flex items-center gap-3">
          <div class="h-9 w-28 rounded-xl bg-muted/60 animate-pulse"></div>
        </div>
        <div class="h-[600px] rounded-3xl border border-border bg-card p-6 animate-pulse"></div>
      </div>
    `;
  }

  // 2. Keadaan Galat Memuat Data
  if (error) {
    return html`
      <div class="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          ${renderIcon('AlertCircle', 'h-7 w-7')}
        </div>
        <h1 class="text-xl font-bold text-foreground">Gagal Memuat Data</h1>
        <p class="mt-2 text-sm text-muted-foreground">${error}</p>
        <div class="mt-6 flex justify-center gap-3">
          <a
            href="#/inventaris${catalogQuery ? '?' + catalogQuery : ''}"
            class="${buttonClass({ variant: 'outline' })}"
          >
            Kembali ke Katalog
          </a>
          <button
            type="button"
            data-action="coba-lagi"
            class="${buttonClass({ variant: 'default' })} bg-primary text-white"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    `;
  }

  // 3. Keadaan Gerbang Tertutup
  if (gate && !gate.canAjukan) {
    const isRusak = normalizeKondisi(item?.kondisi) === 'rusak';
    const isOkiSendiri = gate.reason?.includes('milik OKI Anda');

    return html`
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6">
          <a
            href="#/inventaris/${encodeURIComponent(item?.idInventaris || '')}${catalogQuery ? '?' + catalogQuery : ''}"
            data-action="kembali-detail"
            class="${buttonClass({ variant: 'ghost', size: 'sm' })} text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            ${renderIcon('ArrowLeft', 'h-4 w-4')}
            <span>Kembali ke Detail Barang</span>
          </a>
        </div>

        <div class="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${isRusak ? 'bg-destructive/10 text-destructive' : 'bg-warning/20 text-warning-foreground'}">
            ${renderIcon(isRusak ? 'AlertTriangle' : 'ShieldAlert', 'h-8 w-8')}
          </div>
          <h1 class="text-xl font-bold text-foreground">Pengajuan Tidak Tersedia</h1>
          <p class="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            ${gate.reason || 'Barang ini saat ini tidak dapat diajukan untuk peminjaman.'}
          </p>
          <div class="mt-8 flex justify-center gap-3">
            <a
              href="#/inventaris/${encodeURIComponent(item?.idInventaris || '')}${catalogQuery ? '?' + catalogQuery : ''}"
              class="${buttonClass({ variant: 'default' })} bg-primary text-white"
            >
              Kembali ke Detail Barang
            </a>
            ${isOkiSendiri
              ? html`
                  <a
                    href="#/kelola/inventaris"
                    class="${buttonClass({ variant: 'outline' })}"
                  >
                    Buka Kelola Inventaris
                  </a>
                `
              : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Jika barang null tapi lolos (fallback)
  if (!item) {
    return html`
      <div class="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 class="text-xl font-bold text-foreground">Barang Tidak Ditemukan</h1>
        <p class="mt-2 text-sm text-muted-foreground">Barang yang ingin Anda ajukan tidak ditemukan.</p>
        <div class="mt-6">
          <a href="#/inventaris" class="${buttonClass({ variant: 'default' })} bg-primary text-white">
            Kembali ke Katalog
          </a>
        </div>
      </div>
    `;
  }

  // 4. Data Kalkulasi Formulir
  const maxUnit = getMaxJumlah(formState.startDate, formState.endDate, {
    bookings,
    totalBarang: item.totalBarang,
    today,
  });

  const rentangText = formatRentangTanggal(formState.startDate, formState.endDate);
  const earliest = getEarliestStartDate(today);
  const errors = formState.errors || {};

  // Data identitas peminjam
  const userName = user?.nama || 'Maitri Sakti';
  const userNim = user?.nim || '254107020789';
  const userOki =
    user?.organisasi?.namaOrganisasi ||
    user?.organisasi?.nama ||
    (typeof user?.organisasi === 'string' ? user?.organisasi : 'BEM');

  return html`
    <div class="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
      <!-- Navigasi Breadcrumb Header: Inventaris -->
      <div class="mb-6 flex items-center gap-2">
        <a
          href="#/inventaris${catalogQuery ? '?' + catalogQuery : ''}"
          data-action="kembali-detail"
          class="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background shadow-xs text-muted-foreground">
            ${renderIcon('Archive', 'h-4 w-4')}
          </span>
          <span>Inventaris</span>
        </a>
      </div>

      <!-- Kartu Utama Formulir Pengajuan Peminjaman -->
      <div class="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div class="mb-8">
          <h1 class="text-xl font-bold text-foreground sm:text-2xl">
            Pengajuan Peminjaman
          </h1>
          <span class="sr-only">Ajukan Peminjaman</span>
        </div>

        <form id="form-ajukan" novalidate class="space-y-6">
          <!-- 1. Nama Lengkap (Read-only) -->
          <div>
            <label for="display-nama" class="block text-sm font-semibold text-foreground mb-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              id="display-nama"
              readonly
              value="${userName}"
              class="w-full rounded-xl bg-zinc-100 border-0 px-4 py-3 text-sm text-foreground font-medium cursor-default focus:outline-none"
            />
          </div>

          <!-- 2. NIM (Read-only) -->
          <div>
            <label for="display-nim" class="block text-sm font-semibold text-foreground mb-2">
              NIM
            </label>
            <input
              type="text"
              id="display-nim"
              readonly
              value="${userNim}"
              class="w-full rounded-xl bg-zinc-100 border-0 px-4 py-3 text-sm text-foreground font-medium cursor-default focus:outline-none"
            />
          </div>

          <!-- 3. OKI Peminjam (Read-only) -->
          <div>
            <label for="display-oki" class="block text-sm font-semibold text-foreground mb-2">
              OKI Peminjam
            </label>
            <input
              type="text"
              id="display-oki"
              readonly
              value="${userOki}"
              class="w-full rounded-xl bg-zinc-100 border-0 px-4 py-3 text-sm text-foreground font-medium cursor-default focus:outline-none"
            />
          </div>

          <!-- 4. Barang Dipinjam (Read-only) -->
          <div>
            <label for="display-barang" class="block text-sm font-semibold text-foreground mb-2">
              Barang Dipinjam
            </label>
            <input
              type="text"
              id="display-barang"
              readonly
              value="${item.namaBarang}"
              class="w-full rounded-xl bg-zinc-100 border-0 px-4 py-3 text-sm text-foreground font-medium cursor-default focus:outline-none"
            />
          </div>

          <!-- 5. Jumlah Unit -->
          <div>
            <label for="input-jumlah" class="block text-sm font-semibold text-foreground mb-2">
              Jumlah Unit
            </label>
            <input
              type="number"
              inputmode="numeric"
              id="input-jumlah"
              min="1"
              max="${maxUnit}"
              value="${formState.jumlah}"
              placeholder="1"
              ${errors.jumlah ? raw('aria-invalid="true"') : ''}
              aria-describedby="teks-bantu-jumlah ${errors.jumlah ? 'error-jumlah' : ''}"
              class="${cn(
                'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                errors.jumlah ? 'border-destructive focus-visible:ring-destructive' : ''
              )}"
            />
            <p id="teks-bantu-jumlah" class="mt-1.5 text-xs text-muted-foreground">
              Total ketersediaan fisik: <strong class="text-foreground">${item.totalBarang} unit</strong> (tersedia hingga ${maxUnit} unit untuk rentang tanggal terpilih).
            </p>
            ${errors.jumlah
              ? html`<p id="error-jumlah" class="mt-1 text-xs font-medium text-destructive">${errors.jumlah}</p>`
              : ''}
          </div>

          <!-- 6. Tanggal Peminjaman (Single Trigger) -->
          <div>
            <label for="tanggal-peminjaman-trigger" class="block text-sm font-semibold text-foreground mb-2">
              Tanggal Peminjaman
            </label>
            <div>
              ${renderRangeCalendarTrigger({
                value: rentangText,
                placeholder: 'Pilih Tanggal',
                id: 'tanggal-peminjaman-trigger',
                ariaDescribedBy: cn('teks-bantu-tanggal', errors.tanggal && 'error-tanggal'),
                hasError: Boolean(errors.tanggal),
              })}
            </div>
            <p id="teks-bantu-tanggal" class="mt-1.5 text-xs text-muted-foreground">
              Paling cepat ${formatTanggal(earliest)}.
            </p>
            ${errors.tanggal
              ? html`<p id="error-tanggal" class="mt-1 text-xs font-medium text-destructive">${errors.tanggal}</p>`
              : ''}
          </div>

          <!-- 7. Keperluan Peminjaman Barang -->
          <div>
            <label for="input-keperluan" class="block text-sm font-semibold text-foreground mb-2">
              Keperluan Peminjaman Barang
            </label>
            <textarea
              id="input-keperluan"
              rows="3"
              maxlength="500"
              placeholder="Contoh : Kebutuhan Seminar Kaderisasi OKI"
              ${errors.keperluan ? raw('aria-invalid="true"') : ''}
              aria-describedby="char-counter ${errors.keperluan ? 'error-keperluan' : ''}"
              class="${cn(
                'flex w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
                errors.keperluan ? 'border-destructive focus-visible:ring-destructive' : ''
              )}"
            >${formState.keperluan}</textarea>
            <div class="mt-1.5 flex items-center justify-between">
              ${errors.keperluan
                ? html`<p id="error-keperluan" class="text-xs font-medium text-destructive">${errors.keperluan}</p>`
                : html`<span></span>`}
              <span id="char-counter" class="text-xs text-muted-foreground" aria-live="polite">
                ${formState.keperluan.length}/500
              </span>
            </div>
          </div>

          <!-- Galat Umum / Konflik Kuota Balapan -->
          ${formState.generalError
            ? html`
                <div class="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3" role="alert">
                  ${renderIcon('AlertCircle', 'h-5 w-5 shrink-0 mt-0.5')}
                  <div>
                    <h4 class="font-semibold">Pengajuan Belum Dapat Diproses</h4>
                    <p class="mt-0.5 text-xs leading-relaxed">${formState.generalError}</p>
                  </div>
                </div>
              `
            : ''}

          <!-- Tombol Aksi Formulir -->
          <div class="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              data-action="batal"
              class="${buttonClass({ variant: 'outline' })} rounded-xl px-6 py-2.5 font-medium border-border"
            >
              Batal
            </button>
            <button
              type="button"
              data-action="kirim"
              ${formState.isSubmitting ? raw('disabled') : ''}
              class="${buttonClass({ variant: 'default' })} rounded-xl px-6 py-2.5 bg-primary text-white font-medium hover:bg-primary/90"
            >
              ${formState.isSubmitting
                ? html`
                    <span class="inline-flex items-center gap-2">
                      ${renderIcon('Loader2', 'h-4 w-4 animate-spin')}
                      <span>Mengirim...</span>
                    </span>
                  `
                : 'Kirim Pengajuan'}
            </button>
          </div>
        </form>
      </div>

      <!-- Kontainer Kalender Range Dialog -->
      <div id="calendar-container"></div>

      <!-- Dialog Konfirmasi Kirim Pengajuan -->
      <dialog
        id="dialog-konfirmasi-kirim"
        aria-labelledby="dialog-konfirmasi-kirim-title"
        class="fixed inset-0 m-auto z-50 w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div class="flex flex-col text-center items-center">
          <div class="mb-4 inline-flex h-16 w-16 items-center justify-center text-primary">
            ${renderIcon('Send', 'h-12 w-12 text-primary')}
          </div>
          <h2 id="dialog-konfirmasi-kirim-title" class="text-xl font-bold text-foreground">
            Kirim Pengajuan?
          </h2>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">
            Periksa kembali data pengajuan yang akan anda kirim
          </p>
          <div class="mt-6 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              data-action="tutup-dialog-konfirmasi"
              class="${buttonClass({ variant: 'outline', className: 'flex-1' })} rounded-xl py-2.5 font-medium border-border"
            >
              Kembali
            </button>
            <button
              type="button"
              data-action="konfirmasi-kirim"
              class="${buttonClass({ variant: 'default', className: 'flex-1' })} rounded-xl py-2.5 bg-primary text-white font-medium hover:bg-primary/90"
            >
              Kirim
            </button>
          </div>
        </div>
      </dialog>

      <!-- Dialog Konfirmasi Batal -->
      <dialog
        id="dialog-batal"
        aria-labelledby="dialog-batal-title"
        class="fixed inset-0 m-auto z-50 w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div class="flex flex-col text-center items-center">
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive">
            <span class="h-6 w-6 rounded-full bg-destructive"></span>
          </div>
          <h2 id="dialog-batal-title" class="text-xl font-bold text-foreground">
            Batal Mengajukan
          </h2>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">
            Apakah anda yakin ingin membatalkan pengajuan?
          </p>
          <div class="mt-6 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              data-action="tutup-dialog-batal"
              class="${buttonClass({ variant: 'outline', className: 'flex-1' })} rounded-xl py-2.5 font-medium border-border"
            >
              Kembali
            </button>
            <button
              type="button"
              data-action="konfirmasi-batal"
              class="${buttonClass({ variant: 'default', className: 'flex-1' })} rounded-xl py-2.5 bg-primary text-white font-medium hover:bg-primary/90"
            >
              Batalkan
            </button>
          </div>
        </div>
      </dialog>

      <!-- Dialog Umpan Balik Sukses -->
      <dialog
        id="dialog-sukses"
        aria-labelledby="dialog-sukses-title"
        class="fixed inset-0 m-auto z-50 w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div class="flex flex-col text-center items-center">
          <div class="mb-4 inline-flex h-16 w-16 items-center justify-center text-primary">
            ${renderIcon('CheckCircle2', 'h-12 w-12 text-primary')}
          </div>
          <h2 id="dialog-sukses-title" class="text-xl font-bold text-foreground">
            Pengajuan Berhasil Dikirim!
          </h2>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed">
            Anda telah berhasil mengirimkan pengajuan peminjaman
          </p>

          <div class="mt-6 w-full">
            <button
              type="button"
              data-action="ke-detail-sukses"
              class="${buttonClass({ variant: 'default', className: 'w-full' })} rounded-xl py-2.5 bg-primary text-white font-medium hover:bg-primary/90"
            >
              Kembali
            </button>
          </div>
        </div>
      </dialog>
    </div>
  `;
}

/**
 * Pasang interaksi halaman ajukan peminjaman.
 *
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function mount(root, ctx = {}) {
  if (!root) return;

  const id = ctx.params?.id;
  const catalogQuery = ctx.search || '';
  const user = ctx.user || getUser();

  let state = {
    ...INITIAL_AJUKAN_STATE,
  };

  let item = null;
  let bookings = [];
  let gate = null;
  let calendar = null;
  const today = getSystemToday();

  // 1. Tampilkan keadaan memuat (Skeleton)
  root.innerHTML = render({ loading: true, catalogQuery }).toString();

  async function loadData() {
    try {
      const [fetchedItem, fetchedBookings] = await Promise.all([
        getInventarisById(id),
        getPeminjamanAktif(id),
      ]);
      item = fetchedItem;
      bookings = fetchedBookings || [];
      gate = getAjukanGate(user, item);
      renderPage();
    } catch (err) {
      root.innerHTML = render({
        error: err?.message || 'Gagal mengambil data inventaris.',
        catalogQuery,
      }).toString();
    }
  }

  function renderPage() {
    root.innerHTML = render({
      item,
      user,
      bookings,
      formState: state,
      today,
      catalogQuery,
      gate,
    }).toString();

    // Inisialisasi kalender rentang jika gate terbuka
    if (gate?.canAjukan && item) {
      const calRoot = root.querySelector('#calendar-container');
      if (calRoot) {
        calendar = new RangeCalendar(calRoot, {
          ctx: {
            today,
            totalBarang: item.totalBarang,
            bookings,
          },
          initialState: {
            mulai: state.startDate,
            selesai: state.endDate,
            jumlah: state.jumlah,
          },
          onTerapkan: (calState) => {
            state = reduceAjukanAction(state, {
              type: 'terapkan-tanggal',
              payload: {
                startDate: calState.mulai,
                endDate: calState.selesai,
              },
            });
            renderPage();
          },
        });
        calendar.mount();
      }
    }

    // Tangani dialog native jika perlu dibuka
    const dialogConfirm = root.querySelector('#dialog-konfirmasi-kirim');
    if (dialogConfirm && state.showConfirmModal) {
      dialogConfirm.showModal?.();
    }

    const dialogBatal = root.querySelector('#dialog-batal');
    if (dialogBatal && state.showCancelModal) {
      dialogBatal.showModal?.();
    }

    const dialogSukses = root.querySelector('#dialog-sukses');
    if (dialogSukses && state.isSuccess) {
      dialogSukses.showModal?.();
    }
  }

  // Handle Event Input (Mencegah re-render textarea saat mengetik)
  function handleInput(e) {
    if (e.target.id === 'input-jumlah') {
      const val = parseInt(e.target.value, 10);
      state = reduceAjukanAction(state, {
        type: 'ubah-jumlah',
        payload: Number.isNaN(val) ? 1 : val,
      });
      // Sinkronkan ke kalender
      calendar?.updateJumlah(state.jumlah);
      return;
    }

    if (e.target.id === 'input-keperluan') {
      state = reduceAjukanAction(state, {
        type: 'ubah-keperluan',
        payload: e.target.value,
      });
      const counterEl = root.querySelector('#char-counter');
      if (counterEl) {
        counterEl.textContent = `${e.target.value.length}/500`;
      }
      return;
    }
  }

  // Handle Event Klik
  async function handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');

    if (action === 'coba-lagi') {
      await loadData();
      return;
    }

    if (action === 'open-calendar') {
      const triggerEl = root.querySelector('#tanggal-peminjaman-trigger');
      calendar?.open(triggerEl);
      return;
    }

    if (action === 'hapus-tanggal') {
      state = reduceAjukanAction(state, { type: 'hapus-tanggal' });
      calendar?.dispatch({ type: 'reset-pilihan' });
      renderPage();
      return;
    }

    if (action === 'batal') {
      state = reduceAjukanAction(state, { type: 'buka-dialog-batal' });
      const dialogBatal = root.querySelector('#dialog-batal');
      dialogBatal?.showModal?.();
      return;
    }

    if (action === 'tutup-dialog-batal') {
      state = reduceAjukanAction(state, { type: 'tutup-dialog-batal' });
      const dialogBatal = root.querySelector('#dialog-batal');
      dialogBatal?.close?.();
      root.querySelector('[data-action="batal"]')?.focus?.();
      return;
    }

    if (action === 'konfirmasi-batal') {
      const dialogBatal = root.querySelector('#dialog-batal');
      dialogBatal?.close?.();
      navigate(`#/inventaris/${encodeURIComponent(item.idInventaris)}${catalogQuery ? '?' + catalogQuery : ''}`);
      return;
    }

    if (action === 'tutup-dialog-konfirmasi') {
      state = reduceAjukanAction(state, { type: 'tutup-dialog-konfirmasi' });
      const dialogConfirm = root.querySelector('#dialog-konfirmasi-kirim');
      dialogConfirm?.close?.();
      root.querySelector('[data-action="kirim"]')?.focus?.();
      return;
    }

    if (action === 'konfirmasi-kirim') {
      const dialogConfirm = root.querySelector('#dialog-konfirmasi-kirim');
      dialogConfirm?.close?.();
      await executeSubmit();
      return;
    }

    if (action === 'ke-detail-sukses') {
      const dialogSukses = root.querySelector('#dialog-sukses');
      dialogSukses?.close?.();
      navigate(`#/inventaris/${encodeURIComponent(item.idInventaris)}`);
      return;
    }

    if (action === 'kirim') {
      handleFormSubmitAttempt();
      return;
    }
  }

  // Validasi lokal sebelum membuka konfirmasi
  function handleFormSubmitAttempt() {
    if (state.isSubmitting) return;

    const validationErrors = {};
    if (!state.jumlah || state.jumlah <= 0) {
      validationErrors.jumlah = 'Jumlah unit harus berupa bilangan bulat positif.';
    } else if (item && state.jumlah > item.totalBarang) {
      validationErrors.jumlah = `Jumlah pinjam melebihi total barang (${item.totalBarang}).`;
    }

    if (!state.startDate || !state.endDate) {
      validationErrors.tanggal = 'Tanggal peminjaman wajib dipilih.';
    }

    if (!state.keperluan || !state.keperluan.trim()) {
      validationErrors.keperluan = 'Keperluan peminjaman barang wajib diisi.';
    }

    if (Object.keys(validationErrors).length > 0) {
      state = reduceAjukanAction(state, {
        type: 'kirim-gagal',
        payload: { errors: validationErrors },
      });
      renderPage();

      if (validationErrors.jumlah) {
        root.querySelector('#input-jumlah')?.focus();
      } else if (validationErrors.tanggal) {
        root.querySelector('#tanggal-peminjaman-trigger')?.focus();
      } else if (validationErrors.keperluan) {
        root.querySelector('#input-keperluan')?.focus();
      }
      return;
    }

    // Jika valid, buka dialog konfirmasi
    state = reduceAjukanAction(state, { type: 'buka-dialog-konfirmasi' });
    const dialogConfirm = root.querySelector('#dialog-konfirmasi-kirim');
    dialogConfirm?.showModal?.();
  }

  // Kirim data pengajuan ke API
  async function executeSubmit() {
    if (state.isSubmitting) return;

    state = reduceAjukanAction(state, { type: 'kirim' });
    renderPage();

    try {
      const res = await createPeminjaman({
        idInventaris: item.idInventaris,
        startDate: state.startDate,
        endDate: state.endDate,
        jumlahPinjam: state.jumlah,
        keperluan: state.keperluan,
      });

      state = reduceAjukanAction(state, {
        type: 'kirim-sukses',
        payload: { idPeminjaman: res.idPeminjaman },
      });
      renderPage();
    } catch (err) {
      const mapped = mapServiceErrorsToForm(err.errors || err.response?.data?.errors || {});
      const generalError = err.message || 'Gagal mengirim pengajuan peminjaman.';

      if (err.status === 409) {
        try {
          const freshBookings = await getPeminjamanAktif(item.idInventaris);
          bookings = freshBookings || [];
        } catch {
          // ignore
        }
      }

      state = reduceAjukanAction(state, {
        type: 'kirim-gagal',
        payload: {
          errors: mapped,
          generalError,
        },
      });
      renderPage();

      if (mapped.jumlah) {
        root.querySelector('#input-jumlah')?.focus();
      } else if (mapped.tanggal) {
        root.querySelector('#tanggal-peminjaman-trigger')?.focus();
      } else if (mapped.keperluan) {
        root.querySelector('#input-keperluan')?.focus();
      }
    }
  }

  // Handle Keyboard
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      const dialogConfirm = root.querySelector('#dialog-konfirmasi-kirim');
      if (dialogConfirm?.open) {
        e.preventDefault();
        state = reduceAjukanAction(state, { type: 'tutup-dialog-konfirmasi' });
        dialogConfirm.close();
        root.querySelector('[data-action="kirim"]')?.focus();
        return;
      }

      const dialogBatal = root.querySelector('#dialog-batal');
      if (dialogBatal?.open) {
        e.preventDefault();
        state = reduceAjukanAction(state, { type: 'tutup-dialog-batal' });
        dialogBatal.close();
        root.querySelector('[data-action="batal"]')?.focus();
      }
    }
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  window.addEventListener('keydown', handleKeyDown);

  // Jalankan pemuatan data
  await loadData();

  return function unmount() {
    root.removeEventListener('click', handleClick);
    root.removeEventListener('input', handleInput);
    window.removeEventListener('keydown', handleKeyDown);
    calendar?.unmount();
  };
}
