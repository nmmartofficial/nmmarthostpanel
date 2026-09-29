const ALLOWED_ADMIN_ROLES = new Set(['super_admin', 'admin', 'manager']);
export const NEW_ORDER_NOTIFICATION_TITLE = '🔔 New Order Received';

export const normalizeNewOrderPushData = (data = {}) => {
  if (data?.notification_type !== 'new_order') return null;

  return {
    order_id: String(data.order_id ?? ''),
    order_number: String(data.order_number ?? ''),
    notification_type: 'new_order',
    tenant_id: String(data.tenant_id ?? ''),
    company_code: String(data.company_code ?? '')
  };
};

export const claimNewOrderNotificationSound = (orderId, playedOrderIds) => {
  const id = String(orderId ?? '').trim();
  if (!id || playedOrderIds.has(id)) return false;
  playedOrderIds.add(id);
  return true;
};

export const playNewOrderNotificationChime = (audioContext) => {
  if (!audioContext || audioContext.state !== 'running') return false;

  try {
    const startTime = audioContext.currentTime;
    [659.25, 880].forEach((frequency, index) => {
      const start = startTime + index * 0.11;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.25);
    });
    return true;
  } catch {
    return false;
  }
};

export const buildNewOrderNotificationOptions = (payload = {}) => {
  const data = normalizeNewOrderPushData(payload.data);
  if (!data) return null;

  return {
    title: payload.notification?.title || NEW_ORDER_NOTIFICATION_TITLE,
    options: {
      body: payload.notification?.body ||
        `Dear NM Mart, you have received a new order.\nOrder #${data.order_number}`,
      tag: `nm-order-${data.order_id || data.order_number}`,
      renotify: false,
      silent: false,
      data
    }
  };
};

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
  const title = NEW_ORDER_NOTIFICATION_TITLE;
  const body = `Dear NM Mart, you have received a new order.\nOrder #${orderNumber} • ₹${Number.isFinite(totalAmount) ? totalAmount : 0}`;

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
