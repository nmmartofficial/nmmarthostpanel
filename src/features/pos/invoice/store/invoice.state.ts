/**
 * Invoice Module Initial State
 * Phase 8 - Step 2
 */

import { InvoiceState } from '../types/invoice.types';
import { INVOICE_STATUS } from '../constants/invoice.constants';

export const initialInvoiceState: InvoiceState = {
  invoiceId: null,
  invoiceNumber: null,
  orderId: null,
  customerId: null,
  paymentId: null,
  invoiceStatus: INVOICE_STATUS.IDLE,
  invoiceDate: null,
  subtotal: null,
  discount: null,
  tax: null,
  grandTotal: null,
  loading: false,
  error: '',
};
