# NM MART Admin Panel - Puri Project Details (Hindi)

## 1. Project Overview
- **Project Name**: NM MART Admin Panel (nmmarthostpanel)
- **Type**: Retail ERP + Admin Dashboard
- **Tech Stack**:
  - React 18.2 (UI Framework)
  - Vite 4.4 (Build Tool & Dev Server)
  - Tailwind CSS 3.3 (Styling)
  - Supabase (Backend as a Service - Database + Auth)
  - Framer Motion (Animations)
  - Lucide React (Icons)
  - XLSX (Excel Import/Export)
  - jsPDF + jspdf-autotable (PDF Reports)
- **Local Development Port**: 5200 (agar 5200 busy ho to 5201)
- **Default Admin PIN**: 1234

---

## 2. Project Structure
```
admin-panel-host/
├── public/                  # Static Assets (favicon, etc.)
├── src/
│   ├── components/          # Reusable Components
│   │   ├── CartItem.jsx
│   │   ├── MasterListView.jsx
│   │   ├── NavDropdown.jsx
│   │   ├── PaginationFooter.jsx
│   │   ├── ProductCard.jsx
│   │   ├── Skeleton.jsx
│   │   └── ThermalReceipt.jsx
│   ├── pages/
│   │   ├── Inventory/       # Inventory Management Pages
│   │   │   ├── ProductsView.jsx      # Products + Excel Import (Ye main file hai Excel upload ke liye!)
│   │   │   ├── PurchaseEntryView.jsx
│   │   │   ├── PurchaseView.jsx
│   │   │   ├── StockAlertsView.jsx
│   │   │   ├── StockLogsView.jsx
│   │   │   ├── SuppliersView.jsx
│   │   │   └── EnhancedSuppliersView.jsx
│   │   ├── Orders/
│   │   │   └── OrdersView.jsx
│   │   ├── DashboardView.jsx
│   │   ├── POSView.jsx
│   │   ├── AnalyticsView.jsx
│   │   ├── AppConfigView.jsx
│   │   ├── ExpensesView.jsx
│   │   ├── ProfitLossView.jsx
│   │   ├── NotificationsView.jsx
│   │   ├── LoyaltyManagementView.jsx
│   │   ├── SupportTicketsView.jsx
│   │   ├── HomeLayoutManager.jsx
│   │   └── SelfCheckoutView.jsx
│   ├── utils/
│   │   ├── helpers.js       # Utility Functions (cn, generateUUID, etc.)
│   │   └── security.js      # Security Helpers
│   ├── App.jsx              # Main App Component (Routing + State)
│   ├── main.jsx             # App Entry Point
│   ├── dbSchema.js          # Database Schema Mapping
│   ├── dbSync.js            # Database Operations (Use this file ONLY, directly Supabase call mat karo!)
│   ├── erpController.js     # ERP Action Handler
│   ├── supabase.js          # Supabase Client Initialization
│   ├── ErrorBoundary.jsx
│   └── index.css
├── supabase-schema.sql      # DATABASE KA SOURCE OF TRUTH! Har schema change is file mein karo!
├── .env.example             # Environment Variables Example
├── .gitignore
├── package.json
├── vite.config.js           # Vite Configuration
├── tailwind.config.js
├── postcss.config.js
├── vercel.json             # Vercel Deployment Config
└── index.html
```

---

## 3. Key Files aur Unka Kaam

### a) supabase-schema.sql
- Ye file **sabse important** hai!
- Isme saari database tables, columns, functions define hain
- **Har change pehle is file mein karo phir Supabase SQL Editor mein run karo!**
- Added:
  - `code` column in `brands`, `unit_master`, `department_master`
  - New tables: `item_groups`, `item_categories`

