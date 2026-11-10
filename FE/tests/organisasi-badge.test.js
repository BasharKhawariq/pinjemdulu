import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAFTAR_OKI_RESMI,
  ORG_COLORS,
  getOrganisasiSingkatan,
  getOrganisasiDisplayName,
  getOrganisasiLogoUrl,
  getOrganisasiColorClass,
  renderOrganisasiLogo,
  renderOrganisasiBadge,
} from '../js/ui/organisasi-badge.js';

test('DAFTAR_OKI_RESMI memuat tepat 22 OKI resmi Polinema', () => {
  assert.equal(DAFTAR_OKI_RESMI.length, 22);
  assert.ok(DAFTAR_OKI_RESMI.includes('HMTI'));
  assert.ok(DAFTAR_OKI_RESMI.includes('BEM'));
  assert.ok(DAFTAR_OKI_RESMI.includes('KMK St. YOHANES'));
  assert.ok(DAFTAR_OKI_RESMI.includes('OPA GANENDRA GIRI'));
});

test('getOrganisasiSingkatan menormalisasi berbagai bentuk input', () => {
  assert.equal(getOrganisasiSingkatan('HMTI'), 'HMTI');
  assert.equal(getOrganisasiSingkatan('hmti'), 'HMTI');
  assert.equal(getOrganisasiSingkatan('Himpunan Mahasiswa Mesin (HMM)'), 'HMM');
  assert.equal(getOrganisasiSingkatan({ singkatan: 'HME' }), 'HME');
  assert.equal(getOrganisasiSingkatan({ namaOrganisasi: 'RISPOL' }), 'RISPOL');
  assert.equal(getOrganisasiSingkatan(''), '');
  assert.equal(getOrganisasiSingkatan(null), '');
});

test('getOrganisasiDisplayName mengembalikan nama tampilan yang utuh', () => {
  assert.equal(getOrganisasiDisplayName('BEM Polinema'), 'BEM Polinema');
  assert.equal(getOrganisasiDisplayName({ namaOrganisasi: 'Himpunan HMTI' }), 'Himpunan HMTI');
  assert.equal(getOrganisasiDisplayName(''), '');
});

test('getOrganisasiLogoUrl mengembalikan path aset lokal atau explicit URL', () => {
  assert.equal(getOrganisasiLogoUrl('HMTI'), 'assets/img/oki/HMTI.png');
  assert.equal(
    getOrganisasiLogoUrl('KMK St. YOHANES'),
    'assets/img/oki/KMK%20St.%20YOHANES.png'
  );
  assert.equal(
    getOrganisasiLogoUrl('HMTI', 'https://example.com/hmti.png'),
    'https://example.com/hmti.png'
  );
  assert.equal(
    getOrganisasiLogoUrl({ logoUrl: 'http://localhost:8000/api/berkas/oki.png' }),
    'http://localhost:8000/api/berkas/oki.png'
  );
  assert.equal(getOrganisasiLogoUrl('OKI_TIDAK_DIKENAL_XYZ'), null);
});

test('renderOrganisasiLogo menghasilkan markup gambar dengan fallback onerror', () => {
  const html = renderOrganisasiLogo('HMTI', null, 'h-4 w-4');
  assert.ok(html.includes('<img'));
  assert.ok(html.includes('assets/img/oki/HMTI.png'));
  assert.ok(html.includes('alt="Logo HMTI"'));
  assert.ok(html.includes('onerror='));
  assert.ok(html.includes('hidden'));
  assert.ok(html.includes('H'));
});

test('renderOrganisasiBadge menggabungkan logo dan label organisasi secara rapi', () => {
  const badge = renderOrganisasiBadge('HMTI', { size: 'sm' });
  assert.ok(badge.includes('<img'));
  assert.ok(badge.includes('HMTI'));

  // Menjaga nama panjang jika diberikan
  const customBadge = renderOrganisasiBadge('BEM Polinema');
  assert.ok(customBadge.includes('BEM Polinema'));
  assert.ok(customBadge.includes('assets/img/oki/BEM.png'));

  // Mode asSafeHtml
  const safeBadge = renderOrganisasiBadge('HME', { asSafeHtml: true });
  assert.equal(typeof safeBadge.toString(), 'string');
});

