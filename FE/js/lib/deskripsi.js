/**
 * Fungsi murni manipulasi & validasi deskripsi inventaris (Task #9b).
 * TANPA dependensi React / DOM. Aman dijalankan di runner node:test.
 */

/**
 * Konversi teks polos ke HTML sederhana.
 * Mengubah baris ganda menjadi paragraf, dan baris tunggal menjadi <br>.
 * Men-escape karakter berbahaya HTML.
 *
 * @param {string} text
 * @returns {string}
 */
export function plainTextToHtml(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Pisahkan berdasarkan baris ganda (\n\n) menjadi paragraf
  const paragraphs = trimmed.split(/\r?\n\r?\n+/);
  return paragraphs
    .map((p) => {
      const lines = p.split(/\r?\n/).map(escapeHtml);
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

/**
 * Deteksi apakah sebuah string menyerupai format HTML (mengandung tag pembuka/penutup).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function looksLikeHtml(str) {
  if (!str || typeof str !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Ekstrak teks polos dari string HTML.
 * Menghilangkan tag HTML, mengonversi entitas umum, dan merapikan whitespace.
 *
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';

  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Rapikan baris dan spasi
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  return lines.filter((l) => l.length > 0).join('\n');
}

/**
 * Cek apakah HTML deskripsi kosong secara semantik (misal hanya <p></p>, <p><br></p>, dsb).
 *
 * @param {string} html
 * @returns {boolean}
 */
export function isDeskripsiKosong(html) {
  if (!html || typeof html !== 'string') return true;
  const stripped = htmlToPlainText(html).trim();
  return stripped.length === 0;
}

/**
 * Hitung jumlah karakter teks polos dari isi deskripsi HTML.
 *
 * @param {string} html
 * @returns {number}
 */
export function getDeskripsiLength(html) {
  if (!html || typeof html !== 'string') return 0;
  return htmlToPlainText(html).length;
}

/**
 * Validasi apakah URL tautan aman untuk disematkan di editor.
 * Hanya mengizinkan skema http, https, dan mailto. Menolak javascript:, data:, vbscript:.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeLinkUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.length === 0) return false;

  // Larang skema berbahaya
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }

  // Izinkan http, https, mailto, atau tautan relatif aman
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}
