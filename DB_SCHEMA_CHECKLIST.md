# NM MART ULTRA ERP + NM App (Supabase) – DB Schema Checklist

## 0) Naming Decision (बहुत जरूरी)

यह repo code के हिसाब से नीचे वाले table names expected हैं:
- `purchase_log` और `purchase_logs` दोनों code में used हैं, लेकिन अलग-अलग modules के लिए
  - `purchase_log` = vendor dues वाला purchase entry (ERP master-style)
  - `purchase_logs` = inventory purchase-entry module का log (ERP entry-screen log)

अगर आप एक ही table रखना चाहते हो, तो code को mapping के साथ बदलना पड़ेगा; अभी नीचे schema “as-is code” compatibility के लिए लिखा है।

## 1) Extensions

```sql
create extension if not exists "pgcrypto";
```

## 2) Core Masters (ERP Admin Panel)

### 2.1 unit_master
```sql
create table if not exists public.unit_master (
  id text primary key,
  name text not null
);
```

### 2.2 group_master
```sql
create table if not exists public.group_master (
  id text primary key,
  name text not null
);
```

### 2.3 main_category_master
```sql
create table if not exists public.main_category_master (
  id text primary key,
  name text not null
);
```

### 2.4 sub_category_master
```sql
create table if not exists public.sub_category_master (
  id text primary key,
  name text not null
);
```

### 2.5 brand_master
```sql
create table if not exists public.brand_master (
  id text primary key,
  name text not null
);
```

### 2.6 department_master
```sql
create table if not exists public.department_master (
  id text primary key,
  name text not null
);
```

### 2.7 account_master
```sql
create table if not exists public.account_master (
  id text primary key,
  name text not null,
  phone text,
  type text,
  address text,
  balance numeric not null default 0
);
create index if not exists idx_account_master_name on public.account_master (name);
```

### 2.8 user_master
```sql
create table if not exists public.user_master (
  id text primary key,
  username text not null,
  role text,
  profile text
);
create index if not exists idx_user_master_username on public.user_master (username);
```

### 2.9 credit_master
```sql
create table if not exists public.credit_master (
  id text primary key,
  customer text not null,
  threshold numeric not null default 0,
  due_date text
);
```

### 2.10 vendor_master
```sql
create table if not exists public.vendor_master (
  id text primary key,
  vendor_name text not null,
  contact_person text,
  mobile text,
  address text,
  pending_dues numeric not null default 0
);
create index if not exists idx_vendor_master_vendor_name on public.vendor_master (vendor_name);
```

### 2.11 delivery_boy_master
```sql
create table if not exists public.delivery_boy_master (
  id text primary key,
  name text not null,
  phone text,
  status text not null default 'Available'
);
```

### 2.12 delivery_customer_master
```sql
create table if not exists public.delivery_customer_master (
  id text primary key,
  name text not null,
  address text,
  coordinates text
);
```

### 2.13 pincode_master
```sql
create table if not exists public.pincode_master (
  id text primary key,
  pincode text not null,
  is_allowed boolean not null default true,
  delivery_charge numeric not null default 0
);
create index if not exists idx_pincode_master_pincode on public.pincode_master (pincode);
```

## 3) Staff + Auth (ERP Login / RBAC)

