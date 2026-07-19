import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/payment.constants';
import { initialPaymentState } from '../store/payment.state';
import { PaymentService } from '../services/payment.service';

const PaymentContext = createContext();

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

// Payment Interface Types
export const PAYMENT_INTERFACES = {
  CASH_PAYMENT: {
    method: PAYMENT_METHODS.CASH,
    requiredFields: ['amount'],
    optionalFields: []
  },
  UPI_PAYMENT: {
    method: PAYMENT_METHODS.UPI,
    requiredFields: ['amount', 'upiId'],
    optionalFields: ['transactionId']
  },
  CARD_PAYMENT: {
    method: PAYMENT_METHODS.CARD,
    requiredFields: ['amount', 'cardNumber', 'expiry', 'cvv'],
    optionalFields: ['cardHolderName']
  },
  CREDIT_PAYMENT: {
    method: PAYMENT_METHODS.CREDIT,
    requiredFields: ['amount', 'customerId'],
    optionalFields: ['creditLimit', 'dueDate']
  },
  SPLIT_PAYMENT: {
    method: PAYMENT_METHODS.SPLIT,
    requiredFields: ['payments'],
    optionalFields: []
  }
};

export const PaymentProvider = ({ children }) => {
  // --- Payment State (Phase 4 Step 2) ---
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS.CASH);
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.PENDING);
  const [payableAmount, setPayableAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [changeAmount, setChangeAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Cash Payment State (Phase 4 Step 3) ---
  const [cashAmount, setCashAmount] = useState(0);

  // --- Legacy State (Preserved for compatibility) ---
  const [paymentAmounts, setPaymentAmounts] = useState({
    [PAYMENT_METHODS.CASH]: 0,
    [PAYMENT_METHODS.UPI]: 0,
    [PAYMENT_METHODS.CARD]: 0,
    [PAYMENT_METHODS.CREDIT]: 0
  });
  
  const [paymentError, setPaymentError] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [creditDetails, setCreditDetails] = useState({
    enabled: false,
    customerId: null,
    creditLimit: 0,
    currentCredit: 0,
    dueDate: null
  });

  // --- Payment Actions (Phase 4 Step 2) ---
  // Placeholder actions - no calculations, no validation
  const actions = useMemo(() => ({
    setSelectedMethod,
    setPaymentStatus,
    setPayableAmount,
    setPaidAmount,
    setLoading,
    setError,
    resetPayment: useCallback(() => {
      setSelectedMethod(PAYMENT_METHODS.CASH);
      setPaymentStatus(PAYMENT_STATUS.PENDING);
      setPayableAmount(0);
      setPaidAmount(0);
      setRemainingAmount(0);
      setChangeAmount(0);
      setLoading(false);
      setError('');
    }, [])
  }), []);

  // --- Cash Payment Actions (Phase 4 Step 3) ---
  const setCashAmountAction = useCallback((amount) => {
    setCashAmount(amount);
  }, []);

  const processCashPaymentAction = useCallback(() => {
    setLoading(true);
    setError('');

    const result = PaymentService.processCashPayment({
      payableAmount,
      cashAmount
    });

    if (result.success) {
      setPaidAmount(result.paidAmount);
      setRemainingAmount(result.remainingAmount);
      setChangeAmount(result.changeAmount);
      setPaymentStatus(PAYMENT_STATUS.COMPLETED);
    } else {
      setPaidAmount(result.paidAmount);
      setRemainingAmount(result.remainingAmount);
      setChangeAmount(result.changeAmount);
      setPaymentStatus(PAYMENT_STATUS.FAILED);
      setError(result.error || 'Payment failed');
    }

    setLoading(false);
    return result;
  }, [payableAmount, cashAmount]);

  const clearCashPaymentAction = useCallback(() => {
    setCashAmount(0);
    setPaidAmount(0);
    setRemainingAmount(0);
    setChangeAmount(0);
    setPaymentStatus(PAYMENT_STATUS.PENDING);
    setError('');
  }, []);

  // --- Payment State (Phase 4 Step 2) ---
  const paymentState = useMemo(() => ({
    selectedMethod,
    paymentStatus,
    payableAmount,
    paidAmount,
    remainingAmount,
    changeAmount,
    loading,
    error
  }), [
    selectedMethod,
    paymentStatus,
    payableAmount,
    paidAmount,
    remainingAmount,
    changeAmount,
    loading,
    error
  ]);

  // Calculate total paid (Legacy)
  const totalPaid = useMemo(() => {
    return Object.values(paymentAmounts).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  }, [paymentAmounts]);

  const value = useMemo(() => ({
    // Payment State (Phase 4 Step 2)
    paymentState,
    actions,

    // Cash Payment State (Phase 4 Step 3)
    cashAmount,
    remainingAmount,
    changeAmount,

    // Cash Payment Actions (Phase 4 Step 3)
    setCashAmount: setCashAmountAction,
    processCashPayment: processCashPaymentAction,
    clearCashPayment: clearCashPaymentAction,

    // Legacy State (Preserved for compatibility)
    paymentAmounts,
    setPaymentAmounts,
    paymentStatus,
    setPaymentStatus,
    paymentError,
    setPaymentError,
    isSplitPayment,
    setIsSplitPayment,
    activePaymentMethod,
    setActivePaymentMethod,
    paymentHistory,
    setPaymentHistory,
    creditDetails,
    setCreditDetails,
    totalPaid,

    // Constants
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    PAYMENT_INTERFACES
  }), [
    paymentState,
    actions,
    cashAmount,
    remainingAmount,
    changeAmount,
    setCashAmountAction,
    processCashPaymentAction,
    clearCashPaymentAction,
    paymentAmounts,
    paymentStatus,
    paymentError,
    isSplitPayment,
    activePaymentMethod,
    paymentHistory,
    creditDetails,
    totalPaid
  ]);

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};
