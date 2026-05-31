# NM MART ULTRA ERP - Security Setup Guide

## 1. Supabase Authentication Setup

### Create Users in Supabase Auth
1. Go to your Supabase Dashboard → Authentication → Users
2. Create users with email/password
3. **IMPORTANT**: Ensure each user's UUID matches an entry in `staff_master.id`

### staff_master Table Structure
Ensure your `staff_master` table has these columns:
```sql
CREATE TABLE IF NOT EXISTS staff_master (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  staff_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'billing_staff', 'inventory_manager')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Row Level Security (RLS) Setup

### Enable RLS for ALL Tables
Run this for every table to enable RLS:
```sql
ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_cat_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_cat_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dept_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pincode_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
```

### Example RLS Policy (Super Admin Only)
```sql
-- Allow authenticated users to read all data
CREATE POLICY "Enable read access for authenticated users"
ON item_master
FOR SELECT
TO authenticated
USING (true);

-- Allow super admins to modify data
CREATE POLICY "Enable full access for super admins"
ON item_master
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_master
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);
```
Repeat this for ALL your tables!

---

## 3. Password Hashing (If Not Using Supabase Auth)
- **ALWAYS**: Use bcrypt or Argon2 to hash passwords
- **NEVER**: Store plaintext passwords in any database!

### Example Node.js Hashing (for server-side user creation)
```javascript
import bcrypt from 'bcryptjs';

const saltRounds = 12;

// Hash password
const hashedPassword = await bcrypt.hash('userPassword123', saltRounds);

// Verify password
const isValid = await bcrypt.compare('userPassword123', hashedPassword);
```

---

## 4. Environment Variables Recap
- All secrets are in `.env`
- `.env` is NOT committed to Git (added to `.gitignore`)
- Use `import.meta.env.VITE_*` in your code

---

## 5. Production Checklist
✅ Supabase Auth enabled
✅ All secrets in `.env`
✅ RLS enabled on ALL tables
✅ Error logging to `error_log` table
✅ No plaintext passwords stored
✅ HTTPS enforced in Supabase
