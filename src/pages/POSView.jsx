import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { 
  Zap, CheckCircle2, Camera, MousePointer, Touchpad, AlertOctagon, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../utils/helpers';
import {
  toFloat, getPaymentMethod, isValidPin, formatTime,
  filterProductsBySearch, filterProducts
} from '../utils/pos';
import { handleERPAction, ACTION_TYPES, ERP_MODULES } from '../erpController';

import {
  ProductGrid, ProductSearch, BarcodeInput, CartPanel, CustomerPanel,
  HoldQueueDialog, PaymentDialog, ReceiptDialog, ManagerOverrideDialog,
  DiscountDialog, VoidDialog, ShiftDashboard, AuditTimeline, HardwareDashboard,
  NumericKeypad, POSErrorBoundary
} from '../components';

import {
  useBarcodeEngine, useCustomerEngine, useHoldEngine,
  useKeyboardWorkflow, useSessionActivity, useBillingCalculations
} from '../hooks';

import { POSProvider, usePOS } from '../context';

// --- POS View Modules ---
function POSViewInner() {
  const {
    isTouchMode, setIsTouchMode, appConfig, activeCategory, setActiveCategory,
    categories, posFilter, setPosFilter, setShowScanner
  } = usePOS();

  return (
    <div className={cn(
      "flex h-[calc(100vh-60px)] bg-neutral-100 overflow-hidden -m-4 transition-all duration-300 portrait:flex-col landscape:flex-row",
      isTouchMode ? "text-lg" : "text-base"
    )}>
      {/* SIDEBAR - Categories */}
      <div className={cn(
        "bg-white flex flex-col border-r border-neutral-200 transition-all duration-300 portrait:w-full portrait:h-48 portrait:border-r-0 portrait:border-b",
        isTouchMode ? "w-64" : "w-48"
      )}>
        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className={cn(
            "bg-primary-900 text-white p-2 rounded font-black mb-2 uppercase text-center truncate shadow-sm",
            isTouchMode ? "text-xs py-3" : "text-[10px]"
          )}>
            {appConfig?.shop_name || 'NM MART'}
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory('All')}
              className={cn(
                "w-full text-left px-3 rounded font-black uppercase shadow-sm transition-all",
                activeCategory === 'All' ? "bg-primary-600 text-white shadow-primary-600/20" : "bg-white text-neutral-700 hover:bg-neutral-50",
                isTouchMode ? "py-4 text-xs" : "py-2.5 text-[11px]"
              )}
            >
              All Items
            </button>
            {(categories || []).map((cat, idx) => (
              <button
                key={`cat-${cat.id}-${idx}`}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left px-3 rounded font-black uppercase shadow-sm transition-all",
                  activeCategory === cat.id ? "bg-primary-600 text-white shadow-primary-600/20" : "bg-white text-neutral-700 hover:bg-neutral-50",
                  isTouchMode ? "py-4 text-xs" : "py-2.5 text-[11px]"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 border-t border-neutral-100 bg-slate-50 space-y-1">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Terminal Mode</p>
          <div className="flex bg-white rounded-lg p-1 shadow-inner border border-slate-200">
            <button onClick={() => setIsTouchMode(false)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all", !isTouchMode ? "bg-primary-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50")}><MousePointer size={12} /> Desktop</button>
            <button onClick={() => setIsTouchMode(true)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all", isTouchMode ? "bg-primary-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50")}><Touchpad size={12} /> Touch</button>
          </div>
        </div>

        <div className="p-2 space-y-2 border-t border-neutral-200 bg-neutral-50">
          <button onClick={() => { setPosFilter(posFilter === 'TopSale' ? 'All' : 'TopSale'); setActiveCategory('All'); }} className={cn("w-full rounded font-black uppercase flex items-center justify-center gap-2 shadow-md transition-all border", posFilter === 'TopSale' ? "bg-primary-600 text-white border-primary-700" : "bg-white text-neutral-700 border-neutral-200", isTouchMode ? "p-4 text-xs" : "p-2 text-[10px]")}><Zap size={isTouchMode ? 16 : 14} /> Top Sale</button>
          <button onClick={() => { setPosFilter(posFilter === 'Favourite' ? 'All' : 'Favourite'); setActiveCategory('All'); }} className={cn("w-full rounded font-black uppercase flex items-center justify-center gap-2 shadow-md transition-all border", posFilter === 'Favourite' ? "bg-primary-600 text-white border-primary-700" : "bg-white text-neutral-700 border-neutral-200", isTouchMode ? "p-4 text-xs" : "p-2 text-[10px]")}><CheckCircle2 size={isTouchMode ? 16 : 14} /> Favourite</button>
        </div>
      </div>

      {/* CENTER - Product Grid Section */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className={cn("p-2 flex gap-2 bg-neutral-100 relative border-b border-neutral-200 shadow-sm", isTouchMode ? "py-4" : "")}>
          <ProductSearch />
          <BarcodeInput />
          <button onClick={() => setShowScanner(true)} className={cn("bg-success-600 text-white rounded font-black shadow-md whitespace-nowrap flex items-center justify-center", isTouchMode ? "px-6" : "px-3 py-1.5 text-xs")}><Camera size={isTouchMode ? 18 : 14} /></button>
        </div>
        <ProductGrid />
      </div>

      {/* RIGHT SIDEBAR - Billing */}
      <div className={cn("bg-white flex flex-col border-l border-neutral-200 shadow-2xl overflow-hidden transition-all duration-300", isTouchMode ? "w-[480px]" : "w-[420px]")}>
        <CustomerPanel />
        <CartPanel />
      </div>

      {/* Modals & Dialogs */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[5000] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>}>
        <HoldQueueDialog />
        <VoidDialog />
        <ManagerOverrideDialog />
        <HardwareDashboard />
        <AuditTimeline />
        <DiscountDialog />
        <ShiftDashboard />
        <ReceiptDialog />
        <PaymentDialog />
      </Suspense>
      <AnimatePresence>
        <NumericKeypad />
      </AnimatePresence>
    </div>
  );
}

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
  const custSearchRef = useRef(null);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerInfo({ name: '', mob: '', add: '' });
    setSelectedCartId(null);
    setPaymentAmounts({ Cash: 0, UPI: 0, Card: 0 });
    setBillDiscount(0);
    setFlatDiscount(0);
  }, []);

  const addToCart = useCallback((product) => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setLastAddedId(product.id);
    setSelectedCartId(product.id);
    toast.success(`${product.itname || product.name} added`);
  }, []);

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
    addToCart: (product) => addToCart(product),
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
    if (cart.length === 0) return toast.error("Cart is empty!");
    if (!isPaymentValid) return setPaymentError(`Insufficient Payment: ₹${remainingAmount.toFixed(2)} remaining`);
    setIsProcessing(true); setCheckoutStep('processing');
    try {
      const lastOrderNo = orders.reduce((max, o) => isNaN(parseInt(o.order_number)) ? max : Math.max(max, parseInt(o.order_number)), 0);
      const orderData = {
        order_number: (lastOrderNo + 1).toString(),
        user_id: selectedUser?.id || 'POS-CUST',
        customer_name: selectedUser?.name || 'Walk-in Customer',
        user_mobile: selectedUser?.mobile || '',
        address: selectedUser?.address || '',
        subtotal: subTotal,
        total_amount: finalTotal,
        payment_method: pMethod,
        payment_status: 'paid',
        order_status: 'completed',
        discount: manualDiscount,
        delivery_charge: deliveryChargeAmount
      };
      const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.INSERT, orderData);
      if (!orderRes.success) throw new Error(orderRes.error);
      const createdOrder = orderRes.data[0];
      setLastOrderData(createdOrder);
      setSessionOrders(prev => [...prev, createdOrder]);
      addSessionActivity('Sale Completed', `Bill #${createdOrder.order_number} - ₹${createdOrder.total_amount}`, 'Sales', 'success');
      addHardwareLog('Order Saved', 'Cash Drawer', 'success');
      setLastHardwareAction(prev => ({ ...prev, checkout: formatTime(new Date()) }));
      for (const item of cart) {
        await handleERPAction(ERP_MODULES.ORDER_ITEMS, ACTION_TYPES.INSERT, {
          order_id: createdOrder.id,
          product_id: item.id,
          product_name: item.itname || item.name,
          quantity: item.quantity,
          rate: item.sale_rate,
          total: item.sale_rate * item.quantity
        });
        const product = products.find(p => p.id === item.id);
        if (product) {
          const newStock = toFloat(product.opstock ?? product.stock) - item.quantity;
          await handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.UPDATE, { id: product.id, stock: newStock, opstock: newStock });
        }
      }
      setCheckoutStep('success');
      setShowReceiptDialog(true);
      setShowPaymentModal(false);
      setIsProcessing(false);
      fetchInitialData();
    } catch (error) {
      toast.error(error.message);
      setIsProcessing(false);
      setCheckoutStep('idle');
    }
  }, [cart, isPaymentValid, remainingAmount, orders, selectedUser, subTotal, finalTotal, manualDiscount, deliveryChargeAmount, products, addSessionActivity, addHardwareLog, setLastHardwareAction, setSessionOrders, fetchInitialData]);

  const handleCompletePayment = useCallback(() => handleCheckout(getPaymentMethod(paymentAmounts)), [handleCheckout, paymentAmounts]);

  // --- Additional UI Logic (MOVE UP EARLIER TO AVOID REFERENCE ERROR) ---
  const searchResults = useMemo(() => filterProductsBySearch(products, searchTerm), [searchTerm, products]);
  const filteredProducts = useMemo(() => filterProducts(products, { searchTerm, activeCategory, posFilter }), [products, searchTerm, activeCategory, posFilter]);

  const handleProductSelect = useCallback((product) => {
    addToCart(product);
    setSearchTerm('');
    setShowSearchDropdown(false);
    setSelectedIndex(-1);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [addToCart]);

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
    clearCart, addToCart, removeFromCart, updateQty,
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
    clearCart, addToCart, removeFromCart, updateQty,
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
    <POSProvider value={contextValue}>
      <POSViewInner />
    </POSProvider>
  );
}

export default function POSView(props) {
  return (
    <POSErrorBoundary>
      <POSViewContent {...props} />
    </POSErrorBoundary>
  );
}
