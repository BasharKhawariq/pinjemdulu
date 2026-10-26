/**
 * client.js — Klien dasar layanan (pure mock untuk Vanilla static build).
 */

export function isMockEnabled() {
  return true;
}

export function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
