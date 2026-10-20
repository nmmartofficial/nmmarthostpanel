CREATE INDEX IF NOT EXISTS products_tenant_updated_at_id_idx
  ON public.products (tenant_id, updated_at, id);

CREATE INDEX IF NOT EXISTS products_company_updated_at_id_idx
  ON public.products (company_code, updated_at, id);
