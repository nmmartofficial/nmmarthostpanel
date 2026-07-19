/**
 * Payment Module Service
 * Phase 4 - Step 4
 * Cash and UPI Payment Engine Implementation
 */

import { 
  calculateRemainingAmount, 
  calculateChangeAmount,
  normalizeUPIId,
  generateMockUPITransactionId,
  isValidUPIFormat
} from '../utils/payment.utils';
import type { CashPaymentInput, CashPaymentResult, UPaymentInput, UPaymentResult } from '../types/payment.types';

export class PaymentService {
  /**
   * Process Cash Payment
   * Phase 4 - Step 3
   * 
   * Rules:
   * - Update paid amount
   * - Update remaining amount
   * - Update change amount
   * - Update payment status
   * - Reuse utility functions
   * - Never calculate inside React
   * 
   * @param input - Cash payment input with payable and cash amounts
   * @returns Cash payment result with calculated amounts
   */
  static processCashPayment(input: CashPaymentInput): CashPaymentResult {
    const { payableAmount, cashAmount } = input;

    // Guard validation: Check for valid numbers
    if (isNaN(payableAmount) || isNaN(cashAmount)) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount || 0,
        changeAmount: 0,
        error: 'Amounts must be valid numbers'
      };
    }

    // Guard validation: Check for finite numbers
    if (!isFinite(payableAmount) || !isFinite(cashAmount)) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount || 0,
        changeAmount: 0,
        error: 'Amounts must be finite'
      };
    }

    // Guard validation: Check for negative amounts
    if (payableAmount < 0 || cashAmount < 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        error: 'Amounts cannot be negative'
      };
    }

    // Calculate using pure utility functions
    const remainingAmount = calculateRemainingAmount(payableAmount, cashAmount);
    const changeAmount = calculateChangeAmount(payableAmount, cashAmount);

    // Determine payment status based on calculations
    const isFullyPaid = remainingAmount === 0;
    const isOverpaid = changeAmount > 0;

    return {
      success: isFullyPaid,
      paidAmount: cashAmount,
      remainingAmount,
      changeAmount,
      error: !isFullyPaid ? 'Insufficient payment' : undefined
    };
  }

  /**
   * Process UPI Payment
   * Phase 4 - Step 4
   * 
   * Responsibilities:
   * - Normalize UPI ID
   * - Validate format
   * - Generate mock transaction ID
   * - Update payment status
   * - Update paid amount
   * - Update remaining amount
   * - Reuse existing calculation utilities
   * - No duplicate calculations
   * 
   * @param input - UPI payment input with payable amount and UPI ID
   * @returns UPI payment result with calculated amounts and transaction ID
   */
  static processUPIPayment(input: UPaymentInput): UPaymentResult {
    const { payableAmount, upiId } = input;

    // Guard validation: Check for valid payable amount
    if (isNaN(payableAmount) || !isFinite(payableAmount) || payableAmount < 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount || 0,
        changeAmount: 0,
        transactionId: '',
        error: 'Invalid payable amount'
      };
    }

    // Guard validation: Check UPI ID is not empty
    if (!upiId || upiId.trim().length === 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        transactionId: '',
        error: 'UPI ID is required'
      };
    }

    // Normalize UPI ID
    const normalizedUPIId = normalizeUPIId(upiId);

    // Validate UPI format
    if (!isValidUPIFormat(normalizedUPIId)) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        transactionId: '',
        error: 'Invalid UPI ID format'
      };
    }

    // Generate mock transaction ID
    const transactionId = generateMockUPITransactionId();

    // For UPI, paid amount equals payable amount (full payment)
    const paidAmount = payableAmount;

    // Calculate using existing utility functions
    const remainingAmount = calculateRemainingAmount(payableAmount, paidAmount);
    const changeAmount = calculateChangeAmount(payableAmount, paidAmount);

    // Determine payment status
    const isFullyPaid = remainingAmount === 0;

    return {
      success: isFullyPaid,
      paidAmount,
      remainingAmount,
      changeAmount,
      transactionId,
      error: !isFullyPaid ? 'Payment failed' : undefined
    };
  }

  static async processPayment(paymentData: any): Promise<any> {
    throw new Error('PaymentService.processPayment - Not Implemented');
  }

  static async validatePayment(paymentData: any): Promise<any> {
    throw new Error('PaymentService.validatePayment - Not Implemented');
  }

  static async refundPayment(paymentId: string): Promise<any> {
    throw new Error('PaymentService.refundPayment - Not Implemented');
  }
}
