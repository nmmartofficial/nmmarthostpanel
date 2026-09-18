import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './utils/supabaseConfig.js';

const env = import.meta.env || {};
const realtimeEnabled = env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';
const config = getSupabaseConfig(env);

const createExplosiveClient = (reason) => new Proxy({}, {
  get(_target, prop) {
    if (prop === 'auth' || prop === 'storage' || prop === 'from' || prop === 'channel' || prop === 'rpc' || prop === 'removeChannel') {
      if (prop === 'from' || prop === 'channel' || prop === 'rpc' || prop === 'removeChannel') {
        return () => {
          throw new Error(`[Supabase DISCONNECTED] ${reason}. Fix .env credentials first.`);
        };
      }
      return new Proxy({}, {
        get(_a, method) {
          return () => {
            throw new Error(`[Supabase DISCONNECTED] ${reason}. Fix .env credentials first (called auth.${String(method)}).`);
          };
        }
      });
    }
    return undefined;
  }
});

let supabaseInstance = null;

if (config.isConfigured) {
  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      realtime: {
        enabled: realtimeEnabled
      },
      global: {
        fetch: (...args) => fetch(...args)
      }
    });

    console.log('%c✅ [Supabase Init] LIVE client created — REAL database connection ACTIVE', 'color:#10b981;font-weight:bold');
    console.log('   URL :', config.url);
    console.log('   Key :', (config.anonKey || '').slice(0, 12) + '...');
    console.log('   Realtime:', realtimeEnabled ? 'ENABLED' : 'disabled');
  } catch (error) {
    console.error('❌ [Supabase Init] FATAL — createClient threw:', error?.message || error);
    if (import.meta.env.DEV) console.error('❌ [Supabase Init] Full error:', error);
  }
} else {
  console.error('❌ [Supabase Init] Credentials MISSING or INVALID. WILL NOT fall back to mock.');
  console.error('   VITE_SUPABASE_URL :', config.hasUrl ? `set (len=${config.url.length})` : 'NOT SET');
  console.error('   VITE_SUPABASE_ANON_KEY:', config.hasKey ? `set (len=${config.anonKey.length})` : 'NOT SET');
  console.error('   Reason:', config.reason);
}

const finalClient = supabaseInstance || createExplosiveClient(config.reason || 'Supabase is not configured');

export const supabase = finalClient;
export const isSupabaseMock = false;
export const supabaseConfig = config;

export const getSupabaseDiagnostics = async () => {
  if (!config.isConfigured) {
    return {
      configured: false,
      message: config.reason,
      connected: false,
      authReachable: false,
      restReachable: false
    };
  }

  try {
    const authCheck = await fetch(`${config.url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey
      }
    }).then((response) => ({ ok: response.ok, status: response.status })).catch(() => ({ ok: false, status: 0 }));

    const restCheck = await fetch(`${config.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    }).then((response) => ({ ok: response.ok, status: response.status })).catch(() => ({ ok: false, status: 0 }));

    return {
      configured: true,
      connected: authCheck.ok || restCheck.ok,
      authReachable: authCheck.ok,
      restReachable: restCheck.ok,
      authStatus: authCheck.status,
      restStatus: restCheck.status
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      authReachable: false,
      restReachable: false,
      message: error?.message || 'Supabase diagnostics check failed'
    };
  }
};
