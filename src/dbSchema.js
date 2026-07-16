/**
 * NM MART - Database Schema Mapping
 * Direct binding between Admin Panel Models and Supabase Tables.
 * This ensures that the Admin Panel follows the exact database-first constraints.
 */

export const DB_SCHEMA = {
  // --- CORE TABLES (Synced with Supabase SQL Schema) ---

  // 0. Multi-Tenant (Companies)
  COMPANIES: { table: 'companies', pk: 'id', label: 'Companies Master' },

  // 1. Inventory & Catalog
  PRODUCTS: { table: 'products', pk: 'id', label: 'Products Master', tenantColumn: 'tenant_id' },
  STOCK_ALERTS: { table: 'stock_alerts', pk: 'id', label: 'Stock Alerts', tenantColumn: 'tenant_id' },
  CATEGORIES: { table: 'categories', pk: 'id', label: 'Categories', tenantColumn: 'tenant_id' },
  SUBCATEGORIES: { table: 'subcategories', pk: 'id', label: 'Sub-Categories', tenantColumn: 'tenant_id' },
  BRANDS: { table: 'brands', pk: 'id', label: 'Brands', tenantColumn: 'tenant_id' },
  ADMIN_USERS: { table: 'admin_users', pk: 'id', label: 'Admin User Master', tenantColumn: 'tenant_id' },
  CREDITS: { table: 'credit_master', pk: 'id', label: 'Credit Master', tenantColumn: 'tenant_id' },
  DELIVERY_BOYS: { table: 'delivery_boy_master', pk: 'id', label: 'Delivery Boys', tenantColumn: 'tenant_id' },
  DELIVERY_CUSTOMERS: { table: 'delivery_customer_master', pk: 'id', label: 'Delivery Customers', tenantColumn: 'tenant_id' },
  PURCHASES: { table: 'purchases', pk: 'id', label: 'Purchase Entry', tenantColumn: 'tenant_id' },
  PURCHASE_ITEMS: { table: 'purchase_items', pk: 'id', label: 'Purchase Items', tenantColumn: 'tenant_id' },
  UNITS: { table: 'unit_master', pk: 'id', label: 'Item Units', tenantColumn: 'tenant_id' },
  DEPARTMENTS: { table: 'department_master', pk: 'id', label: 'Departments', tenantColumn: 'tenant_id' },
  ACCOUNTS: { table: 'account_master', pk: 'id', label: 'Accounts', tenantColumn: 'tenant_id' },
  USERS: { table: 'users', pk: 'id', label: 'App Users', tenantColumn: 'tenant_id' },
  
  // 2. Sales & Orders
  ORDERS: { table: 'orders', pk: 'id', label: 'Customer Orders', tenantColumn: 'tenant_id' },
  ORDER_ITEMS: { table: 'order_items', pk: 'id', label: 'Order Line Items', tenantColumn: 'tenant_id' },

  // 3. Wallet & Finance
  WALLET_MASTER: { table: 'wallet_master', pk: 'id', label: 'Wallet Balance', tenantColumn: 'tenant_id' },
  WALLET_TRANSACTIONS: { table: 'wallet_transactions', pk: 'id', label: 'Wallet History', tenantColumn: 'tenant_id' },
  EXPENSES: { table: 'expenses', pk: 'id', label: 'Business Expenses', tenantColumn: 'tenant_id' },
  EXPENSE_CATEGORIES: { table: 'expense_categories', pk: 'id', label: 'Expense Types', tenantColumn: 'tenant_id' },

  // 4. Logistics & Users
  ADDRESSES: { table: 'addresses', pk: 'id', label: 'User Addresses', tenantColumn: 'tenant_id' },
  PINCODES: { table: 'pincode_master', pk: 'id', label: 'Serviceable Areas', tenantColumn: 'tenant_id' },

  // 5. Marketing & Config
  BANNERS: { table: 'banners', pk: 'id', label: 'App Banners', tenantColumn: 'tenant_id' },
  COUPONS: { table: 'coupons', pk: 'id', label: 'Promo Coupons', tenantColumn: 'tenant_id' },
  OFFERS: { table: 'offers_master', pk: 'id', label: 'Offers Master', tenantColumn: 'tenant_id' },
  HOME_CONFIG: { table: 'home_config', pk: 'id', label: 'Home Page Config', tenantColumn: 'tenant_id' },
  APP_CONFIG: { table: 'app_config', pk: 'id', label: 'Global Settings', tenantColumn: 'tenant_id' },

  // 6. Customer Loyalty
  LOYALTY_POINTS: { table: 'customer_loyalty', pk: 'id', label: 'Loyalty Points', tenantColumn: 'tenant_id' },
  LOYALTY_TRANSACTIONS: { table: 'loyalty_transactions', pk: 'id', label: 'Loyalty Transactions', tenantColumn: 'tenant_id' },
  LOYALTY_TIERS: { table: 'loyalty_tiers', pk: 'id', label: 'Loyalty Tiers', tenantColumn: 'tenant_id' },

  // 6. Customer Activity
  CART: { table: 'cart', pk: 'id', label: 'Shopping Cart', tenantColumn: 'tenant_id' },
  WISHLIST: { table: 'wishlist', pk: 'id', label: 'User Wishlist', tenantColumn: 'tenant_id' },

  // 7. System & Audit
  SYSTEM_LOGS: { table: 'system_logs', pk: 'id', label: 'Audit Trail', tenantColumn: 'tenant_id' },
  INVENTORY_LOGS: { table: 'inventory_logs', pk: 'id', label: 'Stock Movement Logs', tenantColumn: 'tenant_id' },
  NOTIFICATIONS: { table: 'notifications', pk: 'id', label: 'Push Notifications', tenantColumn: 'tenant_id' },
  SUPPORT_TICKETS: { table: 'support_tickets', pk: 'id', label: 'User Feedback', tenantColumn: 'tenant_id' },
  
  // 8. Readable Views (UUID Skip)
  READABLE_PRODUCTS: { table: 'readable_products', label: 'Products (Readable)' },
  READABLE_CATEGORIES: { table: 'readable_categories', label: 'Categories (Readable)' },
  READABLE_BRANDS: { table: 'readable_brands', label: 'Brands (Readable)' },
  READABLE_BANNERS: { table: 'readable_banners', label: 'Banners (Readable)' },
  READABLE_COUPONS: { table: 'readable_coupons', label: 'Coupons (Readable)' },
  READABLE_ORDERS: { table: 'readable_orders', label: 'Orders (Readable)' },
  READABLE_USERS: { table: 'readable_users', label: 'Users (Readable)' }
};

