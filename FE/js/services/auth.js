import { mockUsers } from '../data/index.js';
import { STATUS_AKUN } from '../lib/constants.js';
import { delay, isMockEnabled } from './client.js';
import { createCaptcha as generateCaptcha, checkCaptcha } from '../lib/captcha.js';

let mockUsersMutable = [...mockUsers];
const mockCaptchaStore = new Map();

/**
 * Reset state auth mock (untuk pengujian).
 */
export function _resetAuthMockState() {
  mockUsersMutable = [...mockUsers];
  mockCaptchaStore.clear();
}

function getUsersMock() {
  return mockUsersMutable;
}

function sanitizeUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    nama: raw.nama,
    nim: raw.nim,
    email: raw.email,
    organisasi: raw.organisasi,
    role: raw.role,
  };
}

/**
 * Buat captcha baru dan simpan di store sementara.
 * @returns {{ captchaId: string, text: string, answer: string }}
 */
export function createCaptcha() {
  const { captchaId, text } = generateCaptcha();
  mockCaptchaStore.set(captchaId, { answer: text, createdAt: Date.now() });
  return { captchaId, text, answer: text };
}

/**
 * Ambil captcha baru untuk tampilan UI.
 * @returns {{ captchaId: string, text: string }}
 */
export function getCaptcha() {
  const { captchaId, text } = createCaptcha();
  return { captchaId, text };
}

function validateCaptchaMock(captchaId, answer) {
  if (!captchaId || !answer) return false;
  const rec = mockCaptchaStore.get(captchaId);
  if (!rec) return false;
  mockCaptchaStore.delete(captchaId);
  if (Date.now() - rec.createdAt > 5 * 60 * 1000) return false;
  return checkCaptcha(rec.answer, answer);
}

function captchaError() {
  const err = new Error('Jawaban captcha salah atau sudah kadaluarsa.');
  err.statusCode = 422;
  err.errors = { captchaAnswer: 'Jawaban captcha salah atau sudah kadaluarsa.' };
  return err;
}

/**
 * Layanan autentikasi login.
 * @param {{ email?: string, password?: string, captchaId?: string, captchaAnswer?: string }} payload
 * @returns {Promise<{ user: object }>}
 */
export async function login(payload) {
  const { email, password, captchaId, captchaAnswer } = payload || {};
  void password; // MOCK: kata sandi tidak diverifikasi

  if (isMockEnabled()) {
    await delay(30);

    // MOCK-QUICKLOGIN melewati pemeriksaan captcha (khusus panel masuk cepat)
    if (captchaId !== 'MOCK-QUICKLOGIN') {
      if (!validateCaptchaMock(captchaId, captchaAnswer)) {
        throw captchaError();
      }
    }

    const emailKey = String(email || '').trim().toLowerCase();
    const user = getUsersMock().find(
      (u) => typeof u.email === 'string' && u.email.toLowerCase() === emailKey
    );

    if (!user) {
      const err = new Error('Email tidak terdaftar.');
      err.statusCode = 401;
      throw err;
    }

    const status = user.statusAkun || user.status_akun;
    if (status !== STATUS_AKUN.AKTIF) {
      const err = new Error('Akun nonaktif, hubungi penanggung jawab.');
      err.statusCode = 403;
      throw err;
    }

    return { user: sanitizeUser(user) };
  }

  return { user: null };
}

/**
 * Ambil data pengguna aktif berdasarkan ID.
 * @param {string} userId
 * @returns {Promise<{ user: object|null }>}
 */
export async function getCurrentUser(userId) {
  await delay(30);
  if (!userId) return { user: null };
  const user = getUsersMock().find((u) => u.id === userId);
  const status = user?.statusAkun || user?.status_akun;
  if (!user || status !== STATUS_AKUN.AKTIF) return { user: null };
  return { user: sanitizeUser(user) };
}
