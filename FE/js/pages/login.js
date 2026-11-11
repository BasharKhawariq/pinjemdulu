/**
 * login.js — Halaman Masuk (Login) PinjemDulu.
 * Acuan: _sumber/src/app/(auth)/login/LoginView.jsx
 */

import { html, raw, escapeHtml } from '../ui/html.js';
import { inputClass, labelClass, buttonClass, alertClass } from '../ui/classes.js';
import { renderIcon } from '../ui/icons.js';
import { getCaptcha, login, lupaPassword } from '../services/auth.js';
import { isMockEnabled } from '../services/client.js';
import { mockUsers } from '../data/users.js';
import { login as setSession } from '../state/session.js';
import { navigate } from '../router.js';
import { renderModal as renderModalComponent } from '../ui/modal.js';
import { renderOrganisasiLogo } from '../ui/organisasi-badge.js';

let currentCaptchaId = '';
let currentCaptchaText = '';
let authView = 'login';
let forgotModal = null;
let forgotError = '';
let pendingForgotNim = '';
let pendingForgotWhatsapp = '';

function renderForgotPasswordPage() {
  let modal = '';
  if (forgotModal === 'confirm') {
    modal = renderModalComponent({
      id: 'modal-forgot-password-confirm',
      title: 'Kirim Data Ubah Password?',
      description: 'Pastikan No. WhatsApp Anda aktif dan dapat dihubungi.',
      variant: 'send',
      actions: [
        { label: 'Kembali', action: 'forgot-back-form', variant: 'outline' },
        { label: 'Kirim', action: 'forgot-submit-confirm' },
      ],
    }).toString();
  } else if (forgotModal === 'success') {
    modal = renderModalComponent({
      id: 'modal-forgot-password-success',
      title: 'Data Ubah Password Berhasil Dikirim!',
      description: 'Permintaan ubah password Anda berhasil dikirim. Silakan periksa WhatsApp Anda secara berkala untuk mendapatkan informasi dan melanjutkan ke tahap berikutnya.',
      variant: 'success',
      actions: [{ label: 'Mengerti', action: 'forgot-close-success' }],
    }).toString();
  }

  return html`
    <main class="min-h-screen w-full overflow-x-hidden bg-white text-zinc-900">
      <div class="flex min-h-screen w-full">
        <aside aria-hidden="true" class="hidden w-1/2 shrink-0 md:flex md:items-stretch lg:w-[48%]">
          <div class="flex h-full w-full flex-col bg-primary"></div>
        </aside>
        <section class="flex min-h-screen w-full flex-1 flex-col items-center justify-start px-5 py-10 sm:px-8 md:w-1/2 md:px-12 md:py-14 lg:w-[52%] lg:px-20 lg:py-20 xl:px-28">
          <div class="flex w-full max-w-xl flex-1 flex-col">
            <a href="#/login" data-action="forgot-back-login" aria-label="PinjemDulu beranda" class="mb-10 inline-flex items-center gap-3 transition hover:opacity-90">
              <img src="assets/img/Logo-PinjemDulu.png" alt="Logo PinjemDulu" class="h-[42px] w-[42px] shrink-0 rounded-[14px] object-contain shadow-sm sm:h-[44px] sm:w-[44px]" />
              <span class="flex items-baseline text-2xl font-extrabold tracking-tight"><span class="text-zinc-900">Pinjem</span><span class="text-primary">Dulu</span></span>
            </a>
            <div class="mb-8">
              <p class="mb-2 text-sm font-medium text-zinc-500">Selamat Datang Kembali!</p>
              <h1 class="mb-2 text-3xl font-semibold leading-[1.4] tracking-[0] text-zinc-900 sm:text-[32px]">Atur Ulang Password</h1>
              <p class="text-sm leading-6 text-zinc-500">Masukkan NIM dan nomor WhatsApp yang terdaftar untuk memverifikasi akun Anda.</p>
            </div>
            <form id="forgot-password-form" novalidate class="space-y-5">
              <div>
                <label for="forgot-nim" class="${labelClass('mb-2 block text-zinc-600')}">NIM<span class="ml-0.5 text-rose-500">*</span></label>
                <input id="forgot-nim" name="nim" type="text" inputmode="numeric" placeholder="Masukkan NIM anda" class="${inputClass('h-12 rounded-2xl px-4 py-3')}" required />
                <p id="forgot-nim-error" class="mt-1 text-xs text-rose-600 ${forgotError ? '' : 'hidden'}">${escapeHtml(forgotError)}</p>
              </div>
              <div>
                <label for="forgot-whatsapp" class="${labelClass('mb-2 block text-zinc-600')}">No. Whatsapp<span class="ml-0.5 text-rose-500">*</span></label>
                <input id="forgot-whatsapp" name="whatsapp" type="tel" inputmode="tel" placeholder="Masukkan nomor whatsapp yang bisa dihubungi" class="${inputClass('h-12 rounded-2xl px-4 py-3')}" required />
                <p id="forgot-whatsapp-error" class="mt-1 text-xs text-rose-600 hidden"></p>
              </div>
              <button type="submit" class="${buttonClass({ variant: 'default', size: 'lg' })} h-12 w-full rounded-2xl">Kirim</button>
            </form>
            <footer class="mt-auto py-4 text-center text-xs text-zinc-400">&copy; 2026. PinjemDulu - All Rights Reserved.</footer>
          </div>
        </section>
      </div>
      ${raw(modal)}
    </main>
  `.toString();
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

  if (authView === 'forgot') {
    return renderForgotPasswordPage();
  }

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
            <a href="#/login" aria-label="PinjemDulu beranda" class="mb-10 inline-flex items-center gap-3 self-start transition hover:opacity-90">
              <img
                src="assets/img/Logo-PinjemDulu.png"
                alt="Logo PinjemDulu"
                class="h-[42px] w-[42px] shrink-0 rounded-[14px] object-contain shadow-sm sm:h-[44px] sm:w-[44px]"
              />
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

              <button type="button" data-action="forgot-password" class="mt-2 text-left text-xs font-medium text-primary hover:underline">
                Lupa Password?
              </button>

              <!-- Tombol Submit Masuk -->
              <button
                id="btn-login-submit"
                type="submit"
                class="${buttonClass({ variant: 'default', size: 'lg' })} w-full rounded-2xl h-12"
              >
                <span>Masuk</span>
              </button>
            </form>

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

  if (!root.dataset.authViewHandlers) {
    root.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-action]')?.getAttribute('data-action');
      if (!action) return;

      if (action === 'forgot-password') {
        authView = 'forgot';
        forgotModal = null;
        forgotError = '';
        root.innerHTML = render();
      } else if (action === 'forgot-back-login' || action === 'forgot-close-success') {
        authView = 'login';
        forgotModal = null;
        forgotError = '';
        root.innerHTML = render();
      } else if (action === 'forgot-back-form') {
        forgotModal = null;
        root.innerHTML = render();
      } else if (action === 'forgot-submit-confirm') {
        try {
          await lupaPassword({ nim: pendingForgotNim, noWhatsapp: pendingForgotWhatsapp });
          forgotModal = 'success';
          forgotError = '';
        } catch (err) {
          forgotModal = null;
          forgotError = err?.message || 'Gagal mengirim permintaan ubah password.';
        }
        root.innerHTML = render();
      }
    });
    root.addEventListener('submit', (event) => {
      if (event.target.id !== 'forgot-password-form') return;
      event.preventDefault();

      const formData = new FormData(event.target);
      const nim = String(formData.get('nim') || '').trim();
      const whatsapp = String(formData.get('whatsapp') || '').trim();
      const nimError = root.querySelector('#forgot-nim-error');
      const whatsappError = root.querySelector('#forgot-whatsapp-error');
      const nimInput = root.querySelector('#forgot-nim');
      const whatsappInput = root.querySelector('#forgot-whatsapp');
      let hasError = false;

      if (nimError) {
        nimError.textContent = '';
        nimError.classList.add('hidden');
      }
      if (whatsappError) {
        whatsappError.textContent = '';
        whatsappError.classList.add('hidden');
      }
      nimInput?.removeAttribute('aria-invalid');
      whatsappInput?.removeAttribute('aria-invalid');

      if (!nim) {
        if (nimError) {
          nimError.textContent = 'NIM wajib diisi.';
          nimError.classList.remove('hidden');
        }
        nimInput?.setAttribute('aria-invalid', 'true');
        hasError = true;
      } else if (!/^[0-9]+$/.test(nim)) {
        if (nimError) {
          nimError.textContent = 'Format NIM tidak valid.';
          nimError.classList.remove('hidden');
        }
        nimInput?.setAttribute('aria-invalid', 'true');
        hasError = true;
      } else if (isMockEnabled() && !mockUsers.some((user) => String(user.nim) === nim)) {
        if (nimError) {
          nimError.textContent = 'NIM tidak terdaftar';
          nimError.classList.remove('hidden');
        }
        nimInput?.setAttribute('aria-invalid', 'true');
        hasError = true;
      }

      if (!whatsapp) {
        if (whatsappError) {
          whatsappError.textContent = 'Nomor WhatsApp wajib diisi.';
          whatsappError.classList.remove('hidden');
        }
        whatsappInput?.setAttribute('aria-invalid', 'true');
        hasError = true;
      }

      if (hasError) return;
      pendingForgotNim = nim;
      pendingForgotWhatsapp = whatsapp;
      forgotError = '';
      forgotModal = 'confirm';
      root.innerHTML = render();
    });
    root.dataset.authViewHandlers = 'true';
  }

  if (authView === 'forgot') return;

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

export function unmount() {
  authView = 'login';
  forgotModal = null;
  forgotError = '';
}
