import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cn } from '../js/lib/utils.js';

test('cn — gabung kelas sederhana', () => {
  const result = cn('px-3', 'py-2', 'rounded');
  assert.ok(result.includes('px-3'));
  assert.ok(result.includes('py-2'));
  assert.ok(result.includes('rounded'));
});

test('cn — kelas bentrok padding: p-2 + p-4 → p-4 saja', () => {
  const result = cn('p-2', 'p-4');
  assert.ok(!result.includes('p-2'), `p-2 harus hilang, hasil: ${result}`);
  assert.ok(result.includes('p-4'));
});

test('cn — kelas bentrok ukuran font: text-sm + text-lg → text-lg saja', () => {
  const result = cn('text-sm', 'text-lg');
  assert.ok(!result.includes('text-sm'), `text-sm harus hilang, hasil: ${result}`);
  assert.ok(result.includes('text-lg'));
});

test('cn — nilai falsy (false, null, undefined, 0, "") diabaikan', () => {
  const result = cn(
    'text-base',
    false && 'text-red',
    null,
    undefined,
    0,
    '',
    true && 'font-semibold'
  );
  assert.ok(result.includes('text-base'));
  assert.ok(result.includes('font-semibold'));
  assert.ok(!result.includes('false'));
  assert.ok(!result.includes('null'));
});

test('cn — gabung objek bentrok: { p-2: true, p-4: true } → p-4 saja', () => {
  const result = cn({ 'p-2': true, 'p-4': true });
  assert.ok(!result.includes('p-2'));
  assert.ok(result.includes('p-4'));
});
