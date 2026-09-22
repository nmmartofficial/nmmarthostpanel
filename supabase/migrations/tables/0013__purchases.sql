-- Purchases Table Definition
CREATE TABLE IF NOT EXISTS public.purchases (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT,
    invoice_number VARCHAR(50),
    total_amount DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
