import React, { createContext, useContext, useState, useMemo } from 'react';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/payment.constants';

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
  // --- Core Payment State ---
  const [paymentAmounts, setPaymentAmounts] = useState({
    [PAYMENT_METHODS.CASH]: 0,
    [PAYMENT_METHODS.UPI]: 0,
    [PAYMENT_METHODS.CARD]: 0,
    [PAYMENT_METHODS.CREDIT]: 0
  });
  
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.PENDING);
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

  // Calculate total paid
  const totalPaid = useMemo(() => {
    return Object.values(paymentAmounts).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  }, [paymentAmounts]);

  const value = useMemo(() => ({
    // State
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
