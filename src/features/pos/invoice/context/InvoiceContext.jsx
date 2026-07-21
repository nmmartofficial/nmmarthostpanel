/**
 * Invoice Module Context
 * Phase 8 - Step 1
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialInvoiceState } from '../store/invoice.state';
import type { InvoiceState, InvoiceActions } from '../types/invoice.types';
import { INVOICE_STATUS } from '../constants/invoice.constants';
import { InvoiceService } from '../services/invoice.service';

const InvoiceContext = createContext<{
  invoiceState: InvoiceState;
  actions: InvoiceActions;
} | null>(null);

export const InvoiceProvider = ({ children }) => {
  const [invoiceState, setInvoiceState] = useState<InvoiceState>(initialInvoiceState);

  const actions: InvoiceActions = useMemo(() => ({
    setInvoices: (invoices) => setInvoiceState(prev => ({ ...prev, invoices })),
    setSelectedInvoice: (invoice) => setInvoiceState(prev => ({ ...prev, selectedInvoice: invoice })),
    setInvoiceStatus: (status) => setInvoiceState(prev => ({ ...prev, invoiceStatus: status })),
    setSearchQuery: (query) => setInvoiceState(prev => ({ ...prev, searchQuery: query })),
    setLoading: (loading) => setInvoiceState(prev => ({ ...prev, loading })),
    setError: (error) => setInvoiceState(prev => ({ ...prev, error })),
    resetInvoice: () => setInvoiceState(initialInvoiceState),
    generateInvoiceNumber: () => InvoiceService.generateInvoiceNumber(),
    createInvoice: (input) => InvoiceService.createInvoice(input),
    updateInvoiceStatus: (invoice, newStatus) => InvoiceService.updateStatus(invoice, newStatus),
    markCompleted: (invoice) => InvoiceService.markCompleted(invoice),
    markCancelled: (invoice) => InvoiceService.markCancelled(invoice),
    markPending: (invoice) => InvoiceService.markPending(invoice),
    addInvoice: (newInvoice) => {
      let result;
      setInvoiceState(prev => {
        result = InvoiceService.addInvoice(prev.invoices, newInvoice);
        return { ...prev, invoices: result.invoices };
      });
      return result!;
    },
    removeInvoice: (invoiceId) => {
      let result;
      setInvoiceState(prev => {
        result = InvoiceService.removeInvoice(prev.invoices, invoiceId);
        return { ...prev, invoices: result.invoices };
      });
      return result!;
    },
    updateInvoice: (updatedInvoice) => {
      let result;
      setInvoiceState(prev => {
        result = InvoiceService.updateInvoice(prev.invoices, updatedInvoice);
        return { ...prev, invoices: result.invoices };
      });
      return result!;
    },
    findInvoice: (invoiceId) => {
      // findInvoice doesn't change state, just uses current invoices
      return InvoiceService.findInvoice(invoiceState.invoices, invoiceId);
    },
    getInvoices: () => {
      // getInvoices just returns current invoices, no state change
      return InvoiceService.getInvoices(invoiceState.invoices);
    },
    clearInvoices: () => {
      const result = InvoiceService.clearInvoices();
      setInvoiceState(prev => ({ ...prev, invoices: result.invoices }));
      return result;
    },
  }), [invoiceState.invoices]);

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
