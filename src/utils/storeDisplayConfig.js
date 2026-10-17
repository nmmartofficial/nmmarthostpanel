const TABLE = 'home_config';

function scopedError(error, operation) {
  const result = new Error(error?.message || `Could not ${operation} store display selection.`);
  result.code = error?.code || null;
  result.details = error?.details || null;
  result.hint = error?.hint || null;
  result.status = error?.status || null;
  result.table = TABLE;
  result.operation = operation;
  return result;
}

function requireScope(scope) {
  if (scope?.tenantId == null || !scope?.companyCode) {
    throw scopedError(
      new Error('Tenant and company context are required.'),
      'scope'
    );
  }
}

export async function loadStoreDisplaySelection(client, scope, key) {
  requireScope(scope);

  const { data, error } = await client
    .from(TABLE)
    .select('id,key,value,tenant_id,company_code')
    .eq('tenant_id', scope.tenantId)
    .eq('company_code', scope.companyCode)
    .eq('key', key)
    .maybeSingle();

  if (error) throw scopedError(error, 'select');

  return Array.isArray(data?.value?.selected_ids)
    ? [...new Set(data.value.selected_ids.filter((id) => id != null).map(String))]
    : [];
}

export async function saveStoreDisplaySelection(client, {
  scope,
  key,
  title,
  selectedIds,
  updatedBy
}) {
  requireScope(scope);

  const selected = [...new Set((selectedIds || []).filter((id) => id != null).map(String))];
  const payload = {
    tenant_id: scope.tenantId,
    company_code: scope.companyCode,
    key,
    value: {
      selected_ids: selected,
      updated_by: updatedBy ?? null
    },
    description: `${title} selected record IDs`,
    section_name: 'Store Display',
    section_type: 'selection',
    is_active: true,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from(TABLE)
    .upsert(payload, { onConflict: 'tenant_id,key' })
    .select('id,key,tenant_id,company_code')
    .single();

  if (error) throw scopedError(error, 'upsert');
  if (
    !data?.id
    || String(data.tenant_id) !== String(scope.tenantId)
    || data.company_code !== scope.companyCode
    || data.key !== key
  ) {
    throw scopedError(
      new Error('The database did not confirm the selection for this tenant and key.'),
      'upsert'
    );
  }

  return selected;
}
