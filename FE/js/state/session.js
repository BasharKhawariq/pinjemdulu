/**
 * session.js — Manajemen sesi pengguna aktif PinjemDulu.
 * Disimpan di pd:v1:session dengan cadangan memori di Node.
 */

import * as store from './store.js';

export const SESSION_KEY = 'session'; // Disimpan sebagai 'pd:v1:session' oleh store

/**
 * Dapatkan pengguna yang sedang login saat ini.
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
 * Simpan sesi login pengguna baru.
 * @param {object} user
 * @returns {object}
 */
export function login(user) {
  if (!user || typeof user !== 'object') {
    throw new Error('Data pengguna tidak valid untuk sesi login.');
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
 * Hapus sesi login (logout).
 */
export function logout() {
  store.remove(SESSION_KEY);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pd:session-change', {
        detail: null,
      })
    );
  }
}

/**
 * Reset sesi (untuk keperluan unit test).
 */
export function _resetSession() {
  store.remove(SESSION_KEY);
}
