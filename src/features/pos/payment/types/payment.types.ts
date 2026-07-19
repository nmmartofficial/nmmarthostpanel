/**
 * Payment Module Types
 * Phase 4 - Step 2
 */

import { PAYMENT_METHODS, PAYMENT_STATUS } from '../constants/payment.constants';

export interface PaymentInterface {
  method: keyof typeof PAYMENT_METHODS;
  requiredFields: string[];
  optionalFields: string[];
}

export interface PaymentAmounts {
  Cash: number;
  UPI: number;
  Card: number;
  Credit: number;
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

