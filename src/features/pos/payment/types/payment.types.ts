/**
 * Payment Module Types
 * Phase 4 - Step 4
 */

import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/payment.constants';

export interface PaymentInterface {
  method: keyof typeof PAYMENT_METHODS;
  requiredFields: string[];
  optionalFields: string[];
}

export interface PaymentAmounts {
  CASH: number;
  UPI: number;
  CARD: number;
  CREDIT: number;
}

export interface PaymentHistory {
  id: string;
  method: string;
  amount: number;
  timestamp: string;
  status: string;
  [key: string]: any;
}

export interface CreditDetails {
  enabled: boolean;
  customerId: string | null;
  creditLimit: number;
  currentCredit: number;
  dueDate: string | null;
}

/**
 * Payment State Interface
 * Phase 4 - Step 2
 * Pure state structure - no calculations, no business logic
 */
export interface PaymentState {
  selectedMethod: keyof typeof PAYMENT_METHODS;
  paymentStatus: keyof typeof PAYMENT_STATUS;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  changeAmount: number;
  loading: boolean;
  error: string;
  // UPI State (Phase 4 Step 4)
  upiId: string;
  upiStatus: string;
  upiTransactionId: string;
}

/**
 * Payment Actions Interface
 * Phase 4 - Step 2
 * Placeholder actions - no calculations, no validation
 */
export interface PaymentActions {
  setSelectedMethod: (method: keyof typeof PAYMENT_METHODS) => void;
  setPaymentStatus: (status: keyof typeof PAYMENT_STATUS) => void;
  setPayableAmount: (amount: number) => void;
  setPaidAmount: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetPayment: () => void;
}

/**
 * Cash Payment Result Interface
 * Phase 4 - Step 3
 */
export interface CashPaymentResult {
  success: boolean;
  paidAmount: number;
  remainingAmount: number;
  changeAmount: number;
  error?: string;
}

/**
 * Cash Payment Input Interface
 * Phase 4 - Step 3
 */
export interface CashPaymentInput {
  payableAmount: number;
  cashAmount: number;
}

/**
 * UPI Payment Result Interface
 * Phase 4 - Step 4
 */
export interface UPaymentResult {
  success: boolean;
  paidAmount: number;
  remainingAmount: number;
  changeAmount: number;
  transactionId: string;
  error?: string;
}

/**
 * UPI Payment Input Interface
 * Phase 4 - Step 4
 */
export interface UPaymentInput {
  payableAmount: number;
  upiId: string;
}


