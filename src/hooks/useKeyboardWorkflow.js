import { useEffect, useCallback } from 'react';
import { isInputFocused } from '../utils/pos';

export const useKeyboardWorkflow = ({
  checkoutStep,
  isProcessing,
  showReceiptDialog,
  showVoidDialog,
  showShiftPanel,
  showDiscountPanel,
  showTimeline,
  showHardwareDashboard,
  showPaymentModal,
  showHoldQueue,
  showOverride,
  showSearchDropdown,
  showCustDropdown,
  cart,
  selectedCartId,
  setSelectedCartId,
  finalTotal,
  heldBills,
  filteredHeldBills,
  selectedHoldIdx,
  setSelectedHoldIdx,
  billDiscount,
  flatDiscount,
  discountInput,
  setDiscountInput,
  setPaymentAmounts,
  setPaymentError,
  setShowPaymentModal,
  setShowHoldQueue,
  setShowShiftPanel,
  setShowDiscountPanel,
  setShowTimeline,
  setShowHardwareDashboard,
  setShowOverride,
  setShowVoidDialog,
  handleHoldBill,
  handleCheckout,
  resumeHoldBill,
  handlePrintAgain,
  closeReceiptDialog,
  confirmVoidSale,
  handleDiscountChangeAttempt,
  handleClearCartAttempt,
  handleCompletePayment,
  removeFromCart,
  updateQty,
  searchInputRef,
  custSearchRef,
  barcodeInputRef
}) => {
  const handleGlobalKey = useCallback((e) => {
    if (checkoutStep === 'processing' || isProcessing) return;

    if (showReceiptDialog) {
      if (e.key === 'Enter') { e.preventDefault(); handlePrintAgain(); }
      if (e.key === 'Escape') { e.preventDefault(); closeReceiptDialog(); }
      return;
    }
    if (showVoidDialog) {
      if (e.key === 'Enter') { e.preventDefault(); confirmVoidSale(); }
      if (e.key === 'Escape') { e.preventDefault(); setShowVoidDialog(false); barcodeInputRef.current?.focus(); }
      return;
    }
    if (showShiftPanel) {
      if (e.key === 'Escape') { e.preventDefault(); setShowShiftPanel(false); barcodeInputRef.current?.focus(); }
      return;
    }
    if (showDiscountPanel) {
      if (e.key === 'Enter') { e.preventDefault(); handleDiscountChangeAttempt(discountInput.type, discountInput.value); }
      if (e.key === 'Escape') { e.preventDefault(); setShowDiscountPanel(false); barcodeInputRef.current?.focus(); }
      return;
    }
    if (showTimeline) {
      if (e.key === 'Escape') { e.preventDefault(); setShowTimeline(false); barcodeInputRef.current?.focus(); }
      return;
    }
    if (showHardwareDashboard) {
      if (e.key === 'Escape') { e.preventDefault(); setShowHardwareDashboard(false); barcodeInputRef.current?.focus(); }
      return;
    }

    if (e.key === 'F1') { e.preventDefault(); searchInputRef.current?.focus(); }
    if (e.key === 'F2') { e.preventDefault(); custSearchRef.current?.focus(); }
    if (e.key === 'F3') { e.preventDefault(); handleHoldBill(); }
    if (e.key === 'F4') { e.preventDefault(); setSelectedHoldIdx(heldBills.length > 0 ? 0 : -1); setShowHoldQueue(true); }
    if (e.key === 'F7') { e.preventDefault(); setShowShiftPanel(true); }
    if (e.key === 'F8') {
      e.preventDefault();
      if (cart.length > 0) {
        setDiscountInput({ type: billDiscount > 0 ? 'percent' : 'flat', value: billDiscount || flatDiscount || '' });
        setShowDiscountPanel(true);
      }
    }
    if (e.key === 'F9') { e.preventDefault(); setShowTimeline(true); }
    if (e.key === 'F10') { e.preventDefault(); setShowHardwareDashboard(true); }
    if (e.key === 'F6') { e.preventDefault(); if (cart.length > 0) { setPaymentAmounts({ Cash: finalTotal, UPI: 0, Card: 0 }); setPaymentError(''); setShowPaymentModal(true); } }
    if (e.key === 'F12') { e.preventDefault(); if (cart.length > 0) handleCheckout(); }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (showReceiptDialog) closeReceiptDialog();
      else if (showOverride) setShowOverride(false);
      else if (showPaymentModal) setShowPaymentModal(false);
      else if (showHoldQueue) setShowHoldQueue(false);
      else if (showSearchDropdown) {} // Handled in search component usually but keeping logic consistent
      else if (showCustDropdown) {}
      else handleClearCartAttempt();

      barcodeInputRef.current?.focus();
    }

    if (showHoldQueue) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedHoldIdx(prev => (prev < filteredHeldBills.length - 1 ? prev + 1 : prev)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedHoldIdx(prev => (prev > 0 ? prev - 1 : 0)); }
      if (e.key === 'Enter' && selectedHoldIdx >= 0) { e.preventDefault(); resumeHoldBill(filteredHeldBills[selectedHoldIdx]); }
      return;
    }

    if (showPaymentModal) {
      if (e.key === 'Enter') { e.preventDefault(); handleCompletePayment(); }
      return;
    }

    if (!showSearchDropdown && !showCustDropdown && (!isInputFocused() || document.activeElement === barcodeInputRef.current)) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = cart.findIndex(i => i.id === selectedCartId);
        const nextIndex = currentIndex < cart.length - 1 ? currentIndex + 1 : 0;
        if (cart[nextIndex]) setSelectedCartId(cart[nextIndex].id);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = cart.findIndex(i => i.id === selectedCartId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : cart.length - 1;
        if (cart[prevIndex]) setSelectedCartId(cart[prevIndex].id);
      }
    }

    if (selectedCartId && !showSearchDropdown && !showCustDropdown) {
      if (e.key === 'Delete') { e.preventDefault(); removeFromCart(selectedCartId); }
      if (e.key === '+') { e.preventDefault(); const item = cart.find(i => i.id === selectedCartId); if (item) updateQty(selectedCartId, item.quantity + 1); }
      if (e.key === '-') { e.preventDefault(); const item = cart.find(i => i.id === selectedCartId); if (item) updateQty(selectedCartId, item.quantity - 1); }
    }
  }, [
    checkoutStep, isProcessing, showReceiptDialog, showVoidDialog, showShiftPanel, showDiscountPanel,
    showTimeline, showHardwareDashboard, showPaymentModal, showHoldQueue, showOverride,
    showSearchDropdown, showCustDropdown, cart, selectedCartId, setSelectedCartId, finalTotal,
    heldBills, filteredHeldBills, selectedHoldIdx, setSelectedHoldIdx, billDiscount, flatDiscount,
    discountInput, setDiscountInput, setPaymentAmounts, setPaymentError, setShowPaymentModal,
    setShowHoldQueue, setShowShiftPanel, setShowDiscountPanel, setShowTimeline, setShowHardwareDashboard,
    setShowOverride, setShowVoidDialog, handleHoldBill, handleCheckout, resumeHoldBill, handlePrintAgain,
    closeReceiptDialog, confirmVoidSale, handleDiscountChangeAttempt, handleClearCartAttempt,
    handleCompletePayment, removeFromCart, updateQty, searchInputRef, custSearchRef, barcodeInputRef
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  return { handleGlobalKey };
};
