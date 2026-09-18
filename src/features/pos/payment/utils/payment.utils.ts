/**
 * Payment Module Utilities
 * Phase 4 - Step 4
 * Pure utility functions for payment calculations
 */

/**
 * Calculate Remaining Amount
 * Phase 4 - Step 3
 * Pure function - no side effects
 * 
 * Remaining Amount = Payable Amount - Paid Amount
 * 
 * @param payableAmount - The total amount to be paid
 * @param paidAmount - The amount already paid
 * @returns The remaining amount to be paid (0 if fully paid or overpaid)
 */
export function calculateRemainingAmount(payableAmount: number, paidAmount: number): number {
  const remaining = payableAmount - paidAmount;
  return remaining > 0 ? remaining : 0;
}

/**
 * Calculate Change Amount
 * Phase 4 - Step 3
 * Pure function - no side effects
 * 
 * Change Amount = Paid Amount - Payable Amount
 * 
 * If Paid Amount is less than Payable Amount, Change Amount = 0
 * 
 * @param payableAmount - The total amount to be paid
 * @param paidAmount - The amount paid
 * @returns The change amount to be returned (0 if underpaid or exact)
 */
export function calculateChangeAmount(payableAmount: number, paidAmount: number): number {
  const change = paidAmount - payableAmount;
  return change > 0 ? change : 0;
}

/**
 * Normalize UPI ID
 * Phase 4 - Step 4
 * Pure function - no side effects
 * 
 * Normalizes UPI ID by trimming whitespace and converting to lowercase
 * 
 * @param upiId - The UPI ID to normalize
 * @returns Normalized UPI ID
 */
export function normalizeUPIId(upiId: string): string {
  if (!upiId) return '';
  return upiId.trim().toLowerCase();
}

/**
 * Validate UPI Format
 * Phase 4 - Step 4
 * Pure function - no side effects
 * 
 * Basic UPI format validation
 * Checks if UPI ID is not empty and has basic format
 * 
 * @param upiId - The UPI ID to validate
 * @returns True if UPI ID has valid format
 */
export function isValidUPIFormat(upiId: string): boolean {
  if (!upiId || upiId.trim().length === 0) {
    return false;
  }
  
  const normalized = normalizeUPIId(upiId);
  
  // Basic UPI format check: should contain @ and have reasonable length
  // This is a simplified validation - real UPI validation is more complex
  return normalized.includes('@') && normalized.length >= 5 && normalized.length <= 100;
}

/**
 * Normalize Card Number
 * Phase 4 - Step 5
 * Pure function - no side effects
 * 
 * Normalizes card number by removing spaces and non-digit characters
 * 
 * @param cardNumber - The card number to normalize
 * @returns Normalized card number
 */
export function normalizeCardNumber(cardNumber: string): string {
  if (!cardNumber) return '';
  return cardNumber.replace(/\D/g, '');
}

/**
 * Mask Card Number
 * Phase 4 - Step 5
 * Pure function - no side effects
 * 
 * Masks card number for display (shows first 4 and last 4 digits)
 * 
 * @param cardNumber - The card number to mask
 * @returns Masked card number
 */
export function maskCardNumber(cardNumber: string): string {
  const normalized = normalizeCardNumber(cardNumber);
  if (normalized.length < 8) return '';
  return `${normalized.slice(0, 4)}${'*'.repeat(normalized.length - 8)}${normalized.slice(-4)}`;
}

/**
 * Detect Card Type
 * Phase 4 - Step 5
 * Pure function - no side effects
 * 
 * Detects card type based on prefix
 * Supports Visa, MasterCard, RuPay, American Express
 * 
 * @param cardNumber - The card number to detect
 * @returns Detected card type or 'Unknown'
 */
export function detectCardType(cardNumber: string): string {
  const normalized = normalizeCardNumber(cardNumber);
  
  // Visa: starts with 4
  if (/^4/.test(normalized)) return 'Visa';
  
  // MasterCard: starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(normalized) || /^2[2-7]/.test(normalized)) return 'MasterCard';
  
  // RuPay: starts with 60, 65, 81, 82, 508, or 607
  if (/^60|65|81|82|508|607/.test(normalized)) return 'RuPay';
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(normalized)) return 'American Express';
  
  return 'Unknown';
}

/**
 * Validate Card Format
 * Phase 4 - Step 5
 * Pure function - no side effects
 * 
 * Basic card format validation
 * Checks if card number has reasonable length (13-19 digits)
 * 
 * @param cardNumber - The card number to validate
 * @returns True if card number has valid format
 */
