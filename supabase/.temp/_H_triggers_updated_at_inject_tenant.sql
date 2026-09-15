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
  'notifications','support_tickets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();', t, t);
  END LOOP;
END $$;

SELECT public.install_inject_tenant_triggers_on_all();

COMMIT;