### b) src/pages/Inventory/ProductsView.jsx
- Ye file Excel upload ke liye hai!
- **Excel Import Logic**:
  1. Column Mapping: Excel headers ko database fields se map karta hai (jaise `brandcode` → `brand_code`, `unitcode` → `unit_code`)
  2. Master Update: Agar category/subcategory/brand/unit name se nahi milta to auto add karta hai
  3. Lookup Logic:
     - Pehle `code` se try karta hai (agar Excel mein `brandcode` hai to database mein `code` column check karega)
     - Agar code se nahi milta to phir `name` se try karta hai (backward compatibility)
  4. Product Preparation: Product data prepare karta hai, UUID generate karta hai, stock sanitize karta hai (negative nahi hona chahiye)
  5. Bulk Upload: Products ko database mein insert karta hai

### c) src/dbSchema.js
- Ye file database tables ko map karta hai code mein
- Isme humne add kiya:
  - `ITEM_GROUPS`
  - `ITEM_CATEGORIES`

### d) src/dbSync.js
- **IMPORTANT**: Database operations ke liye sirf is file ko use karo! Direct Supabase call mat karo!
- Ye file `fetch`, `insert`, `update`, `delete` jaise functions provide karta hai

### e) src/supabase.js
- Supabase client initialize karta hai
- Agar credentials valid nahi hote to mock mode mein chalta hai taaki app crash na kare

---

## 4. Excel Import - Kaise Kaam Karta Hai?

### Excel Column Mapping (ProductsView.jsx line 118-173)
Ye table dikhata hai Excel ke headers ko database fields se map karte hain:

| Excel Header | Database Field | Details |
|--------------|----------------|---------|
| id | id | Optional - agar valid UUID nahi hai to auto generate |
| itname | name | Product Name (Required) |
| itnameprint | print_name | Product Print Name |
| barcode | barcode | Product Barcode |
| hsencode / HSNCODE | hsn_code | HSN Code |
| takerate | take_rate | Take Rate |
| retsrate | retail_rate | Retail Rate |
| dlvrate | delivery_rate | Delivery Rate |
| onlinerate | online_rate | Online Rate |
| purcrate / PURC RA / PURC RATE | purchase_rate | Purchase Rate |
| mrp / MRP | mrp | MRP |
| opstock / OPENING / Closing | stock | Opening Stock (Negative nahi hona chahiye!) |
| discperc / Dis % | discount_percent | Discount Percent |
| isfav | is_favourite | Is Favourite? (Yes/No) |
| unitcode | unit_code | Unit Code |
| Unit | unit_name | Unit Name |
| itg | item_group_code | Item Group Code |
| itc | item_category_code | Item Category Code |
| dtcode | department_code | Department Code |
| kcode | k_code | K Code |
| brandcode | brand_code | Brand Code |
| Brand na / Brand name | brand_name | Brand Name |
| Main Category / MAIN CATEGORY | category_name | Category Name |
| Sub Category / SUB CATEGORY / SUBC ATEGORY | subcategory_name | Subcategory Name |
| and many more... | ... | ... |

### Lookup Process
1. For each Excel row:
   a. Category: `category_name` se lookup (categories table)
   b. Subcategory: `subcategory_name` se lookup (subcategories table)
   c. Brand: Pehle `brand_code` se, agar nahi mila to `brand_name` se
   d. Unit: Pehle `unit_code` se, agar nahi mila to `unit_name` se
   e. Department: `department_code` se
   f. Item Group: `item_group_code` se
   g. Item Category: `item_category_code` se
2. **Koi row skip nahi hota** (ab humne fix kiya hai!)
3. Agar code nahi milta to bas null rehta hai, row upload hota hai

---

## 5. Environment Variables Setup (.env file)
`.env.example` file ko copy karke `.env` banao aur apne values fill karo:
```env
# Supabase Configuration (Supabase Dashboard se le lo)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-very-long

# Admin PIN
VITE_ADMIN_SECURITY_PIN=1234
```
- **Important**: `.env` file kabhi git mein commit mat karo! (Already in .gitignore)

---

