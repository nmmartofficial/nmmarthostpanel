import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtomicCheckoutPayload, validateAtomicCheckoutInput } from '../../utils/pos/atomicCheckout.js';
import { buildBannerActionFields } from '../../utils/bannerActions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('atomic checkout rejects invalid quantity and underpayment', () => {
  assert.throws(() => validateAtomicCheckoutInput({
    cart: [{ id: 1, quantity: 0 }],
    totalAmount: 100,
    paidAmount: 100,
    paymentMethod: 'cash',
  }), /INVALID_QUANTITY/);

  assert.throws(() => validateAtomicCheckoutInput({
    cart: [{ id: 1, quantity: 1 }],
    totalAmount: 100,
    paidAmount: 99,
    paymentMethod: 'cash',
  }), /INSUFFICIENT_PAYMENT/);
});

test('atomic checkout preserves payment reference and canonical order items', () => {
  const payload = buildAtomicCheckoutPayload({
    cart: [{ id: 7, name: 'Rice', sale_rate: 50, quantity: 2 }],
    subtotal: 100,
    totalAmount: 100,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'CARD',
    paidAmount: 100,
    referenceNo: 'CARD-REF-1',
  });

  assert.equal(payload.payment.reference_no, 'CARD-REF-1');
  assert.equal(payload.items[0].product_id, 7);
  assert.equal(payload.items[0].total, 100);
});

test('production services contain no mock customer or generated transaction path', () => {
  const customerService = read('src/features/pos/customer/services/customer.service.ts');
  const paymentService = read('src/features/pos/payment/services/payment.service.ts');
  assert.doesNotMatch(customerService, /MOCK_CUSTOMERS|fallbackCustomers/);
  assert.doesNotMatch(paymentService, /generateMock|Math\.random\(\)/);
});

