const env = import.meta.env || {};
const mockMode = env.VITE_USE_MOCK === 'true' || env.VITE_USE_MOCK === '1';

export const isLocalPosTestMode = mockMode || (env.DEV && env.VITE_LOCAL_POS_TEST_AUTH === 'true');
export const isLocalPosReadOnlyMode = mockMode || (isLocalPosTestMode && (env.VITE_LOCAL_POS_TEST_READS === 'true' || mockMode));

export const LOCAL_POS_TEST_USER = Object.freeze({
  id: 'local-pos-test-user',
  email: 'local-pos-test@nm-mart.invalid',
  name: 'Mock Mode User',
  role: 'super_admin',
  company_code: 'NMM001',
  tenant_id: 1,
  status: 'active'
});

export const LOCAL_POS_TEST_COMPANY = Object.freeze({
  id: 1,
  company_code: 'NMM001',
  company_slug: 'nm-mart',
  name: 'NM MART (Mock Mode)',
  status: 'active'
});

export const LOCAL_POS_TEST_SESSION = Object.freeze({
  access_token: 'mock-mode-token',
  refresh_token: 'mock-mode-refresh',
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  user: Object.freeze({
    id: LOCAL_POS_TEST_USER.id,
    email: LOCAL_POS_TEST_USER.email
  }),
  provider: 'mock-mode'
});
