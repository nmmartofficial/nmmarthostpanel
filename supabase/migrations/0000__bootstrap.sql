-- =====================================================================
-- NM MART ULTRA RETAIL ERP
-- Migration 0000 — BOOTSTRAP (Extensions + Utility Trigger Functions)
-- ---------------------------------------------------------------------
-- RUN THIS FILE FIRST BEFORE ANY TABLE MIGRATION.
-- Architectural Rules: (LOCKED)
--   1. PK = BIGSERIAL (64-bit auto), FK = BIGINT
--   2. Every tenant table has `tenant_id BIGINT` + `company_code VARCHAR(16)`
--   3. Dual columns (modern snake_case + legacy aliases) where applicable
--   4. Development grants: DISABLE RLS + GRANT ALL ON table/seq TO anon/authenticated/service_role
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 1 : Required PostgreSQL Extensions
-- (uuid-ossp removed intentionally — no UUIDs in project except auth.users mapping)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for pgcrypto/crypt() (password hashing)
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive text where needed (email, username, coupon code)

-- =====================================================================
-- STEP 2 : Utility Trigger Function A-1 — set_current_timestamp_updated_at
--          Used by EVERY table that has an `updated_at` column
--          BEFORE UPDATE → NEW.updated_at = NOW()
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================================
-- STEP 3 : Utility Trigger Function A-2 — inject_tenant_context_on_insert
--          BEFORE INSERT on ANY tenant-aware table
--          Auto-fills (DB-level safety net, in case frontend forgets):
--              • tenant_id    ← current_setting('app.current_tenant_id', true)::BIGINT
--              • company_code ← current_setting('app.current_company_code', true)::VARCHAR(16)
--              • created_by   ← current_setting('app.current_admin_id', true)::BIGINT
--          CRITICAL for Excel imports (which often omit tenant context)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.inject_tenant_context_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id    BIGINT;
    v_company_code TEXT;
    v_admin_id     BIGINT;
BEGIN
    -- Only run when the target table actually has these columns
    -- (safe to attach trigger globally — no missing-col errors)

    -- 1. tenant_id
    IF to_regclass(TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME) IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = TG_TABLE_SCHEMA
              AND table_name   = TG_TABLE_NAME
              AND column_name  = 'tenant_id'
       ) THEN
        IF NEW.tenant_id IS NULL THEN
            BEGIN
                v_tenant_id := current_setting('app.current_tenant_id', true)::BIGINT;
            EXCEPTION WHEN OTHERS THEN v_tenant_id := NULL; END;
            IF v_tenant_id IS NOT NULL THEN
                NEW.tenant_id := v_tenant_id;
            END IF;
        END IF;
    END IF;

    -- 2. company_code (VARCHAR 16)
    IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = TG_TABLE_SCHEMA
              AND table_name   = TG_TABLE_NAME
              AND column_name  = 'company_code'
       ) THEN
        IF NEW.company_code IS NULL THEN
            BEGIN
                v_company_code := current_setting('app.current_company_code', true);
            EXCEPTION WHEN OTHERS THEN v_company_code := NULL; END;
            IF v_company_code IS NOT NULL THEN
                NEW.company_code := SUBSTRING(v_company_code FROM 1 FOR 16);
            END IF;
        END IF;
    END IF;

    -- 3. created_by (BIGINT)
    IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = TG_TABLE_SCHEMA
              AND table_name   = TG_TABLE_NAME
              AND column_name  = 'created_by'
       ) THEN
        IF NEW.created_by IS NULL THEN
            BEGIN
                v_admin_id := current_setting('app.current_admin_id', true)::BIGINT;
            EXCEPTION WHEN OTHERS THEN v_admin_id := NULL; END;
            IF v_admin_id IS NOT NULL THEN
                NEW.created_by := v_admin_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================================
-- STEP 4 : Bootstrap Utility A-3 — install_inject_tenant_triggers_on_all()
--          One-call helper to attach A-2 to ALL tenant tables in one go
-- =====================================================================
CREATE OR REPLACE FUNCTION public.install_inject_tenant_triggers_on_all()
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'tenant_id'
          AND table_name NOT IN ('companies')   -- companies is GLOBAL (not tenant-scoped)
        GROUP BY table_schema, table_name
        ORDER BY table_name
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I_inject_tenant_before_insert ON public.%I;',
            r.table_name, r.table_name
        );
        EXECUTE format(
            'CREATE TRIGGER %I_inject_tenant_before_insert
             BEFORE INSERT ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.inject_tenant_context_on_insert();',
            r.table_name, r.table_name
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMIT;
