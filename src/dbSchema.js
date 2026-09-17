/**
 * NM MART - Database Schema Mapping
 * Direct binding between Admin Panel Models and Supabase Tables.
 * This ensures that the Admin Panel follows the exact database-first constraints.
 * WARNING: DO NOT edit Supabase columns. Only adjust this mapping to match live DB.
 */

export const DB_SCHEMA = {
  COMPANIES: { table: 'companies', pk: 'id', label: 'Companies Master' },

  PRODUCTS: { table: 'products', pk: 'id', label: 'Products Master', tenantColumn: 'tenant_id' },
  STOCK_ALERTS: { table: 'stock_alerts', pk: 'id', label: 'Stock Alerts', tenantColumn: 'tenant_id' },
  CATEGORIES: { table: 'categories', pk: 'id', label: 'Categories', tenantColumn: 'tenant_id' },
  SUBCATEGORIES: { table: 'subcategories', pk: 'id', label: 'Sub-Categories', tenantColumn: 'tenant_id' },
  BRANDS: { table: 'brands', pk: 'id', label: 'Brands', tenantColumn: 'tenant_id' },
  HSN_MASTER: { table: 'hsn_master', pk: 'id', label: 'HSN Master' },
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
  PROFILES: { table: 'profiles', pk: 'id', label: 'Auth Profiles' },

  ORDERS: { table: 'orders', pk: 'id', label: 'Customer Orders', tenantColumn: 'tenant_id' },
  ORDER_ITEMS: { table: 'order_items', pk: 'id', label: 'Order Line Items', tenantColumn: 'tenant_id' },
  PAYMENT_TRANSACTIONS: { table: 'payment_transactions', pk: 'id', label: 'Payment Transactions', tenantColumn: 'tenant_id' },

  WALLET_MASTER: { table: 'wallet_master', pk: 'id', label: 'Wallet Balance', tenantColumn: 'tenant_id' },
  WALLET_TRANSACTIONS: { table: 'wallet_transactions', pk: 'id', label: 'Wallet History', tenantColumn: 'tenant_id' },
  EXPENSES: { table: 'expenses', pk: 'id', label: 'Business Expenses', tenantColumn: 'tenant_id' },
  EXPENSE_CATEGORIES: { table: 'expense_categories', pk: 'id', label: 'Expense Types', tenantColumn: 'tenant_id' },

  ADDRESSES: { table: 'addresses', pk: 'id', label: 'User Addresses', tenantColumn: 'tenant_id' },
  PINCODES: { table: 'pincode_master', pk: 'id', label: 'Serviceable Areas', tenantColumn: 'tenant_id' },

  BANNERS: { table: 'banners', pk: 'id', label: 'App Banners', tenantColumn: 'tenant_id' },
  COUPONS: { table: 'coupons', pk: 'id', label: 'Promo Coupons', tenantColumn: 'tenant_id' },
  OFFERS: { table: 'offers_master', pk: 'id', label: 'Offers Master', tenantColumn: 'tenant_id' },
  HOME_CONFIG: { table: 'home_config', pk: 'id', label: 'Home Page Config', tenantColumn: 'tenant_id' },
  APP_CONFIG: { table: 'app_config', pk: 'id', label: 'Global Settings', tenantColumn: 'tenant_id' },

  LOYALTY_POINTS: { table: 'customer_loyalty', pk: 'id', label: 'Loyalty Points', tenantColumn: 'tenant_id' },
  LOYALTY_TRANSACTIONS: { table: 'loyalty_transactions', pk: 'id', label: 'Loyalty Transactions', tenantColumn: 'tenant_id' },
  LOYALTY_TIERS: { table: 'loyalty_tiers', pk: 'id', label: 'Loyalty Tiers', tenantColumn: 'tenant_id' },

  CART: { table: 'cart', pk: 'id', label: 'Shopping Cart', tenantColumn: 'tenant_id' },
  WISHLIST: { table: 'wishlist', pk: 'id', label: 'User Wishlist', tenantColumn: 'tenant_id' },

  SYSTEM_LOGS: { table: 'system_logs', pk: 'id', label: 'Audit Trail', tenantColumn: 'tenant_id' },
  INVENTORY_LOGS: { table: 'inventory_logs', pk: 'id', label: 'Stock Movement Logs', tenantColumn: 'tenant_id' },
  NOTIFICATIONS: { table: 'notifications', pk: 'id', label: 'Push Notifications', tenantColumn: 'tenant_id' },
  SUPPORT_TICKETS: { table: 'support_tickets', pk: 'id', label: 'User Feedback', tenantColumn: 'tenant_id' },

  READABLE_PRODUCTS: { table: 'readable_products', label: 'Products (Readable)' },
  READABLE_CATEGORIES: { table: 'readable_categories', label: 'Categories (Readable)' },
  READABLE_BRANDS: { table: 'readable_brands', label: 'Brands (Readable)' },
  READABLE_BANNERS: { table: 'readable_banners', label: 'Banners (Readable)' },
  READABLE_COUPONS: { table: 'readable_coupons', label: 'Coupons (Readable)' },
  READABLE_ORDERS: { table: 'readable_orders', label: 'Orders (Readable)' },
  READABLE_USERS: { table: 'readable_users', label: 'Users (Readable)' }
};

