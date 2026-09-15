/**
 * Invoice Module Context
 * Phase 8 - Step 6
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialInvoiceState } from '../store/invoice.state';
import { InvoiceService } from '../services/invoice.service';

const InvoiceContext = createContext(null);

export const InvoiceProvider = ({ children }) => {
  const [invoiceState, setInvoiceState] = useState(initialInvoiceState);

  const actions = useMemo(() => ({
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
      const invoice = {
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
    processInvoice: (input) => {
      const result = InvoiceService.processInvoice(input);
      
      if (result.success && result.invoice) {
        setInvoiceState(prev => ({
          ...prev,
          invoiceId: result.invoice.invoiceId,
          invoiceNumber: result.invoice.invoiceNumber,
          validationErrors: [],
        }));
      } else if (result.validation) {
        setInvoiceState(prev => ({
          ...prev,
          validationErrors: result.validation.errors,
        }));
      }
      
      return result;
    },
    saveInvoice: () => {
      const invoice = {
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
      return InvoiceService.saveInvoice(invoice);
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
    throw new Error('useInvoiceContext must be used within a InvoiceProvider');
  }
  return context;
};

export default InvoiceContext;
