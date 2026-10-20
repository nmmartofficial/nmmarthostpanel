import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldLoadInitialDataForScope, shouldSkipGlobalFetch } from './fetchControl.js';

test('skips fetch while a request is already in flight unless forced', () => {
  assert.equal(
    shouldSkipGlobalFetch({ isFetching: true, force: false, lastFetchedAt: 0, now: 10000, throttleMs: 5000 }),
    true
  );

  assert.equal(
    shouldSkipGlobalFetch({ isFetching: true, force: true, lastFetchedAt: 0, now: 10000, throttleMs: 5000 }),
    false
  );
});

test('skips fetch when the throttle window has not elapsed', () => {
  assert.equal(
    shouldSkipGlobalFetch({ isFetching: false, force: false, lastFetchedAt: 9000, now: 10000, throttleMs: 5000 }),
    true
  );
});

test('allows fetch when the throttle window has elapsed', () => {
  assert.equal(
    shouldSkipGlobalFetch({ isFetching: false, force: false, lastFetchedAt: 1000, now: 10000, throttleMs: 5000 }),
    false
  );
});

test('loads initial data once per authenticated scope', () => {
  assert.equal(shouldLoadInitialDataForScope('user-1:42:SHOP042', null), true);
  assert.equal(shouldLoadInitialDataForScope('user-1:42:SHOP042', 'user-1:42:SHOP042'), false);
  assert.equal(shouldLoadInitialDataForScope('user-1:43:SHOP043', 'user-1:42:SHOP042'), true);
  assert.equal(shouldLoadInitialDataForScope(null, 'user-1:42:SHOP042'), false);
});
