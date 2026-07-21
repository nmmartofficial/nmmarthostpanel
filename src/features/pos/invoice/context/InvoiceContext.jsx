/**
 * Invoice Module Context
 * Phase 8 - Step 5
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialInvoiceState } from '../store/invoice.state';
import type { InvoiceState, InvoiceActions, Invoice } from '../types/invoice.types';
import { InvoiceService } from '../services/invoice.service';

const InvoiceContext = createContext<{
  invoiceState: InvoiceState;
  actions: InvoiceActions;
} | null>(null);

export const InvoiceProvider = ({ children }) => {
  const [invoiceState, setInvoiceState] = useState<InvoiceState>(initialInvoiceState);

  const actions: InvoiceActions = useMemo(() => ({
    setInvoiceId: (invoiceId) => setInvoiceState(prev => ({ ...prev, invoiceId })),
    setInvoiceNumber: (invoiceNumber) => setInvoiceState(prev => ({ ...prev, invoiceNumber })),
    setOrderId: (orderId) => setInvoiceState(prev => ({ ...prev, orderId })),
    setCustomerId: (customerId) => setInvoiceState(prev => ({ ...prev, customerId })),
    setPaymentId: (paymentId) => setInvoiceState(prev => ({ ...prev, paymentId })),
    setInvoiceStatus: (invoiceStatus) => setInvoiceState(prev => ({ ...prev, invoiceStatus })),
    setInvoiceDate: (invoiceDate) => setInvoiceState(prev => ({ ...prev, invoiceDate })),
    setSubtotal: (subtotal) => setInvoiceState(prev => ({ ...prev, subtotal })),
    setDiscount: (discount) => setInvoiceState(prev => ({ ...prev, discount })),
    setTax: (tax) => setInvoiceState(prev => ({ ...prev, tax })),
    setGrandTotal: (grandTotal) => setInvoiceState(prev => ({ ...prev, grandTotal })),
    setLoading: (loading) => setInvoiceState(prev => ({ ...prev, loading })),
    setError: (error) => setInvoiceState(prev => ({ ...prev, error })),
    resetInvoice: () => setInvoiceState(initialInvoiceState),
    createInvoice: (input) => InvoiceService.createInvoice(input),
    validateInvoice: () => {
      // Create invoice object from current state
      const invoice: Invoice = {
        invoiceId: invoiceState.invoiceId || `inv-temp-${Date.now()}`,
        invoiceNumber: invoiceState.invoiceNumber,
        orderId: invoiceState.orderId,
        customerId: invoiceState.customerId,
        paymentId: invoiceState.paymentId,
        items: [],
        subtotal: invoiceState.subtotal,
        discount: invoiceState.discount,
        tax: invoiceState.tax,
        grandTotal: invoiceState.grandTotal,
        status: invoiceState.invoiceStatus,
        createdAt: invoiceState.invoiceDate || new Date(),
        updatedAt: invoiceState.invoiceDate || new Date(),
      };
      const validationResult = InvoiceService.validate(invoice);
      setInvoiceState(prev => ({
        ...prev,
        validationErrors: validationResult.errors,
      }));
      return validationResult;
    },
    clearValidation: () => {
      setInvoiceState(prev => ({
        ...prev,
        validationErrors: [],
      }));
    },
    generateInvoiceNumber: () => {
      const result = InvoiceService.generateInvoiceNumber();
      setInvoiceState(prev => ({
        ...prev,
        invoiceNumber: result.invoiceNumber,
      }));
      return result;
    },
  }), [invoiceState]);

  const value = useMemo(() => ({
    invoiceState,
    actions,
  }), [invoiceState, actions]);

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoiceContext = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }
  return context;
};

export default InvoiceContext;
