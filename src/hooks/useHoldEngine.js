import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getShortHoldId, sortHeldBills, formatTime, normalizeSearch } from '../utils/pos';

export const useHoldEngine = ({
  cart,
  customerInfo,
  finalTotal,
  clearCart,
  addSessionActivity,
  barcodeInputRef,
  setSessionActivitiesCount
}) => {
  const [heldBills, setHeldBills] = useState(() => {
    const saved = localStorage.getItem('pos_held_bills');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHoldQueue, setShowHoldQueue] = useState(false);
  const [holdSearch, setHoldSearch] = useState('');
  const [holdSort, setHoldSort] = useState('newest');
  const [selectedHoldIdx, setSelectedHoldIdx] = useState(-1);
  const [holdSuccessMsg, setHoldSuccessMsg] = useState(false);

  useEffect(() => {
    localStorage.setItem('pos_held_bills', JSON.stringify(heldBills));
  }, [heldBills]);

  const filteredHeldBills = useMemo(() => {
    let list = [...heldBills];
    const term = normalizeSearch(holdSearch);

    if (term) {
      list = list.filter(b =>
        String(b.id).includes(term) ||
        normalizeSearch(b.customerInfo?.name).includes(term) ||
        (b.customerInfo?.mob || '').includes(term)
      );
    }

    return sortHeldBills(list, holdSort);
  }, [heldBills, holdSearch, holdSort]);

  const handleHoldBill = useCallback(() => {
    if (cart.length === 0) return;
    const now = new Date();
    const newHold = {
      id: now.getTime(),
      cart,
      customerInfo,
      time: formatTime(now),
      total: finalTotal
    };
    setHeldBills(prev => [...prev, newHold]);
    clearCart();
    setHoldSuccessMsg(true);
    setSessionActivitiesCount?.(prev => ({ ...prev, holds: prev.holds + 1 }));
    addSessionActivity?.('Bill Held', `Amt: ₹${finalTotal}`, 'Sales', 'warning');
    toast.success("Bill put on hold", { position: 'bottom-center' });
    setTimeout(() => setHoldSuccessMsg(false), 3000);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, [cart, customerInfo, finalTotal, clearCart, addSessionActivity, barcodeInputRef, setSessionActivitiesCount]);

  const resumeHoldBill = useCallback((heldBill) => {
    // Note: The parent needs to update its cart and customerInfo state.
    // This hook will return the data to be set.
    addSessionActivity?.('Bill Resumed', `ID: #${getShortHoldId(heldBill.id)}`, 'Sales', 'success');
    toast.info("Bill restored from hold", { position: 'bottom-center' });
    setHeldBills(prev => prev.filter(b => b.id !== heldBill.id));
    setShowHoldQueue(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
    return { cart: heldBill.cart, customerInfo: heldBill.customerInfo };
  }, [addSessionActivity, barcodeInputRef]);

  const deleteHeldBill = useCallback((id) => {
    setHeldBills(prev => prev.filter(b => b.id !== id));
    toast.info("Held bill deleted", { position: 'bottom-center' });
  }, []);

  return {
    heldBills, setHeldBills,
    showHoldQueue, setShowHoldQueue,
    holdSearch, setHoldSearch,
    holdSort, setHoldSort,
    selectedHoldIdx, setSelectedHoldIdx,
    holdSuccessMsg,
    filteredHeldBills,
    handleHoldBill,
    resumeHoldBill,
    deleteHeldBill
  };
};
