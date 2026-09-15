BEGIN;

INSERT INTO public.pincode_master
    (tenant_id, company_code, pincode, city,         state,           is_serviceable, delivery_charge, min_order_amount, estimated_days, is_active)
VALUES
  (1, 'NMM001', '380001', 'Ahmedabad',  'Gujarat',          TRUE,  0, 200, 1, TRUE),
  (1, 'NMM001', '380002', 'Ahmedabad',  'Gujarat',          TRUE, 20, 199, 1, TRUE),
  (1, 'NMM001', '380006', 'Ahmedabad',  'Gujarat',          TRUE, 25, 300, 1, TRUE),
  (1, 'NMM001', '380015', 'Ahmedabad',  'Gujarat',          TRUE, 30, 499, 2, TRUE),
  (1, 'NMM001', '395001', 'Surat',      'Gujarat',          TRUE, 40, 299, 2, TRUE),
  (1, 'NMM001', '395002', 'Surat',      'Gujarat',          TRUE, 40, 299, 2, TRUE),
  (1, 'NMM001', '400001', 'Mumbai',     'Maharashtra',      TRUE, 60, 499, 3, TRUE),
  (1, 'NMM001', '400008', 'Mumbai',     'Maharashtra',      TRUE, 60, 499, 3, TRUE),
  (1, 'NMM001', '110001', 'New Delhi',  'Delhi',            TRUE, 80, 999, 4, TRUE),
  (1, 'NMM001', '560001', 'Bengaluru',  'Karnataka',        TRUE, 80, 999, 4, TRUE)
ON CONFLICT (tenant_id, pincode) DO NOTHING;

INSERT INTO public.home_config
    (tenant_id, company_code, key, section_name, section_type, position, is_active, value, description)
VALUES
  (1, 'NMM001', 'hero_banner_section',    'Hero Banner Slider', 'banners',     1, TRUE, '{"auto_play": true, "interval": 3000}', 'Top rotating banners'),
  (1, 'NMM001', 'category_grid_section', 'Shop By Category',   'categories',  2, TRUE, '{"columns": 4, "show_icons": true}',       'Category circle grid'),
  (1, 'NMM001', 'offer_banner_section',  'Today Offers',       'offers',      3, TRUE, '{"limit": 3}',                            'Offer banners'),
  (1, 'NMM001', 'product_grid_section',  'Best Selling',       'products',    4, TRUE, '{"filter": "best_seller", "limit": 10}',  'Product grid'),
  (1, 'NMM001', 'footer_quick_links',    'Quick Links',        'links',       9, TRUE, '{"about": true, "contact": true, "t_c": true}', 'Footer links')
ON CONFLICT (tenant_id, key) DO NOTHING;

COMMIT;
