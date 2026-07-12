# NM MART - Admin Panel Complete Guide

## 1. Project Overview
**Project Name**: NM MART - Ultra Retail ERP Admin Panel  
**Purpose**: Comprehensive retail management system covering inventory, POS, orders, finance, customers, and analytics.  
**Tech Stack**:
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **PDF**: jsPDF + jsPDF-AutoTable
- **Excel/CSV**: xlsx
- **QR/Barcodes**: @yudiel/react-qr-scanner, jsbarcode
- **Notifications**: sonner

---

## 2. Folder Structure
```
nmmarthostpanel/
├── public/                          # Static assets
│   ├── favicon.ico
│   └── vite.svg
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── CartItem.jsx
│   │   ├── MasterListView.jsx
│   │   ├── NavDropdown.jsx
│   │   ├── PaginationFooter.jsx
│   │   ├── ProductCard.jsx
│   │   ├── Skeleton.jsx
│   │   └── ThermalReceipt.jsx
│   ├── context/                     # React Context
│   │   └── AppContext.jsx           # Global state management
│   ├── pages/                       # Page components
│   │   ├── Inventory/               # Inventory management pages
│   │   │   ├── EnhancedSuppliersView.jsx
│   │   │   ├── ProductsView.jsx
│   │   │   ├── PurchaseEntryView.jsx
│   │   │   ├── PurchaseView.jsx
│   │   │   ├── StockAlertsView.jsx
│   │   │   ├── StockLogsView.jsx
│   │   │   └── SuppliersView.jsx
│   │   ├── Orders/
│   │   │   └── OrdersView.jsx
│   │   ├── AnalyticsView.jsx
│   │   ├── AppConfigView.jsx
│   │   ├── CustomerAnalyticsView.jsx
│   │   ├── DashboardView.jsx
│   │   ├── ExpensesView.jsx
│   │   ├── HomeLayoutManager.jsx
│   │   ├── LoyaltyManagementView.jsx
│   │   ├── NotificationsView.jsx
│   │   ├── POSView.jsx
│   │   ├── ProfitLossView.jsx
│   │   ├── SelfCheckoutView.jsx
│   │   └── SupportTicketsView.jsx
│   ├── utils/                       # Helper functions
│   │   ├── helpers.js               # Tailwind class utils, UUID generator
│   │   ├── imageHandler.js          # Image processing (500x500 with padding)
│   │   └── security.js              # Security utilities (XSS, validation, etc.)
│   ├── App.jsx                      # Main app component (routing, auth)
│   ├── dbSchema.js                  # Database schema definitions
│   ├── dbSync.js                    # Database sync & CRUD operations
│   ├── erpController.js             # ERP action handlers
│   ├── ErrorBoundary.jsx            # Error boundary
│   ├── index.css                    # Global styles
│   ├── main.jsx                     # Entry point
│   └── supabase.js                  # Supabase client setup
├── supabase_migrations/             # Database migrations
│   ├── 001_add_unique_constraint_products.sql
│   ├── 002_add_missing_product_columns.sql
│   ├── 003_recreate_products_table.sql
│   ├── 004_fix_products_table.sql
│   └── 005_ultimate_fix_products_table.sql
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

---

## 3. Authentication
- **Method**: PIN-based authentication with email
- **Security Features**:
  - Login rate limiting (5 attempts, 5-minute lockout)
  - Secure storage (Base64 encoded)
  - Session timeout (30 minutes)
  - HTTPS enforcement (except localhost)
- **User Roles** (`dbSchema.js`):
  - `SUPER_ADMIN`: Full system access
  - `SALES_MANAGER`: POS, orders, customers
  - `INVENTORY_HEAD`: Products, categories, suppliers
  - `ACCOUNTANT`: Finance, expenses, profit/loss
- **Logout**: Clears local storage and session

---

## 4. Dashboard
- Quick stats for products, categories, orders, users
- Real-time updates via Supabase subscriptions
- Dark/light mode toggle
- Fullscreen mode
- Notifications with unread count

---

## 5. Modules (Key Features)

### Inventory Management
- **Products**: Add/edit/delete, import via Excel, barcode/QR support, stock alerts
- **Categories/Subcategories/Brands**: Soft delete, duplicate prevention
- **Suppliers**: Supplier management
- **Purchase Entry/View**: Record purchases
- **Stock Logs/Alerts**: Stock movement tracking and low-stock notifications

### Point of Sale (POS)
- Fast, modern POS interface
- Barcode scanning
- Cart management
- Thermal receipt printing
- GST invoice generation

### Orders & Customers
- Order management (Self-checkout, online orders)
- Customer analytics
- Loyalty program
- Wallet management
- Delivery management

### Finance
- Expense tracking
- Profit & loss statements
- Ledger view
- Payment reports

### Marketing
- Banner management
- Coupons/offers
- App/home layout configuration

### Reports
- Sale summary, sale bill/item reports
- Purchase/stock reports
- Customer analytics
- Expense reports

---

## 6. API Details (Supabase)

### Supabase Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key
3. Create `.env` from `.env.example`
4. Set up tables (refer to `dbSchema.js`)

### Environment Variables
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ADMIN_SECURITY_PIN=1234
```

