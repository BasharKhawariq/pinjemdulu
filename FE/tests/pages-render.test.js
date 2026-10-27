import test from 'node:test';
import assert from 'node:assert/strict';

import * as LoginPage from '../js/pages/login.js';
import * as DashboardPage from '../js/pages/dashboard-peminjam.js';
import * as PlaceholderPage from '../js/pages/placeholder.js';
import * as NotFoundPage from '../js/pages/notfound.js';
import { renderSidebar, renderMobileDrawer } from '../js/ui/sidebar.js';
import { renderNavbar } from '../js/ui/navbar.js';
import { renderFooter } from '../js/ui/footer.js';
import { ROLES } from '../js/lib/constants.js';

const FORBIDDEN_ESCAPED_TAGS = [
  '&lt;svg',
  '&lt;button',
  '&lt;div',
  '&lt;p',
  '&lt;span',
  '&lt;a ',
  '&lt;path',
  '&lt;input',
  '&lt;label',
  '&amp;lt;',
];

function assertNoEscapedMarkup(output, componentName) {
  for (const token of FORBIDDEN_ESCAPED_TAGS) {
    assert.equal(
      output.includes(token),
      false,
      `${componentName} tidak boleh memuat fragmen markup ter-escape '${token}'`
    );
  }
}

test('pages-render: LoginPage merender struktur form dua kolom, captcha, dan masuk cepat tanpa escape ganda', () => {
  const html = LoginPage.render();
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Selamat Datang Kembali!'));
  assert.ok(html.includes('Siap mengelola atau meminjam?'));
  assert.ok(html.includes('login-email'));
  assert.ok(html.includes('login-password'));
  assert.ok(html.includes('login-captcha-answer'));
  assert.ok(html.includes('Maitri Sakti'));
  assert.ok(html.includes('Siti Rahma'));
  assert.ok(html.includes('Budi Santoso'));
  assert.ok(html.includes('Aulia Putri'));
  assert.ok(html.includes('Nonaktif'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'LoginPage');
  assert.ok(html.includes('assets/img/Logo-PinjemDulu.png'));
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('<button'));
  assert.ok(html.includes('data-action="quick-login"'));
});

test('pages-render: DashboardPage merender sapaan peminjam, 4 kartu status, ringkasan kanan, dan tabel Pengajuan Saya', () => {
  const user = { nama: 'Maitri Sakti', nim: '254107020789', role: ROLES.PEMINJAM };
  const html = DashboardPage.render({ user });
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Halo, Maitri Sakti'));
  assert.ok(html.includes('Siap menyiapkan kegiatan organisasi hari ini?'));
  assert.ok(html.includes('Disetujui'));
  assert.ok(html.includes('Ditolak'));
  assert.ok(html.includes('Dikembalikan'));
  assert.ok(html.includes('Terlambat'));
  assert.ok(html.includes('Total Peminjaman'));
  assert.ok(html.includes('Pengajuan PJ'));
  assert.ok(html.includes('Pengajuan Saya'));
  assert.ok(html.includes('Proyektor Epson'));
  assert.ok(html.includes('Lihat Semua'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));
  assertNoEscapedMarkup(html, 'DashboardPage');

  const maliciousUser = { nama: '<script>alert("xss")</script>', role: ROLES.PEMINJAM };
  const safeHtml = DashboardPage.render({ user: maliciousUser });
  assert.equal(safeHtml.includes('<script>alert("xss")</script>'), false);
  assert.equal(safeHtml.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), true);
});

test('pages-render: PlaceholderPage merender judul dan penanda "Segera hadir" tanpa escape ganda', () => {
  const html = PlaceholderPage.render({ path: '#/dashboard-peminjam' });
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('Dashboard'));
  assert.ok(html.includes('Segera hadir'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'PlaceholderPage');
  assert.ok(html.includes('<svg class="h-7 w-7 text-primary"'));
});

test('pages-render: NotFoundPage merender judul dan tombol kembali ke inventaris tanpa escape ganda', () => {
  const html = NotFoundPage.render({ message: 'Barang tidak ditemukan.' });
  assert.ok(html.includes('Halaman tidak ditemukan'));
  assert.ok(html.includes('Barang tidak ditemukan.'));
  assert.ok(html.includes('href="#/inventaris"'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));

  assertNoEscapedMarkup(html, 'NotFoundPage');
  assert.ok(html.includes('<svg class="h-7 w-7 text-rose-600"'));
});

