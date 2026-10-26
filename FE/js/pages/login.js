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
    const roleName = u.role === 'peminjam' ? 'Peminjam' : 'PJ Inventaris';
    const orgName =
      typeof u.organisasi === 'object' && u.organisasi
        ? u.organisasi.namaOrganisasi || u.organisasi.nama || 'OKI'
        : String(u.organisasi || 'OKI');

    return html`
      <button
        type="button"
        data-action="quick-login"
        data-email="${u.email}"
        class="group flex flex-col justify-start gap-1 rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:border-primary/40 hover:bg-blue-50/50"
      >
        <div class="flex items-center gap-2">
          <p class="truncate text-sm font-semibold text-zinc-900">${u.nama}</p>
          ${
            isNonaktif
              ? raw('<span class="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">Nonaktif</span>')
              : ''
          }
        </div>
        <p class="truncate text-[11px] text-zinc-500">${u.email}</p>
        <p class="truncate text-[11px] text-zinc-400">${roleName} · ${orgName}</p>
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

              <!-- Field Email -->
              <div>
                <label for="login-email" class="${labelClass('mb-2 block text-zinc-600')}">
                  Email<span class="ml-0.5 text-rose-500">*</span>
                </label>
                <div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    placeholder="contoh@mail.uma.ac.id"
                    class="${inputClass('h-12 rounded-2xl px-4 py-3')}"
                    required
                  />
                  <p id="email-error" class="mt-1 text-xs text-rose-600 hidden"></p>
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
            <div class="mt-10 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 sm:p-5">
              <div class="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-primary">
                    Mode Mock Aktif
                  </p>
                  <p class="text-[11px] text-zinc-500">
                    Cepat pilih akun di bawah — tanpa captcha.
                  </p>
                </div>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Mock
                </span>
              </div>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                ${quickUsers}
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
  const emailInput = root.querySelector('#login-email');
  const passwordInput = root.querySelector('#login-password');
  const captchaIdInput = root.querySelector('#login-captcha-id');
  const captchaAnswerInput = root.querySelector('#login-captcha-answer');
  const captchaDisplay = root.querySelector('#captcha-text-display');
  const globalErrorBox = root.querySelector('#login-global-error');
  const emailError = root.querySelector('#email-error');
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
    if (emailError) {
      emailError.textContent = '';
      emailError.classList.add('hidden');
      emailInput?.removeAttribute('aria-invalid');
      emailInput?.removeAttribute('aria-describedby');
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

  async function performLogin({ email, password, captchaId, captchaAnswer }) {
    if (submitting) return;
    submitting = true;
    clearErrors();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Memproses...</span>';
    }

    try {
      const res = await login({ email, password, captchaId, captchaAnswer });
      if (res?.user) {
        setSession(res.user);
        navigate('#/inventaris');
      }
    } catch (err) {
      const statusCode = err?.statusCode || 0;
      const message = err?.message || 'Gagal masuk. Silakan coba lagi.';
      let firstErrorField = null;

      if (statusCode === 401) {
        if (emailError && emailInput) {
          emailError.textContent = message;
          emailError.classList.remove('hidden');
          emailInput.setAttribute('aria-invalid', 'true');
          emailInput.setAttribute('aria-describedby', 'email-error');
          firstErrorField = emailInput;
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
    const email = btn.getAttribute('data-email');
    if (email) {
      performLogin({
        email,
        password: '',
        captchaId: 'MOCK-QUICKLOGIN',
        captchaAnswer: '',
      });
    }
  });

  // Submit Formulir Utama
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;

    clearErrors();
    const emailVal = String(emailInput?.value || '').trim();
    const passwordVal = String(passwordInput?.value || '');
    const captchaAnsVal = String(captchaAnswerInput?.value || '').trim();
    const captchaIdVal = String(captchaIdInput?.value || currentCaptchaId);

    let hasError = false;
    let firstErrorField = null;

    if (!emailVal) {
      if (emailError && emailInput) {
        emailError.textContent = 'Email wajib diisi.';
        emailError.classList.remove('hidden');
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.setAttribute('aria-describedby', 'email-error');
        if (!firstErrorField) firstErrorField = emailInput;
        hasError = true;
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      if (emailError && emailInput) {
        emailError.textContent = 'Format email tidak valid.';
        emailError.classList.remove('hidden');
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.setAttribute('aria-describedby', 'email-error');
        if (!firstErrorField) firstErrorField = emailInput;
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
      email: emailVal,
      password: passwordVal,
      captchaId: captchaIdVal,
      captchaAnswer: captchaAnsVal,
    });
  });
}
