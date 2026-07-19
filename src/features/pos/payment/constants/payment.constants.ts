/**
 * Payment Module Constants
 * Phase 4 - Step 1.1
 */

export const PAYMENT_METHODS = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CREDIT: 'Credit',
  SPLIT: 'Split'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;
