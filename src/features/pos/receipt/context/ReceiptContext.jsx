/**
 * Receipt Module Context
 * Phase 9 - Step 3
 * State wiring only - no business logic
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialReceiptState } from '../store/receipt.state';
import { ReceiptService } from '../services/receipt.service';

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
    createReceipt: useCallback(async (input) => {
      setLoading(true);
      setError('');

      try {
        const result = await ReceiptService.createReceipt(input);
        
        if (result.success && result.receipt) {
          setReceiptId(result.receipt.receiptId);
          setReceiptNumber(result.receipt.receiptNumber);
          setInvoiceId(result.receipt.invoiceId);
          setOrderId(result.receipt.orderId);
          setCustomerId(result.receipt.customerId);
          setPaymentId(result.receipt.paymentId);
          setReceiptStatus(result.receipt.receiptStatus);
          setReceiptDate(result.receipt.receiptDate.toISOString());
        } else {
          setError(result.error || 'Failed to create receipt');
        }
        
        setLoading(false);
        return result;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to create receipt');
        setLoading(false);
        return {
          success: false,
          receipt: null,
          error: error instanceof Error ? error.message : 'Failed to create receipt'
        };
      }
    }, []),
    validateReceipt: useCallback(async () => {
      const validationResult = await ReceiptService.validate({
        receiptId,
        receiptNumber,
        invoiceId,
        orderId,
        customerId,
        paymentId,
        receiptDate: receiptDate ? new Date(receiptDate) : undefined,
        receiptStatus,
        subtotal: 0,
        discount: 0,
        tax: 0,
        grandTotal: 0,
        status: receiptStatus
      });

      setValidationErrors(validationResult.errors);
      return validationResult;
    }, [receiptId, receiptNumber, invoiceId, orderId, customerId, paymentId, receiptDate, receiptStatus]),
    clearValidation: useCallback(() => {
      setValidationErrors([]);
    }, []),
    generateReceiptNumber: useCallback(() => {
      const receiptNumberResult = ReceiptService.generateReceiptNumber();
      setReceiptNumber(receiptNumberResult.receiptNumber);
      return receiptNumberResult;
    }, []),
    processReceipt: useCallback(async (input) => {
      setLoading(true);
      setError('');
      setValidationErrors([]);

      const result = await ReceiptService.processReceipt(input);

      if (result.success && result.receipt) {
        setReceiptId(result.receipt.receiptId);
        setReceiptNumber(result.receipt.receiptNumber);
        setInvoiceId(result.receipt.invoiceId);
        setOrderId(result.receipt.orderId);
        setCustomerId(result.receipt.customerId);
        setPaymentId(result.receipt.paymentId);
        setReceiptStatus(result.receipt.receiptStatus);
        setReceiptDate(result.receipt.receiptDate.toISOString());
        setValidationErrors(result.validation?.errors || []);
      } else {
        setReceiptNumber(result.receiptNumber?.receiptNumber || null);
        setValidationErrors(result.validation?.errors || []);
        setError(result.error || 'Failed to process receipt');
      }

      setLoading(false);
      return result;
    }, [])
  }), []);

  const value = useMemo(() => ({
    state,
    actions
  }), [state, actions]);

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
};
