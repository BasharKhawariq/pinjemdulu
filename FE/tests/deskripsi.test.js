import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  plainTextToHtml,
  looksLikeHtml,
  htmlToPlainText,
  isDeskripsiKosong,
  getDeskripsiLength,
  isSafeLinkUrl,
} from '../js/lib/deskripsi.js';

describe('deskripsi pure functions', () => {
  describe('plainTextToHtml', () => {
    it('mengembalikan string kosong untuk input kosong atau non-string', () => {
      assert.equal(plainTextToHtml(''), '');
      assert.equal(plainTextToHtml(null), '');
      assert.equal(plainTextToHtml(undefined), '');
      assert.equal(plainTextToHtml('   '), '');
    });

    it('mengubah satu baris teks menjadi satu paragraf', () => {
      assert.equal(plainTextToHtml('Halo dunia'), '<p>Halo dunia</p>');
    });

    it('mengubah baris baru tunggal menjadi <br> di dalam paragraf', () => {
      assert.equal(plainTextToHtml('Baris 1\nBaris 2'), '<p>Baris 1<br>Baris 2</p>');
    });

    it('mengubah baris baru ganda menjadi paragraf terpisah', () => {
      assert.equal(
        plainTextToHtml('Paragraf 1\n\nParagraf 2'),
        '<p>Paragraf 1</p><p>Paragraf 2</p>'
      );
    });

    it('men-escape karakter HTML khusus', () => {
      assert.equal(
        plainTextToHtml('Tom & Jerry <cartoon> "funny"'),
        '<p>Tom &amp; Jerry &lt;cartoon&gt; &quot;funny&quot;</p>'
      );
    });
  });

  describe('looksLikeHtml', () => {
    it('mendeteksi tag HTML dengan benar', () => {
      assert.equal(looksLikeHtml('<p>Halo</p>'), true);
      assert.equal(looksLikeHtml('<strong>Tebal</strong>'), true);
      assert.equal(looksLikeHtml('<a href="url">link</a>'), true);
      assert.equal(looksLikeHtml('<div>isi</div>'), true);
    });

    it('mengembalikan false untuk teks biasa tanpa tag HTML', () => {
      assert.equal(looksLikeHtml('Teks biasa saja.'), false);
      assert.equal(looksLikeHtml('Nilai x < 5 dan y > 10'), false);
      assert.equal(looksLikeHtml(''), false);
      assert.equal(looksLikeHtml(null), false);
    });
  });

  describe('htmlToPlainText', () => {
    it('menghilangkan tag HTML dan mengembalikan teks polos', () => {
      assert.equal(htmlToPlainText('<p>Halo <strong>dunia</strong>!</p>'), 'Halo dunia!');
    });

    it('mengonversi entitas HTML umum', () => {
      assert.equal(
        htmlToPlainText('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt; &quot;oke&quot;'),
        '<b>Tom & Jerry</b> "oke"'
      );
    });

    it('menghilangkan tag script dan style', () => {
      assert.equal(htmlToPlainText('<script>alert("xss")</script><p>Aman</p>'), 'Aman');
    });
  });

  describe('isDeskripsiKosong', () => {
    it('mengembalikan true untuk string kosong, null, undefined', () => {
      assert.equal(isDeskripsiKosong(''), true);
      assert.equal(isDeskripsiKosong(null), true);
      assert.equal(isDeskripsiKosong(undefined), true);
    });

    it('mengembalikan true untuk tag kosong yang tidak memiliki konten terlihat', () => {
      assert.equal(isDeskripsiKosong('<p></p>'), true);
      assert.equal(isDeskripsiKosong('<p><br></p>'), true);
      assert.equal(isDeskripsiKosong('<p>   </p>'), true);
      assert.equal(isDeskripsiKosong('<div><span></span></div>'), true);
    });

    it('mengembalikan false jika ada isi teks', () => {
      assert.equal(isDeskripsiKosong('<p>Ada teks</p>'), false);
      assert.equal(isDeskripsiKosong('Bukan HTML tapi ada teks'), false);
    });
  });

  describe('getDeskripsiLength', () => {
    it('menghitung panjang teks polos tanpa tag HTML', () => {
      assert.equal(getDeskripsiLength('<p>12345</p>'), 5);
      assert.equal(getDeskripsiLength(''), 0);
      assert.equal(getDeskripsiLength('<p><strong>abc</strong> def</p>'), 7);
    });
  });

  describe('isSafeLinkUrl', () => {
    it('mengizinkan skema aman http, https, mailto', () => {
      assert.equal(isSafeLinkUrl('https://example.com'), true);
      assert.equal(isSafeLinkUrl('http://example.com'), true);
      assert.equal(isSafeLinkUrl('mailto:admin@kampus.ac.id'), true);
      assert.equal(isSafeLinkUrl('/peminjam/inventaris'), true);
    });

    it('menolak skema berbahaya', () => {
      assert.equal(isSafeLinkUrl('javascript:alert(1)'), false);
      assert.equal(isSafeLinkUrl('javascript:void(0)'), false);
      assert.equal(isSafeLinkUrl('data:text/html,<script>alert(1)</script>'), false);
      assert.equal(isSafeLinkUrl('vbscript:msgbox(1)'), false);
      assert.equal(isSafeLinkUrl('file:///etc/passwd'), false);
      assert.equal(isSafeLinkUrl(''), false);
      assert.equal(isSafeLinkUrl('   '), false);
    });
  });
});