## 6. Local Development
1. Dependencies install karo:
   ```bash
   npm install
   ```
2. Dev server start karo:
   ```bash
   npm run dev
   ```
3. Browser mein open karo: http://localhost:5200

---

## 7. Build for Production
```bash
npm run build
```
- Build `dist` folder mein hoga
- Production mein console logs remove ho jayenge (vite.config.js mein `drop_console: true` set hai)

---

## 8. Deployment - Vercel
1. Vercel account connect karo (already connected hai, shayad)
2. Project repo select karo: `nmmartofficial/nmmarthostpanel`
3. Environment variables Vercel dashboard mein set karo (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_SECURITY_PIN)
4. Deploy!
- Auto deploy hota hai jab main branch par push karte hain!

---

## 9. Common Problems & Solutions

### Problem 1: Excel Upload mein Foreign Key Constraint Error
**Solution**: Check karo ki master tables (brands, units, item_groups, etc.) mein woh code ya name already exist hai ya nahi. Agar nahi hai to pehle master table mein add karo.

### Problem 2: Schema Cache Error
**Solution**: 
1. `supabase-schema.sql` ko Supabase SQL Editor mein run karo
2. Vercel deployment redeploy karo
3. Local browser cache clear karo ya hard refresh (Ctrl + Shift + R)

### Problem 3: ProductsView.jsx mein changes kaam nahi kar rahe
**Solution**:
1. Local dev server restart karo
2. Vite cache clear karo (`.vite` folder delete karo)
3. Browser hard refresh karo

### Problem 4: Koi master table add karna hai (jaise item_groups)
**Solution**:
1. `supabase-schema.sql` mein table add karo
2. `dbSchema.js` mein DB_SCHEMA mein entry add karo
3. (Agar zarurat ho) ProductsView.jsx mein lookup logic add karo

---

## 10. Important Rules (Hamesha Follow Karo!)
1. **Database Operations**: Kabhi bhi direct Supabase call mat karo! Always use `dbSync.js`!
2. **Schema Changes**: Pehle `supabase-schema.sql` mein change karo phir Supabase SQL Editor mein run karo!
3. **Soft Delete**: Data kabhi hard delete mat karo! Always use `is_active` column!
4. **Environment Variables**: `.env` file kabhi commit mat karo! (Already in .gitignore)
5. **Excel Upload Changes**: Sirf `ProductsView.jsx` ko hi modify karo!
6. **Git Workflow**:
   - Har change ke liye pehle `git status` check karo
   - `git add` se files stage karo
   - `git commit` se commit karo
   - `git push origin main` se push karo

---

## 11. Last Major Changes (July 1, 2026)
- **Modified**:
  - `supabase-schema.sql`: 
    - Added `code` columns to brands, unit_master, department_master
    - Added item_groups and item_categories tables
    - Added `image_url` column to subcategories table
    - Added RLS (Row Level Security) policies for all tables with admin full access
  - `src/App.jsx`:
    - Removed duplicate "Item Main Category" view
    - Updated CategoriesView and SubcategoriesView with custom column mapping
    - Added image upload support to SubcategoriesView
  - `src/pages/Inventory/ProductsView.jsx`:
    - Updated column mapping to include code columns
    - Implemented code-first lookup logic
    - Restored original behavior (no row skipping)
    - Added better error handling
  - `src/dbSync.js`:
    - Removed subcategories from upsert list (until unique constraint is properly applied)
    - Added safer insert logic
  - `src/components/MasterListView.jsx`:
    - Added custom column mapping support for different Excel formats
    - Added category name display instead of UUID for category_id fields
    - Improved image preview with fallback placeholders
    - Added console logging for debugging image fields
    - Added "category-search" and "product-search" field type support for searchable dropdowns
  - `PROJECT_DETAILS_HINDI.md`: This file! 😊

---

Agar koi aur problem aaye to pehle ye file check karo! Sab kuch yahi likha hai! 😊