test('pages-render: renderSidebar merender untuk Peminjam dengan benar tanpa escape ganda', () => {
  const user = { nama: 'Maitri Sakti', role: ROLES.PEMINJAM };
  const expandedHtml = renderSidebar({ user, currentHash: '#/dashboard-peminjam', collapsed: false });
  assert.ok(expandedHtml.includes('w-[280px]'));
  assert.ok(expandedHtml.includes('assets/img/Logo-PinjemDulu.png'));
  assert.ok(expandedHtml.includes('Pinjem'));
  assert.ok(expandedHtml.includes('Dulu'));
  assert.ok(expandedHtml.includes('INVENTARIS OKI KAMPUS'));
  assert.ok(expandedHtml.includes('Dashboard'));
  assert.ok(expandedHtml.includes('Inventaris'));
  assert.ok(expandedHtml.includes('id="sub-sidebar-nav-pengajuan-saya"'));
  assert.ok(expandedHtml.includes('aria-controls="sub-sidebar-nav-pengajuan-saya"'));
  assert.ok(!expandedHtml.includes('Kelola Inventaris'));
  assert.ok(expandedHtml.includes('MS'));
  assert.ok(expandedHtml.includes('Maitri Sakti'));
  assert.ok(expandedHtml.includes('Peminjam'));
  assert.ok(!expandedHtml.includes('undefined'));
  assert.ok(!expandedHtml.includes('[object Object]'));
  assertNoEscapedMarkup(expandedHtml, 'Sidebar Peminjam (Expanded)');

  const collapsedHtml = renderSidebar({ user, currentHash: '#/dashboard-peminjam', collapsed: true });
  assert.ok(collapsedHtml.includes('w-[84px]'));
  assert.ok(collapsedHtml.includes('assets/img/Logo-PinjemDulu.png'));
  assert.ok(collapsedHtml.includes('MS'));
  assert.ok(!collapsedHtml.includes('undefined'));
  assertNoEscapedMarkup(collapsedHtml, 'Sidebar Peminjam (Collapsed)');
});

test('pages-render: renderSidebar merender untuk PJ dengan menu kelola tanpa escape ganda', () => {
  const user = { nama: 'Siti Rahma', role: ROLES.PENANGGUNG_JAWAB };
  const html = renderSidebar({ user, currentHash: '#/kelola/inventaris', collapsed: false });
  assert.ok(html.includes('assets/img/Logo-PinjemDulu.png'));
  assert.ok(html.includes('Kelola Inventaris'));
  assert.ok(html.includes('Pengelolaan'));
  assert.ok(html.includes('Kelola Peminjaman'));
  assert.ok(html.includes('SR'));
  assert.ok(html.includes('PJ Inventaris'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));
  assertNoEscapedMarkup(html, 'Sidebar PJ');
});

test('pages-render: renderMobileDrawer merender modal drawer dan tombol tutup tanpa escape ganda', () => {
  const user = { nama: 'Budi Santoso', role: ROLES.PENANGGUNG_JAWAB };
  const html = renderMobileDrawer({ user, currentHash: '#/dashboard-peminjam', open: true });
  assert.ok(html.includes('mobile-drawer'));
  assert.ok(html.includes('assets/img/Logo-PinjemDulu.png'));
  assert.ok(html.includes('translate-x-0'));
  assert.ok(html.includes('id="sub-drawer-nav-pengajuan-saya"'));
  assert.ok(html.includes('aria-controls="sub-drawer-nav-pengajuan-saya"'));
  assert.ok(html.includes('Budi Santoso'));
  assert.ok(html.includes('BS'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));
  assertNoEscapedMarkup(html, 'Mobile Drawer');
});

test('pages-render: renderNavbar merender judul dan ikon tanpa escape ganda', () => {
  const html = renderNavbar({ title: 'Katalog Barang', icon: 'Package' });
  assert.ok(html.includes('Katalog Barang'));
  assert.ok(html.includes('<svg'));
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('[object Object]'));
  assertNoEscapedMarkup(html, 'Navbar');
});

test('pages-render: renderFooter merender hak cipta 2026 tanpa escape ganda', () => {
  const html = renderFooter();
  assert.ok(html.includes('2026. PinjemDulu - All Rights Reserved.'));
  assert.ok(!html.includes('undefined'));
  assertNoEscapedMarkup(html, 'Footer');
});

test('pelindung kebalikan XSS: data berbahaya tetap ter-escape pada nama pengguna di sidebar', () => {
  const maliciousUser = { nama: '<script>alert("xss")</script>', role: ROLES.PEMINJAM };
  const html = renderSidebar({ user: maliciousUser, currentHash: '#/dashboard-peminjam' });
  assert.equal(html.includes('<script>alert("xss")</script>'), false);
  assert.equal(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), true);
});

test('pelindung kebalikan XSS: data berbahaya tetap ter-escape pada pesan NotFoundPage', () => {
  const maliciousMessage = 'Barang rusak"><img src=x onerror=alert(1)>';
  const html = NotFoundPage.render({ message: maliciousMessage });
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
});

test('pelindung kebalikan XSS: data berbahaya tetap ter-escape pada path PlaceholderPage', () => {
  const maliciousPath = '#/<script>alert(1)</script>';
  const html = PlaceholderPage.render({ path: maliciousPath });
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.ok(!html.includes('undefined'));
});
