export const POS_LAYOUT_CONFIG_KEY = 'pos_layout_config';
export const POS_LAYOUT_CONFIG_VERSION = 1;

export const POS_LAYOUT_DEFAULTS = Object.freeze({
  version: POS_LAYOUT_CONFIG_VERSION,
  billingRatio: 1.7,
  density: 'standard',
  fontScale: 1,
  cartRowHeight: 42,
  cartColumns: Object.freeze({
    mrp: true,
    discount: true,
    gst: true,
    saleRate: true,
    actions: true
  }),
  productButtonMinWidth: 124,
  productButtonMinHeight: 64,
  productGridColumns: 3,
  defaultProductMode: 'closed',
  paymentPlacement: 'right',
  showQuickAmounts: true,
  showAmountReceived: true,
  showChangeDue: true,
  compactHeader: false,
  showCustomerSection: true,
  showStatusFooter: true,
  showShortcutFooter: true,
  theme: 'navy',
  billingButtons: Object.freeze({
    deleteSelected: true,
    discountCoupon: true,
    holdBill: true,
    heldBills: true,
    ordersReturns: true,
    splitTender: true,
    shift: true,
    activity: true,
    devices: true,
    clearBill: true
  })
});

const clamp = (value, minimum, maximum, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const boolValue = (value, fallback) => typeof value === 'boolean' ? value : fallback;

export const normalizePOSLayoutSettings = (input) => {
  const source = isRecord(input) ? input : {};
  const cartColumns = isRecord(source.cartColumns) ? source.cartColumns : {};
  const billingButtons = isRecord(source.billingButtons) ? source.billingButtons : {};

  return {
    version: POS_LAYOUT_CONFIG_VERSION,
    billingRatio: clamp(source.billingRatio, 1.2, 2.2, POS_LAYOUT_DEFAULTS.billingRatio),
    density: enumValue(source.density, ['compact', 'standard', 'comfortable'], POS_LAYOUT_DEFAULTS.density),
    fontScale: clamp(source.fontScale, 0.9, 1.15, POS_LAYOUT_DEFAULTS.fontScale),
    cartRowHeight: clamp(source.cartRowHeight, 36, 64, POS_LAYOUT_DEFAULTS.cartRowHeight),
    cartColumns: Object.fromEntries(
      Object.entries(POS_LAYOUT_DEFAULTS.cartColumns)
        .map(([key, fallback]) => [key, boolValue(cartColumns[key], fallback)])
    ),
    productButtonMinWidth: clamp(source.productButtonMinWidth, 100, 200, POS_LAYOUT_DEFAULTS.productButtonMinWidth),
    productButtonMinHeight: clamp(source.productButtonMinHeight, 48, 104, POS_LAYOUT_DEFAULTS.productButtonMinHeight),
    productGridColumns: clamp(source.productGridColumns, 2, 4, POS_LAYOUT_DEFAULTS.productGridColumns),
    defaultProductMode: enumValue(source.defaultProductMode, ['closed', 'trending', 'all'], POS_LAYOUT_DEFAULTS.defaultProductMode),
    paymentPlacement: enumValue(source.paymentPlacement, ['right', 'on-demand'], POS_LAYOUT_DEFAULTS.paymentPlacement),
    showQuickAmounts: boolValue(source.showQuickAmounts, POS_LAYOUT_DEFAULTS.showQuickAmounts),
    showAmountReceived: boolValue(source.showAmountReceived, POS_LAYOUT_DEFAULTS.showAmountReceived),
    showChangeDue: boolValue(source.showChangeDue, POS_LAYOUT_DEFAULTS.showChangeDue),
    compactHeader: boolValue(source.compactHeader, POS_LAYOUT_DEFAULTS.compactHeader),
    showCustomerSection: boolValue(source.showCustomerSection, POS_LAYOUT_DEFAULTS.showCustomerSection),
    showStatusFooter: boolValue(source.showStatusFooter, POS_LAYOUT_DEFAULTS.showStatusFooter),
    showShortcutFooter: boolValue(source.showShortcutFooter, POS_LAYOUT_DEFAULTS.showShortcutFooter),
    theme: enumValue(source.theme, ['navy', 'blue'], POS_LAYOUT_DEFAULTS.theme),
    billingButtons: Object.fromEntries(
      Object.entries(POS_LAYOUT_DEFAULTS.billingButtons)
        .map(([key, fallback]) => [key, boolValue(billingButtons[key], fallback)])
    )
  };
};

export const parsePOSLayoutSettings = (value) => {
  if (isRecord(value)) return normalizePOSLayoutSettings(value);
  if (typeof value !== 'string' || !value.trim()) return normalizePOSLayoutSettings();
  try {
    return normalizePOSLayoutSettings(JSON.parse(value));
  } catch {
    return normalizePOSLayoutSettings();
  }
};

export const getPOSLayoutSettingsRow = (rows = [], currentUser) => {
  if (currentUser?.tenant_id == null || !currentUser?.company_code) return null;
  return (Array.isArray(rows) ? rows : []).find((row) => (
    row?.key === POS_LAYOUT_CONFIG_KEY
    && String(row?.tenant_id) === String(currentUser.tenant_id)
    && String(row?.company_code) === String(currentUser.company_code)
    && row?.is_active !== false
  )) || null;
};

export const canManagePOSLayoutSettings = (currentUser) => {
  const role = String(currentUser?.role || '').trim().toLowerCase();
  return ['super_admin', 'admin', 'manager'].includes(role)
    && currentUser?.is_active !== false
    && String(currentUser?.status || '').trim().toLowerCase() === 'active'
    && currentUser?.tenant_id != null
    && Boolean(currentUser?.company_code);
};
