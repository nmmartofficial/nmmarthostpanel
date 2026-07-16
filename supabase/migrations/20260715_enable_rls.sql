-- =====================================================
-- NM MART - Row Level Security (RLS) Enablement
-- Migration: 20260715_enable_rls.sql
-- Description: Enable RLS on all tenant-owned tables
-- =====================================================

-- Enable RLS on all tenant-owned tables
-- This ensures that no table is publicly accessible

-- 1. Inventory & Catalog Tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_boy_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_customer_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Sales & Orders Tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 3. Wallet & Finance Tables
ALTER TABLE wallet_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- 4. Logistics & Users Tables
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pincode_master ENABLE ROW LEVEL SECURITY;

-- 5. Marketing & Config Tables
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 6. Customer Loyalty Tables
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;

-- 7. Customer Activity Tables
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- 8. System & Audit Tables
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Note: 'companies' table does NOT need RLS as it's the master tenant table
-- Note: Readable views will inherit RLS from base tables

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify RLS is enabled on all tables:
-- 
-- SELECT tablename 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND relrowsecurity = true
-- ORDER BY tablename;
