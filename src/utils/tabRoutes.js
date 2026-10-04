const TAB_ROUTE_OVERRIDES = {
  Products: 'item-master',
  Units: 'item-unit-master',
  Categories: 'item-main-category',
  Subcategories: 'item-sub-category',
  Brands: 'brand',
  HSNMaster: 'hsn-master',
  Departments: 'department-master',
  Accounts: 'account-master',
  UserMaster: 'user-master',
  Banners: 'banner',
  Credits: 'credit-master',
  DeliveryBoys: 'delivery-boy-master',
  DeliveryCustomers: 'delivery-customer-master',
  Coupons: 'coupon-master',
  Offers: 'offers-master',
  Pincodes: 'pincode-master',
  Addresses: 'address-master',
  WalletMaster: 'wallet-master',
  Dashboard: 'dashboard',
  POS: 'sale-entry'
};

const LEGACY_TAB_ROUTE_ALIASES = {
  'brand-master': 'Brands',
  'banner-master': 'Banners'
};

export const APP_TAB_IDS = [
  'Dashboard',
  'Products', 'Units', 'Categories', 'Subcategories', 'Brands', 'HSNMaster',
  'Departments', 'Accounts', 'UserMaster', 'Banners', 'Credits',
  'DeliveryBoys', 'DeliveryCustomers', 'Coupons', 'Offers', 'Pincodes',
  'Addresses', 'WalletMaster', 'Suppliers',
  'StockAlerts', 'StockReduction', 'PurchaseEntry', 'StockLogs',
  'InventoryReconciliation',
  'CustomerAnalytics', 'LoyaltyManagement', 'ProfitLoss', 'Expenses',
  'Orders', 'POS', 'SelfCheckout', 'AppConfig', 'CompanyManagement',
  'Purchase', 'Transaction', 'Notifications', 'SupportTickets', 'Analytics',
  'Users', 'AdminUsers'
];

export const getTabRouteSegment = (tabId) =>
  TAB_ROUTE_OVERRIDES[tabId] ||
  String(tabId).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export const getTabFromRouteSegment = (segment, tabIds) =>
  LEGACY_TAB_ROUTE_ALIASES[segment] && tabIds.includes(LEGACY_TAB_ROUTE_ALIASES[segment])
    ? LEGACY_TAB_ROUTE_ALIASES[segment]
    : tabIds.find((tabId) => getTabRouteSegment(tabId) === segment) || null;

export const getTabIdFromRouteSegment = (segment) =>
  getTabFromRouteSegment(segment, APP_TAB_IDS);
