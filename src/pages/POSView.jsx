import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  toFloat, getPaymentMethod, getCartUnitPrice, formatTime,
  filterProductsBySearch, filterProducts, buildBarcodeIndex
} from '../utils/pos';
import { handleERPAction, ACTION_TYPES, ERP_MODULES } from '../erpController';
import { supabase } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';
import { buildAtomicCheckoutPayload, runPOSCheckoutOnce } from '../utils/pos/atomicCheckout';
import { fetchPersistedPOSInvoice } from '../utils/pos/receiptHelpers';
import { validatePOSDiscountInput } from '../utils/pos/calculations';
import { selectBestPOSPromotion } from '../utils/pos/posOfferPricing';
import { syncCartInventory } from '../utils/inventorySync';

import {
  POSErrorBoundary,
  ReceiptDialog,
  HoldQueueDialog,
  PaymentDialog,
  ManagerOverrideDialog,
  DiscountDialog,
  VoidDialog,
  ShiftDashboard,
  AuditTimeline,
  HardwareDashboard
} from '../components';
import POSLayout from '../features/pos/components/POSLayout';

import {
  useBarcodeEngine, useCustomerEngine, useHoldEngine,
  useKeyboardWorkflow, useSessionActivity, useBillingCalculations
} from '../hooks';
import usePosActions, {
  changePOSCartItemQuantity,
  setPOSCartItemQuantity,
  isPOSQuantityWithinStock
} from '../features/pos/hooks/usePosActions';

import { POSProvider } from '../context';
import { PaymentProvider, usePayment } from '../features/pos/payment';
import { isLocalPosTestMode } from '../utils/localPosTestMode';

