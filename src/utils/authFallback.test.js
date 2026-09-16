import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoAuthResult } from './authFallback.js';
import { getAppEnv } from './env.js';

test('returns a demo auth result for the built-in credentials', () => {
  const result = getDemoAuthResult('demo@example.com', 'Password123!');

  assert.ok(result);
  assert.equal(result.userData.email, 'demo@example.com');
  assert.equal(result.companyData.company_code, 'NMM001');
  assert.equal(result.companyData.company_slug, 'nm-mart');
});

test('returns null for invalid credentials', () => {
  const result = getDemoAuthResult('wrong@example.com', 'wrong-password');

  assert.equal(result, null);
});

test('ignores demo fallback whenever live Supabase config is configured', () => {
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.VITE_SUPABASE_ANON_KEY;
  const previousAllowDemo = process.env.VITE_ALLOW_DEMO_AUTH;

  process.env.VITE_SUPABASE_URL = 'https://mggkadgemqcyybsplkqc.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_2OxrgQFimvpPG8OXPdxvmw_Qur7wHUj';
  process.env.VITE_ALLOW_DEMO_AUTH = 'true';

  try {
    const env = getAppEnv();
    assert.equal(env.allowDemoAuth, false);
    const result = getDemoAuthResult('demo@example.com', 'Password123!');
    assert.equal(result, null);
  } finally {
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = previousUrl;

    if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = previousKey;

    if (previousAllowDemo === undefined) delete process.env.VITE_ALLOW_DEMO_AUTH;
    else process.env.VITE_ALLOW_DEMO_AUTH = previousAllowDemo;
  }
});

test('prefers real Supabase credentials over demo fallback', () => {
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.VITE_SUPABASE_ANON_KEY;
  const previousAllowDemo = process.env.VITE_ALLOW_DEMO_AUTH;

  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'example-anon-key-1234567890';
  process.env.VITE_ALLOW_DEMO_AUTH = 'false';

  try {
    const result = getDemoAuthResult('demo@example.com', 'Password123!');
    assert.equal(result, null);
  } finally {
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = previousUrl;

    if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = previousKey;

    if (previousAllowDemo === undefined) delete process.env.VITE_ALLOW_DEMO_AUTH;
    else process.env.VITE_ALLOW_DEMO_AUTH = previousAllowDemo;
  }
});
