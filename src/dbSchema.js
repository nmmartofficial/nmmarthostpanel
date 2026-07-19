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

// Excel/CSV Upload Column Mappings for all tables
export const TABLE_COLUMN_MAPPINGS = {
  COMPANIES: {
    id: 'id',
    name: 'name',
    address: 'address',
    phone: 'phone',
    email: 'email',
    gstin: 'gstin',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  PRODUCTS: {
    id: 'id',
    itname: 'itname',
    itnameprint: 'itnameprint',
    barcode: 'barcode',
    imagename: 'imagename',
    itemdescription: 'itemdescription',
    hsncode: 'hsncode',
    picture: 'picture',
    takerate: 'takerate',
    restrate: 'restrate',
    dlvrate: 'dlvrate',
    onlinerate: 'onlinerate',
    purcrate: 'purcrate',
    mrp: 'mrp',
    opstock: 'opstock',
    discperc: 'discperc',
    isfav: 'isfav',
    unitcode: 'unitcode',
    itg: 'itg',
    itc: 'itc',
    dtcode: 'dtcode',
    kcode: 'kcode',
    brandcode: 'brandcode',
    isdiscountable: 'isdiscountable',
    gst: 'gst',
    cess: 'cess',
    shopid: 'shopid',
    ispackage: 'ispackage',
    narration: 'narration',
    narration2: 'narration2',
    itemstatus: 'itemstatus',
    category_id: 'category_id',
    subcategory_id: 'subcategory_id',
    brand_id: 'brand_id',
    stock: 'stock',
    name: 'name',
    print_name: 'print_name',
    description: 'description',
    hsn_code: 'hsn_code',
    image_url: 'image_url',
    take_rate: 'take_rate',
    retail_rate: 'retail_rate',
    delivery_rate: 'delivery_rate',
    sale_rate: 'sale_rate',
    purchase_rate: 'purchase_rate',
    discount_percent: 'discount_percent',
    is_favourite: 'is_favourite',
    unit_name: 'unit_name',
    category_name: 'category_name',
    brand_name: 'brand_name',
    is_discountable: 'is_discountable',
    gst_percent: 'gst_percent',
    cess_percent: 'cess_percent',
    shop_id: 'shop_id',
    is_package: 'is_package',
    item_status: 'item_status',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  STOCK_ALERTS: {
    id: 'id',
    product_id: 'product_id',
    alert_type: 'alert_type',
    threshold: 'threshold',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  CATEGORIES: {
    id: 'id',
    name: 'name',
    description: 'description',
    image_url: 'image_url',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  SUBCATEGORIES: {
    id: 'id',
    category_id: 'category_id',
    name: 'name',
    description: 'description',
    image_url: 'image_url',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  BRANDS: {
    id: 'id',
    name: 'name',
    description: 'description',
    logo_url: 'logo_url',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  ADMIN_USERS: {
    id: 'id',
    username: 'username',
    email: 'email',
    password_hash: 'password_hash',
    role: 'role',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  CREDITS: {
    id: 'id',
    customer_id: 'customer_id',
    amount: 'amount',
    type: 'type',
    reason: 'reason',
    reference_id: 'reference_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  DELIVERY_BOYS: {
    id: 'id',
    name: 'name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    vehicle_number: 'vehicle_number',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  DELIVERY_CUSTOMERS: {
    id: 'id',
    name: 'name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    pincode: 'pincode',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  PURCHASES: {
    id: 'id',
    supplier_id: 'supplier_id',
    invoice_number: 'invoice_number',
    invoice_date: 'invoice_date',
    total_amount: 'total_amount',
    paid_amount: 'paid_amount',
    payment_status: 'payment_status',
    status: 'status',
    notes: 'notes',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  PURCHASE_ITEMS: {
    id: 'id',
    purchase_id: 'purchase_id',
    product_id: 'product_id',
    quantity: 'quantity',
    rate: 'rate',
    total: 'total',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  UNITS: {
    id: 'id',
    name: 'name',
    symbol: 'symbol',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  DEPARTMENTS: {
    id: 'id',
    name: 'name',
    description: 'description',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  ACCOUNTS: {
    id: 'id',
    name: 'name',
    type: 'type',
    balance: 'balance',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  USERS: {
    id: 'id',
    name: 'name',
    email: 'email',
    phone: 'phone',
    password_hash: 'password_hash',
    address: 'address',
    pincode: 'pincode',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  ORDERS: {
    id: 'id',
    order_number: 'order_number',
    user_id: 'user_id',
    customer_name: 'customer_name',
    user_mobile: 'user_mobile',
    delivery_address: 'delivery_address',
    pincode: 'pincode',
    subtotal: 'subtotal',
    discount: 'discount',
    delivery_charge: 'delivery_charge',
    total_amount: 'total_amount',
    payment_method: 'payment_method',
    payment_status: 'payment_status',
    order_status: 'order_status',
    delivery_boy_id: 'delivery_boy_id',
    notes: 'notes',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  ORDER_ITEMS: {
    id: 'id',
    order_id: 'order_id',
    product_id: 'product_id',
    product_name: 'product_name',
    quantity: 'quantity',
    qty: 'qty',
    rate: 'rate',
    price: 'price',
    total: 'total',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  WALLET_MASTER: {
    id: 'id',
    user_id: 'user_id',
    customer_id: 'customer_id',
    balance: 'balance',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  WALLET_TRANSACTIONS: {
    id: 'id',
    wallet_id: 'wallet_id',
    user_id: 'user_id',
    amount: 'amount',
    type: 'type',
    reason: 'reason',
    reference_id: 'reference_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  EXPENSES: {
    id: 'id',
    expense_category_id: 'expense_category_id',
    amount: 'amount',
    description: 'description',
    date: 'date',
    receipt_url: 'receipt_url',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  EXPENSE_CATEGORIES: {
    id: 'id',
    name: 'name',
    description: 'description',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  ADDRESSES: {
    id: 'id',
    user_id: 'user_id',
    name: 'name',
    phone: 'phone',
    address_line1: 'address_line1',
    address_line2: 'address_line2',
    city: 'city',
    state: 'state',
    pincode: 'pincode',
    is_default: 'is_default',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  PINCODES: {
    id: 'id',
    pincode: 'pincode',
    city: 'city',
    state: 'state',
    is_serviceable: 'is_serviceable',
    delivery_charge: 'delivery_charge',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  BANNERS: {
    id: 'id',
    title: 'title',
    description: 'description',
    image_url: 'image_url',
    link_url: 'link_url',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  COUPONS: {
    id: 'id',
    code: 'code',
    title: 'title',
    description: 'description',
    discount_type: 'discount_type',
    discount_value: 'discount_value',
    min_order_amount: 'min_order_amount',
    max_discount: 'max_discount',
    valid_from: 'valid_from',
    valid_to: 'valid_to',
    usage_limit: 'usage_limit',
    used_count: 'used_count',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  OFFERS: {
    id: 'id',
    title: 'title',
    description: 'description',
    offer_type: 'offer_type',
    discount_value: 'discount_value',
    min_order_amount: 'min_order_amount',
    valid_from: 'valid_from',
    valid_to: 'valid_to',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  HOME_CONFIG: {
    id: 'id',
    key: 'key',
    value: 'value',
    description: 'description',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  APP_CONFIG: {
    id: 'id',
    key: 'key',
    value: 'value',
    description: 'description',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  LOYALTY_POINTS: {
    id: 'id',
    user_id: 'user_id',
    customer_id: 'customer_id',
    points: 'points',
    tier_id: 'tier_id',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  LOYALTY_TRANSACTIONS: {
    id: 'id',
    loyalty_point_id: 'loyalty_point_id',
    user_id: 'user_id',
    points: 'points',
    type: 'type',
    reason: 'reason',
    reference_id: 'reference_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  LOYALTY_TIERS: {
    id: 'id',
    name: 'name',
    min_points: 'min_points',
    max_points: 'max_points',
    benefits: 'benefits',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  CART: {
    id: 'id',
    user_id: 'user_id',
    product_id: 'product_id',
    quantity: 'quantity',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  WISHLIST: {
    id: 'id',
    user_id: 'user_id',
    product_id: 'product_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  SYSTEM_LOGS: {
    id: 'id',
    table_name: 'table_name',
    action_type: 'action_type',
    username: 'username',
    user_role: 'user_role',
    company_code: 'company_code',
    old_data: 'old_data',
    new_data: 'new_data',
    metadata: 'metadata',
    created_at: 'created_at'
  },
  INVENTORY_LOGS: {
    id: 'id',
    product_id: 'product_id',
    old_stock: 'old_stock',
    new_stock: 'new_stock',
    change_type: 'change_type',
    reference_id: 'reference_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  NOTIFICATIONS: {
    id: 'id',
    title: 'title',
    message: 'message',
    type: 'type',
    reference_id: 'reference_id',
    user_id: 'user_id',
    is_read: 'is_read',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  },
  SUPPORT_TICKETS: {
    id: 'id',
    user_id: 'user_id',
    customer_id: 'customer_id',
    subject: 'subject',
    description: 'description',
    status: 'status',
    priority: 'priority',
    created_at: 'created_at',
    updated_at: 'updated_at',
    tenant_id: 'tenant_id',
    company_code: 'company_code'
  }
};

// Constraint Logic for specific tables (Database-First Approach)
export const TABLE_CONSTRAINTS = {
  PRODUCTS: {
    stock_enforcement: "CHECK (stock >= 0)", // Updated from stock_qty to stock
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
