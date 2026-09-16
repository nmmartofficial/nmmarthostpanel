export const getAppEnv = () => {
  const env = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};
  const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
  const isNodeRuntime = typeof process !== 'undefined' && !!process;
  const supabaseUrl = env.VITE_SUPABASE_URL || processEnv.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || processEnv.VITE_SUPABASE_ANON_KEY || '';

  const hasRealSupabaseConfig = Boolean(
    supabaseUrl &&
    supabaseUrl.includes('supabase.co') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20
  );

  return {
    hasRealSupabaseConfig,
    supabaseUrl,
    supabaseAnonKey
  };
};
