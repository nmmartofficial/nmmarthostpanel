/**
 * Payment Module Hook
 * Phase 4 - Step 4
 */

import { usePayment as usePaymentContext } from '../context/PaymentContext';

export const usePayment = () => {
  const context = usePaymentContext();
  
  // Expose paymentState and actions for Phase 4 Step 2
  return {
    paymentState: context.paymentState,
    actions: context.actions,
    // Cash Payment State (Phase 4 Step 3)
    cashAmount: context.cashAmount,
    remainingAmount: context.remainingAmount,
    changeAmount: context.changeAmount,
    // Cash Payment Actions (Phase 4 Step 3)
    setCashAmount: context.setCashAmount,
    processCashPayment: context.processCashPayment,
    clearCashPayment: context.clearCashPayment,
    // UPI Payment State (Phase 4 Step 4)
    upiId: context.upiId,
    upiTransactionId: context.upiTransactionId,
    upiStatus: context.upiStatus,
    // UPI Payment Actions (Phase 4 Step 4)
    setUPIId: context.setUPIId,
    processUPIPayment: context.processUPIPayment,
    clearUPIPayment: context.clearUPIPayment,
    // Card Payment State (Phase 4 Step 5)
    cardNumber: context.cardNumber,
    cardHolderName: context.cardHolderName,
    expiryDate: context.expiryDate,
    cvv: context.cvv,
    cardType: context.cardType,
    cardTransactionId: context.cardTransactionId,
    cardStatus: context.cardStatus,
    // Card Payment Actions (Phase 4 Step 5)
    setCardDetails: context.setCardDetails,
    processCardPayment: context.processCardPayment,
    clearCardPayment: context.clearCardPayment,
    // Split Payment State (Phase 4 Step 6)
    splitPayments: context.splitPayments,
    splitStatus: context.splitStatus,
    splitTransactionIds: context.splitTransactionIds,
    // Split Payment Actions (Phase 4 Step 6)
    setSplitPayments: context.setSplitPayments,
    processSplitPayment: context.processSplitPayment,
    clearSplitPayment: context.clearSplitPayment,
    // Credit Payment State (Phase 4 Step 7)
    creditCustomerId: context.creditCustomerId,
    creditCustomerName: context.creditCustomerName,
    creditReference: context.creditReference,
    creditStatus: context.creditStatus,
    // Credit Payment Actions (Phase 4 Step 7)
    setCreditCustomer: context.setCreditCustomer,
    processCreditPayment: context.processCreditPayment,
    clearCreditPayment: context.clearCreditPayment,
    // Change Return State (Phase 4 Step 8)
    changeBreakdown: context.changeBreakdown,
    shortageAmount: context.shortageAmount,
    // Change Return Actions (Phase 4 Step 8)
    updateChangeSummary: context.updateChangeSummary,
    clearChangeSummary: context.clearChangeSummary,
    // Validation State (Phase 4 Step 9)
    validationErrors: context.validationErrors,
    validationStatus: context.validationStatus,
    // Validation Actions (Phase 4 Step 9)
    runPaymentValidation: context.runPaymentValidation,
    clearPaymentValidation: context.clearPaymentValidation,
    // Payment Finalization (Phase 4 Step 10)
    processPayment: context.processPayment,
    resetPayment: context.resetPayment,
    // Legacy exports preserved for compatibility
    paymentAmounts: context.paymentAmounts,
    setPaymentAmounts: context.setPaymentAmounts,
    paymentStatus: context.paymentStatus,
    setPaymentStatus: context.setPaymentStatus,
    paymentError: context.paymentError,
    setPaymentError: context.setPaymentError,
    isSplitPayment: context.isSplitPayment,
    setIsSplitPayment: context.setIsSplitPayment,
    activePaymentMethod: context.activePaymentMethod,
    setActivePaymentMethod: context.setActivePaymentMethod,
    paymentHistory: context.paymentHistory,
    setPaymentHistory: context.setPaymentHistory,
    creditDetails: context.creditDetails,
    setCreditDetails: context.setCreditDetails,
    totalPaid: context.totalPaid,
    PAYMENT_METHODS: context.PAYMENT_METHODS,
    PAYMENT_STATUS: context.PAYMENT_STATUS,
    PAYMENT_INTERFACES: context.PAYMENT_INTERFACES
  };
};
