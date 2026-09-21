const INVALID_VALUE_HINTS = ['your-project', 'example', 'replace', 'not-set', 'your-anon'];

export const getSupabaseConfig = (env = {}) => {
  const url = String(env.VITE_SUPABASE_URL || '').trim();
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
  const isUrlPresent = Boolean(url);
  const isKeyPresent = Boolean(anonKey);
  const useMock = env.VITE_USE_MOCK === 'true' || env.VITE_USE_MOCK === '1';
  const realtimeEnabled = env.VITE_SUPABASE_REALTIME_ENABLED === 'true' || env.VITE_SUPABASE_REALTIME_ENABLED === '1';
  const looksPlaceholder = (value) => {
    const normalized = String(value || '').toLowerCase();
    return INVALID_VALUE_HINTS.some((token) => normalized.includes(token));
  };

  const hasValidUrl = isUrlPresent && !looksPlaceholder(url) && url.startsWith('http');
  const hasValidKey = isKeyPresent && !looksPlaceholder(anonKey) && anonKey.length > 20;

  return {
    url,
    anonKey,
    hasUrl: isUrlPresent,
    hasKey: isKeyPresent,
    hasValidUrl,
    hasValidKey,
    useMock,
    realtimeEnabled,
    isConfigured: useMock || (hasValidUrl && hasValidKey),
    reason: useMock
      ? 'VITE_USE_MOCK=true — Silent mock mode enabled (no Supabase calls)'
      : !hasValidUrl
        ? 'VITE_SUPABASE_URL is missing or invalid'
        : !hasValidKey
          ? 'VITE_SUPABASE_ANON_KEY is missing or invalid'
          : null
  };
};
