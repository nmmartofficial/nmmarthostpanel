import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtomicCheckoutPayload, validateAtomicCheckoutInput } from '../../utils/pos/atomicCheckout.js';

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
