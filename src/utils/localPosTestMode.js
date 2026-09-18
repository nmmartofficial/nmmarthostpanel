export const isLocalPosTestMode = import.meta.env.DEV && import.meta.env.VITE_LOCAL_POS_TEST_AUTH === 'true';
export const isLocalPosReadOnlyMode = isLocalPosTestMode && import.meta.env.VITE_LOCAL_POS_TEST_READS === 'true';

export const LOCAL_POS_TEST_USER = Object.freeze({
  id: 'local-pos-test-user',
  email: 'local-pos-test@nm-mart.invalid',
  name: 'Local POS Test User',
  role: 'cashier',
  company_code: 'LOCAL_POS_TEST',
  tenant_id: 'local-pos-test-tenant',
  status: 'active'
});

export const LOCAL_POS_TEST_COMPANY = Object.freeze({
  id: 'local-pos-test-tenant',
  company_code: 'LOCAL_POS_TEST',
  company_slug: 'nm-mart',
  name: 'Local POS Test Workspace',
  status: 'active'
});

export const LOCAL_POS_TEST_SESSION = Object.freeze({
  access_token: null,
  refresh_token: null,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  user: Object.freeze({
    id: LOCAL_POS_TEST_USER.id,
    email: LOCAL_POS_TEST_USER.email
  }),
  provider: 'local-pos-test'
});
