/**
 * Receipt Module Initial State
 * Phase 9 - Step 1
 */

import { ReceiptState } from '../types/receipt.types';
import { RECEIPT_STATUS } from '../constants/receipt.constants';

export const initialReceiptState: ReceiptState = {
  receiptId: null,
  receiptNumber: null,
  orderId: null,
  customerId: null,
  paymentId: null,
  receiptStatus: RECEIPT_STATUS.IDLE,
  loading: false,
  error: '',
  validationErrors: [],
};
