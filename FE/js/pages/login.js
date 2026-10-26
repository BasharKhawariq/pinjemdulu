/**
 * login.js — Halaman Masuk (Login) PinjemDulu.
 * Acuan: _sumber/src/app/(auth)/login/LoginView.jsx
 */

import { html, raw, escapeHtml } from '../ui/html.js';
import { inputClass, labelClass, buttonClass, alertClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { getCaptcha, login } from '../services/auth.js';
import { mockUsers } from '../data/users.js';
import { login as setSession } from '../state/session.js';
import { navigate } from '../router.js';

let currentCaptchaId = '';
let currentCaptchaText = '';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Render halaman login tanpa shell (full-screen dua kolom).
 * @param {object} [ctx]
 * @returns {string}
 */
export function render(ctx = {}) {
  const cap = getCaptcha();
  currentCaptchaId = cap.captchaId;
  currentCaptchaText = cap.text;

  const quickUsers = mockUsers.map((u) => {
    const isNonaktif = (u.statusAkun || u.status_akun) !== 'aktif';
    const isPj = u.role === 'penanggung_jawab';
    const roleName = isPj ? 'PJ' : 'Peminjam';
    const roleFullName = isPj ? 'PJ Inventaris' : 'Peminjam';
    const orgName =
      typeof u.organisasi === 'object' && u.organisasi
        ? u.organisasi.namaOrganisasi || u.organisasi.nama || 'OKI'
        : String(u.organisasi || 'OKI');
    const initials = getInitials(u.nama);

    return html`
      <button
        type="button"
        data-action="quick-login"
        data-role="${u.role}"
        data-nim="${u.nim || ''}"
        data-email="${u.email}"
        class="group flex items-center justify-between gap-2.5 rounded-xl border border-zinc-200/90 bg-white p-2.5 text-left transition hover:border-primary/40 hover:bg-zinc-50 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isPj
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-100 text-blue-700'} text-xs font-bold"
          >
            ${initials}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="truncate text-xs font-semibold text-zinc-900">${u.nama}</p>
              ${isNonaktif
                ? raw(
                    '<span class="shrink-0 rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-rose-700">Nonaktif</span>'
                  )
                : raw(
                    `<span class="shrink-0 rounded ${
                      isPj ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'
                    } px-1.5 py-0.2 text-[9px] font-medium">${roleName}</span>`
                  )}
            </div>
            <p class="truncate text-[11px] font-mono text-zinc-500">NIM: ${u.nim || '—'}</p>
            <p class="truncate text-[10px] text-zinc-400">${roleFullName} · ${orgName}</p>
          </div>
        </div>
        <span class="shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
          ${renderIcon('ChevronRight', 'h-4 w-4')}
        </span>
      </button>
    `;
  });

  return html`
    <main class="min-h-screen w-full overflow-x-hidden bg-white text-zinc-900">
      <div class="flex min-h-screen w-full">
        <!-- Panel kiri: BIRU TUA POLOS. Hidden di layar < md -->
        <aside aria-hidden="true" class="hidden w-1/2 shrink-0 md:flex md:items-stretch lg:w-[48%]">
          <div class="flex h-full w-full flex-col bg-primary"></div>
        </aside>

        <!-- Panel kanan: form login + logo + quick login + copyright -->
        <section class="flex min-h-screen w-full flex-1 flex-col items-center justify-start px-5 py-10 sm:px-8 md:w-1/2 md:px-12 md:py-14 lg:w-[52%] lg:px-20 lg:py-20 xl:px-28">
          <div class="flex w-full max-w-xl flex-1 flex-col">
            <!-- Logo Brand -->
            <a href="#/login" aria-label="PinjemDulu beranda" class="mb-10 inline-flex items-center gap-3 self-start">
              <span class="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-brand-solid text-white shadow-sm sm:h-[44px] sm:w-[44px]">
                ${renderIcon('Sparkles', 'h-6 w-6')}
              </span>
              <span class="flex items-baseline text-2xl font-extrabold tracking-tight">
                <span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span>
              </span>
            </a>

            <!-- Header Sapaan -->
            <div class="mb-8">
              <p class="mb-2 text-sm font-medium text-zinc-500">
                Selamat Datang Kembali!
              </p>
              <h1 class="mb-2 text-3xl font-semibold tracking-[0] text-zinc-900 sm:text-[32px] leading-[1.4]">
                Siap mengelola atau meminjam?
              </h1>
              <p class="text-sm leading-6 text-zinc-500">
                Masuk untuk mengakses layanan inventaris dan peminjaman OKI
              </p>
            </div>

            <!-- Pesan Galat Global (Alert) -->
            <div id="login-global-error" role="alert" class="${alertClass('destructive')} mb-5 hidden"></div>

            <!-- Form Autentikasi -->
            <form id="login-form" novalidate class="space-y-5">
              <input type="hidden" id="login-captcha-id" name="captchaId" value="${currentCaptchaId}" />

              <!-- Field NIM -->
              <div>
                <label for="login-nim" class="${labelClass('mb-2 block text-zinc-600')}">
                  NIM<span class="ml-0.5 text-rose-500">*</span>
                </label>
                <div>
                  <input
                    id="login-nim"
                    data-legacy-id="login-email"
                    name="nim"
                    type="text"
                    inputmode="numeric"
                    autocomplete="username"
                    placeholder="Masukkan NIM Anda (contoh: 254107020001)"
                    class="${inputClass('h-12 rounded-2xl px-4 py-3')}"
                    required
                  />
                  <p id="nim-error" class="mt-1 text-xs text-rose-600 hidden"></p>
                </div>
              </div>

              <!-- Field Password -->
              <div>
                <label for="login-password" class="${labelClass('mb-2 block text-zinc-600')}">
                  Password<span class="ml-0.5 text-rose-500">*</span>
                </label>
                <div class="relative">
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="${inputClass('h-12 rounded-2xl px-4 py-3 pr-12')}"
                    required
                  />
                  <button
                    type="button"
                    data-action="toggle-password"
                    aria-label="Tampilkan kata sandi"
                    aria-pressed="false"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 transition"
                  >
                    <span id="pwd-icon-show">${renderIcon('Eye', 'h-5 w-5')}</span>
                    <span id="pwd-icon-hide" class="hidden">${renderIcon('EyeOff', 'h-5 w-5')}</span>
                  </button>
                </div>
                <p id="password-error" class="mt-1 text-xs text-rose-600 hidden"></p>
              </div>

              <!-- Field Captcha -->
              <div>
                <label for="login-captcha-answer" class="${labelClass('mb-2 block text-zinc-600')}">
                  Captcha<span class="ml-0.5 text-rose-500">*</span>
                </label>
                <div class="mb-2 flex items-center gap-3">
                  <div
                    id="captcha-text-display"
                    class="flex h-12 flex-1 items-center justify-center rounded-2xl border border-input bg-zinc-100 font-mono text-xl font-bold tracking-[0.3em] text-zinc-800 select-none"
                  >
                    ${currentCaptchaText}
                  </div>
                  <button
                    type="button"
                    data-action="refresh-captcha"
                    aria-label="Dapatkan captcha baru"
                    title="Dapatkan captcha baru"
                    class="${buttonClass({ variant: 'outline', size: 'icon' })} h-12 w-12 rounded-2xl shrink-0"
                  >
                    ${renderIcon('RefreshCw', 'h-5 w-5')}
                  </button>
                </div>
                <div>
                  <input
                    id="login-captcha-answer"
                    name="captchaAnswer"
                    type="text"
                    placeholder="Masukkan kode captcha"
                    class="${inputClass('h-12 rounded-2xl px-4 py-3')}"
                    required
                  />
                  <p id="captcha-error" class="mt-1 text-xs text-rose-600 hidden"></p>
                </div>
              </div>

              <!-- Tombol Submit Masuk -->
              <button
                id="btn-login-submit"
                type="submit"
                class="${buttonClass({ variant: 'default', size: 'lg' })} w-full rounded-2xl h-12"
              >
                <span>Masuk</span>
              </button>
            </form>

            <!-- Panel Masuk Cepat (Mock) -->
            <div class="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 sm:p-4 shadow-xs">
              <div class="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                      ${renderIcon('Sparkles', 'h-3.5 w-3.5')}
                    </span>
                    <p class="text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Pilih Akun Demo (Mock)
                    </p>
                    <span class="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                      8 Akun
                    </span>
                  </div>
                  <p class="mt-0.5 text-[11px] text-zinc-500">
                    Klik akun untuk masuk instan tanpa perlu password & captcha.
                  </p>
                </div>

                <!-- Filter Role Tab -->
                <div class="flex items-center gap-1 rounded-lg bg-zinc-200/70 p-1 self-start sm:self-auto" role="tablist" aria-label="Filter Akun Mock">
                  <button
                    type="button"
                    data-action="filter-mock-role"
                    data-role="all"
                    class="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 shadow-xs transition"
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    data-action="filter-mock-role"
                    data-role="peminjam"
                    class="rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 transition"
                  >
                    Peminjam
                  </button>
                  <button
                    type="button"
                    data-action="filter-mock-role"
                    data-role="penanggung_jawab"
                    class="rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 transition"
                  >
                    PJ OKI
                  </button>
                </div>
              </div>

              <!-- List Grid Terbatas (Max Height + Scrollable) -->
              <div
                id="mock-users-grid"
                class="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-[210px] overflow-y-auto pr-1"
              >
                ${quickUsers}
              </div>

              <div class="mt-2.5 flex items-center justify-between border-t border-zinc-200/60 pt-2 text-[11px] text-zinc-400">
                <span>Gunakan scroll untuk melihat akun lainnya</span>
                <span id="mock-count-info" class="font-medium text-zinc-500">8 dari 8 akun</span>
              </div>
            </div>

            <!-- Footer Hak Cipta -->
            <footer class="mt-12 py-4 text-center text-xs text-zinc-400">
              &copy; 2026. PinjemDulu - All Rights Reserved.
            </footer>
          </div>
        </section>
      </div>
    </main>
  `.toString();
}

/**
 * Pasang interaksi dan event handling pada halaman login.
 * @param {HTMLElement} root
 */
export function mount(root) {
  if (!root) return;

  const form = root.querySelector('#login-form');
  const nimInput = root.querySelector('#login-nim') || root.querySelector('#login-email') || root.querySelector('input[name="nim"]');
  const passwordInput = root.querySelector('#login-password');
  const captchaIdInput = root.querySelector('#login-captcha-id');
  const captchaAnswerInput = root.querySelector('#login-captcha-answer');
  const captchaDisplay = root.querySelector('#captcha-text-display');
  const globalErrorBox = root.querySelector('#login-global-error');
  const nimError = root.querySelector('#nim-error') || root.querySelector('#email-error');
  const passwordError = root.querySelector('#password-error');
  const captchaError = root.querySelector('#captcha-error');
  const submitBtn = root.querySelector('#btn-login-submit');
  const togglePwdBtn = root.querySelector('[data-action="toggle-password"]');
  const pwdIconShow = root.querySelector('#pwd-icon-show');
  const pwdIconHide = root.querySelector('#pwd-icon-hide');

  let submitting = false;

  function clearErrors() {
    if (globalErrorBox) {
      globalErrorBox.textContent = '';
      globalErrorBox.classList.add('hidden');
    }
    if (nimError) {
      nimError.textContent = '';
      nimError.classList.add('hidden');
      nimInput?.removeAttribute('aria-invalid');
      nimInput?.removeAttribute('aria-describedby');
    }
    if (passwordError) {
      passwordError.textContent = '';
      passwordError.classList.add('hidden');
      passwordInput?.removeAttribute('aria-invalid');
      passwordInput?.removeAttribute('aria-describedby');
    }
    if (captchaError) {
      captchaError.textContent = '';
      captchaError.classList.add('hidden');
      captchaAnswerInput?.removeAttribute('aria-invalid');
      captchaAnswerInput?.removeAttribute('aria-describedby');
    }
  }

  function refreshCaptcha() {
    const c = getCaptcha();
    currentCaptchaId = c.captchaId;
    currentCaptchaText = c.text;
    if (captchaIdInput) captchaIdInput.value = c.captchaId;
    if (captchaDisplay) captchaDisplay.textContent = c.text;
    if (captchaAnswerInput) captchaAnswerInput.value = '';
  }

  async function performLogin({ nim, email, password, captchaId, captchaAnswer }) {
    if (submitting) return;
    submitting = true;
    clearErrors();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Memproses...</span>';
    }

    try {
      const res = await login({ nim, email, password, captchaId, captchaAnswer });
      if (res?.user) {
        setSession(res.user);
        navigate('#/inventaris');
      }
    } catch (err) {
      const statusCode = err?.statusCode || 0;
      const message = err?.message || 'Gagal masuk. Silakan coba lagi.';
      let firstErrorField = null;

      if (statusCode === 401) {
        if (nimError && nimInput) {
          nimError.textContent = message;
          nimError.classList.remove('hidden');
          nimInput.setAttribute('aria-invalid', 'true');
          nimInput.setAttribute('aria-describedby', 'nim-error');
          firstErrorField = nimInput;
        }
      } else if (statusCode === 403) {
        if (globalErrorBox) {
          globalErrorBox.textContent = message;
          globalErrorBox.classList.remove('hidden');
        }
      } else if (statusCode === 422 && err.errors?.captchaAnswer) {
        if (captchaError && captchaAnswerInput) {
          captchaError.textContent = err.errors.captchaAnswer;
          captchaError.classList.remove('hidden');
          captchaAnswerInput.setAttribute('aria-invalid', 'true');
          captchaAnswerInput.setAttribute('aria-describedby', 'captcha-error');
          firstErrorField = captchaAnswerInput;
        }
      } else {
        if (globalErrorBox) {
          globalErrorBox.textContent = message;
          globalErrorBox.classList.remove('hidden');
        }
      }

      refreshCaptcha();
      if (firstErrorField) {
        firstErrorField.focus();
      }
    } finally {
      submitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Masuk</span>';
      }
    }
  }

  // Toggle tampilkan / sembunyikan kata sandi
  togglePwdBtn?.addEventListener('click', () => {
    if (!passwordInput) return;
    const isPass = passwordInput.type === 'password';
    passwordInput.type = isPass ? 'text' : 'password';
    togglePwdBtn.setAttribute('aria-pressed', isPass ? 'true' : 'false');
    togglePwdBtn.setAttribute('aria-label', isPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    pwdIconShow?.classList.toggle('hidden', isPass);
    pwdIconHide?.classList.toggle('hidden', !isPass);
  });

  // Tombol refresh captcha
  root.querySelector('[data-action="refresh-captcha"]')?.addEventListener('click', () => {
    refreshCaptcha();
  });

  // Masuk Cepat
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="quick-login"]');
    if (!btn || submitting) return;
    const nim = btn.getAttribute('data-nim');
    const email = btn.getAttribute('data-email');
    if (nim || email) {
      performLogin({
        nim,
        email,
        password: '',
        captchaId: 'MOCK-QUICKLOGIN',
        captchaAnswer: '',
      });
    }
  });

  // Filter Tab Akun Mock
  const filterBtns = root.querySelectorAll('[data-action="filter-mock-role"]');
  const userCards = root.querySelectorAll('[data-action="quick-login"]');
  const countInfo = root.querySelector('#mock-count-info');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetRole = btn.getAttribute('data-role');

      filterBtns.forEach((b) => {
        b.className =
          b === btn
            ? 'rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 shadow-xs transition'
            : 'rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 transition';
      });

      let visibleCount = 0;
      userCards.forEach((card) => {
        const role = card.getAttribute('data-role');
        const match = targetRole === 'all' || role === targetRole;
        card.classList.toggle('hidden', !match);
        if (match) visibleCount++;
      });

      if (countInfo) {
        countInfo.textContent = `${visibleCount} dari ${userCards.length} akun`;
      }
    });
  });

  // Submit Formulir Utama
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;

    clearErrors();
    const nimVal = String(nimInput?.value || '').trim();
    const passwordVal = String(passwordInput?.value || '');
    const captchaAnsVal = String(captchaAnswerInput?.value || '').trim();
    const captchaIdVal = String(captchaIdInput?.value || currentCaptchaId);

    let hasError = false;
    let firstErrorField = null;

    if (!nimVal) {
      if (nimError && nimInput) {
        nimError.textContent = 'NIM wajib diisi.';
        nimError.classList.remove('hidden');
        nimInput.setAttribute('aria-invalid', 'true');
        nimInput.setAttribute('aria-describedby', 'nim-error');
        if (!firstErrorField) firstErrorField = nimInput;
        hasError = true;
      }
    } else if (!/^[0-9]+$/.test(nimVal)) {
      if (nimError && nimInput) {
        nimError.textContent = 'Format NIM tidak valid (hanya angka).';
        nimError.classList.remove('hidden');
        nimInput.setAttribute('aria-invalid', 'true');
        nimInput.setAttribute('aria-describedby', 'nim-error');
        if (!firstErrorField) firstErrorField = nimInput;
        hasError = true;
      }
    }

    if (!passwordVal || passwordVal.length < 6) {
      if (passwordError && passwordInput) {
        passwordError.textContent = 'Kata sandi minimal 6 karakter.';
        passwordError.classList.remove('hidden');
        passwordInput.setAttribute('aria-invalid', 'true');
        passwordInput.setAttribute('aria-describedby', 'password-error');
        if (!firstErrorField) firstErrorField = passwordInput;
        hasError = true;
      }
    }

    if (!captchaAnsVal) {
      if (captchaError && captchaAnswerInput) {
        captchaError.textContent = 'Jawaban captcha wajib diisi.';
        captchaError.classList.remove('hidden');
        captchaAnswerInput.setAttribute('aria-invalid', 'true');
        captchaAnswerInput.setAttribute('aria-describedby', 'captcha-error');
        if (!firstErrorField) firstErrorField = captchaAnswerInput;
        hasError = true;
      }
    }

    if (hasError) {
      firstErrorField?.focus();
      return;
    }

    performLogin({
      nim: nimVal,
      password: passwordVal,
      captchaId: captchaIdVal,
      captchaAnswer: captchaAnsVal,
    });
  });
}
