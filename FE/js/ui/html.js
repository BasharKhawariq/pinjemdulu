/**
 * html.js — Template tag dan sanitasi HTML aman untuk aplikasi Vanilla.
 * Mencegah XSS dengan meng-escape semua nilai interpolasi dinamis secara default.
 */

export class SafeHtml {
  constructor(content) {
    this.content = String(content === null || content === undefined ? '' : content);
  }

  toString() {
    return this.content;
  }
}

/**
 * Tandai string sebagai HTML aman agar tidak di-escape ganda.
 * Jika input sudah berupa SafeHtml, kembalikan langsung tanpa perubahan.
 * @param {any} str
 * @returns {SafeHtml}
 */
export function raw(str) {
  if (str instanceof SafeHtml) return str;
  if (str === null || str === undefined || str === false) return new SafeHtml('');
  return new SafeHtml(str);
}

/**
 * Escape karakter berbahaya HTML untuk string data.
 *
 * @param {any} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.content;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Helper internal untuk memformat nilai interpolasi dalam template tag `html`.
 * @param {any} val
 * @returns {string}
 */
function interpolateValue(val) {
  if (val === null || val === undefined || val === false) {
    return '';
  }
  if (Array.isArray(val)) {
    return val.map((v) => interpolateValue(v)).join('');
  }
  if (val instanceof SafeHtml) {
    return val.content;
  }
  return escapeHtml(val);
}

/**
 * Tagged template string `html` untuk menghasilkan string HTML aman.
 * Semua string data biasa akan otomatis di-escape untuk mencegah XSS.
 * SafeHtml (dari raw() atau nested html``) dan array disisipkan tanpa escape ganda.
 * Nilai null, undefined, atau false tidak menghasilkan teks output ("undefined"/"false").
 *
 * @example
 * const htmlObj = html`<div class="card">${userName}</div>`;
 * const htmlStr = htmlObj.toString();
 */
export function html(strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += interpolateValue(values[i]);
    }
  }
  return new SafeHtml(result);
}

