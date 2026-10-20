import test from 'node:test';
import assert from 'node:assert/strict';
import { savePOSLayoutSettingsToSupabase } from './posLayoutSettingsBackend.js';
import { POS_LAYOUT_CONFIG_KEY } from './posLayoutSettings.js';

const admin = {
  auth_user_id: 'auth-admin-1',
  role: 'admin',
  status: 'active',
  is_active: true,
  tenant_id: 7,
  company_code: 'STORE-7'
};

const createClient = ({
  authUserId = 'auth-admin-1',
  returnedScope,
  rpcError = null
} = {}) => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: authUserId } }, error: null }) },
    rpc: async (procedure, parameters) => {
      calls.push({ procedure, parameters });
      if (rpcError) return { data: null, error: rpcError };
      return {
        data: {
          id: 22,
          tenant_id: returnedScope?.tenant_id ?? parameters.p_tenant_id,
          company_code: returnedScope?.company_code ?? parameters.p_company_code,
          key: returnedScope?.key ?? POS_LAYOUT_CONFIG_KEY,
          value: JSON.stringify(parameters.p_settings)
        },
        error: null
      };
    }
  };
  return { client, calls };
};

test('saves settings through the store-scoped RPC after verifying the admin session', async () => {
  const { client, calls } = createClient();
  const saved = await savePOSLayoutSettingsToSupabase(client, admin, { theme: 'blue' });

  assert.equal(saved.key, POS_LAYOUT_CONFIG_KEY);
  assert.equal(String(saved.tenant_id), String(admin.tenant_id));
  assert.equal(saved.company_code, admin.company_code);
  assert.equal(JSON.parse(saved.value).theme, 'blue');
  assert.equal(calls[0].procedure, 'pos_layout_settings_save');
  assert.deepEqual(calls[0].parameters, {
    p_tenant_id: '7',
    p_company_code: 'STORE-7',
    p_settings: JSON.parse(saved.value)
  });
});

test('rejects an unverified admin session, invalid tenant ID, or a row returned for another store', async () => {
  const mismatchedSession = createClient({ authUserId: 'different-auth-user' });
  await assert.rejects(
    savePOSLayoutSettingsToSupabase(mismatchedSession.client, admin, {}),
    /authenticated admin session could not be verified/
  );
  assert.equal(mismatchedSession.calls.length, 0);

  await assert.rejects(
    savePOSLayoutSettingsToSupabase(createClient().client, { ...admin, tenant_id: 'tenant-7' }, {}),
    /valid numeric tenant ID/
  );

  const wrongScope = createClient({ returnedScope: { tenant_id: 8 } });
  await assert.rejects(
    savePOSLayoutSettingsToSupabase(wrongScope.client, admin, {}),
    /did not confirm saving/
  );
});

test('surfaces scoped settings RPC failures', async () => {
  const { client } = createClient({ rpcError: new Error('RLS or RPC unavailable') });
  await assert.rejects(
    savePOSLayoutSettingsToSupabase(client, admin, {}),
    /RLS or RPC unavailable/
  );
});
