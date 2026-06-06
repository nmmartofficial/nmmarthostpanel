
# 🚀 NM MART ULTRA RETAIL ERP – FINAL PRODUCTION DOCUMENTATION
## Version 1.0.2
## Created: 2026-06-05

---

## 📋 1. FRONTEND MODULE MAPPING

### MASTER DROPDOWN (18 MODULES)

| # | Module Name | Table Name | CRUD | Image Upload | Required Fields | Foreign Keys |
|---|-------------|------------|------|--------------|-----------------|--------------|
| 1 | Item Master | products | ✅ | ✅ | name | category_id, brand_id, unit_id, department_id, sub_category_id |
| 2 | Item Unit Master | unit_master | ✅ | ❌ | name | - |
| 3 | Item Group Master | categories | ✅ | ✅ | name | - |
| 4 | Item Main Category | categories | ✅ | ✅ | name | - |
| 5 | Item Sub Category | subcategories | ✅ | ✅ | name, category_id | category_id |
| 6 | Brand Master | brands | ✅ | ✅ | name | - |
| 7 | Department Master | department_master | ✅ | ❌ | name | - |
| 8 | Account Master | account_master | ✅ | ❌ | name, mobile | - |
| 9 | User Master | admin_users | ✅ | ❌ | username, password | - |
| 10 | Banner Master | banners | ✅ | ✅ | title, image_url | - |
| 11 | Credit Master | credit_master | ✅ | ❌ | amount, type | account_id |
| 12 | Delivery Boy Master | delivery_boy_master | ✅ | ❌ | full_name, username, password | - |
| 13 | Delivery Customer Master | delivery_customer_master | ✅ | ❌ | name, mobile | - |
| 14 | Coupon Master | coupons | ✅ | ❌ | code, discount_type, discount_value | - |
| 15 | Offers Master | offers_master | ✅ | ✅ | title | - |
| 16 | Pincode Master | pincode_master | ✅ | ❌ | pincode | - |
| 17 | Address Master | addresses | ✅ | ❌ | user_id, full_name, mobile, pincode | - |
| 18 | Wallet Master | wallet_master | ✅ | ❌ | user_id, balance | - |

### DIRECT NAVIGATION (3 MODULES)
| # | Module Name | Table Name | CRUD | Image Upload | Required Fields | Foreign Keys |
|---|-------------|------------|------|--------------|-----------------|--------------|
| 19 | Sale Entry (POS) | orders, order_items | ✅ | ❌ | subtotal, total_amount | - |
| 20 | Purchase | purchases, purchase_items | ✅ | ❌ | total_amount | supplier_id |
| 21 | Transaction | - | ✅ | ❌ | - | - |

### VIEW DROPDOWN (6 MODULES)
| # | Module Name | Source Tables |
|---|-------------|---------------|
| 22 | Online Order | orders, order_items |
| 23 | Bill View | orders, order_items |
| 24 | Delivery Bill View | orders, order_items |
| 25 | Branch Bill | orders, order_items |
| 26 | Payment (Mobile No) | orders |
| 27 | Wallet Recharge | wallet_transactions |

### REPORT DROPDOWN (15 MODULES)
| # | Report Name | Source Tables | Key Calculations |
|---|-------------|---------------|------------------|
| 28 | Sale Summary | orders, order_items | total_sales, gst, discount |
| 29 | Sale Report Bill Wise | orders, order_items | bill-wise total |
| 30 | Sale Report Item Wise | order_items, products | item-wise sales |
| 31 | Sale Report Item Summary | order_items, products | summarized item sales |
| 32 | Sale Trash Bill | orders (deleted) | - |
| 33 | Sale Cancelled Bill | orders (status=cancelled) | - |
| 34 | Purchase Report | purchases, purchase_items | purchase summary |
| 35 | Stock Report | products | stock status, low stock |
| 36 | Item Statement Report | products, order_items, purchase_items | item movement |
| 37 | Logbook | system_logs | audit logs |
| 38 | Ledger View | account_master, credit_master | account ledger |
| 39 | Delivery Boy Payment Report | orders, delivery_boy_master | delivery payments |
| 40 | Credit Report | credit_master, account_master | credit summary |
| 41 | Payment Reminder | orders (unpaid) | pending payments |

### STORE DROPDOWN (10 MODULES)
| # | Module Name | Source Tables |
|---|-------------|---------------|
| 42 | BOM | - |
| 43 | Production Entry | products |
| 44 | Costing Report | products, purchases |
| 45 | Stock Transfer | products |
| 46 | Stock Transfer Report | products |
| 47 | Wastage Entry | products |
| 48 | Wastage Report | products |
| 49 | Purchase Order (PO) | - |
| 50 | Requisition Order (RO) | - |
| 51 | Requisition Order Report | - |

