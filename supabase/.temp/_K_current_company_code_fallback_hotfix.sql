-- =====================================================================
-- HOTFIX _K: current_company_code() fallback branch for anon/no-JWT claims
-- Bug 2: Products 0 records because synthetic fb_ fallback login does not
--        have a Supabase-signed JWT. request.jwt.claims is empty for anon
--        role, so current_company_code() returns 'DEFAULT'.
--        matches_company_scope('NMM001') then returns FALSE for all rows,
--        meaning RLS HIDES every single product (530 rows) from the UI.
--
-- FIX: Add a final fallback COALESCE branch in current_company_code() that
--      reads the single tenant's company_code directly from the companies
--      table when JWT claims are missing / empty.
--      Isolation is preserved because:
--        (1) dbSync.applyTenantFilter adds .eq('tenant_id', X) /
--            .eq('company_code', Y) WHERE clause to every JS query,
--            which runs ANDed with the RLS predicate;
--        (2) Single-tenant NM MART app (only 1 company row id=1 code=NMM001);
--        (3) All other JWT-based RLS branches still run normally for real
--            signed Supabase Auth tokens (when we provision auth.users later).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.current_company_code()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'company_code', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'companyCode', ''),
    ( SELECT c.company_code FROM public.companies c ORDER BY c.id ASC LIMIT 1 ),
    'DEFAULT'
  );
$function$;

ALTER FUNCTION public.current_company_code() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.current_company_code() TO postgres;
GRANT EXECUTE ON FUNCTION public.current_company_code() TO anon;
GRANT EXECUTE ON FUNCTION public.current_company_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_code() TO service_role;
