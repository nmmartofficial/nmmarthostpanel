/**
 * Payment Module Initial State
 * Phase 4 - Step 4
 */

import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/payment.constants';
import type { PaymentAmounts, PaymentHistory, CreditDetails, PaymentState } from '../types/payment.types';

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

/**
 * Payment State Initial State
 * Phase 4 - Step 4
 * Pure state structure - no calculations, no business logic
 */
export const initialPaymentState: PaymentState = {
  selectedMethod: PAYMENT_METHODS.CASH,
  paymentStatus: PAYMENT_STATUS.PENDING,
  payableAmount: 0,
  paidAmount: 0,
  remainingAmount: 0,
  changeAmount: 0,
  loading: false,
  error: '',
  // UPI State (Phase 4 Step 4)
  upiId: '',
  upiStatus: '',
  upiTransactionId: '',
  // Card State (Phase 4 Step 5)
  cardNumber: '',
  cardHolderName: '',
  expiryDate: '',
  cvv: '',
  cardType: '',
  cardTransactionId: '',
  cardStatus: '',
  // Split Payment State (Phase 4 Step 6)
  splitPayments: [],
  splitStatus: '',
  splitTransactionIds: [],
  // Credit Payment State (Phase 4 Step 7)
  creditCustomerId: '',
  creditCustomerName: '',
  creditReference: '',
  creditStatus: '',
  // Change Return State (Phase 4 Step 8)
  changeBreakdown: [],
  shortageAmount: 0,
  // Validation State (Phase 4 Step 9)
  validationErrors: [],
  validationStatus: ''
};
