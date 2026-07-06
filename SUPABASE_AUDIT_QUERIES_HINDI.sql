-- ========================================
-- NM MART - SUPABASE AUDIT QUERIES HINDI MEIN
-- ========================================

-- ========================================
-- 1. SABSE ZAROORI - SABHI TABLES KA COUNT DEKHNE KA QUERY
-- ========================================
-- Ye query sabhi tables mein kitni rows hain, check karta hai

SELECT 
  schemaname,
  tablename,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes
FROM pg_stat_user_tables
ORDER BY tablename;

-- ========================================
-- 2. SABHI TABLES KA DATA COUNT DEKHNE KA QUERY (SIMPLE)
-- ========================================
-- Ye query har table mein kitni entries hain, batata hai

SELECT 'app_config' AS table_name, COUNT(*) AS total_rows FROM app_config UNION ALL
SELECT 'home_config', COUNT(*) FROM home_config UNION ALL
SELECT 'banners', COUNT(*) FROM banners UNION ALL
SELECT 'categories', COUNT(*) FROM categories UNION ALL
SELECT 'subcategories', COUNT(*) FROM subcategories UNION ALL
SELECT 'brands', COUNT(*) FROM brands UNION ALL
SELECT 'unit_master', COUNT(*) FROM unit_master UNION ALL
SELECT 'department_master', COUNT(*) FROM department_master UNION ALL
SELECT 'products', COUNT(*) FROM products UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users UNION ALL
SELECT 'account_master', COUNT(*) FROM account_master UNION ALL
SELECT 'credit_master', COUNT(*) FROM credit_master UNION ALL
SELECT 'delivery_boy_master', COUNT(*) FROM delivery_boy_master UNION ALL
SELECT 'delivery_customer_master', COUNT(*) FROM delivery_customer_master UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases UNION ALL
SELECT 'purchase_items', COUNT(*) FROM purchase_items UNION ALL
SELECT 'orders', COUNT(*) FROM orders UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items UNION ALL
SELECT 'wallet_master', COUNT(*) FROM wallet_master UNION ALL
SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions UNION ALL
SELECT 'addresses', COUNT(*) FROM addresses UNION ALL
SELECT 'pincode_master', COUNT(*) FROM pincode_master UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons UNION ALL
SELECT 'offers_master', COUNT(*) FROM offers_master UNION ALL
SELECT 'cart', COUNT(*) FROM cart UNION ALL
SELECT 'wishlist', COUNT(*) FROM wishlist UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications UNION ALL
SELECT 'system_logs', COUNT(*) FROM system_logs UNION ALL
SELECT 'users', COUNT(*) FROM users UNION ALL
SELECT 'inventory_logs', COUNT(*) FROM inventory_logs UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses UNION ALL
SELECT 'stock_alerts', COUNT(*) FROM stock_alerts UNION ALL
SELECT 'support_tickets', COUNT(*) FROM support_tickets
ORDER BY table_name;

-- ========================================
-- 3. AUDIT LOGS - SYSTEM_LOGS TABLE DEKHO
-- ========================================
-- Ye sabhi audit logs dikhayega (sabse important query)

SELECT *
FROM system_logs
ORDER BY created_at DESC
LIMIT 100;

-- ========================================
-- 4. SPECIFIC TABLE KE LIYE AUDIT LOGS
-- ========================================
-- Bas specific table ke logs dekhne ke liye

SELECT *
FROM system_logs
WHERE table_name = 'products' -- table name change karo (categories, brands, etc.)
ORDER BY created_at DESC
LIMIT 50;

-- ========================================
-- 5. SPECIFIC USER KE LIYE AUDIT LOGS
-- ========================================
-- Kisi particular user ke actions dekhne ke liye

SELECT *
FROM system_logs
WHERE username = 'admin' -- username change karo
ORDER BY created_at DESC
LIMIT 50;

-- ========================================
-- 6. SPECIFIC ACTION TYPE KE LIYE AUDIT LOGS
-- ========================================
-- INSERT, UPDATE, DELETE, etc.

SELECT *
FROM system_logs
WHERE action_type = 'INSERT' -- INSERT, UPDATE, DELETE, HARD_DELETE, SOFT_DELETE
ORDER BY created_at DESC
LIMIT 50;

