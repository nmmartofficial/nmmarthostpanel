/**
 * Payment Module Types
 * Phase 4 - Step 1.1
 */

import { PAYMENT_METHODS } from '../constants/payment.constants';

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
