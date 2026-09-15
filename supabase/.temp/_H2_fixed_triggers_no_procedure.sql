BEGIN;

-- Part 1: updated_at BEFORE UPDATE triggers on 39 base tables (same list as v3.1 L1330-1342)
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
  'notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I;', t, t);
      EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I
                      FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();', t, t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped updated_at trigger on %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Part 2: inject_tenant_context BEFORE INSERT triggers on 38 tenant tables
--   (same list used for RLS DO block in v3.1 L1358-1368; excludes companies, system_logs, hsn_master)
--   Using per-table BEGIN/EXCEPTION so one missing column doesn't fail entire block.
DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY[
  'unit_master','categories','subcategories','brands','department_master',
  'products','stock_alerts','inventory_logs',
  'account_master','purchases','purchase_items',
  'admin_users','users','delivery_customer_master','delivery_boy_master',
  'orders','order_items','pincode_master','addresses',
  'wallet_master','wallet_transactions','credit_master',
  'expense_categories','expenses','payment_transactions',
  'loyalty_tiers','customer_loyalty','loyalty_transactions',
  'coupons','offers_master','banners',
  'app_config','home_config','cart','wishlist',
  'notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I_inject_tenant_before_insert ON public.%I;', t, t);
      EXECUTE format('CREATE TRIGGER %I_inject_tenant_before_insert
                      BEFORE INSERT ON public.%I
                      FOR EACH ROW EXECUTE FUNCTION public.inject_tenant_context_on_insert();', t, t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped inject_tenant trigger on %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

COMMIT;
