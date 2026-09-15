======================================================================
 NM MART ADMIN PANEL — DATABASE AUDIT REPORT (v3.0)
 + EXECUTION PLAN + COMPONENT-TO-TABLE MAPPING MATRIX
======================================================================
 Generated On : 2026-09-15
 Project Path : D:\NM MART DATA\admin panel host
 Supabase URL : https://mggkadgemqcyybsplkqc.supabase.co
======================================================================

AUDIT SUMMARY
-------------
  Total Modules Scanned          : 12 (Auth, Dashboard, Inventory, POS,
                                    Orders, Users, Customers, Finance,
                                    Logistics, Loyalty, Marketing, System)
  Total Components Scanned       : 72 (Pages + Views + Master List Views)
  Total Action Points Identified : 94 CRUD operations (via handleERPAction)
                                   + 14 direct supabase.from() calls
                                   + 3  supabase.rpc() calls
  Total Database Tables          : 38
  Total Database Views           : 7
  Total RPC / PGSQL Functions    : 9 (4 business + 5 utility triggers/RLS)
  Total Seed Data Insert Rows    : ~120 rows (12 sections, all re-runnable)
  Total RLS Policies Created     : ~145 (36 tenant tables x 4 CRUD each
                                   + companies + system_logs + hsn_master)

======================================================================
 0.  CONSOLIDATED SQL FILE — WHERE TO FIND & HOW TO RUN
======================================================================

 File: supabase/CONSOLIDATED_SCHEMA_v3.0_FINAL.sql

 STEP-BY-STEP EXECUTION INSTRUCTIONS
 -----------------------------------
 1. Open Supabase Dashboard:
    https://supabase.com/dashboard/project/mggkadgemqcyybsplkqc/sql/new

 2. Top-right corner se "New Query" par click karke blank query editor
    kholo.

 3. File ko poora copy-paste karo editor mein:
    supabase/CONSOLIDATED_SCHEMA_v3.0_FINAL.sql

 4. "Run" (Green Triangle ▶️) button par click karo.
    Expected execution time: 1 - 3 seconds
    Expected output: "Success. No rows returned."

 5. Execution ke baad VERIFY karo inn 3 queries se:

    -- a) Count of tables (should be 38+)
       SELECT count(*) AS tables_count
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type   = 'BASE TABLE';
       -- Expected: 38 + 1 (schema_migrations auto-by-supabase) = ~39

    -- b) Count of custom public functions
       SELECT proname
       FROM pg_proc
       WHERE pronamespace = 'public'::regnamespace
       ORDER BY proname;
       -- Must see list:
       --   verify_admin_pin, verify_admin_password,
       --   adjust_wallet_atomic, place_order_atomic,
       --   set_current_timestamp_updated_at,
       --   inject_tenant_context_on_insert,
       --   install_inject_tenant_triggers_on_all,
       --   current_company_code, matches_company_scope

    -- c) Check seed admin user (bcrypt hash present)
       SELECT username, role, company_code, is_active
       FROM public.admin_users;
       -- Expected 2 rows: superadmin | cashier

    -- d) Verify login fallback RPC works (frontend AuthContext.jsx contract)
       SELECT * FROM public.verify_admin_password(
                  'superadmin', 'admin@123');
       -- Expected single JSON column:
       -- {"verified":true,"profile":{"id":..,"company_code":"NMM001",...}}

    -- e) Security PIN RPC
       SELECT public.verify_admin_pin('1234');
       -- Expected: TRUE (app_config seeded with pin=1234)

 6. AGAR tables pehle se exist karte hain aur data hai → TOH is file
    ko seedha run mat karo. Tab CREATE TABLE IF NOT EXISTS chalega
    (safe), lekin RLS policies ke liye ALTER + DROP existing policies
    (jo already hai unko) manually DROP karna padega. EMPTY DB par
    sabse safe run hota hai yeh file.

======================================================================
 1.  COMPONENT → TABLE MAPPING MATRIX (94 CRUD Action Points)
