export const getAppEnv = () => {
  const env = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};
  const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
  const isNodeRuntime = typeof process !== 'undefined' && !!process;
  const isNodeTest = isNodeRuntime && (
    processEnv.NODE_ENV === 'test' ||
    process.argv?.includes('--test') ||
    process.argv?.some((arg) => arg.includes('node:test')) ||
    processEnv.VITEST === 'true' ||
    processEnv.JEST_WORKER_ID !== undefined
  );

  const supabaseUrl = env.VITE_SUPABASE_URL || processEnv.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || processEnv.VITE_SUPABASE_ANON_KEY || '';

  const hasRealSupabaseConfig = Boolean(
    supabaseUrl &&
    supabaseUrl.includes('supabase.co') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20
  );

  return {
    allowDemoAuth: env.VITE_ALLOW_DEMO_AUTH === 'true' || processEnv.VITE_ALLOW_DEMO_AUTH === 'true' || (!hasRealSupabaseConfig && (env.DEV === true || isNodeTest || (isNodeRuntime && processEnv.NODE_ENV !== 'production'))),
    supabaseUrl,
    supabaseAnonKey
  };
};
