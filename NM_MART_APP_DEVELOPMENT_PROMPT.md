# NM MART Customer App - Complete Development Prompt (100% Sync with Admin Panel)

Use this prompt to build the customer-facing app that perfectly syncs with the NM MART Admin Panel!

---

## Project Context:
- **Project Name**: NM MART Customer App
- **Admin Panel Repo**: https://github.com/nmmartofficial/nmmarthostpanel
- **Tech Stack**: Native Android (Java/Kotlin) - NO cross-platform!
- **Backend**: Same Supabase project as admin panel
- **Admin Panel Local Port**: 5200
- **Database Schema**: Same as `supabase-schema.sql` from admin panel

## Core Rules (No Compromise!):
1. **100% Database Sync**: Use EXACT SAME Supabase schema, tables, and columns as admin panel
2. **Read-Only Data**: App should only READ data - ALL writes (orders, wallet, etc.) go through admin panel's existing `dbSync.js`/`erpController.js` patterns
3. **Respect `is_active` Filter**: Only show products, categories, brands, banners where `is_active = true`
4. **Stock Safety**: Never let customers order products with `stock <= 0`
5. **Theme Consistency**: Use app config from `app_config` table (primary_color, secondary_color, accent_color, store_name)
6. **Home Layout**: Use `home_config` table to decide what sections to show on home screen
7. **Real-time Sync**: Use Supabase real-time subscriptions to update app immediately when admin makes changes

## Database Schema (Must Follow EXACTLY):
(Use same as admin panel's `supabase-schema.sql`)

**Key Tables for App**:
1. **app_config**: Store theme, store name, security PIN
2. **banners**: Home screen banners (filter: `is_active = true`)
3. **categories**: Main categories (filter: `is_active = true`)
4. **subcategories**: Subcategories (filter: `is_active = true`)
5. **brands**: Brands (filter: `is_active = true`)
6. **products**: Products (filter: `is_active = true`, `is_live_on_app = true`, `stock > 0`)
7. **offers**: Active offers (filter: `is_active = true`)
8. **coupons**: Active coupons (filter: `is_active = true`)
9. **orders**: Customer orders
10. **users**: App users
11. **wallet_master**: Customer wallets
12. **wallet_transactions**: Wallet history
13. **addresses**: Customer delivery addresses
14. **cart**: User shopping carts
15. **wishlist**: User wishlists
16. **notifications**: App notifications

## Admin Panel → App Sync Rules:
1. **Home Screen**:
   - Use `home_config` table to build home screen sections (banner_slider, category_grid, product_scroll, promo_banner)
   - Only show sections where `is_active = true`
   - Order sections by `order_index`

2. **Product Listings**:
   - Show only products where: `is_active = true`, `is_live_on_app = true`, `stock > 0`
   - Display: `name`, `image_url`, `mrp`, `sale_rate`, `discount_percent`, `stock`, `category_name`, `brand_name`, `size`, `color`
   - Use `basic_sale_price` if available
   - Never show negative stock - sanitize with `Math.max(0, product.stock)`

3. **Categories & Subcategories**:
   - Only show categories/subcategories with `is_active = true`
   - Use `position` column to sort them
   - Subcategories link to their parent category via `category_id`

4. **Orders**:
   - Create orders in `orders` table with all required fields
   - Calculate totals consistently with admin panel
   - Update product stock atomically (use admin panel's `place_order_atomic` PostgreSQL function if available!)
   - Log stock changes in `inventory_logs` table

5. **Wallet & Loyalty**:
   - Use `wallet_master` and `wallet_transactions` tables EXACTLY as admin panel
   - Use `adjust_wallet_atomic` PostgreSQL function for atomic updates
   - Loyalty points: Use `customer_loyalty` and `loyalty_tiers` tables

## App Features (Must Have):
1. **Home Screen**:
   - Dynamic sections from `home_config`
   - Banner slider (from `banners` table) with click actions:
     - Use `link_type` field to determine what happens when banner is tapped:
       - `none`: No action (just display)
       - `product`: Navigate to product details (use `linked_product_id`)
       - `category`: Navigate to category product list (use `linked_category_id`)
       - `url`: Open external URL in browser (use `link_url`)
     - Order banners by `position` column
   - Categories grid
   - Featured products scroll
   - Promo banners
   - Festival theme (from `festivals` table)

2. **Product Categories**:
   - Main categories list
   - Subcategories navigation
   - Product listing with filters (category, subcategory, brand, price range, size, color)
   - Product search (by name, barcode, hsn_code)

3. **Product Details**:
   - Full product info with images
   - Size/color variants (if available)
   - Add to cart/wishlist
   - Stock indicator
   - Offer/coupon applicability

4. **Shopping Cart**:
   - Cart stored in `cart` table
   - Quantity management
   - Real-time stock check
   - Coupon application
   - Wallet balance use
   - Delivery charge calculation (from `pincodes` table)

5. **Checkout**:
   - Address selection (from `addresses` table)
   - Payment method selection
   - Order summary
   - Place order (atomic operation!)

6. **Orders History**:
   - List of user's orders
   - Order details screen
   - Track order status
   - Reorder option

7. **User Profile**:
   - Wallet balance
   - Loyalty points
   - Address management
   - Order history
   - Notifications

8. **Festival Themes**:
   - Auto-detect active festivals from `festivals` table
   - Apply theme colors and UI changes
   - Show festival offers

## Important Rules to Avoid Mismatch:
1. **NO DIRECT DATABASE ALTERATIONS**: Never change the schema without updating admin panel first!
2. **COPY ADMIN PANEL LOGIC**: Use same calculation methods for totals, discounts, GST, etc.
3. **AUDIT LOGS**: Always write to `system_logs` and `inventory_logs` tables, same as admin panel
4. **SOFT DELETES**: Never hard delete anything - use `is_active = false`
5. **TEST WITH ADMIN PANEL**: After building any feature, test that admin panel sees the changes correctly!

## Tech Stack Recommendation:
- **Native Android**: Java OR Kotlin (developer's choice) - NO React Native/Flutter!
- **Architecture**: MVVM (Model-View-ViewModel)
- **Supabase SDK**: Use official Supabase Android SDK for database operations
- **Image Loading**: Glide OR Picasso
- **Networking**: Retrofit (if building API layer) OR direct Supabase SDK
- **Local Storage**: Room Database (for caching products, cart, etc.)
- **UI Components**: Material Design 3 (match admin panel's theme colors)