test('search layer does not use hardcoded mock products or fake payment success results', () => {
  const searchState = read('src/features/pos/hooks/search/useSearchState.ts');
  const searchHook = read('src/features/pos/hooks/search/useSearch.ts');
  const paymentService = read('src/features/pos/payment/services/payment.service.ts');

  assert.doesNotMatch(searchState, /MOCK_PRODUCTS|mockProducts:\s*MOCK_PRODUCTS/);
  assert.doesNotMatch(searchHook, /mockProducts|SearchService\.search\(mockProducts/);
  assert.doesNotMatch(paymentService, /PAYMENT_REQUIRES_ATOMIC_CHECKOUT|generateMock|Math\.random\(\)/);
});

test('active payment services do not directly mutate payment transactions', () => {
  const featurePaymentService = read('src/features/pos/payment/services/payment.service.ts');
  const legacyPaymentService = read('src/features/pos/services/payment.service.ts');

  assert.doesNotMatch(featurePaymentService, /dbSync\.(insert|update|upsert)\([^\n]*PAYMENT_TRANSACTIONS/);
  assert.doesNotMatch(legacyPaymentService, /dbSync\.(insert|update|upsert)\([^\n]*PAYMENT_TRANSACTIONS/);
  assert.match(featurePaymentService, /authoritative atomic checkout transaction/);
  assert.match(legacyPaymentService, /ATOMIC_CHECKOUT_REQUIRED/);
});

test('POS categories come from canonical data and have a real empty state', () => {
  const sidebar = read('src/features/pos/components/LeftSidebar.tsx');
  const categoryFilter = read('src/utils/pos/barcodeHelpers.js');

  assert.doesNotMatch(sidebar, /Groceries|Electronics|Clothing|Household/);
  assert.doesNotMatch(sidebar, /\[\s*['"]All Items['"]/);
  assert.match(sidebar, /usePOS/);
  assert.match(sidebar, /categories/);
  assert.match(sidebar, /No Categories Available/);
  assert.match(sidebar, /category\.id/);
  assert.match(categoryFilter, /p\.category_id/);
  assert.doesNotMatch(categoryFilter, /p\.category_name|p\.category\s*===/);
});

test('local POS test mode is development-only and blocks live checkout', () => {
  const localMode = read('src/utils/localPosTestMode.js');
  const authContext = read('src/context/AuthContext.jsx');
  const globalContext = read('src/context/GlobalContext.jsx');
  const posView = read('src/pages/POSView.jsx');
  const app = read('src/App.jsx');
  const checkoutService = read('src/features/pos/checkout/services/checkout.service.ts');
  const dbSync = read('src/dbSync.js');
  const dataLoader = read('src/utils/supabaseDataLoader.js');
  const protectedRoute = read('src/components/ProtectedRoute.jsx');
  const envLocal = read('.env.local');

  assert.match(localMode, /import\.meta\.env\.DEV\s*&&/);
  assert.match(envLocal, /VITE_LOCAL_POS_TEST_AUTH=true/);
  assert.match(envLocal, /VITE_LOCAL_POS_TEST_READS=true/);
  assert.match(authContext, /isLocalPosTestMode/);
  assert.match(authContext, /LOCAL_POS_TEST_USER/);
  assert.match(globalContext, /isLocalPosTestMode\s*&&\s*!isLocalPosReadOnlyMode/);
  assert.match(app, /isLocalPosTestMode\s*&&\s*!isLocalPosReadOnlyMode/);
  assert.match(posView, /Live checkout is disabled/);
  assert.match(checkoutService, /LOCAL_POS_TEST_MODE/);
  assert.match(dbSync, /live atomic mutations are disabled/);
  assert.match(dbSync, /isLocalPosReadOnlyMode/);
  assert.match(dbSync, /isLocalPosTestMode\s*&&\s*!isLocalPosReadOnlyMode/);
  assert.match(dataLoader, /isLocalPosTestMode\s*&&\s*!isLocalPosReadOnlyMode/);
  assert.match(protectedRoute, /if \(!isAuthenticated\)/);
  assert.doesNotMatch(localMode, /password|signInWithPassword|createUser/i);
});

test('atomic RPC contract locks stock rows before writing order side effects', () => {
  const rpc = read('supabase/migrations/functions/0207__harden_pos_checkout_v3.sql');
  assert.match(rpc, /FOR UPDATE/);
  assert.match(rpc, /INSUFFICIENT_STOCK/);
  assert.match(rpc, /INSERT INTO public\.order_items/);
  assert.match(rpc, /INSERT INTO public\.inventory_logs/);
  assert.match(rpc, /INSERT INTO public\.payment_transactions/);
});

test('atomic purchase contract owns stock receipt and inventory logging', () => {
  const purchaseRpc = read('supabase/migrations/functions/0206__create_purchase_atomic.sql');
  const purchaseEntry = read('src/pages/Inventory/PurchaseEntryView.jsx');
  const erpController = read('src/erpController.js');
  const dbSync = read('src/dbSync.js');

  assert.match(purchaseRpc, /CREATE OR REPLACE FUNCTION public\.create_purchase_atomic/);
  assert.match(purchaseRpc, /FOR UPDATE/);
  assert.match(purchaseRpc, /INSERT INTO public\.purchases/);
  assert.match(purchaseRpc, /INSERT INTO public\.purchase_items/);
  assert.match(purchaseRpc, /UPDATE public\.products/);
  assert.match(purchaseRpc, /INSERT INTO public\.inventory_logs/);
  assert.match(purchaseRpc, /INVALID_PRODUCT/);
  assert.match(purchaseRpc, /INVALID_QUANTITY/);
  assert.match(erpController, /ATOMIC_PURCHASE/);
  assert.match(dbSync, /create_purchase_atomic/);
  assert.match(purchaseEntry, /ACTION_TYPES\.ATOMIC_PURCHASE/);
  assert.doesNotMatch(purchaseEntry, /DB_SCHEMA\.PURCHASE_ITEMS\.table/);
  assert.doesNotMatch(purchaseEntry, /DB_SCHEMA\.PRODUCTS\.table/);
  assert.doesNotMatch(purchaseEntry, /DB_SCHEMA\.INVENTORY_LOGS\.table/);
});

test('purchase accounting and invoice idempotency gaps remain explicit', () => {
  const purchaseSchema = read('supabase/migrations/tables/0013__purchases.sql');
  const purchaseRpc = read('supabase/migrations/functions/0206__create_purchase_atomic.sql');
  assert.doesNotMatch(purchaseSchema, /UNIQUE[^\n]*invoice_number/i);
  assert.doesNotMatch(purchaseRpc, /payment_transactions/);
});

test('legacy PurchaseView is read-only and points users to PurchaseEntry', () => {
  const legacyPurchaseView = read('src/pages/Inventory/PurchaseView.jsx');
  const app = read('src/App.jsx');
  assert.doesNotMatch(legacyPurchaseView, /handleERPAction|ACTION_TYPES\.(INSERT|UPDATE|DELETE)/);
  assert.match(legacyPurchaseView, /New Purchase/);
  assert.match(app, /onNewPurchase=\{\(\) => props\.setActiveTab\('PurchaseEntry'\)\}/);
});

test('master high-risk mappings use canonical fields and wallet is atomic', () => {
  const app = read('src/App.jsx');
  const controller = read('src/erpController.js');
  const sync = read('src/dbSync.js');
  const master = read('src/components/MasterListView.jsx');
  const schema = read('src/dbSchema.js');

  assert.match(app, /name: 'min_order_amount'/);
  assert.doesNotMatch(app, /name: 'min_order_value'/);
  assert.match(app, /name: 'customer_id'/);
  assert.match(app, /name: 'phone'/);
  assert.match(app, /case 'WalletMaster': return <WalletView wallets=\{props\.wallets\}/);
  assert.doesNotMatch(app, /name: 'password'/);
  assert.doesNotMatch(schema, /ADMIN_USERS:\s*\{[\s\S]*password\s*:/);
  assert.match(controller, /ACTION_TYPES\.WALLET_ADJUST/);
  assert.match(controller, /adjust_wallet_atomic/);
  assert.match(sync, /functionName === 'adjust_wallet_atomic'/);
  assert.match(master, /requiredField/);
  assert.match(master, /A valid parent category is required/);
});

test('product edits allow independent main-category and subcategory selection', () => {
  const productsView = read('src/pages/Inventory/ProductsView.jsx');

  assert.match(productsView, /subcategories\.map\(s => <option key=\{s\.id\} value=\{s\.id\}>\{s\.name\}<\/option>\)/);
  assert.doesNotMatch(productsView, /does not belong to/);
  assert.doesNotMatch(productsView, /updates\.category_id\s*=/);
  assert.doesNotMatch(productsView, /Number\(s\.category_id\)\s*===\s*selectedCategoryId/);
});

test('product unit selector uses active Unit Master entries and preserves inactive existing units', () => {
  const app = read('src/App.jsx');
  const dbSync = read('src/dbSync.js');
  const productsView = read('src/pages/Inventory/ProductsView.jsx');

  assert.match(app, /dbSync\.fetch\(DB_SCHEMA\.UNITS\.table,\s*\{\s*includeDeleted:\s*true\s*\}\)/);
  assert.match(dbSync, /'unit_master'/);
  assert.match(productsView, /units = \[\]/);
  assert.match(productsView, /unit\.is_active !== false/);
  assert.match(productsView, /units\.length === 0 \? \['Nos', 'Pcs', 'Kg', 'Ltr', 'Box', 'Pkt'\] : uniqueUnits/);
  assert.match(productsView, /Inactive - existing/);
  assert.match(productsView, /unitcode: e\.target\.value/);
  assert.match(productsView, /<select required value=\{String\(formData\.unit/);
});

test('main category delete is permanent and restricted to the owning active super admin', () => {
  const master = read('src/components/MasterListView.jsx');
  const deletePolicy = read('supabase/migrations/20261003__secure_category_master_delete_rls.sql');
  const softDeleteTables = master.match(/const SOFT_DELETE_TABLES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';

  assert.doesNotMatch(softDeleteTables, /DB_SCHEMA\.CATEGORIES\.table/);
  assert.match(master, /table === DB_SCHEMA\.CATEGORIES\.table[\s\S]*permanently delete/);
  assert.match(deletePolicy, /ON public\.categories\s+FOR DELETE\s+TO authenticated/);
  assert.match(deletePolicy, /admin_user\.status = 'active'/);
  assert.match(deletePolicy, /admin_user\.role = 'super_admin'/);
  assert.match(deletePolicy, /admin_user\.tenant_id = categories\.tenant_id/);
  assert.match(deletePolicy, /admin_user\.company_code = categories\.company_code/);
});

test('Department Master exposes schema fields, filters inactive rows, and supports reversible soft delete', () => {
  const app = read('src/App.jsx');
  const dbSync = read('src/dbSync.js');
  const master = read('src/components/MasterListView.jsx');
  const softDeleteTables = master.match(/const SOFT_DELETE_TABLES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';

  assert.match(app, /name: 'code', label: 'Department Code'/);
  assert.match(app, /name: 'description', label: 'Description'/);
  assert.match(dbSync, /'department_master'/);
  assert.match(softDeleteTables, /DB_SCHEMA\.DEPARTMENTS\.table/);
  assert.match(master, /Show Inactive/);
  assert.match(master, /includeDeleted: true/);
  assert.match(master, /is_deleted: false/);
});

test('Account Master validates contact and tax identifiers and uses reversible inactive records', () => {
  const app = read('src/App.jsx');
  const master = read('src/components/MasterListView.jsx');
  const softDeleteTables = master.match(/const SOFT_DELETE_TABLES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';

  assert.match(app, /name: 'account_type'.*required: true/);
  for (const field of ['email', 'address', 'gst_no', 'pan_no', 'credit_limit']) {
    assert.match(app, new RegExp(`name: '${field}'`));
  }
  assert.match(softDeleteTables, /DB_SCHEMA\.ACCOUNTS\.table/);
  assert.match(master, /isAccountMaster && showInactiveAccounts/);
  assert.match(master, /valid 15-character GSTIN/);
  assert.match(master, /Enter a valid PAN/);
  assert.match(master, /Mobile number must be a valid 10-digit Indian mobile number/);
});

test('User Master disables login status consistently and protects administrator access', () => {
  const app = read('src/App.jsx');
  const master = read('src/components/MasterListView.jsx');
  const softDeleteTables = master.match(/const SOFT_DELETE_TABLES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';

  assert.match(app, /name: 'role', label: 'Role'.*required: true/);
  assert.match(app, /storedRoles/);
  assert.match(softDeleteTables, /DB_SCHEMA\.ADMIN_USERS\.table/);
  assert.match(master, /status: status \? 'active' : 'disabled'/);
  assert.match(master, /status: 'disabled'/);
  assert.match(master, /showInactiveAdminUsers/);
  assert.match(master, /You cannot disable your own User Master account/);
  assert.match(master, /At least one active Super Admin must remain/);
  assert.match(master, /Username or email is already assigned to another user/);
});

test('banner action payload resolves selected product, category, URL, and no-action states', () => {
  assert.deepEqual(buildBannerActionFields({
    linkType: 'product',
    productIds: [12, '12', 34]
  }), {
    link_type: 'product',
    link_id: '["12","34"]',
    linked_product_id: '12',
    action_type: 'product',
    action_value: '12',
    link_url: null
  });
  assert.deepEqual(buildBannerActionFields({
    linkType: 'category',
    categoryId: 56
  }), {
    link_type: 'category',
    link_id: '56',
    linked_product_id: null,
    action_type: 'category',
    action_value: '56',
    link_url: null
  });
  assert.equal(buildBannerActionFields({ linkType: 'url', targetUrl: 'https://example.com/shop' }).action_value, 'https://example.com/shop');
  assert.equal(buildBannerActionFields({ linkType: 'none' }).link_id, null);
});

test('Banner Master exposes required placement and target actions, preserving category targets', () => {
  const app = read('src/App.jsx');
  const master = read('src/components/MasterListView.jsx');
  const schema = read('src/dbSchema.js');

  assert.match(app, /name: 'banner_type', label: 'Placement', type: 'select', required: true/);
  assert.match(app, /name: 'link_type', label: 'Click Action', type: 'select', required: true/);
  assert.match(app, /value: 'top_slider'/);
  assert.match(app, /value: 'product_section'/);
  assert.match(app, /value: 'popup'/);
  assert.match(app, /value: 'app'/);
  assert.match(app, /value: 'url', label: 'Open URL'/);
  assert.match(master, /Choose at least one product for this banner/);
  assert.match(master, /Choose a valid category for this banner/);
  assert.match(master, /hasMultiProductField && \(!isBannerMaster \|\| finalData\.link_type === 'product'\)/);
  assert.match(schema, /action_type: 'action_type', action_value: 'action_value'/);
});

test('Banner linked-product Add opens product options when the search is blank', () => {
  const master = read('src/components/MasterListView.jsx');
  assert.match(master, /if \(!term\) \{\s*setShowMultiProductDropdown\(true\);\s*return;/);
  assert.match(master, /showMultiProductDropdown &&/);
  assert.match(master, /matches\.slice\(0, 20\)\.map/);
  assert.match(master, /No matching product found/);
  assert.match(master, /already linked to the banner/);
});

test('Master forms require only currently visible conditional fields', () => {
  const master = read('src/components/MasterListView.jsx');
  assert.match(master, /if \(!field\.required \|\| \(field\.condition && !field\.condition\(formData\)\)\) return false/);
});

test('Master edit forms normalize stored timestamps for date inputs', () => {
  const master = read('src/components/MasterListView.jsx');
  assert.match(master, /const toDateInputValue = \(value\) =>/);
  assert.match(master, /editedFormData\[field\.name\] = toDateInputValue\(item\[field\.name\]\)/);
});