### TOOLS DROPDOWN (5 MODULES)
| # | Module Name | Source Tables |
|---|-------------|---------------|
| 52 | Configuration | app_config |
| 53 | Store Item Display | products, categories |
| 54 | Store Sub Cat Display | subcategories, categories |
| 55 | Store Main Cat Display | categories |
| 56 | Test Bluetooth | - |

---

## 🗄️ 2. COMPLETE TABLE STRUCTURE

### Table: app_config
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| security_pin | TEXT | ❌ | ❌ | '1234' |
| shop_name | TEXT | ❌ | ❌ | 'NM MART' |
| address | TEXT | ❌ | ❌ | null |
| mobile | TEXT | ❌ | ❌ | null |
| email | TEXT | ❌ | ❌ | null |
| gstin | TEXT | ❌ | ❌ | null |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: home_config
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| section_name | TEXT | ❌ | ❌ | - |
| section_type | TEXT | ❌ | ❌ | null |
| is_active | BOOLEAN | ❌ | ❌ | true |
| position | INTEGER | ❌ | ❌ | 0 |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: banners
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| title | TEXT | ❌ | ❌ | null |
| image_url | TEXT | ❌ | ❌ | - |
| description | TEXT | ❌ | ❌ | null |
| redirect_path | TEXT | ❌ | ❌ | null |
| position | INTEGER | ❌ | ❌ | 0 |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: categories
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ✅ | - |
| image_url | TEXT | ❌ | ❌ | null |
| position | INTEGER | ❌ | ❌ | 0 |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: subcategories
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| category_id | UUID | ❌ | ❌ | - | categories(id) |
| name | TEXT | ❌ | ❌ | - | - |
| image_url | TEXT | ❌ | ❌ | null | - |
| position | INTEGER | ❌ | ❌ | 0 | - |
| is_active | BOOLEAN | ❌ | ❌ | true | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: brands
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ✅ | - |
| logo_url | TEXT | ❌ | ❌ | null |
| position | INTEGER | ❌ | ❌ | 0 |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: unit_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ✅ | - |
| short_name | TEXT | ❌ | ❌ | null |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: department_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ✅ | - |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: products
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| barcode | TEXT | ❌ | ✅ | null | - |
| name | TEXT | ❌ | ❌ | - | - |
| category_id | UUID | ❌ | ❌ | null | categories(id) |
| sub_category_id | UUID | ❌ | ❌ | null | subcategories(id) |
| brand_id | UUID | ❌ | ❌ | null | brands(id) |
| unit_id | UUID | ❌ | ❌ | null | unit_master(id) |
| department_id | UUID | ❌ | ❌ | null | department_master(id) |
| hsn_code | TEXT | ❌ | ❌ | null | - |
| mrp | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| sale_rate | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| purchase_rate | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| gst_percent | NUMERIC(5,2) | ❌ | ❌ | 0.00 | - |
| discount | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| stock | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| description | TEXT | ❌ | ❌ | null | - |
| image_url | TEXT | ❌ | ❌ | null | - |
| is_live_on_app | BOOLEAN | ❌ | ❌ | false | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: admin_users
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| username | TEXT | ❌ | ✅ | - |
| password | TEXT | ❌ | ❌ | - |
| full_name | TEXT | ❌ | ❌ | null |
| role | TEXT | ❌ | ❌ | 'admin' |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: account_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ❌ | - |
| mobile | TEXT | ❌ | ✅ | - |
| email | TEXT | ❌ | ❌ | null |
| address | TEXT | ❌ | ❌ | null |
| account_type | TEXT | ❌ | ❌ | 'Customer' |
| opening_balance | NUMERIC(12,2) | ❌ | ❌ | 0.00 |
| current_balance | NUMERIC(12,2) | ❌ | ❌ | 0.00 |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: credit_master
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| account_id | UUID | ❌ | ❌ | - | account_master(id) |
| amount | NUMERIC(12,2) | ❌ | ❌ | - | - |
| type | TEXT | ❌ | ❌ | - | - |
| reason | TEXT | ❌ | ❌ | null | - |
| transaction_date | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: delivery_boy_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| full_name | TEXT | ❌ | ❌ | - |
| username | TEXT | ❌ | ✅ | - |
| password | TEXT | ❌ | ❌ | - |
| mobile | TEXT | ❌ | ❌ | null |
| vehicle_type | TEXT | ❌ | ❌ | 'Motorcycle' |
| status | TEXT | ❌ | ❌ | 'active' |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: delivery_customer_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ❌ | - |
| mobile | TEXT | ❌ | ❌ | - |
| address | TEXT | ❌ | ❌ | null |
| pincode | TEXT | ❌ | ❌ | null |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: purchases
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| invoice_no | TEXT | ❌ | ❌ | null | - |
| supplier_id | UUID | ❌ | ❌ | null | account_master(id) |
| purchase_date | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| total_amount | NUMERIC(12,2) | ❌ | ❌ | 0.00 | - |
| paid_amount | NUMERIC(12,2) | ❌ | ❌ | 0.00 | - |
| balance_amount | NUMERIC(12,2) | ❌ | ❌ | 0.00 | - |
| remarks | TEXT | ❌ | ❌ | null | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: purchase_items
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| purchase_id | UUID | ❌ | ❌ | - | purchases(id) |
| product_id | UUID | ❌ | ❌ | - | products(id) |
| quantity | NUMERIC(10,2) | ❌ | ❌ | - | - |
| rate | NUMERIC(10,2) | ❌ | ❌ | - | - |
| total | NUMERIC(12,2) | ❌ | ❌ | - | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: orders
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| order_no | TEXT | ❌ | ❌ | null | - |
| user_id | UUID | ❌ | ❌ | null | - |
| customer_name | TEXT | ❌ | ❌ | null | - |
| customer_mobile | TEXT | ❌ | ❌ | null | - |
| address | TEXT | ❌ | ❌ | null | - |
| pincode | TEXT | ❌ | ❌ | null | - |
| subtotal | NUMERIC(12,2) | ❌ | ❌ | - | - |
| delivery_charge | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| discount | NUMERIC(10,2) | ❌ | ❌ | 0.00 | - |
| total_amount | NUMERIC(12,2) | ❌ | ❌ | - | - |
| payment_method | TEXT | ❌ | ❌ | 'Online' | - |
| payment_status | TEXT | ❌ | ❌ | 'pending' | - |
| order_status | TEXT | ❌ | ❌ | 'pending' | - |
| delivery_boy_id | UUID | ❌ | ❌ | null | delivery_boy_master(id) |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: order_items
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| order_id | UUID | ❌ | ❌ | - | orders(id) |
| product_id | UUID | ❌ | ❌ | - | products(id) |
| product_name | TEXT | ❌ | ❌ | - | - |
| quantity | NUMERIC(10,2) | ❌ | ❌ | - | - |
| rate | NUMERIC(10,2) | ❌ | ❌ | - | - |
| total | NUMERIC(12,2) | ❌ | ❌ | - | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: wallet_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| user_id | UUID | ❌ | ❌ | - |
| balance | NUMERIC(12,2) | ❌ | ❌ | 0.00 |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: wallet_transactions
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| user_id | UUID | ❌ | ❌ | - |
| amount | NUMERIC(12,2) | ❌ | ❌ | - |
| type | TEXT | ❌ | ❌ | - |
| reason | TEXT | ❌ | ❌ | null |
| transaction_date | TIMESTAMPTZ | ❌ | ❌ | now() |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: addresses
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| user_id | UUID | ❌ | ❌ | - |
| full_name | TEXT | ❌ | ❌ | - |
| mobile | TEXT | ❌ | ❌ | - |
| house_no | TEXT | ❌ | ❌ | null |
| city | TEXT | ❌ | ❌ | null |
| state | TEXT | ❌ | ❌ | null |
| pincode | TEXT | ❌ | ❌ | - |
| is_default | BOOLEAN | ❌ | ❌ | false |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: pincode_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| pincode | TEXT | ❌ | ✅ | - |
| city | TEXT | ❌ | ❌ | null |
| state | TEXT | ❌ | ❌ | null |
| delivery_charge | NUMERIC(10,2) | ❌ | ❌ | 0.00 |
| is_allowed | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: coupons
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| code | TEXT | ❌ | ✅ | - |
| discount_type | TEXT | ❌ | ❌ | - |
| discount_value | NUMERIC(10,2) | ❌ | ❌ | - |
| min_order_amount | NUMERIC(12,2) | ❌ | ❌ | 0.00 |
| max_discount | NUMERIC(12,2) | ❌ | ❌ | null |
| usage_limit | INTEGER | ❌ | ❌ | null |
| used_count | INTEGER | ❌ | ❌ | 0 |
| valid_from | TIMESTAMPTZ | ❌ | ❌ | null |
| valid_to | TIMESTAMPTZ | ❌ | ❌ | null |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: offers_master
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| title | TEXT | ❌ | ❌ | - |
| description | TEXT | ❌ | ❌ | null |
| image_url | TEXT | ❌ | ❌ | null |
| discount | TEXT | ❌ | ❌ | null |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: cart
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| user_id | UUID | ❌ | ❌ | - | - |
| product_id | UUID | ❌ | ❌ | - | products(id) |
| quantity | NUMERIC(10,2) | ❌ | ❌ | 1.00 | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: wishlist
| Column | Type | PK | Unique | Default | FK |
|--------|------|----|--------|---------|----|
| id | UUID | ✅ | ✅ | uuid_generate_v4() | - |
| user_id | UUID | ❌ | ❌ | - | - |
| product_id | UUID | ❌ | ❌ | - | products(id) |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() | - |

