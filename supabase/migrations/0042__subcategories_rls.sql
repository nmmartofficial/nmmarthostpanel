-- NM MART: Subcategories table + tenant-aware RLS
-- Safe to run more than once in Supabase SQL Editor.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_company_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'company_code', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'companyCode', ''),
    'DEFAULT'
  );
$$;

CREATE OR REPLACE FUNCTION public.matches_company_scope(p_company_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR COALESCE(p_company_code, 'DEFAULT') = 'DEFAULT'
    OR public.current_company_code() = COALESCE(p_company_code, 'DEFAULT')
  );
$$;

CREATE TABLE IF NOT EXISTS public.subcategories (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code VARCHAR(16) NOT NULL,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order SMALLINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcategories_tenant
  ON public.subcategories (tenant_id, company_code);
CREATE INDEX IF NOT EXISTS idx_subcategories_category
  ON public.subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active
  ON public.subcategories (tenant_id, is_active);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subcategories_tenant_policy ON public.subcategories;

CREATE POLICY subcategories_tenant_policy
  ON public.subcategories
  FOR ALL
  TO anon, authenticated
  USING (
    public.matches_company_scope(COALESCE(company_code, 'DEFAULT'))
  )
  WITH CHECK (
    public.matches_company_scope(COALESCE(company_code, 'DEFAULT'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO anon, authenticated;
GRANT ALL ON public.subcategories TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.subcategories_id_seq TO anon, authenticated, service_role;

COMMIT;
