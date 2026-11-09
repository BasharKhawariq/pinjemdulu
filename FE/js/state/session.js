/**
 * session.js — Manajemen sesi pengguna aktif dan token JWT PinjemDulu.
 * Disimpan di pd:v1:session dan pd:v1:token dengan cadangan memori di Node.
 */

import * as store from './store.js';

export const SESSION_KEY = 'session'; // Disimpan sebagai 'pd:v1:session' oleh store
export const TOKEN_KEY = 'token';     // Disimpan sebagai 'pd:v1:token' oleh store

/**
 * Dapatkan token JWT yang tersimpan.
 * @returns {string|null}
 */
export function getToken() {
  const token = store.load(TOKEN_KEY, null);
  return token || null;
}

/**
 * Simpan atau hapus token JWT.
 * @param {string|null} token
 */
export function setToken(token) {
  if (token && typeof token === 'string') {
    store.save(TOKEN_KEY, token);
  } else {
    store.remove(TOKEN_KEY);
  }
}

/**
 * Dapatkan data pengguna yang sedang login saat ini.
 * @returns {object|null}
 */
export function getUser() {
  const user = store.load(SESSION_KEY, null);
  return user || null;
}

/**
 * Alias untuk getUser() agar kompatibel dengan modul lain.
 * @returns {object|null}
 */
export function getCurrentUser() {
  return getUser();
}

/**
 * Simpan sesi login pengguna baru beserta token (jika ada).
 * @param {object} user
 * @param {string|null} [token]
 * @returns {object}
 */
export function login(user, token = null) {
  if (!user || typeof user !== 'object') {
    throw new Error('Data pengguna tidak valid untuk sesi login.');
  }

  // Simpan token JWT jika disertakan secara langsung atau berada di dalam objek user
  const resolvedToken = token || user.token || null;
  if (resolvedToken && typeof resolvedToken === 'string') {
    setToken(resolvedToken);
  }

  store.save(SESSION_KEY, user);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pd:session-change', {
        detail: user,
      })
    );
  }

  return user;
}

/**
 * Hapus sesi login dan token JWT (logout).
 */
export function logout() {
  store.remove(SESSION_KEY);
  store.remove(TOKEN_KEY);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pd:session-change', {
        detail: null,
      })
    );
  }
}

/**
 * Reset sesi dan token (untuk keperluan unit test).
 */
export function _resetSession() {
  store.remove(SESSION_KEY);
  store.remove(TOKEN_KEY);
}