function POSViewContent({
  products,
  categories,
  brands,
  offers = [],
  coupons = [],
  appConfigRows = [],
  users = [],
  currentUser,
  fetchInitialData,
  appConfig,
  setActiveTab,
  orders,
  orderItems = [],
  loading = false,
  inventoryError = ''
}) {
  // --- Performance Diagnostics ---
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  if (process.env.NODE_ENV === 'development') {
    renderCount.current++;
  }

  // --- Main POS States ---
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', mob: '', add: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [billDiscount, setBillDiscount] = useState(0);
  const [deliveryChargePercent, setDeliveryChargePercent] = useState(0);
  const [flatDiscount, setFlatDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [discountOverrideApprovalId, setDiscountOverrideApprovalId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCartId, setSelectedCartId] = useState(null);
  const [lastAddedId, setLastAddedId] = useState(null);
  const cartContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setCart((currentCart) => syncCartInventory(currentCart, products));
    setSelectedProduct((currentProduct) => {
      if (!currentProduct) return currentProduct;
      return products.find((product) => String(product.id) === String(currentProduct.id)) || currentProduct;
    });
  }, [products]);

  // --- Payment, Checkout & Dialog States ---
  const [paymentAmounts, setPaymentAmounts] = useState({ Cash: 0, UPI: 0, Card: 0 });
  const [paymentError, setPaymentError] = useState('');
  const cashInputRef = useRef(null);
  const [checkoutStep, setCheckoutStep] = useState('idle');
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [printStatus, setPrintStatus] = useState('idle');
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidForm, setVoidForm] = useState({ reason: '', remarks: '' });
  const [isVoiding, setIsVoiding] = useState(false);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [discountInput, setDiscountInput] = useState({ type: 'percent', value: '' });
  const [isTouchMode, setIsTouchMode] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
  ));
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadContext, setKeypadContext] = useState({ title: '', value: '', onConfirm: null });
  const [showOverride, setShowOverride] = useState(false);
  const [overrideAction, setOverrideAction] = useState({ id: '', label: '', onApprove: null });
  const [overrideData, setOverrideData] = useState({ reason: 'Manager Approval', remarks: '' });
  const [isApproving, setIsApproving] = useState(false);
  const lastFocusedElement = useRef(null);
  const [lastOrderData, setLastOrderData] = useState(null);
  const [lastSavedOrderId, setLastSavedOrderId] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const invoiceLoadRequestRef = useRef(0);
  const [posFilter, setPosFilter] = useState('All');
  const [showScanner, setShowScanner] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState(null);
  const checkoutInFlightRef = useRef(false);
  const custSearchRef = useRef(null);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerInfo({ name: '', mob: '', add: '' });
    setSelectedCartId(null);
    setPaymentAmounts({ Cash: 0, UPI: 0, Card: 0 });
    setBillDiscount(0);
    setFlatDiscount(0);
    setCouponCode('');
    setDiscountOverrideApprovalId(null);
    setCheckoutSessionId(null);
  }, []);

  const { addToCart } = usePosActions();
  const handleAddToCart = useCallback((product) => {
    const currentProduct = products.find((item) => String(item.id) === String(product?.id)) || product;
    const currentQuantity = cart.find((item) => String(item.id) === String(currentProduct?.id))?.quantity || 0;
    if (!isPOSQuantityWithinStock(currentProduct, currentQuantity + 1)) {
      toast.error(Number(currentProduct?.stock) <= 0
        ? 'This product is out of stock'
        : 'Requested quantity exceeds available stock');
      return;
    }
    setSelectedProduct(currentProduct);
    addToCart(currentProduct, setCart, setLastAddedId, setSelectedCartId);
  }, [addToCart, cart, products]);

  // --- Engine Hooks ---
  const sessionActivity = useSessionActivity({ orders });
  const {
    sessionStartTime, sessionActivities, sessionOrders, setSessionOrders,
    showShiftPanel, setShowShiftPanel, sessionMetrics, setSessionActivitiesCount,
    showTimeline, setShowTimeline, timelineFilter, setTimelineFilter,
    timelineSearch, setTimelineSearch, showHardwareDashboard, setShowHardwareDashboard,
    hardwareLogs, lastHardwareAction, setLastHardwareAction,
    addSessionActivity, addHardwareLog, shiftStats, filteredTimeline, timelineStats
  } = sessionActivity;

  const [cashierShift, setCashierShift] = useState(null);
  const [isShiftLoading, setIsShiftLoading] = useState(true);
  const [isShiftProcessing, setIsShiftProcessing] = useState(false);
  const [shiftError, setShiftError] = useState('');
  const shiftRequestRef = useRef(false);
  const shiftIdempotencyRef = useRef({});

  const refreshCashierShift = useCallback(async () => {
    if (!currentUser?.company_code || !currentUser?.tenant_id) {
      setCashierShift(null);
      const error = new Error('Cashier tenant/store scope is unavailable.');
      setShiftError(error.message);
      throw error;
    }
    try {
      const { data, error } = await supabase.rpc('pos_cashier_shift_current', {
        p_tenant_id: currentUser.tenant_id,
        p_company_code: currentUser.company_code
      });
      if (error) throw error;
      setCashierShift(data || null);
      setShiftError('');
      return data || null;
    } catch (error) {
      setShiftError(error?.message || 'Unable to load cashier shift.');
      throw error;
    }
  }, [currentUser?.company_code, currentUser?.tenant_id]);

  useEffect(() => {
    let active = true;
    setIsShiftLoading(true);
    refreshCashierShift()
      .catch((error) => {
        if (!active) return;
        console.error('Cashier shift load failed:', error);
        setShiftError(error?.message || 'Unable to load cashier shift.');
      })
      .finally(() => {
        if (active) setIsShiftLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshCashierShift]);

  const runShiftOperation = useCallback(async (operation, parameters, keyName) => {
    if (shiftRequestRef.current) return null;
    shiftRequestRef.current = true;
    setIsShiftProcessing(true);
    setShiftError('');
    try {
      const signature = JSON.stringify({ operation, parameters });
      let pendingRequest = shiftIdempotencyRef.current[keyName];
      if (pendingRequest && pendingRequest.signature !== signature) {
        throw new Error('A prior shift response may be pending. Retry the unchanged request to safely confirm its result.');
      }
      if (!pendingRequest) {
        const randomUUID = globalThis.crypto?.randomUUID;
        if (typeof randomUUID !== 'function') {
          throw new Error('Secure request IDs are unavailable in this browser.');
        }
        pendingRequest = {
          signature,
          key: randomUUID.call(globalThis.crypto)
        };
        shiftIdempotencyRef.current[keyName] = pendingRequest;
      }
      const { data, error } = await supabase.rpc(operation, {
        ...parameters,
        p_idempotency_key: pendingRequest.key
      });
      if (error) throw error;
      await refreshCashierShift();
      delete shiftIdempotencyRef.current[keyName];
      return data;
    } catch (error) {
      console.error(`Cashier shift operation failed (${operation}):`, error);
      setShiftError(error?.message || 'Cashier shift operation failed.');
      throw error;
    } finally {
      shiftRequestRef.current = false;
      setIsShiftProcessing(false);
    }
  }, [refreshCashierShift]);

  const openCashierShift = useCallback((openingCash) => runShiftOperation(
    'pos_cashier_shift_open',
    {
      p_tenant_id: currentUser?.tenant_id,
      p_company_code: currentUser?.company_code,
      p_opening_cash: openingCash
    },
    'open'
  ), [currentUser?.company_code, currentUser?.tenant_id, runShiftOperation]);

  const recordCashierMovement = useCallback((movementType, amount, reason) => runShiftOperation(
    'pos_cashier_shift_record_movement',
    {
      p_shift_id: cashierShift?.id,
      p_movement_type: movementType,
      p_amount: amount,
      p_reason: reason,
      p_company_code: currentUser?.company_code,
      p_tenant_id: currentUser?.tenant_id
    },
    movementType
  ), [cashierShift?.id, currentUser?.company_code, currentUser?.tenant_id, runShiftOperation]);

  const closeCashierShift = useCallback((countedCash) => runShiftOperation(
    'pos_cashier_shift_close',
    {
      p_shift_id: cashierShift?.id,
      p_counted_cash: countedCash,
      p_company_code: currentUser?.company_code,
      p_tenant_id: currentUser?.tenant_id
    },
    'close'
  ), [cashierShift?.id, currentUser?.company_code, currentUser?.tenant_id, runShiftOperation]);

  const barcodeMap = useMemo(() => buildBarcodeIndex(products), [products]);
  const handleAmbiguousBarcode = useCallback((code) => {
    setSearchTerm(code);
    setShowSearchDropdown(true);
  }, []);
  const barcodeEngine = useBarcodeEngine({
    barcodeMap,
    addToCart: handleAddToCart,
    onAmbiguousBarcode: handleAmbiguousBarcode,
    addSessionActivity,
    addHardwareLog
  });
  const { scanStatus, barcodeInputRef, handleBarcodeScan, triggerScanFeedback } = barcodeEngine;

  const customerEngine = useCustomerEngine({
    users, orders, addSessionActivity, barcodeInputRef
  });
  const {
    custSearch, setCustSearch, showCustDropdown, setShowCustDropdown,
    selectedCustIdx, setSelectedCustIdx, selectedUser, setSelectedUser,
    customerHistory, customerLoyalty, redeemPoints, setRedeemPoints,
    customerDataLoading, customerDataError,
    filteredUsers, customerStats, selectCustomer, handleCustSearchKeyDown
  } = customerEngine;

  const gstPricingMode = useMemo(() => {
    const setting = appConfigRows.find((row) => (
      row?.key === 'pos_gst_pricing_mode'
      && row?.is_active !== false
    ));
    return String(setting?.value ?? '').trim().toLowerCase() === 'inclusive'
      ? 'inclusive'
      : null;
  }, [appConfigRows]);
  const promotionResult = useMemo(() => selectBestPOSPromotion({
    cart,
    offers,
    coupons,
    couponCode
  }), [cart, offers, coupons, couponCode]);
  const activePromotion = promotionResult.selected;
  const handleApplyCoupon = useCallback((value) => {
    const code = String(value ?? '').trim().toUpperCase();
    if (!code) {
      setCouponCode('');
      return toast.info('Coupon removed');
    }
    const result = selectBestPOSPromotion({ cart, offers, coupons, couponCode: code });
    if (result.couponError) return toast.error(result.couponError);
    setCouponCode(code);
    if (result.selected?.kind !== 'coupon') {
      toast.success('Coupon is valid; a better eligible offer will be applied instead');
    } else {
      toast.success(`Coupon ${code} applied`);
    }
  }, [cart, offers, coupons]);

  const billingCalculations = useBillingCalculations({
    cart, billDiscount, deliveryChargePercent, flatDiscount,
    redeemPoints, paymentAmounts, discountInput,
    promotion: activePromotion,
    gstPricingMode
  });
  const {
    subTotal, totalGst, discountAmount, deliveryChargeAmount, flatDiscountVal,
    pointsDiscountVal, totalDiscount, manualDiscount, finalTotal, roundOff, savingAmount, newNetTotal,
    paidTotal, changeReturn, remainingToPay, remainingAmount, isPaymentValid, cartSummary,
    paymentValidationError,
    taxBreakdown, taxError, billingError, promotionDiscount
  } = billingCalculations;

  const holdEngine = useHoldEngine({
    cart, customerInfo, finalTotal,
    clearCart, addSessionActivity, barcodeInputRef, setSessionActivitiesCount
  });
  const {
    heldBills, setHeldBills, showHoldQueue, setShowHoldQueue,
    holdSearch, setHoldSearch, holdSort, setHoldSort,
    selectedHoldIdx, setSelectedHoldIdx, holdSuccessMsg,
    filteredHeldBills, handleHoldBill, resumeHoldBill: resumeHoldBillEngine, deleteHeldBill
  } = holdEngine;

  // --- Operational Handlers ---
  const removeFromCart = useCallback((productId) => {
    const item = cart.find(i => i.id === productId);
    if (item) {
      addSessionActivity('Item Removed', `${item.name}`, 'Sales', 'warning');
    }
    setCart(prev => prev.filter(item => item.id !== productId));
    if (selectedCartId === productId) setSelectedCartId(null);
    toast.info("Item removed");
  }, [cart, selectedCartId, addSessionActivity]);

  const updateQty = useCallback((productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    if (!Number.isFinite(Number(newQty))) return;
    const item = cart.find(i => i.id === productId);
    const product = products.find((entry) => String(entry.id) === String(productId));
    if (item && !isPOSQuantityWithinStock(product || item, newQty)) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }
    if (item) addSessionActivity('Qty Changed', `${item.name} (${item.quantity} → ${newQty})`, 'Sales');
    setCart(prev => setPOSCartItemQuantity(prev, productId, newQty));
  }, [removeFromCart, cart, products, addSessionActivity]);

  const changeQty = useCallback((productId, amount) => {
    const item = cart.find(entry => entry.id === productId);
    if (!item) return;
    const nextQuantity = Number(item.quantity) + amount;
    const product = products.find((entry) => String(entry.id) === String(productId));
    if (!isPOSQuantityWithinStock(product || item, nextQuantity)) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }
    addSessionActivity('Qty Changed', `${item.name} (${item.quantity} → ${Math.max(0, nextQuantity)})`, 'Sales');
    setCart(prev => changePOSCartItemQuantity(prev, productId, amount));
  }, [cart, products, addSessionActivity]);

  const handleResumeHoldBill = useCallback((hb) => {
    const data = resumeHoldBillEngine(hb);
    if (data) {
      setCart(data.cart);
      setCustomerInfo(data.customerInfo);
    }
  }, [resumeHoldBillEngine]);

  const requestOverride = useCallback((actionId, label, onApprove, authorization) => {
    lastFocusedElement.current = document.activeElement;
    setOverrideAction({ id: actionId, label, onApprove, authorization });
    setOverrideData({ reason: 'Manager Approval', remarks: '' });
    setShowOverride(true);
  }, []);

  const handleOverrideApprove = useCallback(async (e) => {
    if (e) e.preventDefault();
    setIsApproving(true);
    try {
      const { data, error } = await supabase.rpc('authorize_pos_override', {
        p_action_type: overrideAction.id,
        p_product_id: overrideAction.authorization?.productId ?? null,
        p_original_value: overrideAction.authorization?.originalValue ?? null,
        p_requested_value: overrideAction.authorization?.requestedValue ?? null,
        p_tenant_id: currentUser?.tenant_id ?? null,
        p_company_code: currentUser?.company_code ?? null,
        p_reason: overrideData.reason,
        p_remarks: overrideData.remarks || null
      });
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('Manager approval response was invalid');
      toast.success(`${overrideAction.label} Approved`);
      setSessionActivitiesCount(prev => ({ ...prev, overrides: prev.overrides + 1 }));
      addSessionActivity('Manager Override', overrideAction.label, currentUser?.role || 'Manager', 'success');
      if (overrideAction.onApprove) overrideAction.onApprove(data);
      setShowOverride(false);
    } catch (err) {
      addSessionActivity('Override Denied', `Action: ${overrideAction.label}`, currentUser?.role || 'Manager', 'error');
      toast.error(err.message || 'Manager authorization failed');
    } finally {
      setIsApproving(false);
    }
  }, [overrideData.reason, overrideData.remarks, overrideAction, currentUser, addSessionActivity, setSessionActivitiesCount]);

  const handlePriceChangeAttempt = useCallback((productId, newPrice) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    const currentPrice = getCartUnitPrice(item);
    const requestedPrice = Number(newPrice);
    if (currentPrice === null || !Number.isFinite(requestedPrice) || requestedPrice < 0) {
      return toast.error('A valid current and requested price are required');
    }
    const originalPrice = Number.isFinite(Number(item.price_override_base_rate))
      ? Number(item.price_override_base_rate)
      : currentPrice;
    requestOverride(
      'price_override',
      `Override Price for ${item.name}`,
      (approvalId) => setCart(prev => prev.map(i => i.id === productId
        ? {
            ...i,
            sale_rate: requestedPrice,
            onlinerate: requestedPrice,
            price_override_approval_id: approvalId,
            price_override_base_rate: originalPrice
          }
        : i)),
      { productId, originalValue: originalPrice, requestedValue: requestedPrice }
    );
  }, [cart, requestOverride]);

  const handleDiscountChangeAttempt = useCallback((type, value) => {
    const validation = validatePOSDiscountInput(type, value, subTotal);
    if (!validation.valid) return toast.error(validation.error);
    const val = validation.value;
    if ((type === 'percent' && val > 20) || (type === 'flat' && val > 500)) {
      requestOverride(type === 'percent' ? 'high_discount_pct' : 'high_discount_flat', `Apply High Discount (${type === 'percent' ? val + '%' : '₹' + val})`, (approvalId) => {
        if (type === 'percent') { setBillDiscount(val); setFlatDiscount(0); }
        else { setFlatDiscount(val); setBillDiscount(0); }
        setDiscountOverrideApprovalId(approvalId);
        setShowDiscountPanel(false);
        addSessionActivity('Discount Applied', `${type === 'percent' ? val + '%' : '₹' + val}`, 'Discount', 'success');
      }, { originalValue: subTotal, requestedValue: val });
    } else {
      if (type === 'percent') { setBillDiscount(val); setFlatDiscount(0); }
      else { setFlatDiscount(val); setBillDiscount(0); }
      setDiscountOverrideApprovalId(null);
      setShowDiscountPanel(false);
      addSessionActivity('Discount Applied', `${type === 'percent' ? val + '%' : '₹' + val}`, 'Discount', 'success');
    }
  }, [subTotal, requestOverride, addSessionActivity]);

  const handleClearCartAttempt = useCallback(() => {
    if (cart.length === 0) return;
    setVoidForm({ reason: '', remarks: '' });
    setShowVoidDialog(true);
  }, [cart.length]);

  const handlePerformFullVoid = useCallback(() => {
    setIsVoiding(true);
    try {
      clearCart();
      setCustSearch('');
      setSelectedUser(null);
      setShowVoidDialog(false);
      setSessionActivitiesCount(prev => ({ ...prev, voids: prev.voids + 1 }));
      addSessionActivity('Cart Discarded', `Reason: ${voidForm.reason}`, 'Void', 'warning');
      toast.success('Unsaved cart discarded');
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } finally {
      setIsVoiding(false);
    }
  }, [clearCart, voidForm.reason, addSessionActivity, barcodeInputRef, setSessionActivitiesCount, setSelectedUser, setCustSearch]);

  const handleConfirmVoidSale = useCallback((e) => {
    if (e) e.preventDefault();
    if (!voidForm.reason) { toast.error("Please select a reason"); return; }
    requestOverride('void_sale', 'Discard Current Cart', handlePerformFullVoid, {});
  }, [voidForm.reason, requestOverride, handlePerformFullVoid]);

  const handlePrintAgain = useCallback(async () => {
    if (printStatus === 'printing') return;
    if (!lastOrderData) {
      setPrintStatus('failed');
      toast.error('Persisted invoice data is not available to print.');
      return;
    }
    setPrintStatus('printing');
    addHardwareLog('Print Request Initiated', 'Receipt Printer');
    try {
      if (typeof window.print !== 'function') throw new Error('Printing is unavailable in this browser.');
      window.print();
      setPrintStatus('success');
      setSessionActivitiesCount(prev => ({ ...prev, reprints: prev.reprints + 1 }));
      addSessionActivity('Reprint', `Bill: #${lastOrderData?.order_number}`, 'Receipt');
      addHardwareLog('Print Dialog Opened', 'Receipt Printer', 'success');
      toast.success('Print dialog opened');
    } catch (err) {
      setPrintStatus('failed');
      addHardwareLog('Print Failed', 'Receipt Printer', 'error');
      toast.error(err.message || 'Could not open the print dialog.');
    } finally {
      setTimeout(() => setPrintStatus('idle'), 3000);
    }
  }, [printStatus, lastOrderData, addHardwareLog, addSessionActivity, setSessionActivitiesCount]);

  const loadPersistedInvoice = useCallback(async (orderId = lastSavedOrderId) => {
    if (!orderId) return;
    const requestId = ++invoiceLoadRequestRef.current;
    setInvoiceLoading(true);
    setInvoiceError('');
    try {
      const invoice = await fetchPersistedPOSInvoice(supabase, {
        orderId,
        tenantId: currentUser?.tenant_id,
        companyCode: currentUser?.company_code
      });
      if (requestId !== invoiceLoadRequestRef.current) return;
      setLastOrderData(invoice);
      setSessionOrders((previous) => {
        const withoutExisting = previous.filter((order) => Number(order.id) !== Number(invoice.id));
        return [...withoutExisting, invoice];
      });
    } catch (error) {
      if (requestId !== invoiceLoadRequestRef.current) return;
      console.error('Sale saved, but persisted invoice data could not be loaded:', error);
      setLastOrderData(null);
      setInvoiceError('Sale saved, but invoice records could not be loaded. Retry loading or find the saved order in Orders.');
    } finally {
      if (requestId === invoiceLoadRequestRef.current) setInvoiceLoading(false);
    }
  }, [lastSavedOrderId, currentUser?.tenant_id, currentUser?.company_code, setSessionOrders]);

  const closeReceiptDialog = useCallback(() => {
    invoiceLoadRequestRef.current += 1;
    setShowReceiptDialog(false);
    clearCart();
    setLastOrderData(null);
    setLastSavedOrderId(null);
    setInvoiceError('');
    setInvoiceLoading(false);
    setCheckoutStep('idle');
    setIsProcessing(false);
    checkoutInFlightRef.current = false;
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, [clearCart, barcodeInputRef]);

  const handleCheckout = useCallback(async (pMethod) => {
    if (checkoutInFlightRef.current || isProcessing) return;
    if (isShiftLoading) return toast.error('Checking cashier shift status. Please try again.');
    if (shiftError) return toast.error(`Cashier shift unavailable: ${shiftError}`);
    if (!cashierShift) {
      setShowShiftPanel(true);
      return toast.error('Open a cashier shift before completing a sale.');
    }
    if (cart.length === 0) return toast.error("Cart is empty!");
    if (taxError) return toast.error(
      taxError === 'POS_GST_CONFIGURATION_REQUIRED'
        ? 'POS GST-inclusive configuration is missing for this store'
        : 'A valid GST rate is required for every cart item'
    );
    if (billingError) return toast.error('Discounts cannot exceed the cart subtotal');
    if (promotionResult.couponError) return toast.error(promotionResult.couponError);
    if (isLocalPosTestMode) {
      toast.error('Local POS Test Mode - Live checkout is disabled.');
      return;
    }
    const selectedPaymentMethod = pMethod || getPaymentMethod(paymentAmounts);
    if (!isPaymentValid) {
      const messages = {
        INVALID_PAYMENT_TOTAL: 'The payable total is invalid.',
        INVALID_PAYMENT_AMOUNT: 'Enter valid, non-negative payment amounts.',
        INVALID_PAYMENT_METHOD: 'This payment method is not supported.',
        NON_CASH_PAYMENT_EXCEEDS_TOTAL: 'UPI and card amounts cannot exceed the payable total.',
        INSUFFICIENT_PAYMENT: `Insufficient payment: ₹${remainingAmount.toFixed(2)} remaining`
      };
      setPaymentError(messages[paymentValidationError] || 'Payment details are invalid.');
      return;
    }
    setPaymentError('');
    const currentTxId = checkoutSessionId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    if (!checkoutSessionId) setCheckoutSessionId(currentTxId);

    try {
      await runPOSCheckoutOnce(checkoutInFlightRef, async () => {
        setIsProcessing(true);
        setCheckoutStep('processing');
        try {
          const checkoutPayload = buildAtomicCheckoutPayload({
            cart,
            selectedUser,
            customerInfo,
            subtotal: subTotal,
            totalAmount: finalTotal,
            discount: totalDiscount,
            deliveryCharge: deliveryChargeAmount,
            deliveryChargePercent,
            paymentMethod: selectedPaymentMethod,
            paidAmount: paidTotal,
            paymentAmounts,
            totalGst: totalGst,
            roundOff: roundOff,
            transactionId: currentTxId,
            tenantId: currentUser?.tenant_id,
            companyCode: currentUser?.company_code,
            cashierAdminUserId: currentUser?.id,
            promotion: activePromotion,
            couponCode,
            manualDiscountType: billDiscount > 0 ? 'percentage' : flatDiscount > 0 ? 'flat' : null,
            manualDiscountValue: billDiscount > 0 ? billDiscount : flatDiscount,
            pointsDiscount: pointsDiscountVal,
            taxBreakdown,
            discountOverrideApprovalId
          });
          const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.ATOMIC_ORDER, checkoutPayload);
          if (!orderRes.success) throw new Error(orderRes.error);
          const orderId = Number(orderRes.data);
          if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            throw new Error('Checkout returned an invalid order reference. Verify the sale in Orders before retrying.');
          }
          setLastSavedOrderId(orderId);
          setLastOrderData(null);
          setInvoiceError('');
          setCheckoutStep('success');
          setShowReceiptDialog(true);
          setShowPaymentModal(false);
          setIsProcessing(false);
          addSessionActivity('Sale Completed', `Order #${orderId}`, 'Sales', 'success');
          addHardwareLog('Order Saved', 'Cash Drawer', 'success');
          setLastHardwareAction(prev => ({ ...prev, checkout: formatTime(new Date()) }));
          fetchInitialData(true, true, {
            resources: [DB_SCHEMA.PRODUCTS.table, DB_SCHEMA.INVENTORY_LOGS.table]
          });
          await loadPersistedInvoice(orderId);
        } catch (error) {
          throw error;
        }
      });
    } catch (error) {
      toast.error(error.message);
      if (checkoutStep !== 'success') {
        setIsProcessing(false);
        setCheckoutStep('idle');
      }
    }
  }, [cart, customerInfo, isProcessing, isShiftLoading, shiftError, cashierShift, setShowShiftPanel, taxError, billingError, promotionResult.couponError, isPaymentValid, paymentValidationError, remainingAmount, selectedUser, subTotal, finalTotal, totalDiscount, deliveryChargeAmount, deliveryChargePercent, paidTotal, paymentAmounts, totalGst, roundOff, currentUser, activePromotion, couponCode, billDiscount, flatDiscount, pointsDiscountVal, taxBreakdown, discountOverrideApprovalId, checkoutSessionId, checkoutStep, addSessionActivity, addHardwareLog, setLastHardwareAction, fetchInitialData, loadPersistedInvoice]);

  const handleCompletePayment = useCallback(() => handleCheckout(getPaymentMethod(paymentAmounts)), [handleCheckout, paymentAmounts]);

  // --- Additional UI Logic (MOVE UP EARLIER TO AVOID REFERENCE ERROR) ---
  const productLookups = useMemo(() => ({ categories, brands }), [categories, brands]);
  const searchResults = useMemo(
    () => filterProductsBySearch(products, searchTerm, productLookups),
    [searchTerm, products, productLookups]
  );
  const filteredProducts = useMemo(
    () => filterProducts(products, { searchTerm, activeCategory, posFilter }, productLookups),
    [products, searchTerm, activeCategory, posFilter, productLookups]
  );

  const handleProductSelect = useCallback((product) => {
    handleAddToCart(product);
    setSearchTerm('');
    setShowSearchDropdown(false);
    setSelectedIndex(-1);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [handleAddToCart]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) handleProductSelect(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowSearchDropdown(false);
      setSearchTerm('');
      barcodeInputRef.current?.focus();
    }
  }, [searchResults, selectedIndex, handleProductSelect, barcodeInputRef]);

  const openKeypad = useCallback((title, value, onConfirm) => {
    if (!isTouchMode) return;
    setKeypadContext({ title, value, onConfirm });
    setShowKeypad(true);
  }, [isTouchMode]);

  // --- Keyboard Engine ---
  const keyboardWorkflow = useKeyboardWorkflow({
    checkoutStep, isProcessing, showReceiptDialog, showVoidDialog, showShiftPanel, showDiscountPanel,
    showTimeline, showHardwareDashboard, showPaymentModal, showHoldQueue, showOverride, showSearchDropdown, showCustDropdown,
    cart, selectedCartId, setSelectedCartId, finalTotal, heldBills, filteredHeldBills, selectedHoldIdx, setSelectedHoldIdx,
    billDiscount, flatDiscount, discountInput, setDiscountInput, setPaymentAmounts, setPaymentError,
    setShowPaymentModal, setShowHoldQueue, setShowShiftPanel, setShowDiscountPanel, setShowTimeline, setShowHardwareDashboard,
    setShowOverride, setShowVoidDialog, handleHoldBill, resumeHoldBill: handleResumeHoldBill, handleCheckout, handlePrintAgain,
    closeReceiptDialog, confirmVoidSale: handleConfirmVoidSale, handleDiscountChangeAttempt, handleClearCartAttempt, handleCompletePayment,
    removeFromCart, updateQty, searchInputRef, custSearchRef, barcodeInputRef
  });
  const { handleGlobalKey } = keyboardWorkflow;

  useEffect(() => { setSelectedIndex(searchResults.length > 0 ? 0 : -1); }, [searchResults]);
  useEffect(() => { if (showPaymentModal) setTimeout(() => cashInputRef.current?.focus(), 100); else if (!showHoldQueue && !showReceiptDialog) barcodeInputRef.current?.focus(); }, [showPaymentModal, showHoldQueue, showReceiptDialog, barcodeInputRef]);
  useEffect(() => { if (!showOverride && lastFocusedElement.current) lastFocusedElement.current.focus(); }, [showOverride]);

  const contextValue = useMemo(() => ({
    // Basic Data
    products, categories, brands, appConfig, offers, coupons, orders, orderItems, fetchInitialData, setActiveTab,
    inventoryLoading: loading, inventoryError,
    gstPricingMode, taxError, billingError, couponError: promotionResult.couponError, currentUser,
    cashierShift, isShiftLoading, isShiftProcessing, shiftError,
    openCashierShift, recordCashierMovement, closeCashierShift, refreshCashierShift,

    // States
    cart, setCart, customerInfo, setCustomerInfo, searchTerm, setSearchTerm,
    activeCategory, setActiveCategory, billDiscount, setBillDiscount,
    deliveryChargePercent, setDeliveryChargePercent, flatDiscount, setFlatDiscount,
    couponCode, setCouponCode, activePromotion, promotionDiscount, handleApplyCoupon,
    selectedProduct, setSelectedProduct, showSearchDropdown, setShowSearchDropdown,
    selectedIndex, setSelectedIndex, selectedCartId, setSelectedCartId,
    lastAddedId, setLastAddedId,
    paymentAmounts, setPaymentAmounts, paymentError, setPaymentError,
    checkoutStep, setCheckoutStep, showReceiptDialog, setShowReceiptDialog,
    printStatus, setPrintStatus, showVoidDialog, setShowVoidDialog,
    voidForm, setVoidForm, isVoiding, setIsVoiding,
    showDiscountPanel, setShowDiscountPanel, discountInput, setDiscountInput,
    isTouchMode, setIsTouchMode, showKeypad, setShowKeypad,
    keypadContext, setKeypadContext, showOverride, setShowOverride,
    overrideAction, setOverrideAction, overrideData, setOverrideData,
    isApproving, setIsApproving, lastOrderData, setLastOrderData,
    lastSavedOrderId, invoiceLoading, invoiceError, retryInvoiceLoad: loadPersistedInvoice,
    posFilter, setPosFilter, showScanner, setShowScanner,
    isSplitPayment, setIsSplitPayment, showPaymentModal, setShowPaymentModal,
    isProcessing, setIsProcessing,

    // Refs
    cartContainerRef, searchInputRef, cashInputRef, custSearchRef, barcodeInputRef,

    // Calculated Values
    subTotal, totalGst, discountAmount, deliveryChargeAmount, flatDiscountVal,
    pointsDiscountVal, totalDiscount, manualDiscount, finalTotal, roundOff,
    savingAmount, newNetTotal, paidTotal, changeReturn, remainingToPay,
    taxBreakdown,
    remainingAmount, isPaymentValid, paymentValidationError, cartSummary, searchResults, filteredProducts,

    // Engine State
    sessionStartTime, sessionActivities, sessionOrders, showShiftPanel, sessionMetrics,
    showTimeline, timelineFilter, timelineSearch, showHardwareDashboard, hardwareLogs,
    lastHardwareAction, scanStatus, custSearch, showCustDropdown, selectedCustIdx,
    selectedUser, customerHistory, customerLoyalty, customerDataLoading, customerDataError,
    redeemPoints, filteredUsers,
    customerStats, heldBills, showHoldQueue, holdSearch, holdSort, selectedHoldIdx,
    holdSuccessMsg, filteredHeldBills, shiftStats, filteredTimeline, timelineStats,

    // Handlers
    clearCart, addToCart: handleAddToCart, removeFromCart, updateQty, changeQty,
    handleHoldBill, resumeHoldBill: handleResumeHoldBill, deleteHeldBill,
    handleOverrideApprove, handlePriceChangeAttempt, handleDiscountChangeAttempt,
    handleClearCartAttempt, confirmVoidSale: handleConfirmVoidSale, handlePrintAgain, closeReceiptDialog,
    handleCheckout, handleCompletePayment, handleProductSelect, handleSearchKeyDown,
    openKeypad, handleGlobalKey, handleBarcodeScan, triggerScanFeedback,
    setCustSearch, setShowCustDropdown, setSelectedCustIdx, setSelectedUser,
    setRedeemPoints, selectCustomer, handleCustSearchKeyDown, setHoldSearch,
    setHoldSort, setSelectedHoldIdx, setShowHoldQueue, setShowShiftPanel,
    setTimelineFilter, setTimelineSearch, setShowTimeline, setShowHardwareDashboard,
    setSessionActivitiesCount, addSessionActivity, addHardwareLog,

    // Diagnostics
    renderCount: renderCount.current,
    uptime: Math.floor((Date.now() - mountTime.current) / 1000)
  }), [
    products, categories, brands, appConfig, offers, coupons, orders, orderItems, fetchInitialData, setActiveTab, loading, inventoryError,
    gstPricingMode, taxError, billingError, promotionResult.couponError, currentUser,
    cashierShift, isShiftLoading, isShiftProcessing, shiftError,
    openCashierShift, recordCashierMovement, closeCashierShift, refreshCashierShift,
    couponCode, activePromotion, promotionDiscount, handleApplyCoupon,
    cart, customerInfo, searchTerm, activeCategory, billDiscount,
    deliveryChargePercent, flatDiscount, selectedProduct, showSearchDropdown,
    selectedIndex, selectedCartId, lastAddedId,
    paymentAmounts, paymentError, paymentValidationError, checkoutStep, showReceiptDialog,
    printStatus, showVoidDialog, voidForm, isVoiding,
    showDiscountPanel, discountInput, isTouchMode, showKeypad,
    keypadContext, showOverride, overrideAction, overrideData,
    isApproving, lastOrderData, lastSavedOrderId, invoiceLoading, invoiceError,
    loadPersistedInvoice, posFilter, showScanner,
    isSplitPayment, showPaymentModal, isProcessing,
    subTotal, totalGst, discountAmount, deliveryChargeAmount, flatDiscountVal,
    pointsDiscountVal, totalDiscount, manualDiscount, finalTotal, roundOff,
    savingAmount, newNetTotal, paidTotal, changeReturn, remainingToPay,
    remainingAmount, isPaymentValid, cartSummary, searchResults, filteredProducts, taxBreakdown,
    sessionStartTime, sessionActivities, sessionOrders, showShiftPanel, sessionMetrics,
    showTimeline, timelineFilter, timelineSearch, showHardwareDashboard, hardwareLogs,
    lastHardwareAction, scanStatus, custSearch, showCustDropdown, selectedCustIdx,
    selectedUser, customerHistory, customerLoyalty, customerDataLoading, customerDataError,
    redeemPoints, filteredUsers,
    customerStats, heldBills, showHoldQueue, holdSearch, holdSort, selectedHoldIdx,
    holdSuccessMsg, filteredHeldBills, shiftStats, filteredTimeline, timelineStats,
    clearCart, handleAddToCart, removeFromCart, updateQty, changeQty,
    handleHoldBill, handleResumeHoldBill, deleteHeldBill,
    handleOverrideApprove, handlePriceChangeAttempt, handleDiscountChangeAttempt,
    handleClearCartAttempt, handleConfirmVoidSale, handlePrintAgain, closeReceiptDialog,
    handleCheckout, handleCompletePayment, handleProductSelect, handleSearchKeyDown,
    openKeypad, handleGlobalKey, handleBarcodeScan, triggerScanFeedback,
    setCustSearch, setShowCustDropdown, setSelectedCustIdx, setSelectedUser,
    setRedeemPoints, selectCustomer, handleCustSearchKeyDown, setHoldSearch,
    setHoldSort, setSelectedHoldIdx, setShowHoldQueue, setShowShiftPanel,
    setTimelineFilter, setTimelineSearch, setShowTimeline, setShowHardwareDashboard,
    setSessionActivitiesCount, addSessionActivity, addHardwareLog,
  ]);

  return (
    <PaymentProvider>
      <POSProvider value={contextValue}>
        {isLocalPosTestMode && (
          <div className="fixed top-2 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900 shadow-lg">
            LOCAL POS TEST MODE - LIVE CHECKOUT DISABLED
          </div>
        )}
        <POSLayout />

        {/* Global POS Dialogs */}
        <Suspense fallback={null}>
          <ReceiptDialog />
          <HoldQueueDialog />
          <PaymentDialog />
          <ManagerOverrideDialog />
          <DiscountDialog />
          <VoidDialog />
          <ShiftDashboard />
          <AuditTimeline />
          <HardwareDashboard />
        </Suspense>
      </POSProvider>
    </PaymentProvider>
  );
}

export default function POSView(props) {
  return (
    <POSErrorBoundary>
      <POSViewContent {...props} />
    </POSErrorBoundary>
  );
}