export const TABLE_COLUMN_MAPPINGS = {
  COMPANIES: {
    id: 'id', name: 'name', company_slug: 'company_slug', company_code: 'company_code',
    address: 'address', phone: 'phone', email: 'email', gstin: 'gstin', pan_no: 'pan_no',
    currency_code: 'currency_code', timezone: 'timezone', logo_url: 'logo_url',
    is_active: 'is_active', status: 'status', subscription_plan: 'subscription_plan',
    subscription_end: 'subscription_end', theme_config: 'theme_config',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  PRODUCTS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', itname: 'itname', print_name: 'print_name', itnameprint: 'itnameprint',
    description: 'description', itemdescription: 'itemdescription', barcode: 'barcode',
    hsn_code: 'hsn_code', hsncode: 'hsncode', image_url: 'image_url', imagename: 'imagename', picture: 'picture',
    category_id: 'category_id', subcategory_id: 'subcategory_id', brand_id: 'brand_id',
    purchase_rate: 'purchase_rate', purcrate: 'purcrate', mrp: 'mrp',
    retail_rate: 'retail_rate', restrate: 'restrate', take_rate: 'take_rate', takerate: 'takerate',
    delivery_rate: 'delivery_rate', dlvrate: 'dlvrate', sale_rate: 'sale_rate', onlinerate: 'onlinerate',
    stock: 'stock', opstock: 'opstock', low_stock_threshold: 'low_stock_threshold',
    unitcode: 'unitcode', unit_name: 'unit_name', category_name: 'category_name', brand_name: 'brand_name',
    gst_percent: 'gst_percent', gst: 'gst', cess_percent: 'cess_percent', cess: 'cess',
    discount_percent: 'discount_percent', discperc: 'discperc',
    is_discountable: 'is_discountable', isdiscountable: 'isdiscountable',
    is_favourite: 'is_favourite', isfav: 'isfav', is_package: 'is_package', ispackage: 'ispackage',
    item_status: 'item_status', itemstatus: 'itemstatus', is_active: 'is_active', is_deleted: 'is_deleted',
    narration: 'narration', narration2: 'narration2', shop_id: 'shop_id', shopid: 'shopid',
    itg: 'itg', itc: 'itc', dtcode: 'dtcode', kcode: 'kcode', brandcode: 'brandcode',
    brand_code: 'brand_code', department_code: 'department_code', category_code: 'category_code',
    sub_category_code: 'sub_category_code', discount: 'discount', discount_type: 'discount_type',
    cost_price: 'cost_price', selling_price: 'selling_price', discount_pct: 'discount_pct',
    discount_amount: 'discount_amount', max_discount: 'max_discount', min_selling_price: 'min_selling_price',
    item_name: 'item_name', item_group_name: 'item_group_name', sub_category_name: 'sub_category_name',
    gst_pct: 'gst_pct', cess_pct: 'cess_pct', opening_stock: 'opening_stock',
    item_description: 'item_description', item_group: 'item_group', online_rate: 'online_rate',
    subcategory_name: 'subcategory_name', item_category: 'item_category',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  HSN_MASTER: {
    id: 'id', hsn_code: 'hsn_code', description: 'description',
    gst_percent: 'gst_percent', cess_percent: 'cess_percent', is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  STOCK_ALERTS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    product_id: 'product_id', alert_type: 'alert_type', threshold: 'threshold',
    current_stock: 'current_stock', message: 'message', is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  INVENTORY_LOGS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    product_id: 'product_id', old_stock: 'old_stock', new_stock: 'new_stock',
    change_qty: 'change_qty', change_type: 'change_type',
    reference_id: 'reference_id', reference_number: 'reference_number',
    admin_user_id: 'admin_user_id', narration: 'narration',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  CATEGORIES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', description: 'description', image_url: 'image_url', sort_order: 'sort_order',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  SUBCATEGORIES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    category_id: 'category_id', name: 'name', description: 'description',
    image_url: 'image_url', sort_order: 'sort_order', is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  BRANDS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', code: 'code', description: 'description', logo_url: 'logo_url', image_url: 'image_url',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  ADMIN_USERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    auth_user_id: 'auth_user_id', username: 'username', name: 'name', full_name: 'full_name',
    email: 'email', phone: 'phone', password: 'password', password_hash: 'password_hash',
    role: 'role', permissions: 'permissions', is_active: 'is_active', status: 'status',
    last_login_at: 'last_login_at', last_login_ip: 'last_login_ip',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  CREDITS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    customer_id: 'customer_id', customer_type: 'customer_type',
    amount: 'amount', type: 'type', reason: 'reason',
    reference_id: 'reference_id', billing_period: 'billing_period', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  DELIVERY_BOYS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', phone: 'phone', email: 'email', address: 'address',
    vehicle_number: 'vehicle_number', vehicle_type: 'vehicle_type',
    license_number: 'license_number', aadhaar_number: 'aadhaar_number',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  DELIVERY_CUSTOMERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', phone: 'phone', email: 'email', address: 'address', pincode: 'pincode',
    credit_limit: 'credit_limit', current_due: 'current_due',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  PURCHASES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    supplier_id: 'supplier_id', invoice_number: 'invoice_number', invoice_date: 'invoice_date',
    payment_status: 'payment_status', status: 'status',
    subtotal: 'subtotal', gst_amount: 'gst_amount', discount_amount: 'discount_amount',
    round_off: 'round_off', total_amount: 'total_amount',
    paid_amount: 'paid_amount', balance_due: 'balance_due',
    tax_type: 'tax_type', notes: 'notes', admin_user_id: 'admin_user_id', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  PURCHASE_ITEMS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    purchase_id: 'purchase_id', product_id: 'product_id', product_name_snapshot: 'product_name_snapshot',
    quantity: 'quantity', rate: 'rate',
    gst_percent: 'gst_percent', gst_amount: 'gst_amount',
    discount_percent: 'discount_percent', discount_amount: 'discount_amount',
    total: 'total', created_at: 'created_at', updated_at: 'updated_at'
  },
  UNITS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', symbol: 'symbol', short_name: 'short_name', code: 'code',
    sort_order: 'sort_order', is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  DEPARTMENTS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', code: 'code', description: 'description',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  ACCOUNTS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', account_type: 'account_type', type: 'type',
    mobile: 'mobile', phone: 'phone', email: 'email', address: 'address',
    gst_no: 'gst_no', pan_no: 'pan_no',
    opening_balance: 'opening_balance', balance: 'balance', current_balance: 'current_balance',
    credit_limit: 'credit_limit', is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  USERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', email: 'email', phone: 'phone', password_hash: 'password_hash',
    gender: 'gender', dob: 'dob', address: 'address', pincode: 'pincode',
    referral_code: 'referral_code', referred_by_user_id: 'referred_by_user_id',
    is_active: 'is_active', signup_source: 'signup_source',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  PROFILES: {
    id: 'id', full_name: 'full_name', phone: 'phone', mobile: 'mobile', phone_number: 'phone_number',
    role: 'role', address: 'address', city: 'city', pincode: 'pincode', state: 'state',
    avatar_url: 'avatar_url', landmark: 'landmark',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  ORDERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    order_number: 'order_number', order_no: 'order_no', order_id_str: 'order_id_str', order_type: 'order_type',
    user_id: 'user_id', customer_id: 'customer_id',
    customer_name: 'customer_name', user_mobile: 'user_mobile', customer_phone: 'customer_phone',
    delivery_address: 'delivery_address', shipping_address: 'shipping_address',
    pincode: 'pincode', landmark: 'landmark',
    subtotal: 'subtotal', discount: 'discount', coupon_discount: 'coupon_discount',
    delivery_charge: 'delivery_charge', packaging_charge: 'packaging_charge',
    cgst_amount: 'cgst_amount', sgst_amount: 'sgst_amount',
    igst_amount: 'igst_amount', cess_amount: 'cess_amount',
    round_off: 'round_off', total_amount: 'total_amount', total: 'total',
    payment_method: 'payment_method', payment_mode: 'payment_mode',
    payment_status: 'payment_status', order_status: 'order_status', status: 'status',
    coupon_id: 'coupon_id', delivery_boy_id: 'delivery_boy_id',
    cashier_admin_user_id: 'cashier_admin_user_id', notes: 'notes', items: 'items',
    invoice_generated: 'invoice_generated', invoice_printed_at: 'invoice_printed_at',
    delivered_at: 'delivered_at', cancelled_at: 'cancelled_at',
    source_ip: 'source_ip', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  ORDER_ITEMS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    order_id: 'order_id', product_id: 'product_id',
    product_name: 'product_name', hsn_code_snapshot: 'hsn_code_snapshot',
    quantity: 'quantity', qty: 'qty', rate: 'rate', price: 'price',
    discount_percent: 'discount_percent', discount_amount: 'discount_amount',
    gst_percent: 'gst_percent', gst_amount: 'gst_amount',
    total: 'total', is_returned: 'is_returned',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  PAYMENT_TRANSACTIONS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    order_id: 'order_id', transaction_id: 'transaction_id',
    method: 'method', amount: 'amount', status: 'status',
    gateway_response: 'gateway_response', admin_user_id: 'admin_user_id',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  WALLET_MASTER: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    user_id: 'user_id', customer_id: 'customer_id',
    balance: 'balance', wallet_type: 'wallet_type', is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  WALLET_TRANSACTIONS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    wallet_id: 'wallet_id', user_id: 'user_id',
    amount: 'amount', type: 'type', reason: 'reason',
    reference_id: 'reference_id', reference_number: 'reference_number',
    opening_balance: 'opening_balance', closing_balance: 'closing_balance',
    narration: 'narration', status: 'status',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  EXPENSES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    expense_category_id: 'expense_category_id', account_paid_from_id: 'account_paid_from_id',
    amount: 'amount', description: 'description', date: 'date',
    receipt_url: 'receipt_url', voucher_number: 'voucher_number',
    admin_user_id: 'admin_user_id', is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  EXPENSE_CATEGORIES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', description: 'description',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  ADDRESSES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    user_id: 'user_id', name: 'name', phone: 'phone',
    address_type: 'address_type', address_line1: 'address_line1', address_line2: 'address_line2',
    landmark: 'landmark', city: 'city', state: 'state', pincode: 'pincode',
    latitude: 'latitude', longitude: 'longitude',
    is_default: 'is_default', is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  PINCODES: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    pincode: 'pincode', city: 'city', state: 'state',
    is_serviceable: 'is_serviceable', delivery_charge: 'delivery_charge',
    min_order_amount: 'min_order_amount', estimated_days: 'estimated_days',
    is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  BANNERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    title: 'title', itname: 'itname', name: 'name', description: 'description',
    image_url: 'image_url', banner_type: 'banner_type',
    link_url: 'link_url', link_type: 'link_type', link_id: 'link_id',
    action_type: 'action_type', action_value: 'action_value',
    linked_product_id: 'linked_product_id',
    sort_order: 'sort_order', start_date: 'start_date', end_date: 'end_date',
    is_active: 'is_active', is_deleted: 'is_deleted',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  COUPONS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    code: 'code', title: 'title', description: 'description',
    discount_type: 'discount_type', discount_value: 'discount_value',
    min_order_amount: 'min_order_amount', max_discount: 'max_discount',
    valid_from: 'valid_from', valid_to: 'valid_to',
    usage_limit: 'usage_limit', used_count: 'used_count', per_user_limit: 'per_user_limit',
    applies_to: 'applies_to', applies_to_id: 'applies_to_id',
    is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  OFFERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    title: 'title', description: 'description',
    offer_type: 'offer_type', buy_qty: 'buy_qty', get_qty: 'get_qty',
    discount_value: 'discount_value', min_order_amount: 'min_order_amount',
    applies_to_type: 'applies_to_type', applies_to_id: 'applies_to_id',
    banner_image: 'banner_image',
    valid_from: 'valid_from', valid_to: 'valid_to',
    is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  HOME_CONFIG: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    key: 'key', value: 'value', description: 'description',
    section_name: 'section_name', section_type: 'section_type', position: 'position',
    is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  APP_CONFIG: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    key: 'key', value: 'value', value_type: 'value_type', group_name: 'group_name',
    description: 'description', is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  LOYALTY_POINTS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    user_id: 'user_id', customer_id: 'customer_id',
    points: 'points', total_earned: 'total_earned', total_redeemed: 'total_redeemed',
    tier_id: 'tier_id', is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  LOYALTY_TRANSACTIONS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    loyalty_point_id: 'loyalty_point_id', user_id: 'user_id',
    points: 'points', type: 'type', reason: 'reason',
    reference_id: 'reference_id', points_value_inr: 'points_value_inr',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  LOYALTY_TIERS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    name: 'name', min_points: 'min_points', max_points: 'max_points',
    cashback_percent: 'cashback_percent', benefits: 'benefits', color_code: 'color_code',
    is_active: 'is_active',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  CART: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    user_id: 'user_id', product_id: 'product_id',
    quantity: 'quantity', session_id: 'session_id',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  WISHLIST: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    user_id: 'user_id', product_id: 'product_id',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  SYSTEM_LOGS: {
    id: 'id', table_name: 'table_name', action_type: 'action_type',
    record_id: 'record_id', admin_user_id: 'admin_user_id',
    username: 'username', user_role: 'user_role', company_code: 'company_code',
    old_data: 'old_data', new_data: 'new_data', metadata: 'metadata',
    affected_rows: 'affected_rows', status: 'status', error_message: 'error_message',
    created_at: 'created_at'
  },
  NOTIFICATIONS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    user_id: 'user_id', title: 'title', message: 'message',
    type: 'type', image_url: 'image_url', reference_id: 'reference_id',
    deep_link: 'deep_link', is_read: 'is_read',
    sent_at: 'sent_at', delivery_status: 'delivery_status',
    created_at: 'created_at', updated_at: 'updated_at'
  },
  SUPPORT_TICKETS: {
    id: 'id', tenant_id: 'tenant_id', company_code: 'company_code',
    ticket_number: 'ticket_number', user_id: 'user_id', customer_id: 'customer_id',
    subject: 'subject', description: 'description',
    category: 'category', status: 'status', priority: 'priority',
    assigned_admin_user_id: 'assigned_admin_user_id',
    created_at: 'created_at', updated_at: 'updated_at'
  }
};

export const TABLE_CONSTRAINTS = {
  PRODUCTS: {
    stock_enforcement: "CHECK (stock >= 0)",
    price_validation: "CHECK (sale_rate <= mrp)"
  },
  ORDERS: {
    status_flow: ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    atomic_placement: 'place_order_atomic'
  }
};

export const USER_ROLES = {
  SUPER_ADMIN: {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access',
    allowedTabs: ['*']
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
