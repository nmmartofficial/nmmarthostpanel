import { DB_SCHEMA } from '../../../dbSchema.js';
import {
  canManagePOSLayoutSettings,
  normalizePOSLayoutSettings,
  POS_LAYOUT_CONFIG_KEY
} from './posLayoutSettings.js';

const SETTING_COLUMNS = 'id,tenant_id,company_code,key,value,value_type,group_name,description,is_active,updated_at';

export const savePOSLayoutSettingsToSupabase = async (client, currentUser, settings) => {
  if (!canManagePOSLayoutSettings(currentUser)) {
    throw new Error('An active authorized store administrator is required to save POS settings.');
  }

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user?.id || (
    currentUser.auth_user_id
    && String(currentUser.auth_user_id) !== String(authData.user.id)
  )) {
    throw new Error('Your authenticated admin session could not be verified. Sign in again.');
  }

  const scope = {
    tenant_id: currentUser.tenant_id,
    company_code: currentUser.company_code,
    key: POS_LAYOUT_CONFIG_KEY
  };
  const scopedQuery = (query) => query
    .eq('tenant_id', scope.tenant_id)
    .eq('company_code', scope.company_code)
    .eq('key', scope.key);
  const { data: existing, error: lookupError } = await scopedQuery(
    client.from(DB_SCHEMA.APP_CONFIG.table).select('id')
  ).maybeSingle();
  if (lookupError) throw lookupError;

  const setting = {
    value: JSON.stringify(normalizePOSLayoutSettings(settings)),
    value_type: 'string',
    group_name: 'pos',
    description: 'Versioned Touch Sale presentation settings.',
    is_active: true,
    updated_at: new Date().toISOString()
  };
  const result = existing?.id
    ? await scopedQuery(
      client.from(DB_SCHEMA.APP_CONFIG.table)
        .update(setting)
        .eq('id', existing.id)
    ).select(SETTING_COLUMNS).maybeSingle()
    : await client.from(DB_SCHEMA.APP_CONFIG.table)
      .insert({ ...scope, ...setting })
      .select(SETTING_COLUMNS)
      .maybeSingle();

  if (result.error) throw result.error;
  const savedRow = result.data;
  if (!savedRow?.id
    || String(savedRow.tenant_id) !== String(scope.tenant_id)
    || String(savedRow.company_code) !== String(scope.company_code)
    || savedRow.key !== scope.key) {
    throw new Error('Supabase did not confirm saving the store POS settings.');
  }

  return savedRow;
};
