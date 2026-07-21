/**
 * Receipt Module Context
 * Phase 9 - Step 2
 * State wiring only - no business logic
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialReceiptState } from '../store/receipt.state';
import { RECEIPT_STATUS } from '../constants/receipt.constants';

const ReceiptContext = createContext();

export const useReceipt = () => {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error('useReceipt must be used within a ReceiptProvider');
  }
  return context;
};

export const ReceiptProvider = ({ children }) => {
  const [receiptId, setReceiptId] = useState(initialReceiptState.receiptId);
  const [receiptNumber, setReceiptNumber] = useState(initialReceiptState.receiptNumber);
  const [invoiceId, setInvoiceId] = useState(initialReceiptState.invoiceId);
  const [orderId, setOrderId] = useState(initialReceiptState.orderId);
  const [customerId, setCustomerId] = useState(initialReceiptState.customerId);
  const [paymentId, setPaymentId] = useState(initialReceiptState.paymentId);
  const [receiptStatus, setReceiptStatus] = useState(initialReceiptState.receiptStatus);
  const [receiptDate, setReceiptDate] = useState(initialReceiptState.receiptDate);
  const [loading, setLoading] = useState(initialReceiptState.loading);
  const [error, setError] = useState(initialReceiptState.error);
  const [validationErrors, setValidationErrors] = useState(initialReceiptState.validationErrors);

  const state = useMemo(() => ({
    receiptId,
    receiptNumber,
    invoiceId,
    orderId,
    customerId,
    paymentId,
    receiptStatus,
    receiptDate,
    loading,
    error,
    validationErrors
  }), [
    receiptId,
    receiptNumber,
    invoiceId,
    orderId,
    customerId,
    paymentId,
    receiptStatus,
    receiptDate,
    loading,
    error,
    validationErrors
  ]);

  const actions = useMemo(() => ({
    setReceiptId,
    setReceiptNumber,
    setInvoiceId,
    setOrderId,
    setCustomerId,
    setPaymentId,
    setReceiptStatus,
    setReceiptDate,
    setLoading,
    setError,
    setValidationErrors,
    resetReceipt: useCallback(() => {
      setReceiptId(initialReceiptState.receiptId);
      setReceiptNumber(initialReceiptState.receiptNumber);
      setInvoiceId(initialReceiptState.invoiceId);
      setOrderId(initialReceiptState.orderId);
      setCustomerId(initialReceiptState.customerId);
      setPaymentId(initialReceiptState.paymentId);
      setReceiptStatus(initialReceiptState.receiptStatus);
      setReceiptDate(initialReceiptState.receiptDate);
      setLoading(initialReceiptState.loading);
      setError(initialReceiptState.error);
      setValidationErrors(initialReceiptState.validationErrors);
    }, []),
    createReceipt: useCallback((input) => {
      throw new Error('receipt.actions.createReceipt - Not Implemented');
    }, []),
    validateReceipt: useCallback(() => {
      throw new Error('receipt.actions.validateReceipt - Not Implemented');
    }, []),
    clearValidation: useCallback(() => {
      throw new Error('receipt.actions.clearValidation - Not Implemented');
    }, []),
    generateReceiptNumber: useCallback(() => {
      throw new Error('receipt.actions.generateReceiptNumber - Not Implemented');
    }, []),
    processReceipt: useCallback((input) => {
      throw new Error('receipt.actions.processReceipt - Not Implemented');
    }, [])
  }), []);

  const value = useMemo(() => ({
    state,
    actions
  }), [state, actions]);

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
};