-- ========================================
-- 7. DATE RANGE MEIN AUDIT LOGS
-- ========================================
-- Kisi date ke beech ke logs dekhne ke liye

SELECT *
FROM system_logs
WHERE created_at >= '2024-01-01 00:00:00+00' -- start date
  AND created_at <= '2024-12-31 23:59:59+00' -- end date
ORDER BY created_at DESC;

-- ========================================
-- 8. TABLE WISE ACTION COUNT DEKHO
-- ========================================
-- Har table mein kitne INSERT/UPDATE/DELETE hue hain

SELECT 
  table_name,
  action_type,
  COUNT(*) AS total_actions
FROM system_logs
GROUP BY table_name, action_type
ORDER BY table_name, action_type;

-- ========================================
-- 9. USER WISE ACTION COUNT DEKHO
-- ========================================
-- Har user ne kitne actions perform kiye hain

SELECT 
  username,
  user_role,
  action_type,
  COUNT(*) AS total_actions
FROM system_logs
GROUP BY username, user_role, action_type
ORDER BY username, action_type;

-- ========================================
-- 10. PRODUCTS TABLE KA SPECIFIC AUDIT
-- ========================================
-- Products ke liye detailed audit

SELECT 
  id,
  table_name,
  action_type,
  username,
  old_data,
  new_data,
  created_at
FROM system_logs
WHERE table_name = 'products'
ORDER BY created_at DESC
LIMIT 100;

-- ========================================
-- 11. RECENT DELETIONS DEKHO
-- ========================================
-- Jo bhi items delete hue hain recently

SELECT *
FROM system_logs
WHERE action_type IN ('DELETE', 'HARD_DELETE', 'SOFT_DELETE')
ORDER BY created_at DESC
LIMIT 50;

-- ========================================
-- 12. RECENT INSERTIONS DEKHO
-- ========================================
-- Naye items jo add hue hain recently

SELECT *
FROM system_logs
WHERE action_type = 'INSERT'
ORDER BY created_at DESC
LIMIT 50;

-- ========================================
-- 13. INVENTORY LOGS DEKHO (STOCK CHANGES)
-- ========================================
-- Stock ke changes ke liye separate logs

SELECT *
FROM inventory_logs
ORDER BY created_at DESC
LIMIT 100;

-- ========================================
-- 14. PRODUCT WISE INVENTORY LOGS
-- ========================================
-- Kisi particular product ke stock changes

SELECT *
FROM inventory_logs
WHERE product_id = 'your-product-id-here' -- product ID change karo
ORDER BY created_at DESC;

-- ========================================
-- 15. RECENT ORDERS DEKHO
-- ========================================
-- Naye orders jo aaye hain

SELECT *
FROM orders
ORDER BY created_at DESC
LIMIT 50;

-- ========================================
-- 16. STOCK ALERTS DEKHO
-- ========================================
-- Jinki stock kam hai, un alerts ko dekhne ke liye

SELECT 
  p.name AS product_name,
  p.stock AS current_stock,
  sa.threshold AS alert_threshold
FROM stock_alerts sa
JOIN products p ON sa.product_id = p.id
WHERE sa.is_active = true
ORDER BY p.stock ASC;

-- ========================================
-- 17. LOW STOCK PRODUCTS DEKHO (WITHOUT ALERTS)
-- ========================================
-- Jinki stock 10 ya usse kam hai (threshold change kar sakte ho)

SELECT 
  id,
  name,
  stock,
  category_id,
  brand_id
FROM products
WHERE stock <= 10 -- threshold change karo
  AND (is_active = true OR is_active IS NULL)
ORDER BY stock ASC;

-- ========================================
-- 18. TOP 10 BEST SELLING PRODUCTS DEKHO
-- ========================================
-- Sabse zyada bikne wale products

SELECT 
  p.id,
  p.name,
  COUNT(oi.id) AS total_orders,
  SUM(oi.quantity) AS total_quantity_sold,
  SUM(oi.total) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY total_quantity_sold DESC
LIMIT 10;

