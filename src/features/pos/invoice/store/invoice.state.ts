/**
 * Invoice Module Initial State
 * Phase 8 - Step 1
 */

import { InvoiceState } from '../types/invoice.types';
import { INVOICE_STATUS } from '../constants/invoice.constants';

export const initialInvoiceState: InvoiceState = {
  invoices: [],
  selectedInvoice: null,
  loading: false,
  error: '',
  invoiceStatus: INVOICE_STATUS.IDLE,
  searchQuery: '',
  createdAt: null,
  updatedAt: null,
};
