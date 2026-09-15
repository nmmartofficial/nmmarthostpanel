BEGIN;

INSERT INTO public.subcategories
    (tenant_id, company_code, category_id, name, description, sort_order, is_active)
SELECT 1, 'NMM001', c.id, sub.name, sub.descr, sub.so, TRUE
FROM public.categories c
CROSS JOIN (VALUES
  ('Rice & Rice Products', 'Basmati, sona masoori etc.', 1),
  ('Dal & Pulses',        'Toor, chana, moong, masoor',  2),
  ('Atta & Flours',       'Wheat, maida, besan, ragi',   3),
  ('Sugar & Jaggery',     'Sugar, khandsari, gur',       4),
  ('Salt & Spices',       'Salt, haldi, mirchi, garam masala', 5)
) AS sub(name, descr, so)
WHERE c.name = 'Grocery & Staples'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.name = sub.name);

INSERT INTO public.brands
    (tenant_id, company_code, name, code, description, logo_url, is_active)
VALUES
  (1, 'NMM001', 'Local / Desi',        'LOCAL',    'Sourced from local vendors', NULL, TRUE),
  (1, 'NMM001', 'Tata',                'TATA',     'Tata Consumer Products',     NULL, TRUE),
  (1, 'NMM001', 'Haldiram''s',         'HALDIRAM', 'Haldiram Foods International', NULL, TRUE),
  (1, 'NMM001', 'Amul',                'AMUL',     'Amul Dairy Cooperative',     NULL, TRUE),
  (1, 'NMM001', 'Parle',               'PARLE',    'Parle Products Pvt Ltd',     NULL, TRUE),
  (1, 'NMM001', 'Britannia',           'BRIT',     'Britannia Industries',       NULL, TRUE),
  (1, 'NMM001', 'Patanjali',           'PAT',      'Patanjali Ayurved',          NULL, TRUE),
  (1, 'NMM001', 'Nestle',              'NESTLE',   'Nestle India',               NULL, TRUE),
  (1, 'NMM001', 'Dabur',               'DABUR',    'Dabur India',                NULL, TRUE),
  (1, 'NMM001', 'Coca-Cola',           'COKE',     'Coca-Cola India Beverages',  NULL, TRUE),
  (1, 'NMM001', 'Aashirvaad',          'AASH',     'ITC Aashirvaad Atta & Foods',NULL, TRUE),
  (1, 'NMM001', 'India Gate',          'IGATE',    'India Gate Rice/Basmati',    NULL, TRUE),
  (1, 'NMM001', 'Fortune',             'FORT',     'Fortune Edible Oils',         NULL, TRUE),
  (1, 'NMM001', 'Lux',                 'LUX',      'Lux Soap (Unilever)',         NULL, TRUE),
  (1, 'NMM001', 'Colgate',             'COLG',     'Colgate Palmolive Oral Care',NULL, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories
    (tenant_id, company_code, name, description, is_active)
VALUES
  (1, 'NMM001', 'Shop Rent',               'Monthly shop / godown rent',           TRUE),
  (1, 'NMM001', 'Salaries & Wages',        'Staff salaries, overtime, bonus',      TRUE),
  (1, 'NMM001', 'Electricity',             'Electricity bill, gensel fuel',        TRUE),
  (1, 'NMM001', 'Water & Utilities',       'Water, telephone, internet bills',     TRUE),
  (1, 'NMM001', 'Packaging Material',      'Bags, labels, tape, box, thermocol',   TRUE),
  (1, 'NMM001', 'Transport & Logistics',   'Petrol, tempu, courier charges',       TRUE),
  (1, 'NMM001', 'Marketing & Advertising', 'Boards, banners, pamphlets, social',  TRUE),
  (1, 'NMM001', 'Repairs & Maintenance',   'AC, fridge, printer, computer fix',   TRUE),
  (1, 'NMM001', 'Printing & Stationery',   'Bill roll, printer paper, pens, etc.', TRUE),
  (1, 'NMM001', 'GST & Taxes',             'GST payment, income tax, licence',    TRUE),
  (1, 'NMM001', 'Loss / Damage / Shrinkage','Expired stock, theft, breakage',      TRUE),
  (1, 'NMM001', 'Miscellaneous',           'Other small expenses not categorized', TRUE)
ON CONFLICT DO NOTHING;

COMMIT;
