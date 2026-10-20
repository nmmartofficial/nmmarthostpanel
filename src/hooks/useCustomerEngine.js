import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';
import {
  calcCustomerStats,
  filterPOSCustomers,
  formatDate,
  getPOSCustomerSelection,
  isCurrentCustomerRequest,
  toFloat
} from '../utils/pos';

export const useCustomerEngine = ({
  users = [],
  orders = [],
  addSessionActivity,
  barcodeInputRef
}) => {
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [selectedCustIdx, setSelectedCustIdx] = useState(-1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [customerLoyalty, setCustomerLoyalty] = useState({ points: null, wallet: null });
  const [customerDataLoading, setCustomerDataLoading] = useState(false);
  const [customerDataError, setCustomerDataError] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);
  const customerRequestId = useRef(0);

  const filteredUsers = useMemo(() => {
    return filterPOSCustomers(users, custSearch);
  }, [custSearch, users]);

  const customerStats = useMemo(() => {
    const stats = calcCustomerStats(selectedUser, orders);
    if (!stats) return null;
    return {
      ...stats,
      lastDate: stats.lastDate === 'Never' ? 'Never' : formatDate(stats.lastDate),
      lastAmount: toFloat(stats.lastAmount)
    };
  }, [selectedUser, orders]);

  const fetchCustomerData = useCallback(async (userId, requestId) => {
    try {
      const [history, loyaltyData, walletData] = await Promise.all([
        dbSync.fetch(DB_SCHEMA.ORDERS.table, {
          eq: { column: 'user_id', value: userId },
          limit: 5,
          order: { column: 'created_at', ascending: false }
        }),
        dbSync.fetch(DB_SCHEMA.LOYALTY_POINTS.table, {
          eq: { column: 'user_id', value: userId },
          limit: 1
        }),
        dbSync.fetch(DB_SCHEMA.WALLET_MASTER.table, {
          eq: { column: 'user_id', value: userId },
          limit: 1
        })
      ]);
      if (!isCurrentCustomerRequest(requestId, customerRequestId.current)) return;
      setCustomerHistory(history || []);
      setCustomerLoyalty({
        points: loyaltyData?.[0]?.points == null ? null : toFloat(loyaltyData[0].points),
        wallet: walletData?.[0]?.balance == null ? null : toFloat(walletData[0].balance)
      });
    } catch (error) {
      if (!isCurrentCustomerRequest(requestId, customerRequestId.current)) return;
      setCustomerDataError('Customer history and balance could not be loaded.');
      console.error('Failed to load POS customer data:', error);
    } finally {
      if (isCurrentCustomerRequest(requestId, customerRequestId.current)) {
        setCustomerDataLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = ++customerRequestId.current;
    setCustomerHistory([]);
    setCustomerLoyalty({ points: null, wallet: null });
    setRedeemPoints(0);
    setCustomerDataError('');

    if (!selectedUser?.id) {
      setCustomerDataLoading(false);
      return () => {
        if (isCurrentCustomerRequest(requestId, customerRequestId.current)) {
          customerRequestId.current += 1;
        }
      };
    }

    setCustomerDataLoading(true);
    fetchCustomerData(selectedUser.id, requestId);
    return () => {
      if (isCurrentCustomerRequest(requestId, customerRequestId.current)) {
        customerRequestId.current += 1;
      }
    };
  }, [selectedUser, fetchCustomerData]);

  const selectCustomer = useCallback((user) => {
    const selection = getPOSCustomerSelection(user);
    setSelectedUser(selection.user);
    setCustSearch(selection.searchValue);
    if (!selection.user) {
      addSessionActivity?.('Customer Reset', selection.activityLabel, 'Sales');
    } else {
      addSessionActivity?.('Customer Selected', selection.activityLabel, 'Sales', 'success');
    }
    setShowCustDropdown(false);
    setSelectedCustIdx(-1);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, [addSessionActivity, barcodeInputRef]);

  const handleCustSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCustIdx(prev => (prev < filteredUsers.length - 1 ? prev + 1 : prev));
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCustIdx(prev => (prev > 0 ? prev - 1 : 0));
    }
    else if (e.key === 'Enter' && selectedCustIdx >= 0) {
      selectCustomer(filteredUsers[selectedCustIdx]);
    }
    else if (e.key === 'Escape') {
      setShowCustDropdown(false);
      setCustSearch('');
      barcodeInputRef.current?.focus();
    }
  };

  return {
    custSearch, setCustSearch,
    showCustDropdown, setShowCustDropdown,
    selectedCustIdx, setSelectedCustIdx,
    selectedUser, setSelectedUser,
    customerHistory,
    customerLoyalty,
    customerDataLoading,
    customerDataError,
    redeemPoints, setRedeemPoints,
    filteredUsers,
    customerStats,
    selectCustomer,
    handleCustSearchKeyDown
  };
};
