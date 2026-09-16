/**
 * Receipt Module Initial State
 * Phase 9 - Step 2
 */

import { ReceiptState } from '../types/receipt.types';
import { RECEIPT_STATUS } from '../constants/receipt.constants';

export const initialReceiptState: ReceiptState = {
  receiptId: null,
  receiptNumber: null,
  invoiceId: null,
  invoiceNumber: null,
  orderId: null,
  customerId: null,
  paymentId: null,
  receiptStatus: RECEIPT_STATUS.IDLE,
  receiptDate: null,
  subtotal: 0,
  discount: 0,
  tax: 0,
  grandTotal: 0,
  loading: false,
  error: '',
  validationErrors: [],
};
