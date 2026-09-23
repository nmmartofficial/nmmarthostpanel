const ALLOWED_ADMIN_ROLES = new Set(['super_admin', 'admin', 'manager']);

export const isAuthorizedPushRecipient = (user = {}) => {
  const role = String(user?.role || '').trim().toLowerCase();
  return ALLOWED_ADMIN_ROLES.has(role);
};

export const validateTenantRecipientScope = (orderContext = {}, recipientContext = {}) => {
  const orderTenantId = orderContext?.tenant_id ?? orderContext?.tenantId;
  const orderCompanyCode = orderContext?.company_code ?? orderContext?.companyCode;
  const recipientTenantId = recipientContext?.tenant_id ?? recipientContext?.tenantId;
  const recipientCompanyCode = recipientContext?.company_code ?? recipientContext?.companyCode;

  if (orderTenantId == null || recipientTenantId == null) return false;
  if (String(orderTenantId) !== String(recipientTenantId)) return false;

  if (orderCompanyCode && recipientCompanyCode) {
    return String(orderCompanyCode) === String(recipientCompanyCode);
  }

  return true;
};

export const buildNewOrderPushPayload = (order = {}) => {
  const orderId = order?.id ?? order?.order_id ?? null;
  const orderNumber = order?.order_number ?? order?.order_no ?? order?.order_id_str ?? `#${orderId ?? 'unknown'}`;
  const totalAmount = Number(order?.total_amount ?? order?.total ?? 0);
  const title = 'New Order Received';
  const body = `Order #${orderNumber} • ₹${Number.isFinite(totalAmount) ? totalAmount : 0}`;

  return {
    title,
    body,
    data: {
      order_id: String(orderId ?? ''),
      order_number: String(orderNumber ?? ''),
      notification_type: 'new_order',
      tenant_id: String(order?.tenant_id ?? ''),
      company_code: String(order?.company_code ?? '')
    }
  };
};

export const normalizeDeviceTokenRegistration = (device = {}) => {
  const normalized = { ...device };
  delete normalized.access_token;
  delete normalized.refresh_token;
  delete normalized.service_role;
  delete normalized.private_key;

  if (typeof normalized.is_active !== 'boolean') {
    normalized.is_active = normalized.is_active === true || normalized.is_active === 'true' || normalized.is_active === '1';
  }

  normalized.platform = String(normalized.platform || 'android').toLowerCase();
  normalized.device_token = String(normalized.device_token || '').trim();
  normalized.user_id = normalized.user_id ?? normalized.admin_user_id ?? null;
  normalized.company_code = normalized.company_code ?? null;
  normalized.tenant_id = normalized.tenant_id ?? null;

  return normalized;
};
