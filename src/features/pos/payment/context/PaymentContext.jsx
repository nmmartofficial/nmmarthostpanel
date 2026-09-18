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

  // --- UPI Payment State (Phase 4 Step 4) ---
  const [upiId, setUPIId] = useState('');
  const [upiStatus, setUPIStatus] = useState('');
  const [upiTransactionId, setUPITransactionId] = useState('');

  // --- Card Payment State (Phase 4 Step 5) ---
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardType, setCardType] = useState('');
  const [cardTransactionId, setCardTransactionId] = useState('');
  const [cardStatus, setCardStatus] = useState('');

  // --- Split Payment State (Phase 4 Step 6) ---
  const [splitPayments, setSplitPayments] = useState([]);
  const [splitStatus, setSplitStatus] = useState('');
  const [splitTransactionIds, setSplitTransactionIds] = useState([]);

  // --- Credit Payment State (Phase 4 Step 7) ---
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditReference, setCreditReference] = useState('');
  const [creditStatus, setCreditStatus] = useState('');

  // --- Change Return State (Phase 4 Step 8) ---
  const [changeBreakdown, setChangeBreakdown] = useState([]);
  const [shortageAmount, setShortageAmount] = useState(0);

  // --- Validation State (Phase 4 Step 9) ---
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationStatus, setValidationStatus] = useState('');

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
  const resetPaymentAction = useCallback(() => {
    // Reset base payment state
    setSelectedMethod(PAYMENT_METHODS.CASH);
    setPaymentStatus(PAYMENT_STATUS.PENDING);
    setPayableAmount(0);
    setPaidAmount(0);
    setRemainingAmount(0);
    setChangeAmount(0);
    setLoading(false);
    setError('');
    
    // Reset cash state
    setCashAmount(0);
    
    // Reset UPI state
    setUPIId('');
    setUPIStatus('');
    setUPITransactionId('');
    
    // Reset card state
    setCardNumber('');
    setCardHolderName('');
    setExpiryDate('');
    setCvv('');
    setCardType('');
    setCardTransactionId('');
    setCardStatus('');
    
    // Reset split state
    setSplitPayments([]);
    setSplitStatus('');
    setSplitTransactionIds([]);
    
    // Reset credit state
    setCreditCustomerId('');
    setCreditCustomerName('');
    setCreditReference('');
    setCreditStatus('');
    
    // Reset change state
    setChangeBreakdown([]);
    setShortageAmount(0);
    
    // Reset validation state
    setValidationErrors([]);
    setValidationStatus('');
  }, []);

  // Placeholder actions - no calculations, no validation
  const actions = useMemo(() => ({
    setSelectedMethod,
    setPaymentStatus,
    setPayableAmount,
    setPaidAmount,
    setLoading,
    setError,
    resetPayment: resetPaymentAction
  }), [resetPaymentAction]);

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

  // --- UPI Payment Actions (Phase 4 Step 4) ---
  // State wiring only - business logic in PaymentService
  const setUPIIdAction = useCallback((id) => {
    setUPIId(id);
  }, []);

  const processUPIPaymentAction = useCallback(() => {
    setLoading(true);
    setError('');

    const result = PaymentService.processUPIPayment({
      payableAmount,
      upiId
    });

    // Update state based on service result
    setPaidAmount(result.paidAmount);
    setRemainingAmount(result.remainingAmount);
    setChangeAmount(result.changeAmount);
    setUPITransactionId(result.transactionId);
    setUPIStatus(result.success ? 'COMPLETED' : 'FAILED');
    setPaymentStatus(result.success ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED);
    setError(result.error || '');

    setLoading(false);
    return result;
  }, [payableAmount, upiId]);

  const clearUPIPaymentAction = useCallback(() => {
    setUPIId('');
    setUPIStatus('');
    setUPITransactionId('');
    setPaidAmount(0);
    setRemainingAmount(0);
    setChangeAmount(0);
    setPaymentStatus(PAYMENT_STATUS.PENDING);
    setError('');
  }, []);

  // --- Card Payment Actions (Phase 4 Step 5) ---
  // State wiring only - business logic in PaymentService
  const setCardDetailsAction = useCallback((details) => {
    setCardNumber(details.cardNumber || '');
    setCardHolderName(details.cardHolderName || '');
    setExpiryDate(details.expiryDate || '');
    setCvv(details.cvv || '');
  }, []);

  const processCardPaymentAction = useCallback(() => {
    setLoading(true);
    setError('');

    const result = PaymentService.processCardPayment({
      payableAmount,
      cardNumber,
      cardHolderName,
      expiryDate,
      cvv
    });

    // Update state based on service result
    setPaidAmount(result.paidAmount);
    setRemainingAmount(result.remainingAmount);
    setChangeAmount(result.changeAmount);
    setCardType(result.cardType);
    setCardTransactionId(result.transactionId);
    setCardStatus(result.success ? 'COMPLETED' : 'FAILED');
    setPaymentStatus(result.success ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED);
    setError(result.error || '');

    setLoading(false);
    return result;
  }, [payableAmount, cardNumber, cardHolderName, expiryDate, cvv]);

  const clearCardPaymentAction = useCallback(() => {
    setCardNumber('');
    setCardHolderName('');
    setExpiryDate('');
    setCvv('');
    setCardType('');
    setCardTransactionId('');
    setCardStatus('');
    setPaidAmount(0);
    setRemainingAmount(0);
    setChangeAmount(0);
    setPaymentStatus(PAYMENT_STATUS.PENDING);
    setError('');
  }, []);

  // --- Split Payment Actions (Phase 4 Step 6) ---
  const setSplitPaymentsAction = useCallback((payments) => {
    setSplitPayments(payments);
  }, []);

  const processSplitPaymentAction = useCallback(() => {
    setLoading(true);
    setError('');

    const result = PaymentService.processSplitPayment({
      payableAmount,
      splitPayments,
      cashAmount,
      upiId,
      cardNumber,
      cardHolderName,
      expiryDate,
      cvv
    });

    // Update state with results
    setPaidAmount(result.paidAmount);
    setRemainingAmount(result.remainingAmount);
    setChangeAmount(result.changeAmount);
    setSplitPayments(result.processedPayments);
    setSplitTransactionIds(result.transactionIds);
    setSplitStatus(result.success ? 'COMPLETED' : 'FAILED');
    setPaymentStatus(result.success ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED);
    setError(result.error || '');

    setLoading(false);
    return result;
  }, [
    payableAmount,
    splitPayments,
    cashAmount,
    upiId,
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv
  ]);

  const clearSplitPaymentAction = useCallback(() => {
    setSplitPayments([]);
    setSplitStatus('');
    setSplitTransactionIds([]);
    setPaidAmount(0);
    setRemainingAmount(0);
    setChangeAmount(0);
    setPaymentStatus(PAYMENT_STATUS.PENDING);
    setError('');
  }, []);

  // --- Credit Payment Actions (Phase 4 Step 7) ---
  const setCreditCustomerAction = useCallback((customer) => {
    setCreditCustomerId(customer.customerId || '');
    setCreditCustomerName(customer.customerName || '');
    setCreditReference(customer.reference || '');
  }, []);

  const processCreditPaymentAction = useCallback(() => {
    setLoading(true);
    setError('');

    const result = PaymentService.processCreditPayment({
      payableAmount,
      creditCustomerId,
      creditCustomerName,
      creditReference
    });

    setPaidAmount(result.paidAmount);
    setRemainingAmount(result.remainingAmount);
    setChangeAmount(result.changeAmount);
    setCreditReference(result.transactionId);
    setCreditStatus(result.success ? 'COMPLETED' : 'FAILED');
    setPaymentStatus(result.success ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED);
    setError(result.error || '');

    setLoading(false);
    return result;
  }, [payableAmount, creditCustomerId, creditCustomerName, creditReference]);

  const clearCreditPaymentAction = useCallback(() => {
    setCreditCustomerId('');
    setCreditCustomerName('');
    setCreditReference('');
    setCreditStatus('');
    setPaidAmount(0);
    setRemainingAmount(0);
    setChangeAmount(0);
    setPaymentStatus(PAYMENT_STATUS.PENDING);
    setError('');
  }, []);

  // --- Change Return Actions (Phase 4 Step 8) ---
  const updateChangeSummaryAction = useCallback(() => {
    const result = PaymentService.updateChangeSummary({
      payableAmount,
      paidAmount
    });

    setChangeAmount(result.changeAmount);
    setChangeBreakdown(result.changeBreakdown);
    setShortageAmount(result.shortageAmount);
  }, [payableAmount, paidAmount]);

  const clearChangeSummaryAction = useCallback(() => {
    setChangeBreakdown([]);
    setShortageAmount(0);
  }, []);

  // --- Validation Actions (Phase 4 Step 9) ---
  const runPaymentValidationAction = useCallback(() => {
    const result = PaymentService.validatePayment({
      method: selectedMethod,
      payableAmount,
      cashAmount,
      upiId,
      cardNumber,
      expiryDate,
      cvv,
      splitPayments,
      creditCustomerId,
      creditCustomerName
    });
    
    setValidationErrors(result.errors);
    setValidationStatus(result.isValid ? 'VALID' : 'INVALID');
    return result;
  }, [
    selectedMethod,
    payableAmount,
    cashAmount,
    upiId,
    cardNumber,
    expiryDate,
    cvv,
    splitPayments,
    creditCustomerId,
    creditCustomerName
  ]);

  const clearPaymentValidationAction = useCallback(() => {
    setValidationErrors([]);
    setValidationStatus('');
  }, []);

  // --- Payment Finalization (Phase 4 Step 10) ---
  const processPaymentAction = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await PaymentService.processPayment({
      method: selectedMethod,
      payableAmount,
      cashAmount,
      upiId,
      cardNumber,
      cardHolderName,
      expiryDate,
      cvv,
      splitPayments,
      creditCustomerId,
      creditCustomerName,
      creditReference
    });

    // Update all relevant state
    setPaidAmount(result.paidAmount);
    setRemainingAmount(result.remainingAmount);
    setChangeAmount(result.changeAmount);
    setValidationErrors(result.errors);
    setValidationStatus(result.success ? 'VALID' : 'INVALID');
    setPaymentStatus(result.success ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED);

    // Update method-specific state
    if (result.method === 'UPI') {
      setUPITransactionId(result.transactionId);
      setUPIStatus(result.status);
    } else if (result.method === 'CARD') {
      setCardTransactionId(result.transactionId);
      setCardStatus(result.status);
    } else if (result.method === 'SPLIT') {
      setSplitTransactionIds(result.transactionId.split(','));
      setSplitStatus(result.status);
    } else if (result.method === 'CREDIT') {
      setCreditReference(result.transactionId);
      setCreditStatus(result.status);
    }

    // Also update change summary
    const changeSummary = PaymentService.updateChangeSummary({
      payableAmount,
      paidAmount: result.paidAmount
    });
    setChangeBreakdown(changeSummary.changeBreakdown);
    setShortageAmount(changeSummary.shortageAmount);

    setLoading(false);
    return result;
  }, [
    selectedMethod,
    payableAmount,
    cashAmount,
    upiId,
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv,
    splitPayments,
    creditCustomerId,
    creditCustomerName,
    creditReference
  ]);

  // --- Payment State (Phase 4 Step 2) ---
  const paymentState = useMemo(() => ({
    selectedMethod,
    paymentStatus,
    payableAmount,
    paidAmount,
    remainingAmount,
    changeAmount,
    loading,
    error,
    // UPI State (Phase 4 Step 4)
    upiId,
    upiStatus,
    upiTransactionId,
    // Card State (Phase 4 Step 5)
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv,
    cardType,
    cardTransactionId,
    cardStatus,
    // Split Payment State (Phase 4 Step 6)
    splitPayments,
    splitStatus,
    splitTransactionIds,
    // Credit Payment State (Phase 4 Step 7)
    creditCustomerId,
    creditCustomerName,
    creditReference,
    creditStatus,
    // Change Return State (Phase 4 Step 8)
    changeBreakdown,
    shortageAmount,
    // Validation State (Phase 4 Step 9)
    validationErrors,
    validationStatus
  }), [
    selectedMethod,
    paymentStatus,
    payableAmount,
    paidAmount,
    remainingAmount,
    changeAmount,
    loading,
    error,
    upiId,
    upiStatus,
    upiTransactionId,
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv,
    cardType,
    cardTransactionId,
    cardStatus,
    splitPayments,
    splitStatus,
    splitTransactionIds,
    creditCustomerId,
    creditCustomerName,
    creditReference,
    creditStatus,
    changeBreakdown,
    shortageAmount,
    validationErrors,
    validationStatus
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

    // UPI Payment State (Phase 4 Step 4)
    upiId,
    upiTransactionId,
    upiStatus,

    // UPI Payment Actions (Phase 4 Step 4)
    setUPIId: setUPIIdAction,
    processUPIPayment: processUPIPaymentAction,
    clearUPIPayment: clearUPIPaymentAction,

    // Card Payment State (Phase 4 Step 5)
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv,
    cardType,
    cardTransactionId,
    cardStatus,

    // Card Payment Actions (Phase 4 Step 5)
    setCardDetails: setCardDetailsAction,
    processCardPayment: processCardPaymentAction,
    clearCardPayment: clearCardPaymentAction,

    // Split Payment State (Phase 4 Step 6)
    splitPayments,
    splitStatus,
    splitTransactionIds,

    // Split Payment Actions (Phase 4 Step 6)
    setSplitPayments: setSplitPaymentsAction,
    processSplitPayment: processSplitPaymentAction,
    clearSplitPayment: clearSplitPaymentAction,

    // Credit Payment State (Phase 4 Step 7)
    creditCustomerId,
    creditCustomerName,
    creditReference,
    creditStatus,

    // Credit Payment Actions (Phase 4 Step 7)
    setCreditCustomer: setCreditCustomerAction,
    processCreditPayment: processCreditPaymentAction,
    clearCreditPayment: clearCreditPaymentAction,

    // Change Return State (Phase 4 Step 8)
    changeBreakdown,
    shortageAmount,

    // Change Return Actions (Phase 4 Step 8)
    updateChangeSummary: updateChangeSummaryAction,
    clearChangeSummary: clearChangeSummaryAction,

    // Validation State (Phase 4 Step 9)
    validationErrors,
    validationStatus,

    // Validation Actions (Phase 4 Step 9)
    runPaymentValidation: runPaymentValidationAction,
    clearPaymentValidation: clearPaymentValidationAction,

    // Payment Finalization (Phase 4 Step 10)
    processPayment: processPaymentAction,
    resetPayment: resetPaymentAction,

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
    upiId,
    upiTransactionId,
    upiStatus,
    setUPIIdAction,
    processUPIPaymentAction,
    clearUPIPaymentAction,
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv,
    cardType,
    cardTransactionId,
    cardStatus,
    setCardDetailsAction,
    processCardPaymentAction,
    clearCardPaymentAction,
    splitPayments,
    splitStatus,
    splitTransactionIds,
    setSplitPaymentsAction,
    processSplitPaymentAction,
    clearSplitPaymentAction,
    creditCustomerId,
    creditCustomerName,
    creditReference,
    creditStatus,
    setCreditCustomerAction,
    processCreditPaymentAction,
    clearCreditPaymentAction,
    changeBreakdown,
    shortageAmount,
    updateChangeSummaryAction,
    clearChangeSummaryAction,
    validationErrors,
    validationStatus,
    runPaymentValidationAction,
    clearPaymentValidationAction,
    processPaymentAction,
    resetPaymentAction,
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
