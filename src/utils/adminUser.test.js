import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdminUserProfile, buildFallbackAdminProfile, getAdminUserLookupValue } from './adminUser.js';

test('normalizes admin user profiles from the username field', () => {
  const user = normalizeAdminUserProfile({
    id: 1,
    username: 'nmmmart07@gmail.com',
    role: 'super_admin'
  }, 'fallback@example.com');

  assert.equal(user.email, 'nmmmart07@gmail.com');
  assert.equal(user.username, 'nmmmart07@gmail.com');
  assert.equal(user.role, 'super_admin');
});

test('uses username as the lookup value for admin users', () => {
  assert.equal(getAdminUserLookupValue('nmmmart07@gmail.com'), 'nmmmart07@gmail.com');
});

test('builds a fallback admin profile from the authenticated Supabase user', () => {
  const profile = buildFallbackAdminProfile({
    id: 'abc',
    email: 'nmmmart07@gmail.com',
    user_metadata: { full_name: 'NM MART' }
  });

  assert.equal(profile.email, 'nmmmart07@gmail.com');
  assert.equal(profile.role, 'super_admin');
  assert.equal(profile.status, 'active');
});
