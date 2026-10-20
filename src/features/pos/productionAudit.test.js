import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtomicCheckoutPayload, validateAtomicCheckoutInput } from '../../utils/pos/atomicCheckout.js';
import { buildBannerActionFields } from '../../utils/bannerActions.js';
import {
  buildWalletIntelligenceKpis,
  enrichWalletCustomer,
  formatWalletCurrency,
  getWalletActivityStatus,
  getWalletPeriodStart,
  getWalletTrendDirection,
} from '../../utils/walletIntelligence.js';

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

test('Touch Sale uses one cart table and a click-to-show text-only product panel', () => {
  const layout = read('src/features/pos/layout/POSLayout.tsx');
  const billingPanel = read('src/components/CartPanel.jsx');
  const productPanel = read('src/features/pos/components/RightSidebar.tsx');
  const productCard = read('src/components/ProductCard.jsx');

  for (const heading of ['Sr. No.', 'Item Name', 'MRP', 'Qty', 'Disc %', 'GST %', 'Sale Rate', 'Total']) {
    assert.ok(billingPanel.includes(heading), `bill table must expose ${heading}`);
  }
  assert.match(layout, /minmax\(0,var\(--pos-billing-ratio\)\)_minmax\(20rem,1fr\)/);
  assert.match(productPanel, /aria-pressed=\{showTrending\}/);
  assert.match(productPanel, /setShowTrending\(\(visible\) => !visible\)/);
  assert.match(productPanel, /buildTopSellingProducts/);
  assert.match(productCard, /getCartUnitPrice/);
  assert.doesNotMatch(productCard, /<img|resolveProductImageUrl|No Image/);
  assert.match(billingPanel, /handlePriceChangeAttempt/);
  assert.match(billingPanel, /handleHoldBill/);
  assert.match(billingPanel, /setShowDiscountPanel/);
  assert.match(billingPanel, /setShowPaymentModal/);
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

test('authoritative checkout decrements scoped product stock atomically before logging movement', () => {
  const rpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  const stockUpdate = rpc.indexOf('UPDATE public.products AS product');
  const inventoryLog = rpc.indexOf('INSERT INTO public.inventory_logs', stockUpdate);
  const returnOrderId = rpc.indexOf('RETURN v_order_id', inventoryLog);
  const checkoutStart = rpc.indexOf('CREATE OR REPLACE FUNCTION public.place_order_atomic');
  const checkoutEnd = rpc.indexOf('REVOKE ALL ON FUNCTION public.place_order_atomic', checkoutStart);
  const checkoutRpc = rpc.slice(checkoutStart, checkoutEnd);

  assert.ok(stockUpdate > checkoutStart);
  assert.ok(inventoryLog > stockUpdate);
  assert.ok(returnOrderId > inventoryLog);
  assert.match(checkoutRpc, /FOR UPDATE/);
  assert.match(checkoutRpc, /SET stock = product\.stock - \(line->>'quantity'\)::NUMERIC/);
  assert.match(checkoutRpc, /product\.tenant_id = v_tenant_id/);
  assert.match(checkoutRpc, /product\.company_code = v_company_code/);
  assert.match(checkoutRpc, /product\.stock >= \(line->>'quantity'\)::NUMERIC/);
  assert.match(checkoutRpc, /v_stock_update_count <> jsonb_array_length\(v_prepared_lines\)/);
  assert.match(checkoutRpc, /RAISE EXCEPTION 'POS_STOCK_UPDATE_FAILED'/);
});

test('authoritative POS RPC persists order, item, and payment rows before returning confirmation', () => {
  const rpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  const orderInsert = rpc.indexOf('INSERT INTO public.orders');
  const itemInsert = rpc.indexOf('INSERT INTO public.order_items', orderInsert);
  const paymentInsert = rpc.indexOf('INSERT INTO public.payment_transactions', itemInsert);
  const returnOrderId = rpc.indexOf('RETURN v_order_id', paymentInsert);

  assert.ok(orderInsert >= 0);
  assert.ok(itemInsert > orderInsert);
  assert.ok(paymentInsert > itemInsert);
  assert.ok(returnOrderId > paymentInsert);
});

test('POS invoice is exposed only after backend checkout confirmation', () => {
  const posView = read('src/pages/POSView.jsx');
  const checkoutStart = posView.indexOf('const orderRes = await handleERPAction');
  const backendFailureCheck = posView.indexOf('if (!orderRes.success)', checkoutStart);
  const receiptOpen = posView.indexOf('setShowReceiptDialog(true)', checkoutStart);
  const persistedInvoiceLoad = posView.indexOf('await loadPersistedInvoice(orderId)', checkoutStart);

  assert.notEqual(checkoutStart, -1);
  assert.ok(backendFailureCheck > checkoutStart);
  assert.ok(receiptOpen > backendFailureCheck);
  assert.ok(persistedInvoiceLoad > receiptOpen);
  assert.match(posView, /fetchPersistedPOSInvoice\(supabase/);
  assert.doesNotMatch(posView, /order_number:\s*`POS-\$\{orderId\}`/);
});

test('atomic checkout returns the saved order id without client invoice generation', () => {
  const rpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  const checkout = read('src/utils/pos/atomicCheckout.js');

  assert.match(rpc, /'POS-' \|\| gen_random_uuid\(\)::TEXT/);
  assert.match(rpc, /RETURNING id INTO v_order_id/);
  assert.match(rpc, /RETURN v_order_id/);
  assert.match(checkout, /transaction_id:\s*transactionId/);
  assert.doesNotMatch(checkout, /order_number\s*:/);
});

test('atomic checkout carries proportional discount remainder into the final persisted line', () => {
  const rpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  assert.match(rpc, /v_last_eligible_index BIGINT/);
  assert.match(rpc, /v_last_eligible_index := v_line_index/);
  assert.match(rpc, /IF v_line_index \+ 1 = v_last_eligible_index THEN\s+v_allocated_discount := ROUND\(v_global_discount - v_allocated_so_far, 2\)/);
  assert.match(rpc, /POS_DISCOUNT_ALLOCATION_INVALID/);
  assert.match(rpc, /v_allocated_so_far := v_allocated_so_far \+ v_allocated_discount/);
  assert.match(rpc, /'discount_amount', v_line_discount,[\s\S]*?'gst_amount', v_line_gst,[\s\S]*?'total', v_net_amount/);
});

test('authoritative POS checkout restricts direct RPC calls to POS roles', () => {
  const rpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  assert.match(rpc, /LOWER\(BTRIM\(COALESCE\(v_admin\.role, ''\)\)\) NOT IN \([\s\S]*?'super_admin'[\s\S]*?'admin'[\s\S]*?'manager'[\s\S]*?'cashier'/);
  assert.match(rpc, /RAISE EXCEPTION 'POS_ROLE_NOT_AUTHORIZED'/);
});

test('checkout transaction reference is not yet a server-side idempotency key', () => {
  const rpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  const checkoutStart = rpc.indexOf('CREATE OR REPLACE FUNCTION public.place_order_atomic');
  const checkoutEnd = rpc.indexOf('REVOKE ALL ON FUNCTION public.place_order_atomic', checkoutStart);
  const checkoutRpc = rpc.slice(checkoutStart, checkoutEnd);
  const checkout = read('src/utils/pos/atomicCheckout.js');

  assert.match(checkout, /transaction_id:\s*transactionId/);
  assert.doesNotMatch(checkoutRpc, /transaction_id|idempotency_key/i);
});

test('return idempotency replay is bound to the original processor and active store scope', () => {
  const migration = read('supabase/migrations/20261020__pos_step7_returns_refunds_shifts.sql');
  const replayStart = migration.indexOf('WHERE return_row.idempotency_key = p_idempotency_key');
  const replayEnd = migration.indexOf('SELECT refund.id', replayStart);
  const replayCheck = migration.slice(replayStart, replayEnd);

  assert.match(replayCheck, /v_existing\.auth_user_id <> auth\.uid\(\)/);
  assert.match(replayCheck, /v_existing\.processed_by_admin_user_id <> v_admin\.id/);
  assert.match(replayCheck, /order_row\.tenant_id = v_admin\.tenant_id/);
  assert.match(replayCheck, /order_row\.company_code = v_admin\.company_code/);
});

test('POS cart discard and cashier session summary do not claim a saved-sale void or drawer reconciliation', () => {
  const posView = read('src/pages/POSView.jsx');
  const voidDialog = read('src/components/VoidDialog.jsx');
  const shiftDashboard = read('src/components/ShiftDashboard.jsx');

  assert.match(voidDialog, /clears the unsaved cart only/);
  assert.match(voidDialog, /does not cancel a saved order or issue a refund/);
  assert.match(posView, /Unsaved cart discarded/);
  assert.match(shiftDashboard, /Cashier Session Summary/);
  assert.match(shiftDashboard, /Cashier: .*Unavailable/);
  assert.match(shiftDashboard, /not a cash reconciliation/);
  assert.doesNotMatch(shiftDashboard, /Cash In Drawer|Live Operational Data|Terminal: POS-01/);
});

test('return UI calls the scoped atomic RPC and labels refunds as pending requests', () => {
  const returnDialog = read('src/modules/pos/dialogs/ReturnDialog.jsx');
  const paymentService = read('src/features/pos/payment/services/payment.service.ts');
  const ordersView = read('src/pages/Orders/OrdersView.jsx');
  const statusMigration = read('supabase/migrations/20261005__secure_order_status_updates.sql');
  const step7Migration = read('supabase/migrations/20261020__pos_step7_returns_refunds_shifts.sql');
  const returnHandlerStart = ordersView.indexOf('const handleReturnOrder');
  const returnHandlerEnd = ordersView.indexOf('/*\n   * ============================================================\n   * RENDER', returnHandlerStart);
  const returnHandler = ordersView.slice(returnHandlerStart, returnHandlerEnd);

  assert.match(returnDialog, /Returns and refunds are unavailable/);
  assert.match(returnDialog, /No return or payment has been\s+processed/);
  assert.doesNotMatch(returnDialog, /mockInvoice|onProcessReturn|Process Return/);
  assert.match(ordersView, /pos_order_returnable_items/);
  assert.match(returnHandler, /process_pos_return/);
  assert.match(returnHandler, /p_idempotency_key/);
  assert.match(ordersView, /refund request; it does not confirm money transfer/);
  assert.match(ordersView, /restockable: item\.restockable === true/);
  assert.match(step7Migration, /POS_RETURN_QUANTITY_EXCEEDS_REMAINING/);
  assert.match(step7Migration, /refund_status.*'pending'/);
  assert.match(step7Migration, /IF \(v_input->>'restockable'\)::BOOLEAN IS TRUE THEN/);
  assert.match(statusMigration, /'returned'/);
  assert.match(statusMigration, /admin_user\.tenant_id = order_row\.tenant_id/);
  assert.doesNotMatch(statusMigration, /payment_transactions|inventory_logs|order_items/);
  assert.match(paymentService, /REFUND_REQUIRES_ATOMIC_TRANSACTION/);
  assert.match(paymentService, /success:\s*false/);
});

test('cashier sales are assigned to an open shift and the UI requires backend shift confirmation', () => {
  const checkoutRpc = read('supabase/migrations/functions/0208__authoritative_pos_pricing_overrides.sql');
  const step7Migration = read('supabase/migrations/20261020__pos_step7_returns_refunds_shifts.sql');
  const posView = read('src/pages/POSView.jsx');
  const shiftDashboard = read('src/components/ShiftDashboard.jsx');

  assert.match(checkoutRpc, /POS_CASHIER_SHIFT_REQUIRED/);
  assert.match(checkoutRpc, /cashier_shift_id/);
  assert.match(checkoutRpc, /FOR SHARE/);
  assert.match(posView, /pos_cashier_shift_current/);
  assert.match(posView, /Open a cashier shift before completing a sale/);
  assert.match(shiftDashboard, /openCashierShift/);
  assert.match(shiftDashboard, /recordCashierMovement/);
  assert.match(shiftDashboard, /closeCashierShift/);
  assert.match(shiftDashboard, /Counted closing cash/);
  assert.match(shiftDashboard, /Record movement/);
  assert.match(step7Migration, /POS_MIXED_TENDER_RECONCILIATION_UNAVAILABLE/);
  assert.match(step7Migration, /POS_SHIFT_IDEMPOTENCY_KEY_CONFLICT/);
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
  assert.match(app, /case 'WalletMaster': return <WalletMasterView \/>/);
  assert.doesNotMatch(app, /name: 'password'/);
  assert.doesNotMatch(schema, /ADMIN_USERS:\s*\{[\s\S]*password\s*:/);
  assert.match(controller, /ACTION_TYPES\.WALLET_ADJUST/);
  assert.match(controller, /executeAtomic\('admin_adjust_wallet_atomic'/);
  assert.match(controller, /p_tenant_id: payload\?\.tenant_id/);
  assert.match(sync, /admin_adjust_wallet_atomic/);
  assert.doesNotMatch(sync, /['"]adjust_wallet_atomic['"]/);
  assert.match(master, /requiredField/);
  assert.match(master, /A valid parent category is required/);
});

test('wallet customer logins are manually linked through tenant-scoped admin RPCs', () => {
  const app = read('src/App.jsx');
  const walletView = read('src/pages/WalletMasterView.jsx');
  const sync = read('src/dbSync.js');
  const migration = read('supabase/migrations/20261005__wallet_customer_auth_links.sql');

  assert.match(app, /import WalletMasterView from '\.\/pages\/WalletMasterView'/);
  assert.match(walletView, /supabase\.rpc\('admin_list_wallet_login_candidates'\)/);
  assert.match(walletView, /supabase\.rpc\('admin_list_wallet_link_customers'\)/);
  assert.match(walletView, /supabase\.rpc\('admin_link_wallet_customer'/);
  assert.match(walletView, /dbSync\.executeAtomic\('admin_adjust_wallet_atomic'/);
  assert.match(walletView, /p_tenant_id: adjustment\.customer\.tenant_id/);
  assert.match(walletView, /p_company_code: adjustment\.customer\.company_code/);
  assert.match(sync, /'admin_adjust_wallet_atomic'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.customer_auth_links/);
  assert.match(migration, /auth_user_id UUID PRIMARY KEY REFERENCES auth\.users/);
  assert.match(migration, /CONSTRAINT customer_auth_links_tenant_customer_unique UNIQUE/);
  assert.match(migration, /admin_user\.role = 'super_admin'/);
  assert.match(migration, /admin_user\.tenant_id = p_tenant_id/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_link_wallet_customer/);
});

test('wallet account and customer dropdowns load independently from wallet intelligence', () => {
  const walletView = read('src/pages/WalletMasterView.jsx');

  assert.match(walletView, /Promise\.allSettled\(\[/);
  assert.match(walletView, /setLoginCandidates\(loginData\)/);
  assert.match(walletView, /setCustomerCandidates\(customerData\)/);
  assert.match(walletView, /linkLoadErrors\.login/);
  assert.match(walletView, /linkLoadErrors\.customer/);
  assert.doesNotMatch(walletView, /catch \(loadError\)[\s\S]*setLoginCandidates\(\[\]\)[\s\S]*setCustomerCandidates\(\[\]\)/);
});

test('linked wallet customers remain visible when intelligence analytics fail', () => {
  const walletView = read('src/pages/WalletMasterView.jsx');
  const profileMigration = read('supabase/migrations/20261005__wallet_customer_profile.sql');

  assert.match(walletView, /supabase\.rpc\('admin_list_wallet_customers'\)/);
  assert.match(walletView, /supabase\.rpc\('admin_wallet_intelligence'\)/);
  assert.match(walletView, /analyticsWarning/);
  assert.match(walletView, /linkedCustomersData\.map/);
  assert.match(walletView, /account_linked: true/);
  assert.match(walletView, /Account Linked/);
  assert.match(walletView, /supabase\.rpc\('admin_wallet_customer_profile'/);
  assert.match(profileMigration, /admin_user\.tenant_id = p_tenant_id/);
  assert.match(profileMigration, /admin_user\.company_code = p_company_code/);
  assert.match(profileMigration, /FROM public\.customer_auth_links AS account_link/);
  assert.match(profileMigration, /LEFT JOIN LATERAL/);
  assert.match(profileMigration, /'linked_login_email'/);
  assert.match(profileMigration, /GRANT EXECUTE ON FUNCTION public\.admin_wallet_customer_profile[\s\S]*TO authenticated/);
  assert.doesNotMatch(profileMigration, /(?:INSERT|UPDATE|DELETE)\s+INTO\s+public\.(?:orders|wallet_master|wallet_transactions)/i);
});

test('wallet credits and debits stay in the wallet balance and transaction ledger', () => {
  const walletView = read('src/pages/WalletMasterView.jsx');
  const sync = read('src/dbSync.js');
  const migration = read('supabase/migrations/20261005__secure_login_wallet_customers.sql');

  assert.match(walletView, /dbSync\.executeAtomic\('admin_adjust_wallet_atomic'/);
  assert.match(sync, /'admin_adjust_wallet_atomic'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.admin_adjust_wallet_atomic/);
  assert.match(migration, /INSERT INTO public\.wallet_master/);
  assert.match(migration, /INSERT INTO public\.wallet_transactions/);
  assert.doesNotMatch(migration, /INSERT INTO public\.orders/);
  assert.doesNotMatch(walletView, /admin_credit_wallet_with_order_atomic|(?:insert|update|upsert)\(['"]orders/i);
  assert.match(walletView, /existing secured wallet RPC and wallet ledger\. No sales order is created/i);
});

test('wallet intelligence reads are tenant-scoped and never write order or wallet records', () => {
  const walletView = read('src/pages/WalletMasterView.jsx');
  const migration = read('supabase/migrations/20261005__wallet_intelligence_reads.sql');

  assert.match(walletView, /supabase\.rpc\('admin_wallet_intelligence'\)/);
  assert.match(walletView, /supabase\.rpc\('admin_wallet_customer_profile'/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /admin_user\.role = 'super_admin'/);
  assert.match(migration, /admin_user\.tenant_id = p_tenant_id/);
  assert.match(migration, /admin_user\.company_code = p_company_code/);
  assert.match(migration, /LOWER\(COALESCE\(order_row\.order_status, order_row\.status, ''\)\) = 'delivered'/);
  assert.doesNotMatch(migration, /paid_orders_count|known_payment_orders_count/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.admin_wallet_intelligence/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.admin_wallet_customer_detail/);
  assert.doesNotMatch(migration, /(?:INSERT|UPDATE|DELETE)\s+INTO\s+public\.(?:orders|wallet_master|wallet_transactions)/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_wallet_intelligence\(\) TO authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_wallet_customer_detail/);
});

test('wallet hardening revokes legacy RPC and direct client writes', () => {
  const controller = read('src/erpController.js');
  const app = read('src/App.jsx');
  const sync = read('src/dbSync.js');
  const migration = read('supabase/migrations/20261005__harden_wallet_access.sql');

  assert.match(controller, /executeAtomic\('admin_adjust_wallet_atomic'/);
  assert.match(controller, /p_company_code: payload\?\.company_code/);
  assert.match(app, /tenant_id: currentUser\?\.tenant_id,[\s\S]*company_code: currentUser\?\.company_code/);
  assert.doesNotMatch(sync, /['"]adjust_wallet_atomic['"]/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.adjust_wallet_atomic\(BIGINT, NUMERIC, TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.wallet_master, public\.wallet_transactions\s+FROM PUBLIC, anon/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER/);
  assert.match(migration, /CREATE POLICY wallet_master_admin_read[\s\S]*TO authenticated[\s\S]*auth\.uid\(\) IS NOT NULL/);
  assert.match(migration, /CREATE POLICY wallet_transactions_admin_read[\s\S]*admin_user\.tenant_id = wallet_transactions\.tenant_id[\s\S]*admin_user\.company_code = wallet_transactions\.company_code/);
  assert.doesNotMatch(migration, /USING\s*\(\s*true\s*\)/i);
});

test('wallet intelligence helpers preserve unknown data and approved activity windows', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const day = 86_400_000;
  const customer = {
    orders_count: 2,
    lifetime_shopping: 100,
    spend_90d: 50,
    last_purchase: new Date(Date.now() - 31 * day).toISOString(),
    wallet_balance: 20,
    recommendation: 'review',
  };
  const enriched = enrichWalletCustomer(customer, [customer]);

  assert.equal(getWalletActivityStatus(new Date(now.getTime() - 30 * day).toISOString(), now.getTime()), 'active');
  assert.equal(getWalletActivityStatus(new Date(now.getTime() - 31 * day).toISOString(), now.getTime()), 'low_activity');
  assert.equal(getWalletActivityStatus(new Date(now.getTime() - 90 * day).toISOString(), now.getTime()), 'low_activity');
  assert.equal(getWalletActivityStatus(new Date(now.getTime() - 91 * day).toISOString(), now.getTime()), 'inactive');
  assert.equal(enriched.activity_status, 'low_activity');
  assert.equal(enriched.payment_history, 'No History');
  assert.equal(enriched.recommendation, 'review');
  assert.equal(enriched.suggested_limit, null);
  assert.ok(enriched.score <= 100);
  assert.equal(enriched.score_components.paymentHistory, undefined);
  assert.equal(formatWalletCurrency(null), '—');
  assert.equal(buildWalletIntelligenceKpis([enriched]).outstandingCredit, null);
  assert.equal(getWalletPeriodStart('Lifetime', now), null);
  assert.equal(getWalletPeriodStart('6 Months', now).toISOString(), '2025-07-01T00:00:00.000Z');
});

test('wallet intelligence exposes completed-customer activity, trend direction, and unknown credit data', () => {
  const customers = [
    { activity_status: 'active', wallet_balance: 25, lifetime_shopping: 100, recommendation: 'review' },
    { activity_status: 'low_activity', wallet_balance: 0, lifetime_shopping: 0, recommendation: 'review' },
    { activity_status: 'inactive', wallet_balance: 5, lifetime_shopping: 50, recommendation: 'review' },
  ];
  const kpis = buildWalletIntelligenceKpis(customers);

  assert.equal(kpis.totalCustomers, 3);
  assert.equal(kpis.activeCustomers, 1);
  assert.equal(kpis.lowActivityCustomers, 1);
  assert.equal(kpis.inactiveCustomers, 1);
  assert.equal(kpis.totalWalletBalance, 30);
  assert.equal(kpis.outstandingCredit, null);
  assert.equal(getWalletTrendDirection([{ amount: 10 }, { amount: 15 }, { amount: 20 }, { amount: 25 }]), 'increasing');
  assert.equal(getWalletTrendDirection([{ amount: 25 }, { amount: 20 }, { amount: 15 }, { amount: 10 }]), 'decreasing');
  assert.equal(getWalletTrendDirection([{ amount: 10 }, { amount: 11 }, { amount: 10 }, { amount: 11 }]), 'stable');
  assert.equal(getWalletTrendDirection([{ amount: 0 }, { amount: 0 }]), 'inactive');
  assert.equal(getWalletTrendDirection([{ amount: 10 }]), 'insufficient_data');
});

test('wallet master keeps linked profiles independent and only scores verified delivered shopping', () => {
  const walletView = read('src/pages/WalletMasterView.jsx');
  const intelligenceMigration = read('supabase/migrations/20261005__wallet_intelligence_reads.sql');
  const profileMigration = read('supabase/migrations/20261005__wallet_customer_profile_summary.sql');
  const schema = read('src/dbSchema.js');

  assert.match(walletView, /'Low Activity'/);
  assert.match(walletView, /'Inactive Customers'/);
  assert.match(walletView, /'Average Order'/);
  assert.match(walletView, /'1Y Spend'/);
  assert.match(walletView, /wallet_credit_total/);
  assert.match(walletView, /wallet_debit_total/);
  assert.match(walletView, /getWalletTrendDirection/);
  assert.match(intelligenceMigration, /customer\.created_at/);
  assert.match(intelligenceMigration, /'low_activity_customers'/);
  assert.match(intelligenceMigration, /LOWER\(COALESCE\(order_row\.order_status, order_row\.status, ''\)\) = 'delivered'/);
  assert.match(profileMigration, /admin_user\.tenant_id = p_tenant_id/);
  assert.match(profileMigration, /admin_user\.company_code = p_company_code/);
  assert.match(profileMigration, /wallet_credit_total/);
  assert.match(profileMigration, /wallet_debit_total/);
  assert.match(profileMigration, /GRANT EXECUTE ON FUNCTION public\.admin_wallet_customer_profile[\s\S]*TO authenticated/);
  assert.match(schema, /status_flow: \['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'\]/);
  assert.doesNotMatch(profileMigration, /(?:INSERT|UPDATE|DELETE)\s+INTO\s+public\.(?:orders|wallet_master|wallet_transactions)/i);
});

test('order detail status changes require a confirmed Supabase row update', () => {
  const ordersView = read('src/pages/Orders/OrdersView.jsx');
  const migration = read('supabase/migrations/20261005__secure_order_status_updates.sql');

  assert.match(ordersView, /supabase\.rpc\(\s*'admin_update_order_status'/);
  assert.match(ordersView, /!updatedOrder[\s\S]*String\(updatedOrder\.id\) !== String\(id\)[\s\S]*updatedOrder\.order_status !== status/);
  assert.match(ordersView, /Supabase did not confirm the order status update/);
  assert.match(migration, /admin_user\.auth_user_id = auth\.uid\(\)/);
  assert.match(migration, /admin_user\.tenant_id = order_row\.tenant_id/);
  assert.match(migration, /admin_user\.company_code = order_row\.company_code/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_update_order_status\(BIGINT, TEXT\) TO authenticated/);
  assert.match(migration, /order_status = p_order_status,[\s\S]*status = p_order_status/);
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