### Table: notifications
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| title | TEXT | ❌ | ❌ | - |
| message | TEXT | ❌ | ❌ | - |
| type | TEXT | ❌ | ❌ | null |
| reference_id | UUID | ❌ | ❌ | null |
| user_id | UUID | ❌ | ❌ | null |
| is_read | BOOLEAN | ❌ | ❌ | false |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: system_logs
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| log_entry | TEXT | ❌ | ❌ | - |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |

### Table: users
| Column | Type | PK | Unique | Default |
|--------|------|----|--------|---------|
| id | UUID | ✅ | ✅ | uuid_generate_v4() |
| name | TEXT | ❌ | ❌ | - |
| email | TEXT | ❌ | ✅ | null |
| mobile | TEXT | ❌ | ✅ | - |
| password | TEXT | ❌ | ❌ | null |
| is_active | BOOLEAN | ❌ | ❌ | true |
| created_at | TIMESTAMPTZ | ❌ | ❌ | now() |
| updated_at | TIMESTAMPTZ | ❌ | ❌ | now() |

---

## 📦 3. SUPABASE STORAGE BUCKETS

### Final Bucket List: 4 Buckets
| # | Bucket Name | Public | Purpose | Upload Role | Delete Role |
|---|-------------|--------|---------|-------------|-------------|
| 1 | banner-images | ✅ | Banners, Offers | Authenticated | Authenticated |
| 2 | category-images | ✅ | Categories, Subcategories | Authenticated | Authenticated |
| 3 | brand-images | ✅ | Brands | Authenticated | Authenticated |
| 4 | product-images | ✅ | Products | Authenticated | Authenticated |

