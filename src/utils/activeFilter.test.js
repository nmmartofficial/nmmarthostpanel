import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActiveFlag, filterActiveRecords } from './activeFilter.js';

test('treats readable-view active strings as active', () => {
  assert.equal(normalizeActiveFlag('Active'), true);
  assert.equal(normalizeActiveFlag('active'), true);
  assert.equal(normalizeActiveFlag('true'), true);
});

test('filters out inactive records while keeping rows with missing flags', () => {
  const records = [
    { id: 1, is_active: true },
    { id: 2, is_active: 'Active' },
    { id: 3, is_active: false },
    { id: 4 },
    { id: 5, is_active: 'Inactive' }
  ];

  assert.deepEqual(filterActiveRecords(records), [
    { id: 1, is_active: true },
    { id: 2, is_active: 'Active' },
    { id: 4 }
  ]);
});
