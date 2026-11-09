/**
 * env.js — Konfigurasi Lingkungan Runtime Frontend PinjemDulu.
 * Dimuat secara sinkron di index.html sebelum modul ES dieksekusi.
 * 
 * Pengaturan ini dapat disesuaikan saat beralih antara lingkungan lokal,
 * staging, maupun produksi tanpa perlu kompilasi ulang kode aplikasi.
 */
window.__ENV__ = {
  // Base URL backend API PinjemDulu
  API_BASE_URL: 'http://localhost:8000',

  // Mode Mock:
  // false = Konsumsi backend API nyata (default untuk integrasi)
  // true  = Gunakan mode simulasi mock lokal
  ENABLE_MOCK: false,
};

