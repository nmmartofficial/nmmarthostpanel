/**
 * Invoice Module Utilities
 * Phase 8 - Step 5
 */

import type {
  Invoice,
  InvoiceItem,
  InvoiceCreationInput,
  InvoiceValidationError,
  InvoiceValidationResult,
  InvoiceNumberResult,
} from '../types/invoice.types';

// Invoice Item utilities
export const createInvoiceItem = (input: Omit<InvoiceItem, 'itemId'> & { itemId?: string }): InvoiceItem => {
  const now = new Date();
  return {
    itemId: input.itemId || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productId: input.productId,
    productName: input.productName,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    totalPrice: input.totalPrice,
  };
};

export const cloneInvoiceItem = (item: InvoiceItem): InvoiceItem => {
  return { ...item };
};

export const freezeInvoiceItem = (item: InvoiceItem): InvoiceItem => {
  return Object.freeze({ ...item });
};

// Invoice utilities
export const createInvoice = (input: InvoiceCreationInput): Invoice => {
  const now = new Date();
  return {
    invoiceId: input.invoiceId || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    invoiceNumber: input.invoiceNumber ?? null,
    orderId: input.orderId ?? null,
    customerId: input.customerId ?? null,
    paymentId: input.paymentId ?? null,
    items: input.items || [],
    subtotal: input.subtotal ?? null,
    discount: input.discount ?? null,
    tax: input.tax ?? null,
    grandTotal: input.grandTotal ?? null,
    status: input.status,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
};

export const cloneInvoice = (invoice: Invoice): Invoice => {
  return {
    ...invoice,
    items: invoice.items.map(item => cloneInvoiceItem(item)),
  };
};

export const freezeInvoice = (invoice: Invoice): Invoice => {
  const frozenItems = invoice.items.map(item => freezeInvoiceItem(item));
  return Object.freeze({
    ...invoice,
    items: Object.freeze(frozenItems),
  });
};

// Invoice Number Generator Utilities - Pure Functions
export const generateInvoicePrefix = (date?: Date): string => {
  const inputDate = date || new Date();
  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  return `INV-${year}${month}${day}`;
};

export const generateInvoiceSequence = (): number => {
  // Simple sequence using timestamp (for demo purposes, in real app you'd use a counter)
  return Date.now();
};

export const generateInvoiceNumber = (date?: Date): InvoiceNumberResult => {
  const generatedAt = date || new Date();
  const prefix = generateInvoicePrefix(generatedAt);
  const sequence = generateInvoiceSequence();
  const invoiceNumber = `${prefix}-${sequence}`;

  return {
    invoiceNumber,
    prefix,
    sequence,
    generatedAt,
  };
};

// Validation Utilities - Pure Functions
export const validateInvoiceId = (invoiceId: string | null): InvoiceValidationError[] => {
  const errors: InvoiceValidationError[] = [];
  if (!invoiceId) {
    errors.push({
      field: 'invoiceId',
      message: 'Invoice ID is required',
    });
  } else if (typeof invoiceId !== 'string' || invoiceId.trim().length === 0) {
    errors.push({
      field: 'invoiceId',
      message: 'Invoice ID must be a non-empty string',
    });
  }
  return errors;
};

export const validateOrderReference = (orderId: string | number | null): InvoiceValidationError[] => {
  const errors: InvoiceValidationError[] = [];
  // Order reference can be null or a valid non-empty value
  if (orderId !== null && orderId !== undefined) {
    if (typeof orderId === 'string' && orderId.trim().length === 0) {
      errors.push({
        field: 'orderId',
        message: 'Order ID cannot be an empty string',
      });
    }
    if (typeof orderId === 'number' && !Number.isFinite(orderId)) {
      errors.push({
        field: 'orderId',
        message: 'Order ID must be a finite number',
      });
    }
  }
  return errors;
};

export const validateCustomerReference = (customerId: string | number | null): InvoiceValidationError[] => {
  const errors: InvoiceValidationError[] = [];
  // Customer reference can be null or a valid non-empty value
  if (customerId !== null && customerId !== undefined) {
    if (typeof customerId === 'string' && customerId.trim().length === 0) {
      errors.push({
        field: 'customerId',
        message: 'Customer ID cannot be an empty string',
      });
    }
    if (typeof customerId === 'number' && !Number.isFinite(customerId)) {
      errors.push({
        field: 'customerId',
        message: 'Customer ID must be a finite number',
      });
    }
  }
  return errors;
};

export const validatePaymentReference = (paymentId: string | number | null): InvoiceValidationError[] => {
  const errors: InvoiceValidationError[] = [];
  // Payment reference can be null or a valid non-empty value
  if (paymentId !== null && paymentId !== undefined) {
    if (typeof paymentId === 'string' && paymentId.trim().length === 0) {
      errors.push({
        field: 'paymentId',
        message: 'Payment ID cannot be an empty string',
      });
    }
    if (typeof paymentId === 'number' && !Number.isFinite(paymentId)) {
      errors.push({
        field: 'paymentId',
        message: 'Payment ID must be a finite number',
      });
    }
  }
  return errors;
};

export const validateInvoiceItems = (items: InvoiceItem[]): InvoiceValidationError[] => {
  const errors: InvoiceValidationError[] = [];
  if (!items || !Array.isArray(items)) {
    errors.push({
      field: 'items',
      message: 'Invoice items must be an array',
    });
    return errors;
  }
  if (items.length === 0) {
    errors.push({
      field: 'items',
      message: 'Invoice must have at least one item',
    });
    return errors;
  }
  items.forEach((item, index) => {
    const prefix = `items[${index}]`;
    if (!item.itemId || typeof item.itemId !== 'string' || item.itemId.trim().length === 0) {
      errors.push({
        field: `${prefix}.itemId`,
        message: 'Item ID is required',
      });
    }
    if (!item.productName || typeof item.productName !== 'string' || item.productName.trim().length === 0) {
      errors.push({
        field: `${prefix}.productName`,
        message: 'Product name is required',
      });
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors.push({
        field: `${prefix}.quantity`,
        message: 'Quantity must be a positive finite number',
      });
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      errors.push({
        field: `${prefix}.unitPrice`,
        message: 'Unit price must be a non-negative finite number',
      });
    }
    if (!Number.isFinite(item.totalPrice) || item.totalPrice < 0) {
      errors.push({
        field: `${prefix}.totalPrice`,
        message: 'Total price must be a non-negative finite number',
      });
    }
  });
  return errors;
};

export const validateInvoice = (invoice: Invoice): InvoiceValidationResult => {
  const errors: InvoiceValidationError[] = [
    ...validateInvoiceId(invoice.invoiceId),
    ...validateOrderReference(invoice.orderId),
    ...validateCustomerReference(invoice.customerId),
    ...validatePaymentReference(invoice.paymentId),
    ...validateInvoiceItems(invoice.items),
  ];
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Keep other utilities as "Not Implemented" for now
export const updateInvoiceStatus = (invoice: Invoice, newStatus: any): Invoice => {
  throw new Error('Not Implemented');
};

export const markInvoiceCompleted = (invoice: Invoice): Invoice => {
  throw new Error('Not Implemented');
};

export const markInvoiceCancelled = (invoice: Invoice): Invoice => {
  throw new Error('Not Implemented');
};

export const markInvoicePending = (invoice: Invoice): Invoice => {
  throw new Error('Not Implemented');
};

export const cloneUpdatedInvoice = (invoice: Invoice): Invoice => {
  throw new Error('Not Implemented');
};

export const freezeUpdatedInvoice = (invoice: Invoice): Invoice => {
  throw new Error('Not Implemented');
};

export const generateInvoiceSnapshotId = (): string => {
  throw new Error('Not Implemented');
};

export const createInvoiceSnapshot = (data?: any) => {
  throw new Error('Not Implemented');
};

export const cloneInvoiceSnapshot = (snapshot: any) => {
  throw new Error('Not Implemented');
};

export const freezeInvoiceSnapshot = (snapshot: any) => {
  throw new Error('Not Implemented');
};

export const validateSnapshot = (snapshot: any) => {
  throw new Error('Not Implemented');
};
