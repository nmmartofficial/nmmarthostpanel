/**
 * Payment Module Hook
 * Phase 4 - Step 3
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