### Supabase Client (`supabase.js`)
- Real Supabase client if valid credentials are provided
- Mock client as fallback for development
- Graceful error handling

---

## 7. State Management
- **Global State**: React Context (`AppContext.jsx`)
- **Managed States**:
  - Products, categories, subcategories, brands
  - Orders, users, notifications
  - Banners, coupons, offers
  - App config, stats
  - And many more (pincodes, wallet tx, addresses, cart, wishlist, admin users, credits, delivery boys, delivery customers, purchases, departments, units, accounts, inventory logs, expenses)
- **Real-time Updates**: Supabase subscriptions for key tables

---

## 8. UI Components
- **MasterListView.jsx**: Reusable CRUD list view with search, filter, pagination
- **PaginationFooter.jsx**: Pagination component
- **NavDropdown.jsx**: Navigation dropdown menu
- **ProductCard.jsx**: Product card for display
- **CartItem.jsx**: Cart item component
- **ThermalReceipt.jsx**: Receipt component
- **Skeleton.jsx**: Loading skeleton

---

## 9. Theme & Styling
- **Colors**: Custom primary/secondary colors (orange, dark grey)
- **Dark Mode**: Toggle with localStorage persistence
- **Festival Themes**: Diwali/Holi auto-apply
- **Responsive Design**: Fully responsive
- **Tailwind CSS**: Utility-first styling

---

## 10. Key Files Deep Dive

### `dbSchema.js`
- Defines all database tables and their keys
- Table constraints (unique, status flow, etc.)
- User roles and permissions

### `dbSync.js`
- Unified CRUD operations (insert, fetch, update, delete)
- Soft delete support for categories, subcategories, brands
- Bulk upsert for Excel imports
- Image upload/processing
- Audit logging
- Printer integration (ESC/POS commands, GST invoices)
- Excel export
- Wallet management

### `erpController.js`
- Modular action controller
- 54+ button actions
- `handleERPAction` function for unified action handling
- `parseERPCSV` for Excel/CSV parsing

### `imageHandler.js`
- Auto-trims white/transparent background
- Resizes to 500x500 with padding
- Exports as WebP (80% quality)

### `security.js`
- XSS sanitization
- Input validation (PIN, email, phone, etc.)
- Secure storage
- Login rate limiter
- Clickjacking prevention

---

## 11. Current Features (Completed)
✅ Inventory management (Products, categories, brands, suppliers)
✅ POS with barcode scanning
✅ Order management
✅ Expense tracking
✅ Profit & loss
✅ Customer management & loyalty
✅ Analytics (Charts, reports)
✅ Dark mode
✅ Festival themes
✅ Excel/CSV import/export
✅ Thermal receipt printing
✅ GST invoice generation
✅ QR/Barcode support
✅ Role-based access control
✅ Login rate limiting
✅ Secure storage
✅ Soft delete
✅ Real-time updates
✅ Duplicate entry prevention

---

## 12. How to Run

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup
1. Clone the repo:
   ```bash
   git clone https://github.com/nmmartofficial/nmmarthostpanel.git
   cd nmmarthostpanel
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open the local URL (usually `http://localhost:5200` or next available port)

---

## 13. Important Decisions & Conventions
- **Database-First**: Schema defined in `dbSchema.js`, migrations in `supabase_migrations/`
- **Soft Delete**: Categories, subcategories, brands use soft delete
- **Image Handling**: 500x500 WebP with white padding
- **Security**: Input sanitization, XSS protection, rate limiting
- **Reusable Components**: `MasterListView` for all CRUD lists
- **Modular Actions**: `erpController.js` for all button actions
- **State Management**: React Context for global state, Supabase subscriptions for real-time

---

## 14. Next Steps
1. Set up your Supabase project and run migrations
2. Test all modules end-to-end
3. Add any missing features as needed
4. Deploy to Vercel (or your preferred host)

---

For any issues, contact the NM MART development team!