---

## 🔒 4. RLS REQUIREMENTS

### For Testing Phase (RLS Disabled)
All tables have RLS disabled for easy testing and development.

### For Production (RLS Enablement Recommended)
Once testing is complete, enable RLS and add policies:
```sql
-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... and so on for all tables

-- Add policies (example)
CREATE POLICY "Allow authenticated select" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON products FOR DELETE USING (auth.role() = 'authenticated');
```

---

## 📊 5. CSV / EXCEL IMPORT

### Product Import
#### Headers & Mapping
| CSV Header | Database Column |
|------------|-----------------|
| Name | name |
| Barcode | barcode |
| HSN Code | hsn_code |
| Sale Rate | sale_rate |
| MRP | mrp |
| Purchase Rate | purchase_rate |
| Stock | stock |
| Category | category |
| Subcategory | subcategory |
| Brand | brand |
| Unit | unit |

---

## 🔍 6. FRONTEND SUPABASE QUERIES

### Common Queries
```javascript
// Get all products
supabase.from('products').select('*').order('created_at', { ascending: false })

// Get products with categories and brands
supabase.from('products').select(`*, categories(*), brands(*), unit_master(*)`).order('name')

// Get orders with items
supabase.from('orders').select(`*, order_items(*)`).order('created_at', { ascending: false })

// Get banners
supabase.from('banners').select('*').order('position').eq('is_active', true)

// Insert product
supabase.from('products').insert([productData]).select()

// Update product
supabase.from('products').update(productData).eq('id', productId).select()

// Delete product
supabase.from('products').delete().eq('id', productId)
```

---

## ✅ 7. MASTER TABLE DUPLICATE RESOLUTION

### Final Source of Truth (dbSchema.js)
The final table names as per `dbSchema.js` are:
- ✅ categories (NOT item_main_category)
- ✅ subcategories (NOT item_sub_category)
- ✅ brands (NOT brand_master)
- ✅ products (NOT items)
- ✅ All other tables follow the DB_SCHEMA mapping

---

## 🔐 8. AUTHENTICATION

### System
- Custom PIN-based login for Admin Panel
- PIN stored in `app_config.security_pin` (default: 1234)
- Admin users stored in `admin_users` table

### Roles
- Super Admin: Full access
- Admin: Most access
- Staff: Limited access
- Delivery Boy: Delivery only
- Customer: App only

---

## 📋 9. FINAL CHECKLIST

### ✅ Completed
- 29 database tables created with proper constraints
- 4 storage buckets identified
- Complete module mapping documented
- Full table schema defined
- Import/export mapping provided
- Common queries documented
- Initial data included

### 📝 Next Steps
1. Run FINAL_SUPABASE_SCHEMA.sql in Supabase SQL Editor
2. Create storage buckets
3. Update .env with Supabase credentials
4. Test the application
5. Enable RLS in production
