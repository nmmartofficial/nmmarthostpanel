BEGIN;

-- ============================================================
-- SEED: App Config (needed for verify_admin_pin to work)
-- ============================================================
INSERT INTO public.app_config
    (tenant_id, company_code, key, value, value_type, group_name, description)
VALUES
  (1, 'NMM001', 'admin_security_pin',          '1234',                     'string',  'security',  'Global Admin Security PIN'),
  (1, 'NMM001', 'shop_name',                   'NM MART',                  'string',  'branding',  'Shop Display Name'),
  (1, 'NMM001', 'shop_address',                '123 Main Market Road',     'string',  'branding',  'Shop Address for Receipt'),
  (1, 'NMM001', 'shop_mobile',                 '+91-98765-43210',          'string',  'branding',  'Shop Contact No'),
  (1, 'NMM001', 'shop_email',                  'support@nmmart.in',        'string',  'branding',  'Shop Email'),
  (1, 'NMM001', 'shop_gst_no',                 '27ABCDE1234F1Z5',          'string',  'tax',       'GST Registration No'),
  (1, 'NMM001', 'default_tax_rate',            '5',                        'number',  'tax',       'Default GST %'),
  (1, 'NMM001', 'currency_symbol',             '₹',                        'string',  'general',   'Currency Symbol'),
  (1, 'NMM001', 'enable_guard_verification',   'false',                    'boolean', 'security',  'Enable 2nd PIN for Deletes'),
  (1, 'NMM001', 'primary_color',               '#FFC107',                  'string',  'theme',     'Brand Primary Color'),
  (1, 'NMM001', 'secondary_color',             '#212121',                  'string',  'theme',     'Brand Secondary Color'),
  (1, 'NMM001', 'accent_color',                '#FF5722',                  'string',  'theme',     'Brand Accent Color'),
  (1, 'NMM001', 'default_sales_rate',          'retail_rate',              'string',  'pos',       'Default rate column for POS'),
  (1, 'NMM001', 'low_stock_days',              '5',                        'number',  'inventory', 'Run-out risk days threshold'),
  (1, 'NMM001', 'urgent_expiry_days',          '15',                       'number',  'inventory', 'Urgent expiry alert threshold')
ON CONFLICT (tenant_id, key) DO NOTHING;

-- ============================================================
-- SEED: Unit Master (Common units)
-- ============================================================
INSERT INTO public.unit_master
    (tenant_id, company_code, name, symbol, short_name, sort_order, is_active)