======================================================================

 A. AUTH MODULE  (Tables: admin_users | companies | app_config)
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions on Click
 ---------------------------------|-----------------------|--------------------------
 LoginView.jsx (L109 handleLogin)| admin_users (SELECT)  | Login Submit: check uname
                                  | companies   (SELECT)  | + fetch company by code
                                  | verify_admin_password | Fallback: RPC if no JWT
 ForgotPasswordView.jsx (L46)    | admin_users (SELECT)  | Check email, send reset
 ResetPasswordView.jsx           | Supabase Auth        | Supabase.updateUser()
 AuthContext.jsx (L157/513/534)  | admin_users (3 selects)| On session restore: hydrate user by username/email
 AuthContext.jsx (L181)          | companies (SELECT)    | After user → fetch comp by company_code
 StoreSetup.jsx (L16,L38,L50)    | companies (INSERT)    | New company sign-up
                                  | admin_users (INSERT)  | + admin account + seed
 AppConfigView.jsx (L49)         | verify_admin_pin RPC  | Security gate for config
 AppConfigView.jsx (L103)        | app_config (UPSERT)   | Save tax, GST, PIN, theme

 B. DASHBOARD / ANALYTICS MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Metrics / Actions
 ---------------------------------|-----------------------|--------------------------
 DashboardView.jsx (L539-565)     | products, orders,     | Total Sales, Top 10 items
                                  | order_items, expenses,| Expense trend (30d),
                                  | categories, brands    | Low stock (<=5d runout),
                                  | inventory_logs        | Urgent exp (<=15d)
 DashboardView.jsx (L157)         | products (UPDATE)     | Quick edit product price
 AnalyticsView.jsx                | orders (created_at,   | Sales by date,
                                  |  payment_method       |  payment method breakdown
 ProfitLossView.jsx               | purchases + orders    | Revenue vs COGS + gross
                                  | + expenses + order_   | profit line chart (daily)
                                  | items + inventory_logs
 ExpensesView.jsx (L53/82)        | expenses (I/U/D)      | Add/Edit/Delete expense
 ExpensesView.jsx (L56)           | expense_categories    | Dropdown for type
                                  | account_master        | "Paid from" dropdown

 C. INVENTORY MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions
 ---------------------------------|-----------------------|--------------------------
 ProductsView.jsx (L408,425,780)  | products (I/U/D)      | 3 Master List View buttons
 ProductsView.jsx (L414/435)      | inventory_logs INSERT | Stock-adjustment log row
 ProductsView.jsx                 | categories (dropdown) | Category Select
                                  | brands (dropdown)     | Brand Select
                                  | unit_master (dropdown)| Unit Select
                                  | hsn_master (lookup)   | GST auto-fill by HSN
 CategoriesView.jsx               | categories (I/U/D)    | Master list 4 buttons
 SubcategoriesView.jsx            | subcategories (I/U/D) | w/ category_id FK dropdown
 BrandsView.jsx                   | brands (I/U/D)        | Master list
 DepartmentsView.jsx              | department_master     | Master list
 UnitsView.jsx                    | unit_master           | Master list
 HSN (hidden Master)              | hsn_master            | (via Excel import)
 PurchaseEntryView.jsx (L109)     | purchases (INSERT)    | Save purchase header
 PurchaseEntryView.jsx (L119)     | purchase_items INSERT | N items per purchase
 PurchaseEntryView.jsx (L133)     | products UPDATE       | Increment stock after purchase
 PurchaseEntryView.jsx (L139)     | inventory_logs INSERT | purchase movement log
 PurchaseView.jsx (L65,L67,L149)  | purchases (I/U/D)     | Purchase register screen
                                  | purchase_items        | Purchase items lookup
 SuppliersView.jsx (L46/49/69)    | account_master        | Filter where account_type
                                  | (I/U/D type=Supplier) | = 'Supplier' (triple use)
 EnhancedSuppliersView.jsx        | account_master        | Same + mobile search filter
 StockAlertsView.jsx              | stock_alerts JOIN     | List rows where
                                  | products              | current_stock <= threshold
 StockLogsView.jsx                | inventory_logs        | Filter by date, product,
                                  | + products JOIN       | change_type (sold/purch)

 D. POS / BILLING / COUNTER MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions on Click
 ---------------------------------|-----------------------|--------------------------
 POSView.jsx (Product Grid L539) | products (SELECT/barcode) | Scan/search products by
                                  | readable_products     |  barcode + category filter
 POSView.jsx (CustomerPanel)      | delivery_customer_    | Walk-in customer + credit
                                  | master + users        |   dropdown for Udhaar
 POSView.jsx (CartPanel L88+)     | (Local state only,    | Cart lines, qty +/-
                                  |  NOT persisted yet)
 POSView.jsx (PaymentDialog)      | payment_transactions  | Choose CASH/UPI/CARD etc
                                  | orders INSERT         | (6 methods)
 POSView.jsx (L309 Place Order)   | place_order_atomic RPC| ATOMIC: order header +
                                  | (recommended atomic)  | items + stock deduction
 POSView.jsx (L318/329)           | order_items INSERT,   | NON-RPC fallback if
                                  | products UPDATE stock | atomic RPC unavailable
 POSView.jsx (L329)               | inventory_logs sold   | Stock-movement log row
 POSView.jsx (ReceiptDialog)      | orders + order_items  | Thermal print, PDF
                                  | JOIN readable_* views
 CartPanel.jsx / components/Cart  | (Client-side)         | DiscountDialog btn → %/Rs
 Checkout/services/checkout.     | wallet_master + credit| Wallet/Credit balance
 service.ts                       | _master + orders      | read before accepting pay
 pos/repository/adapters/         | products, categories, | List page: fetch product
 supabase.adapter.ts              | subcategories, brands |  list for POS grid
                                  | app_config            |  & shop GST from config
 SelfCheckoutView.jsx (L197/206)  | orders + order_items  | Same flow as POS but
 SelfCheckoutView.jsx (L221/227)  | products + inventory  |   customer-facing kiosk
                                  | _logs (sold)
 SelfCheckoutKiosk.jsx (L263+)    | orders, order_items,  | Kiosk-mode order creation
                                  | products, inventory_logs, app_config

 E. ORDERS MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions on Click
 ---------------------------------|-----------------------|--------------------------
 OrdersView.jsx (L99/563)         | orders (UPDATE status)| Pending → Packed → Out
                                  |  + delivery_boy_id    |  → Delivered / Cancel
 OrdersView.jsx (L109)            | orders UPDATE full    | Edit address/phone/payment
 OrdersView.jsx (L234/522)        | orders (DELETE)       | Dangerous cancel action
                                  | GENERATE_BILL action  | (verify_admin_pin check)
 OrdersView.jsx (L578)            | products UPDATE stock | UNDO cancel → restore stock
                                  | + inventory_logs
 OrdersView.jsx (Bill dialog L224)| GENERATE_BILL → RPC   | / print PDF thermal
 OnlineOrderView.jsx (L27)        | orders (UPDATE)       | Online app order status
                                  | order_type=online_app
                                  | order_status filter

 F. USERS / CUSTOMERS / LOYALTY / WALLET MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions
 ---------------------------------|-----------------------|--------------------------
 UsersView.jsx (App Users)        | users (I/U/D)         | Signups list
 UserMasterView.jsx               | admin_users (I/U/D)   | Admin/staff user mgmt
 AdminUsersView.jsx               | admin_users           | Master list w/ role dropdown
 DeliveryCustomersView.jsx        | delivery_customer_    | Counter Udhaar customers
                                  | master (I/U/D)        | credit_limit field
 DeliveryBoysView.jsx             | delivery_boy_master   | Master list
 CreditsView.jsx                  | credit_master (I/U/D)  | Udhaar/Due entries
 LoyaltyManagementView.jsx (L67)  | customer_loyalty UPDATE| Adjust points manually
 LoyaltyManagementView.jsx (L72)  | customer_loyalty INSERT| New loyalty account
                                  | loyalty_tiers (dropdown)| Tier selection dropdown
 WalletView / WalletMaster        | wallet_master +       | Balance list, per customer
                                  | wallet_transactions   | Adjust via button triggers
 Wallet recharge via adjust_      | wallet + wtxns + rpc  | Call `adjust_wallet_atomic`
 wallet_atomic (dbSync L940)      | (B-3 RPC fn)

 G. ADDRESSES / LOGISTICS MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions
 ---------------------------------|-----------------------|--------------------------
 AddressesView.jsx                | addresses (I/U/D)     | Manage user saved addrs
                                  | users (FK join)       | (name, phone, pincode, latlng)
 PincodesView.jsx                 | pincode_master        | Serviceable areas +
                                  | (I/U/D)               |   delivery charge matrix
 delivery_boy_master (Orders      | delivery_boy_master   | Assign order to delivery
 assign)                          |   (SELECT dropdown)   |   boy (OrdersView status)

 H. MARKETING / CMS / CONFIG MODULE
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions
 ---------------------------------|-----------------------|--------------------------
 BannersView.jsx                  | banners (I/U/D)       | Manage top-slider banners
                                  | products (lookup)     | + "Link to Product"
                                  | categories (lookup)   | + "Link to Category"
 CouponsView.jsx                  | coupons (I/U/D)       | Promo code generation
 HomeLayoutManager.jsx (L34)      | home_config BULK_UPSERT| Rearrange section order
 HomeLayoutManager.jsx (L49)      | home_config DELETE    | Delete a section
 OffersView.jsx                   | offers_master         | BuyXGetY / flat discount
 AppConfigView + FestivalTheme    | app_config 15+ keys   | Bulk upsert on save
 HomeLayoutManager.jsx            | home_config 5 rows    | Save via BULK_UPSERT
 CompanyManagement.jsx            | companies (I/U/D)     | Super admin company
                                  | admin_users (link)    |   mgmt (multi-tenant)
 StoreSetup.jsx                   | companies + admin_    | First-time onboarding
                                  | users INSERT + app_   | + seed app_config
                                  | config + home_config
 NotificationsView.jsx (L14,L36,  | notifications (UPDATE)| Mark as read / Send new
                      L83)        | notifications INSERT  | (to app users, bulk)
 SupportTicketsView.jsx (L36)     | support_tickets UPDATE| Mark open → closed
 SupportTicketsView.jsx (L53)     | notifications INSERT  | Send reply as notification
                                  | system_logs           | (Appended by dbSync on
                                  | (AUDIT INSERT only)   | every INSERT/UPDATE/DELETE)

 I. SYSTEM / AUDIT / EXPORT / IMPORT
 -----------------------------------------------------------------
 Component / View                 | Table(s) Accessed     | Actions
 ---------------------------------|-----------------------|--------------------------
 MasterListView.jsx (Generic I/U/D)| (Generic for any     | handleERPAction +
 (600+ lines, used by ALL         |  table passed as      | parseERPCSV Excel import
  master list views above)         |  prop `table`)        | exportToExcel
 dbSync.js  (259/307/488/504)     | products + all tables | Excel sync, tenant filter
 dbSync.js  (L737)                 | products (DELETE by   | Purge by id, notify sys
 dbSync.js  (L273)                 | notifications INSERT  | Sync-complete in-app
 dbSync.js  (L307)                 | system_logs INSERT    | Audit row every op
 securityHelper.logSecurityEvent  | system_logs INSERT    | Login / logout / failed
                                  |                       |   attempt audit rows
 ExcelUpload.jsx                   | handleERPAction BULK  | Any table Excel insert
                                  | _UPSERT or INSERT     | (w/ inject_tenant trigger)
 App.jsx (L1036) Maintenance Exp. | handleERPAction       | All tables → XLSX export
                                  | MAINTENANCE_EXPORT
 App.jsx (L4924) System Logs      | system_logs SELECT    | Audit trail viewer
 App.jsx (Stock Movement L5094)   | purchase_items +      | Product drill: purchase +
                                  | order_items +         |   sale history side drawer
                                  | purchases + orders
 App.jsx (Sales vs Purchase L5328)| Same as above         | Dashboard drill-down

======================================================================
 2.  RPC FUNCTION CONTRACT FIXES (Critical)
======================================================================
 ORIGINAL BUG IN MIGRATION 0202__verify_admin_password.sql :
   FUNCTION returned BOOLEAN only.

 FRONTEND CONTRACT (AuthContext.jsx L442-L457):
   const fbData = fallbackResult?.data;
   if (!fbError && fbData && fbData.verified === true && fbData.profile) { ... }

   → Expected return type: JSON object with keys:
       {
         verified: boolean,
         profile:  { id, username, email, name, role,
                     company_code, tenant_id, is_active,
                     status, permissions }
         error?:   string (optional, if verification failed)
       }

 CONSOLIDATED SCHEMA v3 FIXES:
   verify_admin_password TEXT, TEXT → RETURNS JSONB
     ✓ Now returns {"verified":true, "profile":{...}} as expected.
     ✓ Still uses pgcrypto.crypt() constant-time comparison.
     ✓ SECURITY DEFINER + DISABLE RLS so anon role can verify
       before JWT is issued (chicken-egg problem resolved).

======================================================================
 3.  DROP-DOWN DEPENDENCIES MAP (Which dropdown uses which table)
======================================================================
 Screen                 | Dropdown Label        | Table Source        | Column used as FK
 -----------------------|-----------------------|---------------------|-------------------
 Products Add Form      | Category              | categories          | category_id (FK)
 Products Add Form      | Sub-Category          | subcategories       | subcategory_id
 Products Add Form      | Brand                 | brands              | brand_id
 Products Add Form      | Unit                  | unit_master         | unitcode / unit_name
 Products Add Form      | HSN Code              | hsn_master          | hsn_code
 Purchase Entry         | Supplier Name         | account_master      | supplier_id
                        | (Filter: type=Supplier)| WHERE account_type='Supplier'
 Expense Add Form       | Expense Category      | expense_categories  | expense_category_id
 Expense Add Form       | Paid From (A/c)       | account_master      | account_paid_from_id
 Orders Status Assign   | Delivery Boy          | delivery_boy_master | delivery_boy_id
 Customer Panel POS     | Walk-in Customer      | delivery_customer_  | (for Udhaar credit)
                        |                       | master
 Loyalty Manage Add     | Loyalty Tier          | loyalty_tiers       | tier_id
 Order Assign           | Order Status          | orders CHECK const. | order_status ENUM 7 vals
 Order Payment          | Payment Method        | orders CHECK const. | payment_method 6 vals
 Users/Roles Add        | Admin Role            | admin_users.role    | role VARCHAR(30)
                                                                      (SALES_MANAGER/INVENTORY_HEAD/ACCOUNTANT etc.)

======================================================================
 4.  POST-EXECUTION SANITY CHECKLIST (Do this after running SQL)
======================================================================
 [ ] 1.  admin_users me superadmin + cashier entries dikh rahe hain?
          → Login test:
              Email (Supabase Auth) = signup manually first OR
              Use fallback: username=superadmin password=admin@123
              (via verify_admin_password RPC)
 [ ] 2.  app_config me admin_security_pin=1234 hai?
          → SELECT value FROM app_config WHERE key='admin_security_pin';
 [ ] 3.  categories (10), unit_master (11), expense_categories (12)
          seed rows present hain?
 [ ] 4.  LoginView par jaakar "superadmin" + "admin@123" login karo.
          Expected flow:
            - Supabase Auth fails → fallback RPC kicks in
            - AuthContext.jsx L442 → rpc verify_admin_password returns JSONB
            - hydrateAuthState() runs → admin_users fetched
            - companies fetched by company_code=NMM001
            - Redirect to /nm-mart/dashboard → SUCCESS
 [ ] 5.  Dashboard par Low-stock alert = 0 hoga (empty products
          table ok). Go to Categories → confirm seed 10 categories
          dropdown show ho rahe hain.
 [ ] 6.  POS button par click → Product grid (empty ok) →
          Open Add product dialog → Category/Brand/Unit dropdowns
          seed data dikhana chahiye.
 [ ] 7.  Open AppConfigView → Current PIN 1234 → type 1234
          → verify_admin_pin RPC returns true → Settings form
            khulna chahiye.
 [ ] 8.  Expenses Add → "Paid From" dropdown list dikhani chahiye
          (account_master me at least 1 row = Suppliers on empty
           DB it will be empty, ok; add a Bank entry manually first)

======================================================================
 5.  KNOWN GAPS / TO-BE MANUAL-ACTION ITEMS
======================================================================
 ⚠️  GAP 1: Supabase Auth Email User Signup
     admin_users me password_hash = bcrypt fallback ke liye hai,
     lekin Supabase Auth ke auth.users me email sign-up karna
     padega manually:
       → Supabase Dashboard → Authentication → Users → Add user
         Email: admin@nmmart.in  Password: admin@123
         Email: cashier@nmmart.in Password: cashier@123
     WARNA Supabase Auth JWT flow nahi chalega, sirf fallback RPC
     (verify_admin_password) ka use hoga, jo session token 8 ghante
     ke liye synthetic generate karta hai (AuthContext L470).

 ⚠️  GAP 2: JWT Custom Claims (tenant_id, company_code, role)
     Supabase ke JWT me by default app_metadata nahi aata.
     Ek Supabase Edge Function ya PostgreSQL Trigger lagana
     padega jo auth.users.on_insert → auth.users.update user_meta
     data set kare: {"company_code":"NMM001","tenant_id":1,"role":...}
     TABHI RLS policies ka tenant_id / company_code filter chalega.
     (ABHI ke liye consolidated schema me matches_company_scope()
      helper hai — jab tak JWT custom claims add nahi karte, tab
      service_role key se backend hit karo ya disable RLS for dev.)

 ⚠️  GAP 3: VITE_USE_MOCK=false set hai by default new .env me
     nahi hai. Ensure karo ki production .env me:
        VITE_USE_MOCK=false
     ho, warna Login ke baad bhi MOCK client chalega
     (src/supabase.js L17 fallback).

 ⚠️  GAP 4: Foreign Key to account_master.type='Supplier' →
     PurchaseEntryView me supplier dropdown SQL-level filter
     nahi hai; App.jsx L6959+ me data ko frontend me filter karte
     hain (props.accounts.filter(a => a.account_type==='Supplier')).
     Isko database view me shift karna better hoga future me.

======================================================================
 6.  TABLE COUNT VERIFICATION QUICK REFERENCE
======================================================================
 Sl  Table Name                     #Cols  Seed Rows  Used By Modules
 --  ------------------------------- -----  ---------  ------------------
  1  companies                         19          1  ALL (tenant root)
  2  unit_master                       12         11  Products (dropdown)
  3  categories                        11         10  Products (FK + dropdown)
  4  subcategories                     12          5  Products (FK + dropdown)
  5  brands                            11         10  Products (FK + dropdown)
  6  department_master                 11          0  (Optional sectioning)
  7  hsn_master                         8         21  Products (GST auto)
  8  products (CORE)                   68          0  Dashboard, POS, Inventory
  9  stock_alerts                      11          0  StockAlertsView
 10  inventory_logs                    14          0  StockLogs + audit triggers
 11  account_master (triple-use)       19          0  Suppliers + Expense Pay
 12  purchases                         21          0  PurchaseView / PurchaseEntry
 13  purchase_items                    13          0  PurchaseView line items
 14  admin_users                       18          2  Auth + UserMasterView
 15  users                             19          0  Orders + Loyalty + Wallet
 16  delivery_customer_master          12          0  POS Udhaar + Credits
 17  delivery_boy_master               13          0  Orders assign boy
 18  orders (3-in-1)                   45          0  POS + Online + Delivery
 19  order_items                       18          0  Order line items
 20  payment_transactions              11          0  Reconciliation (new)
 21  wallet_master                     10          0  WalletView
 22  wallet_transactions               16          0  Wallet history
 23  credit_master                     10          0  Credits View (Udhaar)
 24  expense_categories                 9         12  ExpensesView dropdown
 25  expenses                          16          0  Expenses + P&L
 26  pincode_master                    12         10  Delivery charges
 27  addresses                         18          0  User saved addresses
 28  loyalty_tiers                     10          4  Loyalty tier dropdown
 29  customer_loyalty                  12          0  Loyalty accounts
 30  loyalty_transactions              11          0  Points earn/redeem log
 31  coupons                           20          0  Marketing (checkout apply)
 32  offers_master                     17          0  Marketing offer engine
 33  banners                           18          0  App banners + CMS
 34  app_config                        10         15  All settings/themes/PIN
 35  home_config                       11          5  Home screen layout
 36  cart                               9          0  App user cart
 37  wishlist                           8          0  App user wishlist
 38  system_logs                       15          0  Audit trail
 39  notifications                     14          0  Inbox + push
 40  support_tickets                   13          0  Support module
 ---------------------------------------------------------------------
 TOTAL TABLES: 40 (38 tenant + companies global + hsn_master global)
 TOTAL VIEWS : 7  (readable_products, readable_categories,
                  readable_brands, readable_banners,
                  readable_coupons, readable_orders, readable_users)
 TOTAL RPCs  : 4  (verify_admin_pin, verify_admin_password,
                  adjust_wallet_atomic, place_order_atomic)

======================================================================
 -- END OF AUDIT REPORT --
 Consolidated SQL file: supabase/CONSOLIDATED_SCHEMA_v3.0_FINAL.sql
======================================================================
