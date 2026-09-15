import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSupabaseLoadPlan } from './supabaseDataLoader.js';

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';
process.env.VITE_USE_MOCK = 'false';

test('buildSupabaseLoadPlan uses the project DB_SCHEMA table names', () => {
  const plan = buildSupabaseLoadPlan(['COMPANIES', 'PRODUCTS', 'NOT_A_TABLE']);

  assert.deepEqual(plan.map((entry) => entry.tableKey), ['COMPANIES', 'PRODUCTS', 'NOT_A_TABLE']);
  assert.equal(plan[0].tableName, 'companies');
  assert.equal(plan[1].tableName, 'products');
  assert.equal(plan[2].status, 'missing-schema');
  assert.equal(plan[2].tableName, null);
});