VALUES
  (1, 'NMM001', 'Kilogram',     'kg',     'kg',    1, TRUE),
  (1, 'NMM001', 'Gram',         'g',      'g',     2, TRUE),
  (1, 'NMM001', 'Piece',        'pcs',    'pc',    3, TRUE),
  (1, 'NMM001', 'Litre',        'L',      'L',     4, TRUE),
  (1, 'NMM001', 'Millilitre',   'ml',     'ml',    5, TRUE),
  (1, 'NMM001', 'Dozen',        'dozen',  'dz',    6, TRUE),
  (1, 'NMM001', 'Box',          'box',    'bx',    7, TRUE),
  (1, 'NMM001', 'Pack',         'pack',   'pk',    8, TRUE),
  (1, 'NMM001', 'Metre',        'm',      'm',     9, TRUE),
  (1, 'NMM001', 'Foot',         'ft',     'ft',   10, TRUE),
  (1, 'NMM001', 'Nos',          'nos',    'nos',  11, TRUE),
  (1, 'NMM001', 'Packet',       'pkt',    'pkt',  12, TRUE),
  (1, 'NMM001', 'Bottle',       'btl',    'btl',  13, TRUE),
  (1, 'NMM001', 'Can',          'can',    'can',  14, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Super Admin User (CRITICAL)
-- Email: nmmart07@gmail.com  /  Password: nmmart2026
-- bcrypt hash via pgcrypto: crypt('nmmart2026', gen_salt('bf'))
-- ============================================================
INSERT INTO public.admin_users
    (tenant_id, company_code, username, name, email, phone, password_hash, role, is_active, status)
VALUES
  (1, 'NMM001',
   'superadmin',
   'Super Administrator',
   'nmmart07@gmail.com', '+91-99999-99999', crypt('nmmart2026', gen_salt('bf')),
   'super_admin',
   TRUE,
   'active'
  )
ON CONFLICT (tenant_id, username) DO UPDATE
SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  password_hash = crypt('nmmart2026', gen_salt('bf')),
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================
-- SEED: Cashier User (password: cashier@123)
-- ============================================================
INSERT INTO public.admin_users
    (tenant_id, company_code, username, name, email, phone, password_hash, role, is_active, status)
VALUES
  (1, 'NMM001',
   'cashier',
   'Counter Cashier',
   'cashier@nmmart.in',
   '+91-98888-88888',
   crypt('cashier@123', gen_salt('bf')),
   'cashier',
   TRUE,
   'active'
  )
ON CONFLICT (tenant_id, username) DO NOTHING;

-- ============================================================
-- SEED: Popular Categories (24 rows)
-- ============================================================
INSERT INTO public.categories
    (tenant_id, company_code, name, description, sort_order, is_active)
VALUES
  (1, 'NMM001', 'Grocery & Staples', 'Daily staples: rice, dal, atta, sugar, salt',   1, TRUE),
  (1, 'NMM001', 'Groceries',         'All Items quick tab (common grocery)',          2, TRUE),
  (1, 'NMM001', 'Atta',              'Wheat / multigrain atta, flours',               3, TRUE),
  (1, 'NMM001', 'Rice',              'Basmati, sona masoori, raw rice varieties',    4, TRUE),
  (1, 'NMM001', 'Oil',               'Sunflower, mustard, olive, coconut oils',      5, TRUE),
  (1, 'NMM001', 'Salt',              'Common salt, iodized, rock salt',               6, TRUE),
  (1, 'NMM001', 'Sugar',             'White sugar, khandsari, jaggery',               7, TRUE),
  (1, 'NMM001', 'Tea',               'Tea leaves, green tea, chai premix',            8, TRUE),
  (1, 'NMM001', 'Dairy & Eggs',      'Milk, curd, paneer, ghee, butter, eggs',       9, TRUE),
  (1, 'NMM001', 'Milk',              'Milk (cow, buffalo, toned, full-cream)',      10, TRUE),
  (1, 'NMM001', 'Bakery & Snacks',   'Bread, biscuits, chips, namkeen, cakes',      11, TRUE),
  (1, 'NMM001', 'Biscuits',          'Glucose, Marie, cream, sandwich biscuits',    12, TRUE),
  (1, 'NMM001', 'Instant Food',      'Noodles, pasta, ready-to-eat, soup mixes',    13, TRUE),
  (1, 'NMM001', 'Beverages',         'Soft drinks, juices, tea, coffee, water',     14, TRUE),
  (1, 'NMM001', 'Personal Care',     'Soap, shampoo, cosmetics, oral care',         15, TRUE),
  (1, 'NMM001', 'Toothpaste',        'Toothpastes, mouthwash, dental hygiene',      16, TRUE),
  (1, 'NMM001', 'Home Care',         'Detergent, cleaning liquids, dishwash',       17, TRUE),
  (1, 'NMM001', 'Household',         'Utensils, paper, disposables, storage',       18, TRUE),
  (1, 'NMM001', 'Frozen Food',       'Frozen veggies, french fries, ice-cream',     19, TRUE),
  (1, 'NMM001', 'Fresh Vegetables',  'Locally sourced daily vegetables',             20, TRUE),
  (1, 'NMM001', 'Fresh Fruits',      'Seasonal fresh fruits',                        21, TRUE),
  (1, 'NMM001', 'Pharma & Wellness', 'OTC medicines, vitamins, health drinks',      22, TRUE),
  (1, 'NMM001', 'Electronics',       'Mobiles, accessories, chargers, headphones',  23, TRUE),
  (1, 'NMM001', 'Clothing',          'Apparel, fashion, garments',                   24, TRUE)
ON CONFLICT (tenant_id, name) DO NOTHING;

COMMIT;
