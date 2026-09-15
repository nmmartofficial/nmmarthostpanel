import { useState, useMemo, useCallback, useEffect } from 'react';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';
import { normalizeSearch, calcCustomerStats, formatDate, toFloat } from '../utils/pos';

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
  const [customerLoyalty, setCustomerLoyalty] = useState({ points: 0, wallet: 0 });
  const [redeemPoints, setRedeemPoints] = useState(0);

  const filteredUsers = useMemo(() => {
    const term = normalizeSearch(custSearch);
    if (!term) return [];

    return users.filter(u =>
      normalizeSearch(u.name).includes(term) ||
      (u.mobile || '').includes(term) ||
      normalizeSearch(u.id).includes(term)
    ).slice(0, 10);
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

  const fetchCustomerData = useCallback(async (mobile) => {
    try {
      const history = await dbSync.fetch(DB_SCHEMA.ORDERS.table, {
        eq: { column: 'user_mobile', value: mobile },
        limit: 5,
        order: { column: 'created_at', ascending: false }
      });
      setCustomerHistory(history || []);
      const userData = await dbSync.fetch(DB_SCHEMA.USERS.table, { eq: { column: 'mobile', value: mobile } });
      if (userData && userData.length > 0) {
        setCustomerLoyalty({ points: userData[0].points || 0, wallet: userData[0].wallet || 0 });
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (selectedUser?.mobile && selectedUser.mobile.length >= 10) {
       fetchCustomerData(selectedUser.mobile);
    } else {
       setCustomerHistory([]);
       setCustomerLoyalty({ points: 0, wallet: 0 });
       setRedeemPoints(0);
    }
  }, [selectedUser, fetchCustomerData]);

  const selectCustomer = useCallback((user) => {
    if (!user) {
      setSelectedUser(null);
      setCustSearch('');
      addSessionActivity?.('Customer Reset', 'Switched to Walk-in', 'Sales');
    } else {
      setSelectedUser(user);
      setCustSearch(user.mobile || user.name || '');
      addSessionActivity?.('Customer Selected', `${user.name || user.mobile}`, 'Sales', 'success');
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
    redeemPoints, setRedeemPoints,
    filteredUsers,
    customerStats,
    selectCustomer,
    handleCustSearchKeyDown
  };
};
