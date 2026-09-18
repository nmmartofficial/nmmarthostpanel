import test from 'node:test';
import assert from 'node:assert/strict';
import { isSessionExpired, hasValidStoredAuthState } from './authState.js';

test('detects expired session', () => {
  assert.equal(isSessionExpired({ expires_at: 10 }, 11), true);
  assert.equal(isSessionExpired({ expires_at: 100 }, 50), false);
});

test('accepts valid stored auth state', () => {
  const storedSession = { expires_at: 9999999999 };
  const storedUser = { id: 'u1', email: 'admin@example.com' };
  assert.equal(hasValidStoredAuthState(storedSession, storedUser), true);
});

test('rejects missing or expired stored auth state', () => {
  assert.equal(hasValidStoredAuthState(null, { id: 'u1', email: 'x@y.com' }), false);
  assert.equal(hasValidStoredAuthState({ expires_at: 1 }, { id: 'u1', email: 'x@y.com' }), false);
});
