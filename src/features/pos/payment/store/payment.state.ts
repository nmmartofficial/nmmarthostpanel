/**
 * Payment Module Initial State
 * Phase 4 - Step 1.1
 */

import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/payment.constants';
import type { PaymentAmounts, PaymentHistory, CreditDetails } from '../types/payment.types';

export const initialPaymentAmounts: PaymentAmounts = {
  [PAYMENT_METHODS.CASH]: 0,
  [PAYMENT_METHODS.UPI]: 0,
  [PAYMENT_METHODS.CARD]: 0,
  [PAYMENT_METHODS.CREDIT]: 0
};

export const initialPaymentStatus = PAYMENT_STATUS.PENDING;

export const initialPaymentError = '';

export const initialIsSplitPayment = false;

export const initialActivePaymentMethod = PAYMENT_METHODS.CASH;

export const initialPaymentHistory: PaymentHistory[] = [];

export const initialCreditDetails: CreditDetails = {
  enabled: false,
  customerId: null,
  creditLimit: 0,
  currentCredit: 0,
  dueDate: null
};
