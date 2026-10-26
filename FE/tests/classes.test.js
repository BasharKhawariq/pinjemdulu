import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cn,
  buttonClass,
  inputClass,
  labelClass,
  checkboxClass,
  badgeClass,
  cardClass,
  alertClass,
  skeletonClass,
} from '../js/ui/classes.js';

function assertNoDuplicateClasses(str) {
  const parts = str.trim().split(/\s+/).filter(Boolean);
  const seen = new Set();
  for (const p of parts) {
    assert.equal(seen.has(p), false, `Ditemukan kelas duplikat "${p}" di: ${str}`);
    seen.add(p);
  }
}

test('classes: cn menggabungkan kelas dan mengabaikan nilai falsy', () => {
  const res = cn('flex', false && 'hidden', null, undefined, 0, 'items-center');
  assert.equal(res, 'flex items-center');
});

test('classes: buttonClass menghasilkan varian dan ukuran yang diharapkan tanpa duplikat', () => {
  const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
  const sizes = ['default', 'sm', 'lg', 'icon'];

  for (const variant of variants) {
    for (const size of sizes) {
      const cls = buttonClass({ variant, size });
      assert.ok(typeof cls === 'string' && cls.length > 0);
      assertNoDuplicateClasses(cls);

      if (size === 'sm') {
        assert.ok(cls.includes('h-9'));
        assert.ok(!cls.includes('h-11'));
        assert.ok(cls.includes('text-xs'));
        assert.ok(!cls.includes('text-sm'));
      }
      if (size === 'lg') {
        assert.ok(cls.includes('h-12'));
        assert.ok(!cls.includes('h-11'));
        assert.ok(cls.includes('text-base'));
        assert.ok(!cls.includes('text-sm'));
      }
      if (size === 'icon') {
        assert.ok(cls.includes('h-10'));
        assert.ok(cls.includes('w-10'));
      }
    }
  }

  // Cek kata kunci penanda varian
  assert.ok(buttonClass({ variant: 'default' }).includes('bg-primary'));
  assert.ok(buttonClass({ variant: 'destructive' }).includes('bg-destructive'));
  assert.ok(buttonClass({ variant: 'outline' }).includes('border-input'));
  assert.ok(buttonClass({ variant: 'secondary' }).includes('bg-secondary'));
  assert.ok(buttonClass({ variant: 'ghost' }).includes('hover:bg-accent'));
  assert.ok(buttonClass({ variant: 'link' }).includes('hover:underline'));
});

test('classes: inputClass menghasilkan kelas input yang valid tanpa duplikat', () => {
  const cls = inputClass();
  assert.ok(cls.includes('border-input'));
  assert.ok(cls.includes('bg-background'));
  assert.ok(cls.includes('focus-visible:ring-ring'));
  assert.ok(cls.includes('aria-[invalid=true]:border-destructive'));
  assertNoDuplicateClasses(cls);
});

test('classes: labelClass menghasilkan kelas label yang valid tanpa duplikat', () => {
  const cls = labelClass();
  assert.ok(cls.includes('text-sm'));
  assert.ok(cls.includes('font-medium'));
  assert.ok(cls.includes('text-foreground'));
  assertNoDuplicateClasses(cls);
});

test('classes: checkboxClass menghasilkan kelas checkbox yang valid tanpa duplikat', () => {
  const cls = checkboxClass();
  assert.ok(cls.includes('peer'));
  assert.ok(cls.includes('h-4'));
  assert.ok(cls.includes('w-4'));
  assert.ok(cls.includes('border-primary'));
  assert.ok(cls.includes('data-[state=checked]:bg-primary'));
  assertNoDuplicateClasses(cls);
});

test('classes: badgeClass menghasilkan semua varian dengan benar tanpa duplikat', () => {
  const variants = [
    'default',
    'secondary',
    'destructive',
    'outline',
    'info',
    'success',
    'warning',
    'danger',
  ];
  for (const variant of variants) {
    const cls = badgeClass(variant);
    assert.ok(cls.includes('rounded-full'));
    assert.ok(cls.includes('text-xs'));
    assertNoDuplicateClasses(cls);
  }
  assert.ok(badgeClass('default').includes('bg-primary'));
  assert.ok(badgeClass('secondary').includes('bg-secondary'));
  assert.ok(badgeClass('destructive').includes('bg-destructive'));
  assert.ok(badgeClass('info').includes('bg-info'));
  assert.ok(badgeClass('success').includes('bg-success'));
  assert.ok(badgeClass('warning').includes('bg-warning'));
  assert.ok(badgeClass('danger').includes('bg-danger'));
});

test('classes: cardClass menghasilkan kelas kartu yang valid tanpa duplikat', () => {
  const cls = cardClass();
  assert.ok(cls.includes('rounded-lg'));
  assert.ok(cls.includes('border'));
  assert.ok(cls.includes('bg-card'));
  assert.ok(cls.includes('text-card-foreground'));
  assertNoDuplicateClasses(cls);
});

test('classes: alertClass menghasilkan varian alert tanpa duplikat', () => {
  const variants = ['destructive', 'info', 'success', 'warning', 'default'];
  for (const variant of variants) {
    const cls = alertClass(variant);
    assert.ok(cls.includes('rounded-2xl'));
    assert.ok(cls.includes('border'));
    assertNoDuplicateClasses(cls);
  }
  assert.ok(alertClass('destructive').includes('border-rose-200'));
  assert.ok(alertClass('destructive').includes('text-rose-700'));
  assert.ok(alertClass('info').includes('border-blue-200'));
  assert.ok(alertClass('success').includes('border-emerald-200'));
  assert.ok(alertClass('warning').includes('border-amber-200'));
  assert.ok(alertClass('default').includes('border-zinc-200'));
});

test('classes: skeletonClass menghasilkan kelas animasi pulsa tanpa duplikat', () => {
  const cls = skeletonClass();
  assert.ok(cls.includes('animate-pulse'));
  assert.ok(cls.includes('rounded-md'));
  assert.ok(cls.includes('bg-muted'));
  assertNoDuplicateClasses(cls);
});

