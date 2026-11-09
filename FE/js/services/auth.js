import { mockUsers } from '../data/index.js';
import { ROLES, STATUS_AKUN } from '../lib/constants.js';
import { delay, isMockEnabled, apiFetch } from './client.js';
import { createCaptcha as generateCaptcha, checkCaptcha } from '../lib/captcha.js';
import { setToken, getToken, getUser, login as loginSession, logout as logoutSession } from '../state/session.js';

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
 * Normalisasi data user profil dari BE ke struktur FE yang terpadu.
 * @param {object} rawUser
 * @returns {object|null}
 */
export function normalizeUser(rawUser) {
  if (!rawUser) return null;
  const isPj = Boolean(
    rawUser?.isPj ??
    (rawUser?.role === 'Penanggung Jawab' || rawUser?.role === ROLES.PENANGGUNG_JAWAB)
  );

  const rawOrg = rawUser?.organisasi;
  const org = rawOrg && typeof rawOrg === 'object' ? {
    ...rawOrg,
    id: rawUser.idOrganisasi || rawOrg.id || rawOrg.idOrganisasi || null,
    idOrganisasi: rawUser.idOrganisasi || rawOrg.idOrganisasi || rawOrg.id || null,
    nama: rawOrg.nama || rawOrg.namaOrganisasi || rawOrg.singkatan || '',
    namaOrganisasi: rawOrg.namaOrganisasi || rawOrg.nama || rawOrg.singkatan || '',
    singkatan: rawOrg.singkatan || rawOrg.nama || rawOrg.namaOrganisasi || '',
    logoUrl: rawOrg.logoUrl || null,
  } : rawOrg;

  return {
    ...rawUser,
    id: rawUser?.nim || rawUser?.id,
    nim: rawUser?.nim || '',
    nama: rawUser?.namaPengguna || rawUser?.nama || '',
    namaPengguna: rawUser?.namaPengguna || rawUser?.nama || '',
    role: isPj ? ROLES.PENANGGUNG_JAWAB : ROLES.PEMINJAM,
    roleAsli: rawUser?.role || (isPj ? 'Penanggung Jawab' : 'Peminjam'),
    isPj,
    idOrganisasi: rawUser?.idOrganisasi || (typeof rawOrg === 'object' ? rawOrg?.id : null),
    organisasi: org,
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
 * Mendukung login menggunakan NIM (utama) maupun email (kompatibilitas).
 * @param {{ nim?: string, email?: string, password?: string, captchaId?: string, captchaAnswer?: string }} payload
 * @returns {Promise<{ user: object, token?: string }>}
 */
export async function login(payload) {
  const { nim, email, password, captchaId, captchaAnswer } = payload || {};

  if (isMockEnabled()) {
    void password; // MOCK: kata sandi tidak diverifikasi
    await delay(30);

    // MOCK-QUICKLOGIN melewati pemeriksaan captcha (khusus panel masuk cepat)
    if (captchaId !== 'MOCK-QUICKLOGIN') {
      if (!validateCaptchaMock(captchaId, captchaAnswer)) {
        throw captchaError();
      }
    }

    const nimKey = String(nim || '').trim();
    const emailKey = String(email || '').trim().toLowerCase();
    const user = getUsersMock().find((u) => {
      if (nimKey && String(u.nim || '').trim() === nimKey) return true;
      if (emailKey && typeof u.email === 'string' && u.email.toLowerCase() === emailKey) return true;
      return false;
    });

    if (!user) {
      const err = new Error(nimKey ? 'NIM tidak terdaftar.' : 'Email tidak terdaftar.');
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

  // --- Real API Mode ---
  // Validasi captcha di sisi klien jika captchaId disertakan
  if (captchaId && captchaId !== 'MOCK-QUICKLOGIN') {
    if (!validateCaptchaMock(captchaId, captchaAnswer)) {
      throw captchaError();
    }
  }

  const nimValue = String(nim || '').trim();
  const passwordValue = String(password || '');

  const response = await apiFetch('/api/login', {
    method: 'POST',
    body: {
      nim: nimValue,
      password: passwordValue,
    },
  });

  const { token, user: rawUser } = response || {};
  const normalizedUser = normalizeUser(rawUser);
  if (normalizedUser && token) {
    normalizedUser.token = token;
  }

  if (token) {
    setToken(token);
  }

  return { user: normalizedUser, token };
}

/**
 * Ambil data profil pengguna yang sedang login dari backend (/api/me)
 * atau dari state sesi lokal pada mode mock.
 * @returns {Promise<{ user: object|null }>}
 */
export async function getMe() {
  if (isMockEnabled()) {
    const sessionUser = getUser();
    return { user: sessionUser };
  }

  try {
    const rawUser = await apiFetch('/api/me');
    if (!rawUser) return { user: null };

    const normalizedUser = normalizeUser(rawUser);
    return { user: normalizedUser };
  } catch (err) {
    if (err?.statusCode === 401) {
      return { user: null };
    }
    throw err;
  }
}

/**
 * Periksa keabsahan sesi saat ini ke backend atau state lokal.
 * Jika sesi di backend kedaluwarsa atau tidak valid, sesi lokal akan di-logout otomatis.
 * @returns {Promise<object|null>}
 */
export async function checkSession() {
  if (isMockEnabled()) {
    return getUser();
  }

  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const { user } = await getMe();
    if (!user) {
      logoutSession();
      return null;
    }
    return user;
  } catch (err) {
    if (err?.statusCode === 401) {
      logoutSession();
      return null;
    }
    throw err;
  }
}

/**
 * Ambil data pengguna aktif berdasarkan ID (kompatibilitas mock / getMe).
 * @param {string} userId
 * @returns {Promise<{ user: object|null }>}
 */
export async function getCurrentUser(userId) {
  if (isMockEnabled()) {
    await delay(30);
    if (!userId) return { user: null };
    const user = getUsersMock().find((u) => u.id === userId);
    const status = user?.statusAkun || user?.status_akun;
    if (!user || status !== STATUS_AKUN.AKTIF) return { user: null };
    return { user: sanitizeUser(user) };
  }

  return getMe();
}

/**
 * Layanan Ubah Password.
 * @param {{ passwordLama: string, passwordBaru: string, konfirmasiPassword: string }} payload
 * @returns {Promise<{ message: string, token?: string, user?: object }>}
 */
export async function ubahPassword(payload) {
  const { passwordLama, passwordBaru, konfirmasiPassword } = payload || {};

  if (!passwordLama) {
    const err = new Error('Password saat ini wajib diisi');
    err.statusCode = 422;
    err.errors = { passwordLama: 'Password saat ini wajib diisi' };
    throw err;
  }
  if (!passwordBaru || passwordBaru.length < 8) {
    const err = new Error('Password baru minimal 8 karakter');
    err.statusCode = 422;
    err.errors = { passwordBaru: 'Password baru minimal 8 karakter' };
    throw err;
  }
  if (konfirmasiPassword !== passwordBaru) {
    const err = new Error('Konfirmasi password harus sama dengan password baru');
    err.statusCode = 422;
    err.errors = { konfirmasiPassword: 'Konfirmasi password harus sama dengan password baru' };
    throw err;
  }

  if (isMockEnabled()) {
    await delay(30);
    return { message: 'Password berhasil diubah' };
  }

  const res = await apiFetch('/api/ubah-password', {
    method: 'POST',
    body: {
      passwordLama,
      passwordBaru,
      konfirmasiPassword,
    },
  });

  if (res?.token) {
    setToken(res.token);
  }
  if (res?.user) {
    const normalized = normalizeUser(res.user);
    if (res.token) normalized.token = res.token;
    loginSession(normalized, res.token);
  }

  return res;
}

/**
 * Layanan Permintaan Lupa Password (mengirim tiket ubah password ke PJ OKI).
 * @param {{ nim: string, noWhatsapp: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export async function lupaPassword(payload) {
  const { nim, noWhatsapp } = payload || {};
  const nimStr = String(nim || '').trim();
  const waStr = String(noWhatsapp || '').trim();

  if (!nimStr) {
    const err = new Error('NIM wajib diisi');
    err.statusCode = 422;
    err.errors = { nim: 'NIM wajib diisi' };
    throw err;
  }
  if (!waStr) {
    const err = new Error('Nomor WhatsApp wajib diisi');
    err.statusCode = 422;
    err.errors = { noWhatsapp: 'Nomor WhatsApp wajib diisi' };
    throw err;
  }
  if (!/^[0-9+]{8,20}$/.test(waStr)) {
    const err = new Error('No WhatsApp hanya boleh angka dan +, 8 sampai 20 karakter');
    err.statusCode = 422;
    err.errors = { noWhatsapp: 'No WhatsApp hanya boleh angka dan +, 8 sampai 20 karakter' };
    throw err;
  }

  if (isMockEnabled()) {
    await delay(30);
    const exists = getUsersMock().some((u) => String(u.nim || '').trim() === nimStr);
    if (!exists) {
      const err = new Error('NIM tidak terdaftar');
      err.statusCode = 404;
      err.code = 'NIM_TIDAK_TERDAFTAR';
      throw err;
    }
    return { message: 'Permintaan ubah password dikirim ke penanggung jawab OKI Anda' };
  }

  return await apiFetch('/api/lupa-password', {
    method: 'POST',
    body: {
      nim: nimStr,
      noWhatsapp: waStr,
    },
  });
}

/**
 * Layanan Reset Password menggunakan token tautan.
 * @param {{ token: string, passwordBaru: string, konfirmasiPassword: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export async function resetPassword(payload) {
  const { token, passwordBaru, konfirmasiPassword } = payload || {};
  const tokenStr = String(token || '').trim();

  if (!tokenStr) {
    const err = new Error('Tautan ubah password tidak valid atau sudah kedaluwarsa.');
    err.statusCode = 400;
    err.code = 'TAUTAN_TIDAK_VALID';
    throw err;
  }
  if (!passwordBaru || passwordBaru.length < 8) {
    const err = new Error('Password baru minimal 8 karakter');
    err.statusCode = 422;
    err.errors = { passwordBaru: 'Password baru minimal 8 karakter' };
    throw err;
  }
  if (konfirmasiPassword !== passwordBaru) {
    const err = new Error('Konfirmasi password harus sama dengan password baru');
    err.statusCode = 422;
    err.errors = { konfirmasiPassword: 'Konfirmasi password harus sama dengan password baru' };
    throw err;
  }

  if (isMockEnabled()) {
    await delay(30);
    return { message: 'Password berhasil diubah. Silakan login dengan password baru.' };
  }

  return await apiFetch('/api/reset-password', {
    method: 'POST',
    body: {
      token: tokenStr,
      passwordBaru,
      konfirmasiPassword,
    },
  });
}
