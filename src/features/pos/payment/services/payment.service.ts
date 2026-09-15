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
  isValidUPIFormat,
  normalizeCardNumber,
  maskCardNumber,
  detectCardType,
  isValidCardFormat,
  generateMockCardTransactionId,
  calculateSplitTotal,
  mergeTransactionIds,
  validateSplitAmounts,
  normalizeCustomerReference,
  generateMockCreditReference,
  calculateChangeBreakdown,
  calculateShortageAmount,
  validateCashPayment,
  validateUPIPayment,
  validateCardPayment,
  validateSplitPayment,
  validateCreditPayment,
  validatePaymentMethod
} from '../utils/payment.utils';
import type { 
  CashPaymentInput, 
  CashPaymentResult, 
  UPaymentInput, 
  UPaymentResult, 
  CardPaymentInput, 
  CardPaymentResult,
  SplitPaymentItem,
  CreditPaymentResult,
  PaymentProcessResult
} from '../types/payment.types';

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

  /**
   * Process Card Payment
   * Phase 4 - Step 5
   * 
   * Responsibilities:
   * - Normalize card number
   * - Validate card format
   * - Detect card type
   * - Generate mock transaction ID
   * - Reuse existing payment calculation utilities
   * - Update payment status
   * - Update paid amount
   * - Update remaining amount
   * - Update change amount
   * - No duplicate calculations
   * 
   * @param input - Card payment input
   * @returns Card payment result
   */
  static processCardPayment(input: CardPaymentInput): CardPaymentResult {
    const { payableAmount, cardNumber, expiryDate, cvv } = input;

    // Guard validation: Check for valid payable amount
    if (isNaN(payableAmount) || !isFinite(payableAmount) || payableAmount < 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount || 0,
        changeAmount: 0,
        cardType: '',
        transactionId: '',
        error: 'Invalid payable amount'
      };
    }

    // Guard validation: Check card number is not empty
    if (!cardNumber || cardNumber.trim().length === 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        cardType: '',
        transactionId: '',
        error: 'Card number is required'
      };
    }

    // Guard validation: Check expiry date is not empty
    if (!expiryDate || expiryDate.trim().length === 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        cardType: '',
        transactionId: '',
        error: 'Expiry date is required'
      };
    }

    // Guard validation: Check CVV is not empty
    if (!cvv || cvv.trim().length === 0) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        cardType: '',
        transactionId: '',
        error: 'CVV is required'
      };
    }

    // Normalize card number
    const normalizedCardNumber = normalizeCardNumber(cardNumber);

    // Validate card format
    if (!isValidCardFormat(normalizedCardNumber)) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        cardType: '',
        transactionId: '',
        error: 'Invalid card format'
      };
    }

    // Detect card type
    const cardType = detectCardType(normalizedCardNumber);

    // Generate mock transaction ID
    const transactionId = generateMockCardTransactionId();

    // For card, paid amount equals payable amount (full payment)
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
      cardType,
      transactionId,
      error: !isFullyPaid ? 'Payment failed' : undefined
    };
  }

  /**
   * Process Split Payment
   * Phase 4 - Step 6
   *
   * Responsibilities:
   * - Loop through payment methods
   * - Call existing engine
   * - Collect results
   * - Aggregate paid amount
   * - Aggregate remaining amount
   * - Aggregate change amount
   * - Aggregate transaction IDs
   * - Update overall payment status
   *
   * @param input - Split payment input
   * @returns Split payment result
   */
  static processSplitPayment(input: {
    payableAmount: number;
    splitPayments: SplitPaymentItem[];
    cashAmount?: number;
    upiId?: string;
    cardNumber?: string;
    cardHolderName?: string;
    expiryDate?: string;
    cvv?: string;
  }): {
    success: boolean;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    transactionIds: string[];
    error?: string;
    processedPayments: SplitPaymentItem[];
  } {
    const { payableAmount, splitPayments } = input;

    // Validate split payments
    if (!validateSplitAmounts(splitPayments)) {
      return {
        success: false,
        paidAmount: 0,
        remainingAmount: payableAmount,
        changeAmount: 0,
        transactionIds: [],
        error: 'Invalid split payment amounts',
        processedPayments: splitPayments.map(p => ({ ...p, status: 'FAILED' }))
      };
    }

    let remainingAmount = payableAmount;
    let totalPaid = 0;
    let totalChange = 0;
    const transactionIds: string[] = [];
    const processedPayments: SplitPaymentItem[] = [];

    // Loop through each split payment and process
    for (const payment of splitPayments) {
      let result;

      if (payment.method === 'CASH') {
        // For split cash payments, use the split amount
        result = this.processCashPayment({
          payableAmount: remainingAmount,
          cashAmount: payment.amount
        });
        if (result.transactionId) {
          transactionIds.push(result.transactionId);
        }
      } else if (payment.method === 'UPI') {
        // For split UPI payments, use the split amount and provided UPI ID
        result = this.processUPIPayment({
          payableAmount: payment.amount, // UPI is full payment for its share
          upiId: input.upiId || ''
        });
        if (result.transactionId) {
          transactionIds.push(result.transactionId);
        }
      } else if (payment.method === 'CARD') {
        // For split card payments, use the split amount and provided card details
        result = this.processCardPayment({
          payableAmount: payment.amount, // Card is full payment for its share
          cardNumber: input.cardNumber || '',
          cardHolderName: input.cardHolderName || '',
          expiryDate: input.expiryDate || '',
          cvv: input.cvv || ''
        });
        if (result.transactionId) {
          transactionIds.push(result.transactionId);
        }
      } else {
        // Invalid payment method
        result = {
          success: false,
          paidAmount: 0,
          remainingAmount: payment.amount,
          changeAmount: 0,
          cardType: '',
          transactionId: '',
          error: 'Invalid payment method'
        };
      }

      // Aggregate results
      totalPaid += result.paidAmount;
      remainingAmount = calculateRemainingAmount(remainingAmount, result.paidAmount);
      totalChange += result.changeAmount;

      // Track processed payment with status
      processedPayments.push({
        ...payment,
        status: result.success ? 'COMPLETED' : 'FAILED'
      });
    }

    // Determine overall success (all individual payments must succeed)
    const allSuccess = processedPayments.every(p => p.status === 'COMPLETED');

    return {
      success: allSuccess,
      paidAmount: totalPaid,
      remainingAmount: remainingAmount,
      changeAmount: totalChange,
      transactionIds: mergeTransactionIds(transactionIds),
      error: allSuccess ? undefined : 'One or more split payments failed',
      processedPayments
    };
  }

  /**
   * Process Credit Payment
   * Phase 4 - Step 7
   * Reuse existing calculation utilities
   */
  static processCreditPayment(input: {
    payableAmount: number;
    creditCustomerId: string;
    creditCustomerName: string;
    creditReference: string;
  }): CreditPaymentResult {
    const { payableAmount, creditCustomerId, creditCustomerName, creditReference } = input;

    const paidAmount = payableAmount;
    const remainingAmount = calculateRemainingAmount(payableAmount, paidAmount);
    const changeAmount = calculateChangeAmount(payableAmount, paidAmount);
    const transactionId = generateMockCreditReference();
    const success = remainingAmount === 0;

    return {
      success,
      paidAmount,
      remainingAmount,
      changeAmount,
      transactionId,
      error: success ? undefined : 'Payment failed'
    };
  }

  /**
   * Update Change Summary
   * Phase 4 - Step 8
   * 
   * Reuse existing utility functions
   * No duplicate calculations
   * 
   * @param input - Change summary input
   * @returns Change summary result
   */
  static updateChangeSummary(input: {
    payableAmount: number;
    paidAmount: number;
  }): {
    changeAmount: number;
    changeBreakdown: Array<{ denomination: number; count: number }>;
    shortageAmount: number;
  } {
    const changeAmount = calculateChangeAmount(input.payableAmount, input.paidAmount);
    const changeBreakdown = calculateChangeBreakdown(changeAmount);
    const shortageAmount = calculateShortageAmount(input.payableAmount, input.paidAmount);

    return {
      changeAmount,
      changeBreakdown,
      shortageAmount
    };
  }

  /**
   * Process Payment (Orchestrator)
   * Phase 4 - Step 10
   * Reuses all existing payment engines
   */
  static processPayment(input: {
    method: string;
    payableAmount: number;
    cashAmount?: number;
    upiId?: string;
    cardNumber?: string;
    cardHolderName?: string;
    expiryDate?: string;
    cvv?: string;
    splitPayments?: SplitPaymentItem[];
    creditCustomerId?: string;
    creditCustomerName?: string;
    creditReference?: string;
  }): PaymentProcessResult {
    // First run validation
    const validationResult = this.validatePayment(input);

    if (!validationResult.isValid) {
      return {
        success: false,
        method: input.method,
        status: 'FAILED',
        paidAmount: 0,
        remainingAmount: input.payableAmount,
        changeAmount: 0,
        transactionId: '',
        errors: validationResult.errors
      };
    }

    let result: any;
    let transactionId = '';
    let status = '';

    switch (input.method) {
      case 'CASH':
        result = this.processCashPayment({
          payableAmount: input.payableAmount,
          cashAmount: input.cashAmount || 0
        });
        transactionId = '';
        status = result.success ? 'COMPLETED' : 'FAILED';
        break;
      case 'UPI':
        result = this.processUPIPayment({
          payableAmount: input.payableAmount,
          upiId: input.upiId || ''
        });
        transactionId = result.transactionId;
        status = result.success ? 'COMPLETED' : 'FAILED';
        break;
      case 'CARD':
        result = this.processCardPayment({
          payableAmount: input.payableAmount,
          cardNumber: input.cardNumber || '',
          cardHolderName: input.cardHolderName || '',
          expiryDate: input.expiryDate || '',
          cvv: input.cvv || ''
        });
        transactionId = result.transactionId;
        status = result.success ? 'COMPLETED' : 'FAILED';
        break;
      case 'SPLIT':
        result = this.processSplitPayment({
          payableAmount: input.payableAmount,
          splitPayments: input.splitPayments || [],
          cashAmount: input.cashAmount,
          upiId: input.upiId,
          cardNumber: input.cardNumber,
          cardHolderName: input.cardHolderName,
          expiryDate: input.expiryDate,
          cvv: input.cvv
        });
        transactionId = result.transactionIds.join(',');
        status = result.success ? 'COMPLETED' : 'FAILED';
        break;
      case 'CREDIT':
        result = this.processCreditPayment({
          payableAmount: input.payableAmount,
          creditCustomerId: input.creditCustomerId || '',
          creditCustomerName: input.creditCustomerName || '',
          creditReference: input.creditReference || ''
        });
        transactionId = result.transactionId;
        status = result.success ? 'COMPLETED' : 'FAILED';
        break;
      default:
        return {
          success: false,
          method: input.method,
          status: 'FAILED',
          paidAmount: 0,
          remainingAmount: input.payableAmount,
          changeAmount: 0,
          transactionId: '',
          errors: [{ field: 'paymentMethod', message: 'Unsupported payment method' }]
        };
    }

    return {
      success: result.success,
      method: input.method,
      status,
      paidAmount: result.paidAmount,
      remainingAmount: result.remainingAmount,
      changeAmount: result.changeAmount,
      transactionId,
      errors: []
    };
  }

  /**
   * Validate Payment
   * Phase 4 - Step 9
   * Reuse validation utilities - no duplicate logic
   */
  static validatePayment(paymentData: {
    method: string;
    payableAmount: number;
    cashAmount?: number;
    upiId?: string;
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    splitPayments?: Array<{ method: string; amount: number }>;
    creditCustomerId?: string;
    creditCustomerName?: string;
  }): { isValid: boolean; errors: Array<{ field: string; message: string }>; method: string } {
    const validMethods = ['CASH', 'UPI', 'CARD', 'SPLIT', 'CREDIT'];
    const methodValidation = validatePaymentMethod(paymentData.method, validMethods);
    
    if (!methodValidation.isValid) {
      return {
        isValid: false,
        errors: methodValidation.errors,
        method: paymentData.method
      };
    }

    let validationResult;
    switch (paymentData.method) {
      case 'CASH':
        validationResult = validateCashPayment(paymentData.payableAmount, paymentData.cashAmount || 0);
        break;
      case 'UPI':
        validationResult = validateUPIPayment(paymentData.payableAmount, paymentData.upiId || '');
        break;
      case 'CARD':
        validationResult = validateCardPayment(
          paymentData.payableAmount,
          paymentData.cardNumber || '',
          paymentData.expiryDate || '',
          paymentData.cvv || ''
        );
        break;
      case 'SPLIT':
        validationResult = validateSplitPayment(paymentData.payableAmount, paymentData.splitPayments || []);
        break;
      case 'CREDIT':
        validationResult = validateCreditPayment(
          paymentData.payableAmount,
          paymentData.creditCustomerId || '',
          paymentData.creditCustomerName || ''
        );
        break;
      default:
        validationResult = { isValid: false, errors: [{ field: 'paymentMethod', message: 'Unsupported payment method' }] };
    }

    return {
      ...validationResult,
      method: paymentData.method
    };
  }

  static async refundPayment(paymentId: string): Promise<any> {
    throw new Error('PaymentService.refundPayment - Not Implemented');
  }
}