-- ========================================
-- 19. ACTIVE vs INACTIVE PRODUCTS
-- ========================================
-- Kitne products active hain aur kitne inactive

SELECT 
  CASE 
    WHEN is_active = true THEN 'Active'
    WHEN is_active = false THEN 'Inactive'
    ELSE 'Not Set'
  END AS status,
  COUNT(*) AS total_products
FROM products
GROUP BY is_active;

-- ========================================
-- 20. DAILY ORDERS SUMMARY
-- ========================================
-- Din ke hisab se kitne orders aaye hain

SELECT 
  DATE(created_at) AS order_date,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_revenue,
  AVG(total_amount) AS avg_order_value
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC
LIMIT 30;

-- ========================================
-- 21. COUPON USAGE STATISTICS
-- ========================================
-- Coupons kitni baar use hue hain

SELECT 
  id,
  code,
  discount_type,
  discount_value,
  used_count,
  usage_limit,
  is_active
FROM coupons
ORDER BY used_count DESC;

-- ========================================
-- 22. WALLET TRANSACTIONS SUMMARY
-- ========================================
-- Wallet ke transactions ke baare mein

SELECT 
  type,
  COUNT(*) AS total_transactions,
  SUM(amount) AS total_amount
FROM wallet_transactions
GROUP BY type;

-- ========================================
-- 23. PURCHASES SUMMARY (SUPPLIER WISE)
-- ========================================
-- Supplier ke hisab se purchases

SELECT 
  am.name AS supplier_name,
  COUNT(p.id) AS total_purchases,
  SUM(p.total_amount) AS total_purchase_value
FROM purchases p
JOIN account_master am ON p.supplier_id = am.id
GROUP BY am.name
ORDER BY total_purchase_value DESC;

-- ========================================
-- 24. EXPENSES SUMMARY
-- ========================================
-- Category wise expenses

SELECT 
  ec.name AS expense_category,
  COUNT(e.id) AS total_expenses,
  SUM(e.amount) AS total_amount
FROM expenses e
LEFT JOIN expense_categories ec ON e.category_id = ec.id
GROUP BY ec.name
ORDER BY total_amount DESC;

-- ========================================
-- 25. CHECK RLS POLICIES (IMPORTANT FOR SECURITY)
-- ========================================
-- Ye query dekhayega ki kon kon se tables par RLS enable hai

SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- JAVA DEVELOPER KE LIYE HELPER QUERIES
-- ========================================

-- QUERY 1: APP KE LIYE SIRF ACTIVE DATA
-- Sirf active items (products, categories, etc.) app ke liye

-- Active Products
SELECT * FROM products 
WHERE (is_active = true OR is_active IS NULL)
ORDER BY created_at DESC;

-- Active Categories
SELECT * FROM categories 
WHERE (is_active = true OR is_active IS NULL)
ORDER BY name;

-- Active Banners
SELECT * FROM banners 
WHERE (is_active = true OR is_active IS NULL)
ORDER BY position, created_at DESC;

-- Active Coupons
SELECT * FROM coupons 
WHERE (is_active = true OR is_active IS NULL)
  AND (valid_from IS NULL OR valid_from <= NOW())
  AND (valid_to IS NULL OR valid_to >= NOW())
ORDER BY created_at DESC;

-- ========================================
-- QUICK REFERENCE: SABHI TABLES KE NAMES
-- ========================================
/*
1. app_config
2. home_config
3. banners
4. categories
5. subcategories
6. brands
7. unit_master
8. department_master
9. products (SABSE ZAROORI)
10. admin_users
11. account_master
12. credit_master
13. delivery_boy_master
14. delivery_customer_master
15. purchases
16. purchase_items
17. orders
18. order_items
19. wallet_master
20. wallet_transactions
21. addresses
22. pincode_master
23. coupons
24. offers_master
25. cart
26. wishlist
27. notifications
28. system_logs (AUDIT LOGS)
29. users
30. inventory_logs
31. expense_categories
32. expenses
33. stock_alerts
34. support_tickets
*/

-- ========================================
-- YEH SAB QUERIES SUPABASE SQL EDITOR MEIN DIRECT CHALA SAKTE HO!
-- ========================================
