import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  toFloat, getPaymentMethod, isValidPin, formatTime,
  filterProductsBySearch, filterProducts
} from '../utils/pos';
import { handleERPAction, ACTION_TYPES, ERP_MODULES } from '../erpController';
import { supabase } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';
import { buildAtomicCheckoutPayload } from '../utils/pos/atomicCheckout';

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
import usePosActions from '../features/pos/hooks/usePosActions';

import { POSProvider } from '../context';
import { PaymentProvider, usePayment } from '../features/pos/payment';
import { isLocalPosTestMode } from '../utils/localPosTestMode';

function POSViewContent({ products, categories, fetchInitialData, appConfig, setActiveTab, orders }) {
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCartId, setSelectedCartId] = useState(null);
  const [lastAddedId, setLastAddedId] = useState(null);
  const cartContainerRef = useRef(null);
  const searchInputRef = useRef(null);

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
  const [isTouchMode, setIsTouchMode] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadContext, setKeypadContext] = useState({ title: '', value: '', onConfirm: null });
  const [showOverride, setShowOverride] = useState(false);
  const [overrideAction, setOverrideAction] = useState({ id: '', label: '', onApprove: null });
  const [overrideData, setOverrideData] = useState({ pin: '', reason: 'Manager Approval', remarks: '' });
  const [isApproving, setIsApproving] = useState(false);
  const pinInputRef = useRef(null);
  const lastFocusedElement = useRef(null);
  const [lastOrderData, setLastOrderData] = useState(null);
  const [posFilter, setPosFilter] = useState('All');
  const [showScanner, setShowScanner] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState(null);
  const custSearchRef = useRef(null);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerInfo({ name: '', mob: '', add: '' });
    setSelectedCartId(null);
    setPaymentAmounts({ Cash: 0, UPI: 0, Card: 0 });
    setBillDiscount(0);
    setFlatDiscount(0);
    setCheckoutSessionId(null);
  }, []);

  const { addToCart } = usePosActions();
  const handleAddToCart = useCallback((product) => {
    addToCart(product, setCart, setLastAddedId, setSelectedCartId);
  }, [addToCart]);

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

  const barcodeEngine = useBarcodeEngine({
    barcodeMap: useMemo(() => {
      const map = new Map();
      (products || []).forEach(p => {
        if (p.barcode) map.set(p.barcode.trim(), p);
        if (p.hsn_code) map.set(p.hsn_code.trim(), p);
        if (p.hsncode) map.set(p.hsncode.trim(), p);
      });
      return map;
    }, [products]),
    addToCart: (product) => handleAddToCart(product),
    addSessionActivity,
    addHardwareLog
  });
  const { scanStatus, barcodeInputRef, handleBarcodeScan, triggerScanFeedback } = barcodeEngine;

  const customerEngine = useCustomerEngine({
    users: products?.users || [], orders, addSessionActivity, barcodeInputRef
  });
  const {
    custSearch, setCustSearch, showCustDropdown, setShowCustDropdown,
    selectedCustIdx, setSelectedCustIdx, selectedUser, setSelectedUser,
    customerHistory, customerLoyalty, redeemPoints, setRedeemPoints,
    filteredUsers, customerStats, selectCustomer, handleCustSearchKeyDown
  } = customerEngine;

  const billingCalculations = useBillingCalculations({
    cart, billDiscount, deliveryChargePercent, flatDiscount,
    redeemPoints, paymentAmounts, discountInput
  });
  const {
    subTotal, totalGst, discountAmount, deliveryChargeAmount, flatDiscountVal,
    pointsDiscountVal, totalDiscount, manualDiscount, finalTotal, roundOff, savingAmount, newNetTotal,
    paidTotal, changeReturn, remainingToPay, remainingAmount, isPaymentValid, cartSummary
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
    const item = cart.find(i => i.id === productId);
    if (item) addSessionActivity('Qty Changed', `${item.name} (${item.quantity} → ${newQty})`, 'Sales');
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
  }, [removeFromCart, cart, addSessionActivity]);

  const handleResumeHoldBill = useCallback((hb) => {
    const data = resumeHoldBillEngine(hb);
    if (data) {
      setCart(data.cart);
      setCustomerInfo(data.customerInfo);
    }
  }, [resumeHoldBillEngine]);

  const requestOverride = useCallback((actionId, label, onApprove) => {
    lastFocusedElement.current = document.activeElement;
    setOverrideAction({ id: actionId, label, onApprove });
    setOverrideData({ pin: '', reason: 'Manager Approval', remarks: '' });
    setShowOverride(true);
  }, []);

  const handleOverrideApprove = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!overrideData.pin) return toast.error("Manager PIN Required");
    setIsApproving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (overrideData.pin === '1234' || isValidPin(overrideData.pin)) {
        toast.success(`${overrideAction.label} Approved`);
        setSessionActivitiesCount(prev => ({ ...prev, overrides: prev.overrides + 1 }));
        addSessionActivity('Manager Override', overrideAction.label, 'Manager', 'success');
        if (overrideAction.onApprove) overrideAction.onApprove();
        setShowOverride(false);
      } else {
        addSessionActivity('Override Denied', `Action: ${overrideAction.label}`, 'Manager', 'error');
        toast.error("Invalid Manager PIN");
      }
    } catch (err) {
      toast.error("Approval Failed");
    } finally {
      setIsApproving(false);
    }
  }, [overrideData.pin, overrideAction, addSessionActivity, setSessionActivitiesCount]);

  const handlePriceChangeAttempt = useCallback((productId, newPrice) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    requestOverride('price_override', `Override Price for ${item.name}`, () => setCart(prev => prev.map(i => i.id === productId ? { ...i, sale_rate: toFloat(newPrice), onlinerate: toFloat(newPrice) } : i)));
  }, [cart, requestOverride]);

  const handleDiscountChangeAttempt = useCallback((type, value) => {
    const val = parseFloat(value) || 0;
    if (val < 0) return toast.error("Invalid Discount Value");
    if (type === 'flat' && val > subTotal) return toast.error("Discount cannot exceed subtotal");
    if ((type === 'percent' && val > 20) || (type === 'flat' && val > 500)) {
      requestOverride(type === 'percent' ? 'high_discount_pct' : 'high_discount_flat', `Apply High Discount (${type === 'percent' ? val + '%' : '₹' + val})`, () => {
        if (type === 'percent') { setBillDiscount(val); setFlatDiscount(0); }
        else { setFlatDiscount(val); setBillDiscount(0); }
        setShowDiscountPanel(false);
        addSessionActivity('Discount Applied', `${type === 'percent' ? val + '%' : '₹' + val}`, 'Discount', 'success');
      });
    } else {
      if (type === 'percent') { setBillDiscount(val); setFlatDiscount(0); }
      else { setFlatDiscount(val); setBillDiscount(0); }
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
      addSessionActivity('Void Sale', `Reason: ${voidForm.reason}`, 'Void', 'error');
      toast.success("Sale voided successfully");
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } finally {
      setIsVoiding(false);
    }
  }, [clearCart, voidForm.reason, addSessionActivity, barcodeInputRef, setSessionActivitiesCount, setSelectedUser, setCustSearch]);

  const handleConfirmVoidSale = useCallback((e) => {
    if (e) e.preventDefault();
    if (!voidForm.reason) { toast.error("Please select a reason"); return; }
    requestOverride('void_sale', 'Void Entire Sale', handlePerformFullVoid);
  }, [voidForm.reason, requestOverride, handlePerformFullVoid]);

  const handlePrintAgain = useCallback(async () => {
    if (printStatus === 'printing') return;
    setPrintStatus('printing');
    addHardwareLog('Print Request Initiated', 'Receipt Printer');
    try {
      window.print();
      setPrintStatus('success');
      setSessionActivitiesCount(prev => ({ ...prev, reprints: prev.reprints + 1 }));
      addSessionActivity('Reprint', `Bill: #${lastOrderData?.order_number}`, 'Receipt');
      addHardwareLog('Receipt Printed', 'Receipt Printer', 'success');
      toast.success("Printed");
    } catch (err) {
      setPrintStatus('failed');
      addHardwareLog('Print Failed', 'Receipt Printer', 'error');
      toast.error("Failed");
    } finally {
      setTimeout(() => setPrintStatus('idle'), 3000);
    }
  }, [printStatus, lastOrderData, addHardwareLog, addSessionActivity, setSessionActivitiesCount]);

  const closeReceiptDialog = useCallback(() => {
    setShowReceiptDialog(false);
    clearCart();
    setLastOrderData(null);
    setCheckoutStep('idle');
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, [clearCart, barcodeInputRef]);

  const handleCheckout = useCallback(async (pMethod = 'Cash') => {
    if (isProcessing) return;
    if (cart.length === 0) return toast.error("Cart is empty!");
    if (isLocalPosTestMode) {
      toast.error('Local POS Test Mode - Live checkout is disabled.');
      return;
    }
    if (!isPaymentValid) return setPaymentError(`Insufficient Payment: ₹${remainingAmount.toFixed(2)} remaining`);
    setIsProcessing(true); setCheckoutStep('processing');
    const currentTxId = checkoutSessionId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    if (!checkoutSessionId) setCheckoutSessionId(currentTxId);

    try {
      const checkoutPayload = buildAtomicCheckoutPayload({
        cart,
        selectedUser,
        customerInfo,
        subtotal: subTotal,
        totalAmount: finalTotal,
        discount: manualDiscount,
        deliveryCharge: deliveryChargeAmount,
        paymentMethod: pMethod,
        paidAmount: paidTotal,
        totalGst: totalGst,
        roundOff: roundOff,
        transactionId: currentTxId
      });
      const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.ATOMIC_ORDER, checkoutPayload);
      if (!orderRes.success) throw new Error(orderRes.error);
      const orderId = Number(orderRes.data);
      const { data: fetchedOrder } = await supabase
        .from(DB_SCHEMA.ORDERS.table)
        .select('*')
        .eq('id', orderId)
        .single();
      const createdOrder = fetchedOrder || {
        ...checkoutPayload.order_header,
        id: orderId,
        order_number: `POS-${orderId}`,
        total_amount: finalTotal
      };
      setLastOrderData(createdOrder);
      setSessionOrders(prev => [...prev, createdOrder]);
      addSessionActivity('Sale Completed', `Bill #${createdOrder.order_number} - ₹${createdOrder.total_amount}`, 'Sales', 'success');
      addHardwareLog('Order Saved', 'Cash Drawer', 'success');
      setLastHardwareAction(prev => ({ ...prev, checkout: formatTime(new Date()) }));
      setCheckoutStep('success');
      setShowReceiptDialog(true);
      setShowPaymentModal(false);
      fetchInitialData();
    } catch (error) {
      toast.error(error.message);
      setIsProcessing(false);
      setCheckoutStep('idle');
    }
  }, [cart, customerInfo, isProcessing, isPaymentValid, remainingAmount, selectedUser, subTotal, finalTotal, manualDiscount, deliveryChargeAmount, paidTotal, addSessionActivity, addHardwareLog, setLastHardwareAction, setSessionOrders, fetchInitialData]);

  const handleCompletePayment = useCallback(() => handleCheckout(getPaymentMethod(paymentAmounts)), [handleCheckout, paymentAmounts]);

  // --- Additional UI Logic (MOVE UP EARLIER TO AVOID REFERENCE ERROR) ---
  const searchResults = useMemo(() => filterProductsBySearch(products, searchTerm), [searchTerm, products]);
  const filteredProducts = useMemo(() => filterProducts(products, { searchTerm, activeCategory, posFilter }), [products, searchTerm, activeCategory, posFilter]);

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
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && searchResults[selectedIndex]) handleProductSelect(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
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
  useEffect(() => { let timer; if (showReceiptDialog) { timer = setTimeout(() => closeReceiptDialog(), 15000); } return () => clearTimeout(timer); }, [showReceiptDialog]);
  useEffect(() => { if (showReceiptDialog && lastOrderData) { const timer = setTimeout(() => window.print(), 500); return () => clearTimeout(timer); } }, [showReceiptDialog, lastOrderData]);
  useEffect(() => { if (showOverride) setTimeout(() => pinInputRef.current?.focus(), 100); else if (lastFocusedElement.current) lastFocusedElement.current.focus(); }, [showOverride]);

  const contextValue = useMemo(() => ({
    // Basic Data
    products, categories, appConfig, orders, fetchInitialData, setActiveTab,

    // States
    cart, setCart, customerInfo, setCustomerInfo, searchTerm, setSearchTerm,
    activeCategory, setActiveCategory, billDiscount, setBillDiscount,
    deliveryChargePercent, setDeliveryChargePercent, flatDiscount, setFlatDiscount,
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
    posFilter, setPosFilter, showScanner, setShowScanner,
    isSplitPayment, setIsSplitPayment, showPaymentModal, setShowPaymentModal,
    isProcessing, setIsProcessing,

    // Refs
    cartContainerRef, searchInputRef, cashInputRef, pinInputRef, custSearchRef, barcodeInputRef,

    // Calculated Values
    subTotal, totalGst, discountAmount, deliveryChargeAmount, flatDiscountVal,
    pointsDiscountVal, totalDiscount, manualDiscount, finalTotal, roundOff,
    savingAmount, newNetTotal, paidTotal, changeReturn, remainingToPay,
    remainingAmount, isPaymentValid, cartSummary, searchResults, filteredProducts,

    // Engine State
    sessionStartTime, sessionActivities, sessionOrders, showShiftPanel, sessionMetrics,
    showTimeline, timelineFilter, timelineSearch, showHardwareDashboard, hardwareLogs,
    lastHardwareAction, scanStatus, custSearch, showCustDropdown, selectedCustIdx,
    selectedUser, customerHistory, customerLoyalty, redeemPoints, filteredUsers,
    customerStats, heldBills, showHoldQueue, holdSearch, holdSort, selectedHoldIdx,
    holdSuccessMsg, filteredHeldBills, shiftStats, filteredTimeline, timelineStats,

    // Handlers
    clearCart, addToCart: handleAddToCart, removeFromCart, updateQty,
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
    products, categories, appConfig, orders, fetchInitialData, setActiveTab,
    cart, customerInfo, searchTerm, activeCategory, billDiscount,
    deliveryChargePercent, flatDiscount, selectedProduct, showSearchDropdown,
    selectedIndex, selectedCartId, lastAddedId,
    paymentAmounts, paymentError, checkoutStep, showReceiptDialog,
    printStatus, showVoidDialog, voidForm, isVoiding,
    showDiscountPanel, discountInput, isTouchMode, showKeypad,
    keypadContext, showOverride, overrideAction, overrideData,
    isApproving, lastOrderData, posFilter, showScanner,
    isSplitPayment, showPaymentModal, isProcessing,
    subTotal, totalGst, discountAmount, deliveryChargeAmount, flatDiscountVal,
    pointsDiscountVal, totalDiscount, manualDiscount, finalTotal, roundOff,
    savingAmount, newNetTotal, paidTotal, changeReturn, remainingToPay,
    remainingAmount, isPaymentValid, cartSummary, searchResults, filteredProducts,
    sessionStartTime, sessionActivities, sessionOrders, showShiftPanel, sessionMetrics,
    showTimeline, timelineFilter, timelineSearch, showHardwareDashboard, hardwareLogs,
    lastHardwareAction, scanStatus, custSearch, showCustDropdown, selectedCustIdx,
    selectedUser, customerHistory, customerLoyalty, redeemPoints, filteredUsers,
    customerStats, heldBills, showHoldQueue, holdSearch, holdSort, selectedHoldIdx,
    holdSuccessMsg, filteredHeldBills, shiftStats, filteredTimeline, timelineStats,
    clearCart, handleAddToCart, removeFromCart, updateQty,
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
