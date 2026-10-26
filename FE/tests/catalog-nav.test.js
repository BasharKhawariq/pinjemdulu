import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CATALOG_QUERY_KEY, buildKatalogUrl } from '../js/lib/catalog-nav.js';

describe('CATALOG_QUERY_KEY', () => {
  it('berisi string kunci penyimpanan yang valid', () => {
    assert.equal(typeof CATALOG_QUERY_KEY, 'string');
    assert.ok(CATALOG_QUERY_KEY.length > 0);
    assert.equal(CATALOG_QUERY_KEY, 'pd:v1:katalog-query');
  });
});

describe('buildKatalogUrl', () => {
  const basePath = '/peminjam/inventaris';

  it('mengembalikan basePath saja jika query string kosong atau hanya spasi', () => {
    assert.equal(buildKatalogUrl(basePath, ''), basePath);
    assert.equal(buildKatalogUrl(basePath, '   '), basePath);
    assert.equal(buildKatalogUrl(basePath, '\t\n'), basePath);
  });

  it('mengembalikan basePath saja jika query string hanya tanda tanya', () => {
    assert.equal(buildKatalogUrl(basePath, '?'), basePath);
    assert.equal(buildKatalogUrl(basePath, '???'), basePath);
    assert.equal(buildKatalogUrl(basePath, ' ? '), basePath);
  });

  it('mengembalikan basePath saja untuk nilai tidak valid (null, undefined, bukan string)', () => {
    assert.equal(buildKatalogUrl(basePath, null), basePath);
    assert.equal(buildKatalogUrl(basePath, undefined), basePath);
    assert.equal(buildKatalogUrl(basePath, 123), basePath);
    assert.equal(buildKatalogUrl(basePath, true), basePath);
    assert.equal(buildKatalogUrl(basePath, {}), basePath);
    assert.equal(
      buildKatalogUrl(basePath, () => {}),
      basePath
    );
  });

  it('menangani query string dengan tanda tanya awalan', () => {
    assert.equal(buildKatalogUrl(basePath, '?q=laptop'), '/peminjam/inventaris?q=laptop');
    assert.equal(buildKatalogUrl(basePath, '?page=2'), '/peminjam/inventaris?page=2');
    assert.equal(
      buildKatalogUrl(basePath, '?q=kamera&kategori=1&page=3'),
      '/peminjam/inventaris?q=kamera&kategori=1&page=3'
    );
  });

  it('menormalkan awalan jika query string tidak memiliki tanda tanya', () => {
    assert.equal(buildKatalogUrl(basePath, 'q=laptop'), '/peminjam/inventaris?q=laptop');
    assert.equal(buildKatalogUrl(basePath, 'page=2'), '/peminjam/inventaris?page=2');
    assert.equal(
      buildKatalogUrl(basePath, 'q=kamera&kategori=1&page=3'),
      '/peminjam/inventaris?q=kamera&kategori=1&page=3'
    );
  });

  it('menangani query string yang memiliki karakter ter-encode (URL encoding)', () => {
    assert.equal(
      buildKatalogUrl(basePath, '?q=kabel%20hdmi&oki=bem%20kemakuman'),
      '/peminjam/inventaris?q=kabel%20hdmi&oki=bem%20kemakuman'
    );
    assert.equal(
      buildKatalogUrl(basePath, 'q=kabel%20hdmi&oki=bem%20kemakuman'),
      '/peminjam/inventaris?q=kabel%20hdmi&oki=bem%20kemakuman'
    );
    assert.equal(
      buildKatalogUrl(basePath, '?kategori=audio%2Cvideo&page=2'),
      '/peminjam/inventaris?kategori=audio%2Cvideo&page=2'
    );
  });

  it('menormalkan query dengan tanda tanya berlebih di awal', () => {
    assert.equal(buildKatalogUrl(basePath, '??q=laptop'), '/peminjam/inventaris?q=laptop');
  });

  it('bekerja dengan basePath kustom atau kosong', () => {
    assert.equal(buildKatalogUrl('', 'q=proyektor'), '?q=proyektor');
    assert.equal(buildKatalogUrl('', ''), '');
    assert.equal(buildKatalogUrl(null, 'q=proyektor'), '?q=proyektor');
    assert.equal(buildKatalogUrl(undefined, 'q=proyektor'), '?q=proyektor');
  });
});
