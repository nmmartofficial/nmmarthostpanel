BEGIN;

DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'companies','unit_master','categories','subcategories','brands','department_master',
  'products','stock_alerts','inventory_logs','hsn_master',
  'account_master','purchases','purchase_items',
  'admin_users','users','delivery_customer_master','delivery_boy_master',
  'orders','order_items','pincode_master','addresses',
  'wallet_master','wallet_transactions','credit_master',
  'expense_categories','expenses','payment_transactions',
  'loyalty_tiers','customer_loyalty','loyalty_transactions',
  'coupons','offers_master','banners',
  'app_config','home_config','cart','wishlist',
  'system_logs','notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role;', t);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I_id_seq TO anon, authenticated, service_role;', t);
  END LOOP;
END $$;

COMMIT;
