BEGIN;

INSERT INTO public.loyalty_tiers
    (tenant_id, company_code, name, min_points, max_points, cashback_percent, benefits, color_code, is_active)
VALUES
  (1, 'NMM001', 'Bronze',     0,     2499,   0.5,  '{"welcome":"Points on signup","discount":"0.5% cashback"}',    '#CD7F32', TRUE),
  (1, 'NMM001', 'Silver',   2500,    9999,   1.0,  '{"shipping":"Free delivery above ₹500","discount":"1% cashback"}', '#C0C0C0', TRUE),
  (1, 'NMM001', 'Gold',    10000,   49999,   2.0,  '{"priority":"Priority support","exclusive":"Early sales access","discount":"2% cashback"}', '#FFD700', TRUE),
  (1, 'NMM001', 'Platinum',50000, 9999999,   3.0,  '{"manager":"Dedicated account manager","returns":"Lifetime returns","free_delivery":"All orders free","discount":"3% cashback"}', '#00CED1', TRUE)
ON CONFLICT DO NOTHING;

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

INSERT INTO public.hsn_master
    (hsn_code, description, gst_percent, cess_percent, is_active)
VALUES
  ('1006',  'Rice (Other than Basmati)',           0,  0, TRUE),
  ('1001',  'Wheat and meslin',                     0,  0, TRUE),
  ('1101',  'Wheat flour (Atta / Maida)',           5,  0, TRUE),
  ('0713',  'Dried leguminous vegetables (Dal)',    5,  0, TRUE),
  ('1701',  'Sugar',                                 5,  0, TRUE),
  ('2101',  'Salt (common / edible)',                0,  0, TRUE),
  ('0904',  'Turmeric (Haldi), Pepper, Spices',     5,  0, TRUE),
  ('0401',  'Milk (raw / pasteurized)',              0,  0, TRUE),
  ('0406',  'Paneer / Cheese',                       5,  0, TRUE),
  ('0405',  'Butter & Ghee',                        12,  0, TRUE),
  ('0210',  'Eggs',                                  0,  0, TRUE),
  ('0805',  'Citrus fruits - Orange, Mosambi',       5,  0, TRUE),
  ('0709',  'Fresh vegetables',                      0,  0, TRUE),
  ('0808',  'Apples, Pears, Banana',                 5,  0, TRUE),
  ('1905',  'Bread, Biscuits, Cakes',               18,  0, TRUE),
  ('2201',  'Mineral / Aerated Water',              18,  0, TRUE),
  ('2202',  'Soft Drinks (Carbonated)',             28, 12, TRUE),
  ('2106',  'Biscuits, Namkeen, Chips',             18,  0, TRUE),
  ('3304',  'Beauty / Cosmetic Products',           18,  0, TRUE),
  ('3401',  'Soap (Toilet / Laundry)',              18,  0, TRUE),
  ('3004',  'Medicaments (OTC / Patented)',         12,  0, TRUE)
ON CONFLICT (hsn_code) DO NOTHING;

COMMIT;
