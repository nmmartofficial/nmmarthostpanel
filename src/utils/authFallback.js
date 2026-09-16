import { getAppEnv } from './env.js';

const DEMO_CREDENTIALS = {
  email: 'demo@example.com',
  password: 'Password123!'
};

export const getDemoAuthResult = (email, password) => {
  const { allowDemoAuth, hasRealSupabaseConfig } = getAppEnv();

  if (!allowDemoAuth || hasRealSupabaseConfig) {
    return null;
  }

  if (email !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    return null;
  }

  return {
    authSession: {
      access_token: 'demo-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor((Date.now() + 3600000) / 1000),
      refresh_token: 'demo-refresh-token',
      user: {
        id: 'demo-user-id',
        email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    },
    userData: {
      id: 'demo-user-id',
      email,
      name: 'Demo User',
      role: 'super_admin',
      status: 'active',
      company_code: 'NMM001'
    },
    companyData: {
      id: '1',
      company_code: 'NMM001',
      company_slug: 'nm-mart',
      name: 'NM MART',
      status: 'active'
    }
  };
};
