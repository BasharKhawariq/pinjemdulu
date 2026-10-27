import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterButtonClass,
  renderFilterButton,
  renderFilterModal,
} from '../js/ui/filter.js';

test('filter: filterButtonClass memuat kelas hover primary dan border yang sesuai', () => {
  const cls = filterButtonClass();
  assert.ok(cls.includes('hover:bg-primary'));
  assert.ok(cls.includes('hover:text-white'));
  assert.ok(cls.includes('hover:border-primary'));
  assert.ok(cls.includes('rounded-full'));
});

test('filter: renderFilterButton merender tombol filter dan badge aktif', () => {
  const btnEmpty = renderFilterButton({ id: 'btn-test', countActive: 0 }).toString();
  assert.ok(btnEmpty.includes('id="btn-test"'));
  assert.ok(btnEmpty.includes('data-action="open-filter-dialog"'));
  assert.ok(btnEmpty.includes(' hidden"')); // badge hidden class

  const btnActive = renderFilterButton({ id: 'btn-active', countActive: 3 }).toString();
  assert.ok(btnActive.includes('3'));
  assert.ok(!btnActive.includes(' hidden"')); // badge visible
});

test('filter: renderFilterModal merender tag dialog native dengan tombol reset dan terapkan', () => {
  const modalHtml = renderFilterModal({
    id: 'dialog-test-filter',
    title: 'Filter Uji',
    countActive: 1,
    bodyContent: '<div>Konten Filter</div>',
  }).toString();

  assert.ok(modalHtml.includes('<dialog id="dialog-test-filter"'));
  assert.ok(modalHtml.includes('Filter Uji'));
  assert.ok(modalHtml.includes('Konten Filter'));
  assert.ok(modalHtml.includes('Reset'));
  assert.ok(modalHtml.includes('Terapkan'));
  assert.ok(modalHtml.includes('data-action="close-filter-dialog"'));
});
