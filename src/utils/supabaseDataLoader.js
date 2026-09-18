import { DB_SCHEMA } from '../dbSchema.js';
import { isLocalPosReadOnlyMode, isLocalPosTestMode } from './localPosTestMode.js';

let supabaseInstance = null;

const initializeSupabase = async () => {
  if (supabaseInstance) return supabaseInstance;

  try {
    const mod = await import('../supabase.js');
    supabaseInstance = mod.supabase;
  } catch (error) {
    supabaseInstance = null;
  }

  return supabaseInstance;
};

const DEFAULT_TABLE_KEYS = ['COMPANIES', 'PRODUCTS', 'CATEGORIES', 'ORDERS', 'USERS'];

export const buildSupabaseLoadPlan = (tableKeys = DEFAULT_TABLE_KEYS) => {
  return tableKeys.map((tableKey) => {
    const schemaEntry = DB_SCHEMA[tableKey];
    if (!schemaEntry?.table) {
      return {
        tableKey,
        tableName: null,
        status: 'missing-schema'
      };
    }

    return {
      tableKey,
      tableName: schemaEntry.table,
      status: 'ready'
    };
  });
};

export const loadSupabaseTables = async (tableKeys = DEFAULT_TABLE_KEYS, options = {}) => {
  if (isLocalPosTestMode && !isLocalPosReadOnlyMode) {
    return buildSupabaseLoadPlan(tableKeys).map((entry) => ({
      ...entry,
      data: [],
      error: null,
      count: 0,
      status: 'local-test-mode'
    }));
  }

  const { limit = 5, onProgress } = options;
  const plan = buildSupabaseLoadPlan(tableKeys);
  const supabase = await initializeSupabase();

  const results = [];

  for (const entry of plan) {
    if (entry.status !== 'ready') {
      results.push({ ...entry, data: [], error: null, count: 0 });
      continue;
    }

    onProgress?.({ tableKey: entry.tableKey, tableName: entry.tableName, status: 'loading' });

    const query = supabase ? supabase.from(entry.tableName).select('*').limit(limit) : null;
    const { data, error } = query ? await query : { data: [], error: null };

    const normalized = {
      tableKey: entry.tableKey,
      tableName: entry.tableName,
      data: data || [],
      error: error ? { message: error.message } : null,
      count: Array.isArray(data) ? data.length : 0
    };

    results.push(normalized);
    onProgress?.({ ...normalized, status: error ? 'error' : 'loaded' });
  }

  return results;
};
