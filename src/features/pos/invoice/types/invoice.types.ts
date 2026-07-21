/**
 * Invoice Module Types
 * Phase 8 - Step 6
 */

import { INVOICE_STATUS } from '../constants/invoice.constants';

export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

export interface InvoiceSummary {
  // Placeholder
}

export interface InvoiceResult {
  // Placeholder
}

export interface InvoiceSnapshot {
  invoiceSnapshotId: string;
  orderId: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  payableAmount: number;
  createdAt: Date;
  status: InvoiceStatus;
}

export interface InvoiceItem {
  itemId: string;
  productId: string | number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string | null;
  orderId: string | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  items: InvoiceItem[];
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  grandTotal: number | null;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceCreationInput {
  invoiceId?: string;
  invoiceNumber?: string | null;
  orderId?: string | null;
  customerId?: string | number | null;
  paymentId?: string | number | null;
  items?: InvoiceItem[];
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  grandTotal?: number | null;
  status: InvoiceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InvoiceCreationResult {
  success: boolean;
  invoice: Invoice | null;
  error: string | null;
}

export interface InvoiceState {
  invoiceId: string | null;
  invoiceNumber: string | null;
  orderId: string | number | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  invoiceStatus: InvoiceStatus;
  invoiceDate: Date | null;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  grandTotal: number | null;
  loading: boolean;
  error: string;
  validationErrors: InvoiceValidationError[];
}

export interface InvoiceValidationError {
  field: string;
  message: string;
}

export interface InvoiceValidationResult {
  isValid: boolean;
  errors: InvoiceValidationError[];
}

export interface InvoiceNumberResult {
  invoiceNumber: string;
  prefix: string;
  sequence: number;
  generatedAt: Date;
}

export interface InvoiceStatusResult {
  success: boolean;
  invoice: Invoice | null;
  previousStatus: InvoiceStatus | null;
  currentStatus: InvoiceStatus | null;
  updatedAt: Date | null;
  error: string | null;
}

export interface InvoiceRepositoryResult {
  success: boolean;
  invoices: Invoice[];
  invoice: Invoice | null;
  error: string | null;
}

export interface InvoiceProcessResult {
  success: boolean;
  invoice: Invoice | null;
  validation: InvoiceValidationResult | null;
  invoiceNumber: InvoiceNumberResult | null;
  error: string | null;
}

export interface InvoiceActions {
  setInvoiceId: (invoiceId: string | null) => void;
  setInvoiceNumber: (invoiceNumber: string | null) => void;
  setOrderId: (orderId: string | number | null) => void;
  setCustomerId: (customerId: string | number | null) => void;
  setPaymentId: (paymentId: string | number | null) => void;
  setInvoiceStatus: (status: InvoiceStatus) => void;
  setInvoiceDate: (invoiceDate: Date | null) => void;
  setSubtotal: (subtotal: number | null) => void;
  setDiscount: (discount: number | null) => void;
  setTax: (tax: number | null) => void;
  setGrandTotal: (grandTotal: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetInvoice: () => void;
  createInvoice: (input: InvoiceCreationInput) => InvoiceCreationResult;
  validateInvoice: () => InvoiceValidationResult;
  clearValidation: () => void;
  generateInvoiceNumber: () => InvoiceNumberResult;
  processInvoice: (input: InvoiceCreationInput) => InvoiceProcessResult;
}
