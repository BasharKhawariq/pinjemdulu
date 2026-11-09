/**
 * client.js — Klien HTTP dan manajemen koneksi backend API PinjemDulu.
 * Mendukung pemanggilan real API maupun fallback mode mock.
 */

import { ENV } from '../config.js';
import { getToken } from '../state/session.js';

let mockOverride = null;

/**
 * Periksa apakah mode mock sedang aktif.
 * @returns {boolean}
 */
export function isMockEnabled() {
  if (mockOverride !== null) {
    return mockOverride;
  }
  return ENV.ENABLE_MOCK;
}

/**
 * Setel override status mock (berguna untuk pengujian atau toggle dinamis).
 * @param {boolean|null} value - true/false untuk override, null untuk kembali ke konfigurasi ENV
 */
export function setMockEnabled(value) {
  mockOverride = typeof value === 'boolean' ? value : null;
}

/**
 * Dapatkan URL basis API backend.
 * @returns {string}
 */
export function getApiBaseUrl() {
  return ENV.API_BASE_URL || 'http://localhost:8000';
}

/**
 * Helper penundaan asinkron untuk simulasi latensi jaringan pada mode mock.
 * @param {number} [ms=100]
 * @returns {Promise<void>}
 */
export function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pemanggilan API HTTP terstandarisasi dengan penanganan JWT, headers JSON, dan format error terstruktur.
 *
 * @param {string} endpoint - Path endpoint (misal: '/api/login' atau 'api/inventaris')
 * @param {RequestInit} [options={}] - Opsi fetch standar (method, headers, body, dll.)
 * @returns {Promise<any>}
 */
export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${baseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});

  // Sertakan token JWT otomatis dari session jika tersedia dan belum diset manual
  if (!headers.has('Authorization')) {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Tangani body & header Content-Type
  let finalBody = options.body;
  const isFormData = typeof FormData !== 'undefined' && finalBody instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && finalBody instanceof Blob;

  if (finalBody !== undefined && finalBody !== null) {
    if (isFormData || isBlob) {
      // Biarkan browser/fetch mengatur header Content-Type otomatis (termasuk boundary)
      headers.delete('Content-Type');
    } else if (typeof finalBody === 'object') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      finalBody = JSON.stringify(finalBody);
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const fetchOptions = {
    ...options,
    headers,
    body: finalBody,
  };

  const response = await fetch(url, fetchOptions);

  // Status 204 No Content: respons tanpa payload
  if (response.status === 204) {
    return null;
  }

  // Parse body respons (JSON atau teks)
  const contentType = response.headers.get('content-type') || '';
  let responseData = null;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      const text = await response.text();
      responseData = text ? JSON.parse(text) : null;
    } catch {
      responseData = null;
    }
  }

  // Tangani kegagalan HTTP status (4xx, 5xx)
  if (!response.ok) {
    const message =
      responseData?.message ||
      (typeof responseData === 'string' ? responseData : null) ||
      response.statusText ||
      `Permintaan gagal dengan status ${response.status}`;

    const error = new Error(message);
    error.statusCode = response.status;
    error.status = response.status;
    error.code = responseData?.code || null;
    error.errors = responseData?.errors || null;
    error.data = responseData;

    throw error;
  }

  return responseData;
}
