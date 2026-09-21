import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupabaseConfig } from './supabaseConfig.js';

test('detects missing Supabase URL and anon key', () => {
  const config = getSupabaseConfig({});
  assert.equal(config.isConfigured, false);
  assert.match(config.reason, /VITE_SUPABASE_URL/i);
});

test('accepts valid Supabase configuration', () => {
  const config = getSupabaseConfig({
    VITE_SUPABASE_URL: 'https://xyzcompany.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'abcdefghijklmnopqrstuvwxyz1234567890abcd'
  });
  assert.equal(config.isConfigured, true);
  assert.equal(config.reason, null);
});

test('detects placeholder values', () => {
  const config = getSupabaseConfig({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'replace-me'
  });
  assert.equal(config.isConfigured, false);
});

test('keeps Realtime disabled by default unless explicitly enabled', () => {
  const defaultConfig = getSupabaseConfig({
    VITE_SUPABASE_URL: 'https://xyzcompany.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'abcdefghijklmnopqrstuvwxyz1234567890abcd'
  });
  assert.equal(defaultConfig.realtimeEnabled, false);

  const enabledConfig = getSupabaseConfig({
    VITE_SUPABASE_URL: 'https://xyzcompany.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'abcdefghijklmnopqrstuvwxyz1234567890abcd',
    VITE_SUPABASE_REALTIME_ENABLED: 'true'
  });
  assert.equal(enabledConfig.realtimeEnabled, true);
});
