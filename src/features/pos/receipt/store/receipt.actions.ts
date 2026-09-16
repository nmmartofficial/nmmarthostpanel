/**
 * Receipt Module Actions
 * Phase 9 - Step 1
 * Basic state setters implementation
 */

import type { ReceiptActions, ReceiptState } from '../types/receipt.types';
import { initialReceiptState } from './receipt.state';

export const createReceiptActions = (state: ReceiptState, setState: (state: ReceiptState) => void): ReceiptActions => {
  return {
    setReceiptId: (receiptId: string | null) => {
      setState({ ...state, receiptId });
    },
    setReceiptNumber: (receiptNumber: string | null) => {
      setState({ ...state, receiptNumber });
    },
    setInvoiceId: (invoiceId: string | null) => {
      setState({ ...state, invoiceId });
    },
    setOrderId: (orderId: string | number | null) => {
      setState({ ...state, orderId });
    },
    setCustomerId: (customerId: string | number | null) => {
      setState({ ...state, customerId });
    },
    setPaymentId: (paymentId: string | number | null) => {
      setState({ ...state, paymentId });
    },
    setReceiptStatus: (status: any) => {
      setState({ ...state, receiptStatus: status });
    },
    setReceiptDate: (receiptDate: string | null) => {
      setState({ ...state, receiptDate });
    },
    setLoading: (loading: boolean) => {
      setState({ ...state, loading });
    },
    setError: (error: string) => {
      setState({ ...state, error });
    },
    resetReceipt: () => {
      setState(initialReceiptState);
    },
    createReceipt: async (input: any) => {
      setState({
        ...state,
        receiptId: input.receiptId || `RCP-${Date.now()}`,
        receiptNumber: input.receiptNumber || null,
        invoiceId: input.invoiceId || null,
        invoiceNumber: input.invoiceNumber || null,
        orderId: input.orderId || null,
        customerId: input.customerId || null,
        paymentId: input.paymentId || null,
        receiptDate: input.receiptDate ? input.receiptDate.toISOString() : new Date().toISOString(),
        receiptStatus: input.receiptStatus || 'PENDING',
        subtotal: input.subtotal || 0,
        discount: input.discount || 0,
        tax: input.tax || 0,
        grandTotal: input.grandTotal || 0,
        loading: false,
        error: '',
      });
      return { success: true, receipt: null, error: null };
    },
    validateReceipt: async () => {
      const errors = [];
      if (!state.receiptId) errors.push({ field: 'receiptId', message: 'Receipt ID is required' });
      if (!state.receiptNumber) errors.push({ field: 'receiptNumber', message: 'Receipt number is required' });
      if (state.subtotal < 0) errors.push({ field: 'subtotal', message: 'Subtotal cannot be negative' });
      if (state.grandTotal < 0) errors.push({ field: 'grandTotal', message: 'Grand total cannot be negative' });
      setState({ ...state, validationErrors: errors });
      return { valid: errors.length === 0, errors };
    },
    clearValidation: () => {
      setState({ ...state, validationErrors: [] });
    },
    generateReceiptNumber: () => {
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setState({ ...state, receiptNumber });
      return {
        receiptNumber,
        prefix: 'RCP',
        sequence: Date.now(),
        generatedAt: new Date(),
      };
    },
    processReceipt: async (input: any) => {
      const actions = createReceiptActions(state, setState);
      await actions.createReceipt(input);
      const validation = await actions.validateReceipt();
      return {
        success: validation.valid,
        receipt: null,
        validation,
        receiptNumber: null,
        error: validation.valid ? null : 'Validation failed',
      };
    }
  };
};
