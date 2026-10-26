import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve('.');

function getAllFiles(dir, exts = ['.js']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file === 'node_modules' || file === '_sumber' || file === '.git') continue;
      results = results.concat(getAllFiles(full, exts));
    } else {
      if (exts.some((ext) => file.endsWith(ext))) {
        results.push(full);
      }
    }
  }
  return results;
}

test('tailwind-guard (a): tidak ada kelas dirangkai dinamis di js/**/*.js', () => {
  const jsFiles = getAllFiles(path.join(ROOT_DIR, 'js'));
  const dynamicClassPattern =
    /\b(?:bg|text|border|ring|w|h|p|m|px|py|gap|rounded|grid-cols|opacity)-\$\{/;

  const violations = [];
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (dynamicClassPattern.test(line)) {
        violations.push(`${path.relative(ROOT_DIR, file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Ditemukan kelas dirangkai dinamis:\n${violations.join('\n')}`
  );
});

test('tailwind-guard (b): tidak ada hex/hsl/oklch di js/**/*.js, css/*.css (kecuali tokens.css), dan tailwind.config.mjs', () => {
  const filesToCheck = [
    ...getAllFiles(path.join(ROOT_DIR, 'js')),
    ...getAllFiles(path.join(ROOT_DIR, 'css'), ['.css']).filter(
      (f) => !['tokens.css', 'app.css'].includes(path.basename(f))
    ),
    path.join(ROOT_DIR, 'tailwind.config.mjs'),
  ];

  const hexPattern = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;
  const hslPattern = /\bhsl\s*\(/i;
  const oklchPattern = /\boklch\s*\(/i;

  const violations = [];
  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Abaikan URL hash yang bukan hex warna (mis. #/inventaris)
      if (line.includes('#/')) return;
      if (hexPattern.test(line) || hslPattern.test(line) || oklchPattern.test(line)) {
        violations.push(`${path.relative(ROOT_DIR, file)}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Ditemukan nilai warna hex/hsl/oklch terlarang:\n${violations.join('\n')}`
  );
});

test('tailwind-guard (c): css/app.css ada, tidak kosong, memuat penanda', () => {
  const appCssPath = path.join(ROOT_DIR, 'css', 'app.css');
  assert.ok(fs.existsSync(appCssPath), 'css/app.css harus ada');
  const stat = fs.statSync(appCssPath);
  assert.ok(stat.size > 0, 'css/app.css tidak boleh kosong');

  const content = fs.readFileSync(appCssPath, 'utf8');
  assert.ok(content.includes('.bg-primary'), 'css/app.css harus memuat .bg-primary');
  assert.ok(content.includes('.rounded-2xl'), 'css/app.css harus memuat .rounded-2xl');
});

test('tailwind-guard (d): tidak basi, kelas statis sederhana dari js/ui/classes.js dan shell muncul di css/app.css', () => {
  const appCssPath = path.join(ROOT_DIR, 'css', 'app.css');
  assert.ok(fs.existsSync(appCssPath), 'css/app.css harus ada');
  const appCss = fs.readFileSync(appCssPath, 'utf8');

  const targetFiles = [
    path.join(ROOT_DIR, 'js', 'ui', 'classes.js'),
    path.join(ROOT_DIR, 'js', 'ui', 'sidebar.js'),
    path.join(ROOT_DIR, 'js', 'ui', 'navbar.js'),
    path.join(ROOT_DIR, 'js', 'ui', 'footer.js'),
  ].filter((f) => fs.existsSync(f));

  const nonClassKeywords = new Set([
    'string',
    'default',
    'destructive',
    'outline',
    'secondary',
    'ghost',
    'link',
    'icon',
    'info',
    'success',
    'warning',
    'danger',
    'sm',
    'lg',
    'true',
    'false',
    'null',
    'undefined',
    'button',
    'submit',
    'text',
    'group',
    'active',
    'open',
    'collapsed',
  ]);

  const staticClasses = new Set();

  for (const file of targetFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // Ambil string di dalam class="..." atau className="..."
    const classAttrMatches = content.match(/class(?:Name)?=["'`]([^"'`]+)["'`]/g) || [];
    for (const match of classAttrMatches) {
      const val = match.replace(/^class(?:Name)?=["'`]/, '').replace(/["'`]$/, '');
      for (const t of val.split(/\s+/)) {
        if (
          /^[a-z][a-z0-9-]*[a-z0-9]$/.test(t) &&
          !t.includes(':') &&
          !t.includes('/') &&
          !t.includes('[') &&
          !t.includes('$') &&
          !t.includes('?') &&
          !nonClassKeywords.has(t)
        ) {
          staticClasses.add(t);
        }
      }
    }

    // Khusus classes.js: ambil string literal dari daftar kelas
    if (file.endsWith('classes.js')) {
      const stringLiterals = content.match(/(['"`])(?:(?=(\\?))\2[\s\S])*?\1/g) || [];
      for (const lit of stringLiterals) {
        const raw = lit.slice(1, -1);
        if (
          raw.includes(' ') ||
          raw.startsWith('bg-') ||
          raw.startsWith('text-') ||
          raw.startsWith('border-') ||
          raw.startsWith('h-') ||
          raw.startsWith('w-') ||
          raw.startsWith('px-') ||
          raw.startsWith('py-') ||
          raw.startsWith('rounded-')
        ) {
          for (const token of raw.split(/\s+/)) {
            if (
              /^[a-z][a-z0-9-]*[a-z0-9]$/.test(token) &&
              !token.includes(':') &&
              !token.includes('/') &&
              !token.includes('[') &&
              !token.includes('$') &&
              !token.includes('?') &&
              !nonClassKeywords.has(token)
            ) {
              staticClasses.add(token);
            }
          }
        }
      }
    }
  }

  const missing = [];
  for (const cls of staticClasses) {
    if (!appCss.includes(`.${cls}`)) {
      missing.push(cls);
    }
  }

  assert.equal(
    missing.length,
    0,
    `Kelas statis tidak ditemukan di app.css:\n${missing.join(', ')}`
  );
});
