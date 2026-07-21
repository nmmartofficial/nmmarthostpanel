/**
 * Invoice Module Hook
 * Phase 8 - Step 1
 */

import { useInvoiceContext } from '../context/InvoiceContext';

export const useInvoice = () => {
  const { invoiceState, actions } = useInvoiceContext();
  return {
    invoiceState,
    ...actions,
  };
};
