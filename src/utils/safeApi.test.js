import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAsync, safeParseNumber, safeString, safeArray } from './safeApi.js';

test('safeAsync returns fallback on failure', async () => {
  const result = await safeAsync(async () => { throw new Error('boom'); }, 'fallback');
  assert.equal(result, 'fallback');
});

test('safeParseNumber returns fallback for invalid input', () => {
  assert.equal(safeParseNumber('abc', 5), 5);
});

test('safeString handles null values', () => {
  assert.equal(safeString(null, 'n/a'), 'n/a');
});

test('safeArray returns empty array for non-array input', () => {
  assert.deepEqual(safeArray(null), []);
});
