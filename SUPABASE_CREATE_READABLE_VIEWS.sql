-- ========================================
-- SUPABASE READABLE VIEWS CREATE KARNE KA SCRIPT
-- ========================================
-- Ye script aapko Supabase Dashboard mein run karna hoga
-- Isse aapke database mein readable views ban jayenge
-- Views matlab virtual tables jo automatically update hote hain

-- ========================================
-- Products Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_products AS
SELECT 
  name,
  itname,
  barcode,
  mrp,
  sale_rate,
  onlinerate,
  purchase_rate,
  stock,
  opstock,
  gst,
  gst_percent,
  cess,
  cess_percent,
  discount,
  discount_pct,
  discount_percent,
  min_qty,
  description,
  image_url,
  is_favourite,
  is_discountable,
  is_active,
  is_live_on_app,
  hsn_code,
  created_at,
  updated_at
FROM products
ORDER BY created_at DESC;

-- ========================================
-- Categories Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_categories AS
SELECT 
  name,
  image_url,
  position,
  is_active,
  created_at,
  updated_at
FROM categories
ORDER BY name;

-- ========================================
-- Brands Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_brands AS
SELECT 
  name,
  code,
  image_url,
  is_active,
  created_at,
  updated_at
FROM brands
ORDER BY name;

-- ========================================
-- Banners Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_banners AS
SELECT 
  title,
  image_url,
  position,
  is_active,
  created_at,
  updated_at
FROM banners
ORDER BY position;

-- ========================================
-- Coupons Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_coupons AS
SELECT 
  code,
  discount_type,
  discount_value,
  min_order_value,
  max_discount,
  usage_limit,
  used_count,
  valid_from,
  valid_to,
  is_active,
  created_at,
  updated_at
FROM coupons
ORDER BY created_at DESC;

-- ========================================
-- Orders Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_orders AS
SELECT 
  order_number,
  user_id,
  customer_name,
  user_mobile,
  address,
  pincode,
  subtotal,
  delivery_charge,
  discount,
  total_amount,
  payment_mode,
  payment_status,
  order_status,
  created_at,
  updated_at
FROM orders
ORDER BY created_at DESC;

-- ========================================
-- Users Readable View
-- ========================================
CREATE OR REPLACE VIEW readable_users AS
SELECT 
  name,
  email,
  mobile,
  is_active,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;

-- ========================================
-- YE SCRIPT KO SUPABASE DASHBOARD ME RUN KARO!
-- Step 1: Go to https://supabase.com/dashboard/project/[your-project-id]
-- Step 2: Click on "SQL Editor"
-- Step 3: Paste this whole script and click "Run"
-- Step 4: After running, you will see new views in "Table Editor"
-- ========================================
