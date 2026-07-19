import test from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonParse } from './security.js';

test('parses regular JSON payloads', () => {
  assert.deepEqual(safeJsonParse('{"ok":true}'), { ok: true });
});

test('decodes base64-encoded JSON payloads', () => {
  const value = 'W3siaWQiOiIxMjMifV0=';
  assert.deepEqual(safeJsonParse(value), [{ id: '123' }]);
});

test('returns fallback for invalid payloads', () => {
  assert.equal(safeJsonParse('not valid json', 'fallback'), 'fallback');
});
