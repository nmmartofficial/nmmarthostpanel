import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import { isLocalPosTestMode } from '../utils/localPosTestMode';
import {
  deleteStoreHeldBill,
  listStoreHeldBills,
  resumeStoreHeldBill,
  saveStoreHeldBill
} from '../utils/pos/heldBillsBackend';
import { getShortHoldId, sortHeldBills, formatTime, normalizeSearch } from '../utils/pos';

export const useHoldEngine = ({
  cart,
  customerInfo,
  finalTotal,
  clearCart,
  addSessionActivity,
  barcodeInputRef,
  setSessionActivitiesCount,
  currentUser
}) => {
  const [heldBills, setHeldBills] = useState([]);
  const [heldBillsScopeKey, setHeldBillsScopeKey] = useState('');
  const [showHoldQueue, setShowHoldQueue] = useState(false);
  const [holdSearch, setHoldSearch] = useState('');
  const [holdSort, setHoldSort] = useState('newest');
  const [selectedHoldIdx, setSelectedHoldIdx] = useState(-1);
  const [holdSuccessMsg, setHoldSuccessMsg] = useState(false);
  const [heldBillsLoading, setHeldBillsLoading] = useState(false);
  const [heldBillsError, setHeldBillsError] = useState('');
  const refreshRequestRef = useRef(0);
  const operationRef = useRef(false);
  const scopeKey = isLocalPosTestMode
    ? 'local-pos-test'
    : `${String(currentUser?.tenant_id ?? '')}:${String(currentUser?.company_code ?? '')}`;
  const visibleHeldBills = heldBillsScopeKey === scopeKey ? heldBills : [];

  const refreshHeldBills = useCallback(async () => {
    if (isLocalPosTestMode) {
      setHeldBillsScopeKey('local-pos-test');
      setHeldBillsError('');
      setHeldBillsLoading(false);
      return [];
    }

    const requestId = ++refreshRequestRef.current;
    setHeldBillsLoading(true);
    setHeldBillsError('');
    try {
      const rows = await listStoreHeldBills(supabase, currentUser);
      if (requestId === refreshRequestRef.current) {
        setHeldBillsScopeKey(`${String(currentUser?.tenant_id ?? '')}:${String(currentUser?.company_code ?? '')}`);
        setHeldBills(rows);
      }
      return rows;
    } catch (error) {
      if (requestId === refreshRequestRef.current) {
        const message = error?.message || 'Held bills could not be loaded from the backend.';
        setHeldBillsError(message);
        toast.error(message);
      }
      throw error;
    } finally {
      if (requestId === refreshRequestRef.current) setHeldBillsLoading(false);
    }
  }, [currentUser?.company_code, currentUser?.tenant_id]);

  useEffect(() => {
    refreshHeldBills().catch((error) => {
      console.error('Held bill refresh failed:', error);
    });
    return () => {
      refreshRequestRef.current += 1;
    };
  }, [refreshHeldBills]);

  useEffect(() => {
    if (showHoldQueue) {
      refreshHeldBills().catch((error) => {
        console.error('Held bill refresh failed:', error);
      });
    }
  }, [showHoldQueue, refreshHeldBills]);

  const filteredHeldBills = useMemo(() => {
    let list = [...visibleHeldBills];
    const term = normalizeSearch(holdSearch);

    if (term) {
      list = list.filter((bill) => (
        String(bill.id).toLowerCase().includes(term)
        || normalizeSearch(bill.customerInfo?.name).includes(term)
        || (bill.customerInfo?.mob || '').includes(term)
      ));
    }

    return sortHeldBills(list, holdSort);
  }, [visibleHeldBills, holdSearch, holdSort]);

  const handleHoldBill = useCallback(async () => {
    if (cart.length === 0) return;
    if (operationRef.current) return;
    operationRef.current = true;
    try {
      const now = new Date();
      let heldBill;
      if (isLocalPosTestMode) {
        heldBill = {
          id: now.getTime(),
          cart,
          customerInfo,
          time: formatTime(now),
          created_at: now.toISOString(),
          total: finalTotal
        };
      } else {
        const randomUUID = globalThis.crypto?.randomUUID;
        if (typeof randomUUID !== 'function') {
          throw new Error('Secure bill IDs are unavailable in this browser.');
        }
        heldBill = await saveStoreHeldBill(supabase, currentUser, {
          id: randomUUID.call(globalThis.crypto),
          cart,
          customerInfo,
          total: finalTotal
        });
      }

      refreshRequestRef.current += 1;
      setHeldBillsLoading(false);
      setHeldBillsScopeKey(scopeKey);
      setHeldBills((previous) => [heldBill, ...previous.filter((bill) => bill.id !== heldBill.id)]);
      clearCart();
      setHoldSuccessMsg(true);
      setSessionActivitiesCount?.((previous) => ({ ...previous, holds: previous.holds + 1 }));
      addSessionActivity?.('Bill Held', `Amt: ₹${finalTotal}`, 'Sales', 'warning');
      toast.success('Bill put on hold', { position: 'bottom-center' });
      setTimeout(() => setHoldSuccessMsg(false), 3000);
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (error) {
      const message = error?.message || 'Bill could not be saved to the held-bill backend.';
      setHeldBillsError(message);
      toast.error(message);
      console.error('Held bill save failed:', error);
    } finally {
      operationRef.current = false;
    }
  }, [
    cart, customerInfo, finalTotal, clearCart, setSessionActivitiesCount,
    addSessionActivity, barcodeInputRef, currentUser, scopeKey
  ]);

  const resumeHoldBill = useCallback(async (heldBill) => {
    if (!heldBill?.id || operationRef.current) return null;
    operationRef.current = true;
    try {
      const resumedBill = isLocalPosTestMode
        ? heldBill
        : await resumeStoreHeldBill(supabase, currentUser, heldBill.id);
      refreshRequestRef.current += 1;
      setHeldBillsLoading(false);
      setHeldBills((previous) => previous.filter((bill) => bill.id !== resumedBill.id));
      setShowHoldQueue(false);
      addSessionActivity?.('Bill Resumed', `ID: #${getShortHoldId(resumedBill.id)}`, 'Sales', 'success');
      toast.info('Bill restored from hold', { position: 'bottom-center' });
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
      return { cart: resumedBill.cart, customerInfo: resumedBill.customerInfo };
    } catch (error) {
      const message = error?.message || 'Held bill could not be resumed from the backend.';
      setHeldBillsError(message);
      toast.error(message);
      console.error('Held bill resume failed:', error);
      return null;
    } finally {
      operationRef.current = false;
    }
  }, [addSessionActivity, barcodeInputRef, currentUser]);

  const deleteHeldBill = useCallback(async (id) => {
    if (!id || operationRef.current) return;
    operationRef.current = true;
    try {
      if (!isLocalPosTestMode) await deleteStoreHeldBill(supabase, currentUser, id);
      refreshRequestRef.current += 1;
      setHeldBillsLoading(false);
      setHeldBills((previous) => previous.filter((bill) => bill.id !== id));
      toast.info('Held bill deleted', { position: 'bottom-center' });
    } catch (error) {
      const message = error?.message || 'Held bill could not be deleted from the backend.';
      setHeldBillsError(message);
      toast.error(message);
      console.error('Held bill delete failed:', error);
    } finally {
      operationRef.current = false;
    }
  }, [currentUser]);

  return {
    heldBills: visibleHeldBills,
    showHoldQueue,
    setShowHoldQueue,
    holdSearch,
    setHoldSearch,
    holdSort,
    setHoldSort,
    selectedHoldIdx,
    setSelectedHoldIdx,
    holdSuccessMsg,
    heldBillsLoading,
    heldBillsError,
    refreshHeldBills,
    filteredHeldBills,
    handleHoldBill,
    resumeHoldBill,
    deleteHeldBill
  };
};