// Constraint Logic for specific tables (Database-First Approach)
export const TABLE_CONSTRAINTS = {
  PRODUCTS: {
    stock_enforcement: "CHECK (stock >= 0)", // Updated to 'stock' from SQL
    price_validation: "CHECK (sale_rate <= mrp)"
  },
  ORDERS: {
    status_flow: ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'], // Matched with SQL
    atomic_placement: 'place_order_atomic'
  }
};

// --- Step 2: Access Control Roles ---
export const USER_ROLES = {
  SUPER_ADMIN: {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access',
    allowedTabs: ['*'] // Everything
  },
  SALES_MANAGER: {
    id: 'sales_manager',
    label: 'Sales Manager',
    description: 'Manage POS, Orders, and Customers',
    allowedTabs: ['Dashboard', 'POS', 'Orders', 'OnlineOrder', 'BillView', 'DeliveryCustomers', 'PaymentMobile', 'WalletRecharge']
  },
  INVENTORY_HEAD: {
    id: 'inventory_head',
    label: 'Inventory Head',
    description: 'Manage Products, Categories, and Suppliers',
    allowedTabs: ['Dashboard', 'Products', 'Categories', 'Subcategories', 'Brands', 'Suppliers', 'PurchaseEntry', 'StockLogs', 'StockReport']
  },
  ACCOUNTANT: {
    id: 'accountant',
    label: 'Accountant',
    description: 'Manage Finance, Expenses, and Profit/Loss',
    allowedTabs: ['Dashboard', 'Expenses', 'ProfitLoss', 'LedgerView', 'Logbook', 'CreditReport', 'PaymentReportDB']
  }
};
