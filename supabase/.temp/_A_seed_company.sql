BEGIN;

-- ============================================================
-- SEED: Default Company (Must exist FIRST for all tenant_id FKs)
-- ============================================================
INSERT INTO public.companies
    (id, name, company_slug, company_code, address, phone, email, gstin, pan_no,
     currency_code, timezone, is_active, status, subscription_plan)
VALUES (
    1,
    'NM MART Ultra Retail',
    'nm-mart',
    'NMM001',
    '123 Main Market Road, Near Bus Stand',
    '+91-98765-43210',
    'support@nmmart.in',
    '27ABCDE1234F1Z5',
    'ABCDE1234F',
    'INR',
    'Asia/Kolkata',
    TRUE,
    'active',
    'enterprise'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
