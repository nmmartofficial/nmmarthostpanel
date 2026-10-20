import {
  canManagePOSLayoutSettings,
  normalizePOSLayoutSettings,
  POS_LAYOUT_CONFIG_KEY
} from './posLayoutSettings.js';

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

  const normalizedTenantId = String(currentUser.tenant_id);
  if (!/^[1-9]\d*$/.test(normalizedTenantId)) {
    throw new Error('A valid numeric tenant ID is required to save POS settings.');
  }
  const { data: savedRow, error } = await client.rpc('pos_layout_settings_save', {
    p_tenant_id: normalizedTenantId,
    p_company_code: currentUser.company_code,
    p_settings: normalizePOSLayoutSettings(settings)
  });

  if (error) throw error;
  if (!savedRow?.id
    || String(savedRow.tenant_id) !== normalizedTenantId
    || String(savedRow.company_code) !== String(currentUser.company_code)
    || savedRow.key !== POS_LAYOUT_CONFIG_KEY) {
    throw new Error('Supabase did not confirm saving the store POS settings.');
  }

  return savedRow;
};
