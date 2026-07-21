/**
 * Receipt Module Utilities
 * Phase 9 - Step 3
 * Pure functions with Object.freeze
 */

import type {
  Receipt,
  ReceiptCreationInput,
  ReceiptValidationError,
  ReceiptValidationResult
} from '../types/receipt.types';

/**
 * Create Receipt
 * Phase 9 - Step 3
 * Pure function - no side effects
 * Creates a frozen receipt object
 */
export function createReceipt(input: ReceiptCreationInput): Receipt {
  const receipt: Receipt = {
    receiptId: input.receiptId || generateId(),
    receiptNumber: input.receiptNumber || null,
    invoiceId: input.invoiceId || null,
    invoiceNumber: input.invoiceNumber || null,
    orderId: input.orderId || null,
    customerId: input.customerId || null,
    paymentId: input.paymentId || null,
    receiptDate: input.receiptDate || new Date(),
    receiptStatus: input.receiptStatus || input.status,
    subtotal: input.subtotal || 0,
    discount: input.discount || 0,
    tax: input.tax || 0,
    grandTotal: input.grandTotal || 0,
    items: input.items || [],
    status: input.status,
    createdAt: input.createdAt || new Date(),
    updatedAt: input.updatedAt || new Date()
  };
  
  return Object.freeze(receipt);
}

/**
 * Clone Receipt
 * Phase 9 - Step 3
 * Pure function - no side effects
 * Creates a deep frozen clone of receipt
 */
export function cloneReceipt(receipt: Receipt): Receipt {
  const cloned: Receipt = {
    ...receipt,
    items: receipt.items.map((item) => ({ ...item })),
    receiptDate: new Date(receipt.receiptDate),
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt)
  };

  return Object.freeze(cloned);
}

/**
 * Freeze Receipt
 * Phase 9 - Step 3
 * Pure function - no side effects
 * Returns frozen receipt object
 */
export function freezeReceipt(receipt: Receipt): Receipt {
  return Object.freeze(receipt);
}

export function validateReceiptId(receiptId?: string | null): ReceiptValidationError | null {
  if (receiptId === undefined || receiptId === null || String(receiptId).trim() === '') {
    return { field: 'receiptId', message: 'Receipt ID is required' };
  }
  return null;
}

export function validateInvoiceReference(
  invoiceId?: string | null,
  invoiceNumber?: string | null
): ReceiptValidationError | null {
  if ((invoiceId === undefined || invoiceId === null || String(invoiceId).trim() === '')
    && (invoiceNumber === undefined || invoiceNumber === null || String(invoiceNumber).trim() === '')) {
    return { field: 'invoiceReference', message: 'Invoice reference is required' };
  }
  return null;
}

export function validateOrderReference(orderId?: string | null): ReceiptValidationError | null {
  if (orderId === undefined || orderId === null || String(orderId).trim() === '') {
    return { field: 'orderId', message: 'Order reference is required' };
  }
  return null;
}

export function validateCustomerReference(
  customerId?: string | number | null
): ReceiptValidationError | null {
  if (customerId === undefined || customerId === null || String(customerId).trim() === '') {
    return { field: 'customerId', message: 'Customer reference is required' };
  }
  return null;
}

export function validatePaymentReference(
  paymentId?: string | number | null
): ReceiptValidationError | null {
  if (paymentId === undefined || paymentId === null || String(paymentId).trim() === '') {
    return { field: 'paymentId', message: 'Payment reference is required' };
  }
  return null;
}

export function validateReceipt(input: ReceiptCreationInput): ReceiptValidationResult {
  const errors: ReceiptValidationError[] = [];

  const receiptIdError = validateReceiptId(input.receiptId ?? null);
  if (receiptIdError) errors.push(receiptIdError);

  const invoiceReferenceError = validateInvoiceReference(input.invoiceId ?? null, input.invoiceNumber ?? null);
  if (invoiceReferenceError) errors.push(invoiceReferenceError);

  const orderReferenceError = validateOrderReference(input.orderId ?? null);
  if (orderReferenceError) errors.push(orderReferenceError);

  const customerReferenceError = validateCustomerReference(input.customerId ?? null);
  if (customerReferenceError) errors.push(customerReferenceError);

  const paymentReferenceError = validatePaymentReference(input.paymentId ?? null);
  if (paymentReferenceError) errors.push(paymentReferenceError);

  return {
    valid: errors.length === 0,
    errors: cloneValidationErrors(errors)
  };
}

export function cloneValidationErrors(errors: ReceiptValidationError[]): ReceiptValidationError[] {
  return errors.map((error) => ({ ...error }));
}

/**
 * Generate ID
 * Phase 9 - Step 3
 * Pure function - no side effects
 * Helper function to generate unique ID
 */
function generateId(): string {
  return `RCP${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
}

// Placeholder functions - Not Implemented
export function formatReceiptNumber(receiptNumber: string): string {
  throw new Error('receipt.utils.formatReceiptNumber - Not Implemented');
}

export function calculateReceiptTotals(items: any[]): any {
  throw new Error('receipt.utils.calculateReceiptTotals - Not Implemented');
}

export function formatCurrency(amount: number): string {
  throw new Error('receipt.utils.formatCurrency - Not Implemented');
}

export function formatDate(date: Date): string {
  throw new Error('receipt.utils.formatDate - Not Implemented');
}

export function generateReceiptHTML(receipt: any): string {
  throw new Error('receipt.utils.generateReceiptHTML - Not Implemented');
}

export function generateReceiptText(receipt: any): string {
  throw new Error('receipt.utils.generateReceiptText - Not Implemented');
}
