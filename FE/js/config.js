/**
 * config.js — Modul pembaca konfigurasi lingkungan runtime PinjemDulu.
 * Bekerja baik di browser (membaca window.__ENV__) maupun di Node.js test runner.
 */

const isBrowser = typeof window !== 'undefined';

function resolveApiBaseUrl() {
  if (isBrowser && typeof window.__ENV__?.API_BASE_URL === 'string') {
    return window.__ENV__.API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  return 'http://localhost:8000';
}

function resolveEnableMock() {
  // Jika berjalan di lingkungan browser:
  if (isBrowser) {
    const envVal = window.__ENV__?.ENABLE_MOCK;
    if (typeof envVal === 'boolean') return envVal;
    if (typeof envVal === 'string') return envVal.toLowerCase() === 'true';
    return false; // Default di browser adalah real API jika window.__ENV__ sudah ada
  }

  // Jika berjalan di lingkungan Node.js (misalnya runner pengujian unit):
  if (typeof process !== 'undefined') {
    if (process.env?.ENABLE_MOCK !== undefined) {
      return process.env.ENABLE_MOCK === 'true';
    }
    if (process.env?.NEXT_PUBLIC_USE_MOCK !== undefined) {
      return process.env.NEXT_PUBLIC_USE_MOCK === 'true';
    }
  }

  // Default fallback untuk lingkungan non-browser (Node.js test runner)
  return true;
}

export const ENV = {
  API_BASE_URL: resolveApiBaseUrl(),
  ENABLE_MOCK: resolveEnableMock(),
};

