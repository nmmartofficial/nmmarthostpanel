-- Banner RLS hardening draft.
-- This migration is intentionally not applied automatically because the current admin
-- flow uses existing JWT tenant claims and must be verified before changing live RLS.
-- Existing banner rows and all tenant-scoped policies are preserved.

DROP POLICY IF EXISTS "Enable all access for banners" ON public.banners;

CREATE INDEX IF NOT EXISTS banners_active_placement_order_idx
  ON public.banners (tenant_id, company_code, banner_type, sort_order, start_date, end_date)
  WHERE is_active = true AND is_deleted = false;
