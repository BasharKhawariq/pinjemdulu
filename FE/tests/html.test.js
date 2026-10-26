import test from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, escapeHtml, SafeHtml } from '../js/ui/html.js';

test('html helper: teks biasa otomatis di-escape', () => {
  const unsafe = '<script>alert("xss")</script> & "quotes" \'single\'';
  const res = html`<div>${unsafe}</div>`.toString();
  assert.equal(res.includes('<script>'), false);
  assert.equal(res.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot; &#39;single&#39;'), true);
});

test('html helper: fragmen raw() tidak di-escape', () => {
  const markup = '<span class="badge">Aman</span>';
  const res = html`<div>${raw(markup)}</div>`.toString();
  assert.equal(res, '<div><span class="badge">Aman</span></div>');
});

test('html helper: raw() di dalam raw() tidak berubah (idempotent)', () => {
  const original = '<svg class="icon"><path d="M0 0"/></svg>';
  const wrappedOnce = raw(original);
  const wrappedTwice = raw(wrappedOnce);
  assert.equal(wrappedTwice instanceof SafeHtml, true);
  assert.equal(wrappedTwice.toString(), original);
  assert.equal(wrappedTwice, wrappedOnce);
});

test('html helper: array hasil map disisipkan dengan benar tanpa escape ganda', () => {
  const items = ['Item 1', 'Item <2>'];
  const listItems = items.map((it) => html`<li>${it}</li>`);
  const res = html`<ul>${listItems}</ul>`.toString();
  assert.equal(res, '<ul><li>Item 1</li><li>Item &lt;2&gt;</li></ul>');
});

test('html helper: nilai null, undefined, dan false tidak menghasilkan "undefined" atau "false"', () => {
  const res = html`<div>${null}${undefined}${false}</div>`.toString();
  assert.equal(res, '<div></div>');
  assert.equal(res.includes('undefined'), false);
  assert.equal(res.includes('null'), false);
  assert.equal(res.includes('false'), false);
});

test('html helper: angka 0 tetap dirender sebagai karakter "0"', () => {
  const res = html`<span>${0}</span>`.toString();
  assert.equal(res, '<span>0</span>');
});

test('escapeHtml: escape teks biasa dan membiarkan SafeHtml utuh', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(false), '');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml('<b>bold</b>'), '&lt;b&gt;bold&lt;/b&gt;');
  assert.equal(escapeHtml(raw('<b>bold</b>')), '<b>bold</b>');
});
