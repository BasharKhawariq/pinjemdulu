/**
 * captcha.js — Generator dan validator captcha murni.
 * Mendukung injeksi RNG untuk pengujian deterministik.
 */

const CAPTCHA_CHARS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Buat captcha baru (4 huruf kecil acak).
 * @param {() => number} [rng=Math.random]
 * @returns {{ captchaId: string, text: string }}
 */
export function createCaptcha(rng = Math.random) {
  let text = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(rng() * CAPTCHA_CHARS.length);
    text += CAPTCHA_CHARS[idx % CAPTCHA_CHARS.length];
  }
  const randomSuffix = Math.floor(rng() * 1e8).toString(36);
  const captchaId = `cap-${Date.now().toString(36)}-${randomSuffix}`;
  return { captchaId, text };
}

/**
 * Validasi jawaban captcha (tidak peka huruf besar/kecil, abaikan spasi tepi).
 * @param {string} text
 * @param {string} answer
 * @returns {boolean}
 */
export function checkCaptcha(text, answer) {
  if (!text || !answer) return false;
  return String(text).trim().toLowerCase() === String(answer).trim().toLowerCase();
}