```sql
create table if not exists public.staff_master (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  password text,
  staff_name text,
  role text not null check (role in ('super_admin', 'billing_staff', 'inventory_manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

## 4) Catalog + NM App Mirror

### 4.1 item_master
```sql
create table if not exists public.item_master (
  id text primary key,
  name text not null,
  barcode text,
  hsn_code text,
  selling_price numeric not null default 0,
  mrp numeric not null default 0,
  purchase_rate numeric not null default 0,
  gst numeric not null default 0,
  cess numeric not null default 0,
  discount numeric not null default 0,
  opening_stock numeric not null default 0,
  stock_qty numeric not null default 0,
  unit text,
  item_group text,
  main_category text,
  sub_category text,
  brand text,
  is_favourite boolean not null default false,
  is_discountable boolean not null default false,
  description text,
  min_stock_level numeric not null default 10,
  created_at timestamptz not null default now()
);
create index if not exists idx_item_master_barcode on public.item_master (barcode);
create index if not exists idx_item_master_name on public.item_master (name);
```

### 4.2 products (NM App format, mixed-case columns required by code)
```sql
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text,
  "ItemGroupName" text,
  "MRP" numeric not null default 0,
  "Rate" numeric not null default 0,
  "discountPerc" numeric not null default 0,
  "ImageUrl" text,
  "RawCodeNew" text,
  "RawName" text,
  unit text,
  stock integer not null default 0,
  is_featured boolean not null default false,
  badge text,
  min_stock_level numeric not null default 10,
  created_at timestamptz not null default now()
);
create index if not exists idx_products_rawcodenew on public.products ("RawCodeNew");
create index if not exists idx_products_name on public.products (name);
```

## 5) Banner / Mobile Display

```sql
create table if not exists public.banner_master (
  id text primary key,
  title text,
  image_url text,
  redirect_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_banner_master_is_active on public.banner_master (is_active);
```

## 6) ERP Logs

### 6.1 sale_logs
```sql
create table if not exists public.sale_logs (
  id text primary key,
  bill_no text not null,
  customer jsonb not null,
  items jsonb not null,
  totals jsonb not null,
  payment_mode text,
  bill_type text,
  rider text,
  date timestamptz not null
);
create index if not exists idx_sale_logs_bill_no on public.sale_logs (bill_no);
create index if not exists idx_sale_logs_date on public.sale_logs (date desc);
```

### 6.2 transaction_logs
```sql
create table if not exists public.transaction_logs (
  id text primary key,
  type text not null,
  type_value integer not null,
  account text not null,
  date date not null,
  v_no text not null,
  entries jsonb not null,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_transaction_logs_v_no on public.transaction_logs (v_no);
create index if not exists idx_transaction_logs_date on public.transaction_logs (date desc);
```

### 6.3 purchase_log (vendor dues वाला)
```sql
create table if not exists public.purchase_log (
  id text primary key,
  vendor_id text not null,
  bill_number text,
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  payment_mode text not null default 'Cash',
  purchase_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchase_log_vendor_id on public.purchase_log (vendor_id);
create index if not exists idx_purchase_log_purchase_date on public.purchase_log (purchase_date desc);
```

### 6.4 purchase_logs (inventory purchase entry screen log, camelCase columns required by code)
```sql
create table if not exists public.purchase_logs (
  id text primary key,
  "billNo" text,
  date date not null,
  party text not null,
  department text,
  "taxType" text,
  items jsonb not null,
  "totalQty" numeric not null default 0,
  "totalTax" numeric not null default 0,
  "netAmount" numeric not null default 0,
  "roundOff" numeric not null default 0,
  "createdAt" timestamptz not null
);
create index if not exists idx_purchase_logs_date on public.purchase_logs (date desc);
create index if not exists idx_purchase_logs_party on public.purchase_logs (party);
```

## 7) NM App / Delivery Orders

```sql
create table if not exists public.online_orders (
  id text primary key,
  status text,
  rider text,
  created_at timestamptz not null default now()
);
create index if not exists idx_online_orders_status on public.online_orders (status);
create index if not exists idx_online_orders_created_at on public.online_orders (created_at desc);
```

## 8) Error Monitoring

```sql
create table if not exists public.error_log (
  id bigint primary key,
  error_message text not null,
  error_context text not null,
  timestamp timestamptz not null default now(),
  user_id text,
  user_role text
);
create index if not exists idx_error_log_timestamp on public.error_log (timestamp desc);
```

## 9) RLS Enable (All Tables)

```sql
alter table public.unit_master enable row level security;
alter table public.group_master enable row level security;
alter table public.main_category_master enable row level security;
alter table public.sub_category_master enable row level security;
alter table public.brand_master enable row level security;
alter table public.department_master enable row level security;
alter table public.account_master enable row level security;
alter table public.user_master enable row level security;
alter table public.credit_master enable row level security;
alter table public.vendor_master enable row level security;
alter table public.delivery_boy_master enable row level security;
alter table public.delivery_customer_master enable row level security;
alter table public.pincode_master enable row level security;
alter table public.wallet_balances enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.staff_master enable row level security;
alter table public.item_master enable row level security;
alter table public.products enable row level security;
alter table public.banner_master enable row level security;
alter table public.sale_logs enable row level security;
alter table public.transaction_logs enable row level security;
alter table public.purchase_log enable row level security;
alter table public.purchase_logs enable row level security;
alter table public.online_orders enable row level security;
alter table public.error_log enable row level security;
```

## 10) RBAC Helper (Super Admin Check)

```sql
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.staff_master
    where id = auth.uid()
      and role = 'super_admin'
      and is_active = true
  );
$$;
```

## 11) RLS Policies (Base Template)

### 11.1 Authenticated read (ERP Admin panel)
नीचे वाले policies हर table पर apply कर सकते हो (ERP UI के लिए):

```sql
create policy "read_authenticated"
on public.item_master
for select
to authenticated
using (true);

create policy "write_super_admin"
on public.item_master
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());
```

इसी pattern से ये tables cover करो:
- `unit_master`, `group_master`, `main_category_master`, `sub_category_master`, `brand_master`
- `department_master`, `account_master`, `user_master`, `credit_master`
- `vendor_master`, `delivery_boy_master`, `delivery_customer_master`
- `wallet_balances`, `wallet_transactions`
- `sale_logs`, `transaction_logs`, `purchase_log`, `purchase_logs`
- `online_orders`, `error_log`, `banner_master`, `staff_master`

### 11.2 Public read (NM App)
NM App को public read चाहिए तो सिर्फ selected tables पर anon read allow करें:

```sql
create policy "public_read_products"
on public.products
for select
to anon
using (true);

create policy "public_read_banners"
on public.banner_master
for select
to anon
using (is_active = true);
```

अगर NM App `pincode_master` भी read करता है:

```sql
create policy "public_read_pincodes"
on public.pincode_master
for select
to anon
using (true);
```

## 12) Final Checklist (Run Order)

1. Extensions run करें  
2. Tables + indexes create करें  
3. RLS enable करें  
4. `is_super_admin()` create करें  
5. Policies create करें (ERP read + super_admin write)  
6. NM App वाले tables पर `anon` read policies enable करें (जरूरत के हिसाब से)  
7. Supabase Storage bucket `nm-media` (products/banners) setup + RLS/permissions configure करें  

