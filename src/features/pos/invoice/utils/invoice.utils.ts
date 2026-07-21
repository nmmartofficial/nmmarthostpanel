/**
 * Invoice Module Utilities
 * Phase 8 - Step 3
 */

import type {
  Invoice,
  InvoiceItem,
  InvoiceCreationInput,
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

// Keep other utilities as "Not Implemented" for now
export const generateInvoicePrefix = (date?: Date): string => {
  throw new Error('Not Implemented');
};

export const generateInvoiceSequence = (): number => {
  throw new Error('Not Implemented');
};

export const generateInvoiceNumber = (date?: Date): any => {
  throw new Error('Not Implemented');
};

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

export const validateOrderReference = (orderId: any) => {
  throw new Error('Not Implemented');
};

export const validateSnapshot = (snapshot: any) => {
  throw new Error('Not Implemented');
};

export const validateInvoice = (snapshot: any) => {
  throw new Error('Not Implemented');
};
