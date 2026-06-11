/**
 * NM MART - Database Schema Mapping
 * Direct binding between Admin Panel Models and Supabase Tables.
 * This ensures that the Admin Panel follows the exact database-first constraints.
 */

export const DB_SCHEMA = {
  // --- CORE TABLES (Synced with Supabase SQL Schema) ---
  
  // 1. Inventory & Catalog
  PRODUCTS: { table: 'products', pk: 'id', label: 'Products Master' },
  STOCK_ALERTS: { table: 'stock_alerts', pk: 'id', label: 'Stock Alerts' },
  CATEGORIES: { table: 'categories', pk: 'id', label: 'Categories' },
  SUBCATEGORIES: { table: 'subcategories', pk: 'id', label: 'Sub-Categories' },
  BRANDS: { table: 'brands', pk: 'id', label: 'Brands' },
  ADMIN_USERS: { table: 'admin_users', pk: 'id', label: 'Admin User Master' },
  CREDITS: { table: 'credit_master', pk: 'id', label: 'Credit Master' },
  DELIVERY_BOYS: { table: 'delivery_boy_master', pk: 'id', label: 'Delivery Boys' },
  DELIVERY_CUSTOMERS: { table: 'delivery_customer_master', pk: 'id', label: 'Delivery Customers' },
  PURCHASES: { table: 'purchases', pk: 'id', label: 'Purchase Entry' },
  PURCHASE_ITEMS: { table: 'purchase_items', pk: 'id', label: 'Purchase Items' },
  UNITS: { table: 'unit_master', pk: 'id', label: 'Item Units' },
  DEPARTMENTS: { table: 'department_master', pk: 'id', label: 'Departments' },
  ACCOUNTS: { table: 'account_master', pk: 'id', label: 'Accounts' },
  USERS: { table: 'users', pk: 'id', label: 'App Users' },
  
  // 2. Sales & Orders
  ORDERS: { table: 'orders', pk: 'id', label: 'Customer Orders' },
  ORDER_ITEMS: { table: 'order_items', pk: 'id', label: 'Order Line Items' },
  
  // 3. Wallet & Finance
  WALLET_MASTER: { table: 'wallet_master', pk: 'id', label: 'Wallet Balance' },
  WALLET_TRANSACTIONS: { table: 'wallet_transactions', pk: 'id', label: 'Wallet History' },
  EXPENSES: { table: 'expenses', pk: 'id', label: 'Business Expenses' },
  EXPENSE_CATEGORIES: { table: 'expense_categories', pk: 'id', label: 'Expense Types' },
  
  // 4. Logistics & Users
  ADDRESSES: { table: 'addresses', pk: 'id', label: 'User Addresses' },
  PINCODES: { table: 'pincode_master', pk: 'id', label: 'Serviceable Areas' },
  
  // 5. Marketing & Config
  BANNERS: { table: 'banners', pk: 'id', label: 'App Banners' },
  COUPONS: { table: 'coupons', pk: 'id', label: 'Promo Coupons' },
  OFFERS: { table: 'offers_master', pk: 'id', label: 'Offers Master' },
  HOME_CONFIG: { table: 'home_config', pk: 'id', label: 'Home Page Config' },
  APP_CONFIG: { table: 'app_config', pk: 'id', label: 'Global Settings' },
  
  // 6. Customer Activity
  CART: { table: 'cart', pk: 'id', label: 'Shopping Cart' },
  WISHLIST: { table: 'wishlist', pk: 'id', label: 'User Wishlist' },
  
  // 7. System & Audit
  SYSTEM_LOGS: { table: 'system_logs', pk: 'id', label: 'Audit Trail' },
  INVENTORY_LOGS: { table: 'inventory_logs', pk: 'id', label: 'Stock Movement Logs' },
  NOTIFICATIONS: { table: 'notifications', pk: 'id', label: 'Push Notifications' },
  SUPPORT_TICKETS: { table: 'support_tickets', pk: 'id', label: 'User Feedback' }
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