export function isValidCardFormat(cardNumber: string): boolean {
  const normalized = normalizeCardNumber(cardNumber);
  return normalized.length >= 13 && normalized.length <= 19;
}

/**
 * Calculate Split Total
 * Phase 4 - Step 6
 * Pure function - no side effects
 *
 * Calculates total of all split payment amounts
 *
 * @param splitPayments - Array of split payment items
 * @returns Total split amount
 */
export function calculateSplitTotal(splitPayments: Array<{ amount: number }>): number {
  return splitPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
}

/**
 * Merge Transaction IDs
 * Phase 4 - Step 6
 * Pure function - no side effects
 *
 * Merges transaction IDs from multiple payment results
 *
 * @param transactionIds - Array of transaction IDs
 * @returns Merged array of transaction IDs
 */
export function mergeTransactionIds(transactionIds: string[]): string[] {
  return [...new Set(transactionIds.filter(Boolean))];
}

/**
 * Validate Split Amounts
 * Phase 4 - Step 6
 * Pure function - no side effects
 *
 * Validates split payment amounts:
 * - All amounts >= 0
 * - Methods are valid
 * - Total split amount > 0
 *
 * @param splitPayments - Array of split payment items
 * @returns True if valid, false otherwise
 */
export function validateSplitAmounts(splitPayments: Array<{ method: string; amount: number }>): boolean {
  if (!splitPayments || splitPayments.length === 0) {
    return false;
  }

  const total = calculateSplitTotal(splitPayments);
  if (total <= 0) {
    return false;
  }

  const validMethods = ['CASH', 'UPI', 'CARD'];
  for (const payment of splitPayments) {
    if (payment.amount < 0) {
      return false;
    }
    if (!validMethods.includes(payment.method)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize Customer Reference
 * Phase 4 - Step 7
 * Pure function - no side effects
 */
export function normalizeCustomerReference(reference: string): string {
  if (!reference) return '';
  return reference.trim();
}

/**
 * Calculate Change Breakdown
 * Phase 4 - Step 8
 * Pure function - no side effects
 * 
 * Calculates change breakdown using the following denominations:
 * 2000, 500, 200, 100, 50, 20, 10, 5, 2, 1
 * 
 * @param changeAmount - The change amount to calculate breakdown for
 * @returns Change breakdown array
 */
export function calculateChangeBreakdown(changeAmount: number): Array<{ denomination: number; count: number }> {
  const denominations = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  const breakdown: Array<{ denomination: number; count: number }> = [];
  let remainingChange = changeAmount;

  for (const denomination of denominations) {
    if (remainingChange >= denomination) {
      const count = Math.floor(remainingChange / denomination);
      breakdown.push({ denomination, count });
      remainingChange = remainingChange % denomination;
    }
  }

  return breakdown;
}

/**
 * Calculate Shortage Amount
 * Phase 4 - Step 8
 * Pure function - no side effects
 * 
 * Calculates shortage amount (payable amount - paid amount if underpaid)
 * 
 * @param payableAmount - The total amount to be paid
 * @param paidAmount - The amount already paid
 * @returns The shortage amount (0 if fully paid or overpaid)
 */
export function calculateShortageAmount(payableAmount: number, paidAmount: number): number {
  const shortage = payableAmount - paidAmount;
  return shortage > 0 ? shortage : 0;
}

/**
 * Format Currency
 * Phase 4 - Step 3
 * Placeholder - to be implemented later
 */
export function formatCurrency(amount: number): string {
  throw new Error('payment.utils.formatCurrency - Not Implemented');
}

/**
 * Validate Amount
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validateAmount(amount: number): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push({ field: 'amount', message: 'Amount must be a valid number' });
  } else if (amount < 0) {
    errors.push({ field: 'amount', message: 'Amount cannot be negative' });
  } else if (!isFinite(amount)) {
    errors.push({ field: 'amount', message: 'Amount must be finite' });
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate Payment Method
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validatePaymentMethod(method: string, validMethods: string[]): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  if (!method) {
    errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
  } else if (!validMethods.includes(method)) {
    errors.push({ field: 'paymentMethod', message: 'Invalid payment method' });
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate Cash Payment
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validateCashPayment(payableAmount: number, cashAmount: number): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  
  // Validate payable amount
  const payableValidation = validateAmount(payableAmount);
  if (!payableValidation.isValid) {
    errors.push(...payableValidation.errors.map(err => ({ ...err, field: 'payableAmount' })));
  }
  
  // Validate cash amount
  const cashValidation = validateAmount(cashAmount);
  if (!cashValidation.isValid) {
    errors.push(...cashValidation.errors.map(err => ({ ...err, field: 'cashAmount' })));
  }
  
  // Validate cash amount is at least payable amount
  if (payableAmount > 0 && cashAmount < payableAmount) {
    errors.push({ field: 'cashAmount', message: 'Cash amount must be at least payable amount' });
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate UPI Payment
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validateUPIPayment(payableAmount: number, upiId: string): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  
  // Validate payable amount
  const payableValidation = validateAmount(payableAmount);
  if (!payableValidation.isValid) {
    errors.push(...payableValidation.errors.map(err => ({ ...err, field: 'payableAmount' })));
  }
  
  // Validate UPI ID
  if (!upiId || upiId.trim().length === 0) {
    errors.push({ field: 'upiId', message: 'UPI ID is required' });
  } else if (!isValidUPIFormat(upiId)) {
    errors.push({ field: 'upiId', message: 'Invalid UPI ID format' });
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate Card Payment
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validateCardPayment(payableAmount: number, cardNumber: string, expiryDate: string, cvv: string): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  
  // Validate payable amount
  const payableValidation = validateAmount(payableAmount);
  if (!payableValidation.isValid) {
    errors.push(...payableValidation.errors.map(err => ({ ...err, field: 'payableAmount' })));
  }
  
  // Validate card number
  if (!cardNumber || cardNumber.trim().length === 0) {
    errors.push({ field: 'cardNumber', message: 'Card number is required' });
  } else if (!isValidCardFormat(cardNumber)) {
    errors.push({ field: 'cardNumber', message: 'Invalid card number format' });
  }
  
  // Validate expiry date
  if (!expiryDate || expiryDate.trim().length === 0) {
    errors.push({ field: 'expiryDate', message: 'Expiry date is required' });
  }
  
  // Validate CVV
  if (!cvv || cvv.trim().length === 0) {
    errors.push({ field: 'cvv', message: 'CVV is required' });
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate Split Payment
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validateSplitPayment(payableAmount: number, splitPayments: Array<{ method: string; amount: number }>): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  
  // Validate payable amount
  const payableValidation = validateAmount(payableAmount);
  if (!payableValidation.isValid) {
    errors.push(...payableValidation.errors.map(err => ({ ...err, field: 'payableAmount' })));
  }
  
  // Validate split payments
  if (!splitPayments || splitPayments.length === 0) {
    errors.push({ field: 'splitPayments', message: 'At least one split payment is required' });
  } else {
    const validMethods = ['CASH', 'UPI', 'CARD'];
    splitPayments.forEach((payment, index) => {
      if (!validMethods.includes(payment.method)) {
        errors.push({ field: `splitPayments[${index}].method`, message: 'Invalid split payment method' });
      }
      const amountValidation = validateAmount(payment.amount);
      if (!amountValidation.isValid) {
        errors.push(...amountValidation.errors.map(err => ({ ...err, field: `splitPayments[${index}].amount` })));
      }
    });
    
    // Validate total split amount
    const total = calculateSplitTotal(splitPayments);
    if (total < payableAmount) {
      errors.push({ field: 'splitPayments', message: 'Total split amount must be at least payable amount' });
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate Credit Payment
 * Phase 4 - Step 9
 * Pure function - no side effects
 */
export function validateCreditPayment(payableAmount: number, creditCustomerId: string, creditCustomerName: string): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors = [];
  
  // Validate payable amount
  const payableValidation = validateAmount(payableAmount);
  if (!payableValidation.isValid) {
    errors.push(...payableValidation.errors.map(err => ({ ...err, field: 'payableAmount' })));
  }
  
  // Validate credit customer ID
  if (!creditCustomerId || creditCustomerId.trim().length === 0) {
    errors.push({ field: 'creditCustomerId', message: 'Customer ID is required' });
  }
  
  // Validate credit customer name
  if (!creditCustomerName || creditCustomerName.trim().length === 0) {
    errors.push({ field: 'creditCustomerName', message: 'Customer name is required' });
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Calculate Total
 * Phase 4 - Step 3
 * Placeholder - to be implemented later
 */
export function calculateTotal(payments: any[]): number {
  throw new Error('payment.utils.calculateTotal - Not Implemented');
}
