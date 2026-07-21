/**
 * Receipt Module Types
 * Phase 9 - Step 3
 */

import { RECEIPT_STATUS } from '../constants/receipt.constants';

export type ReceiptStatus = typeof RECEIPT_STATUS[keyof typeof RECEIPT_STATUS];

export interface ReceiptSummary {
  // Placeholder
}

export interface ReceiptResult {
  // Placeholder
}

export interface ReceiptSnapshot {
  receiptSnapshotId: string;
  createdAt: Date;
  status: ReceiptStatus;
}

export interface ReceiptItem {
  itemId: string;
  productId: string | number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Receipt {
  receiptId: string;
  receiptNumber: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  orderId: string | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  receiptDate: Date;
  receiptStatus: ReceiptStatus;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  items: ReceiptItem[];
  status: ReceiptStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptCreationInput {
  receiptId?: string;
  receiptNumber?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  orderId?: string | null;
  customerId?: string | number | null;
  paymentId?: string | number | null;
  receiptDate?: Date;
  receiptStatus?: ReceiptStatus;
  subtotal?: number;
  discount?: number;
  tax?: number;
  grandTotal?: number;
  items?: ReceiptItem[];
  status: ReceiptStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReceiptCreationResult {
  success: boolean;
  receipt: Receipt | null;
  error: string | null;
}

export interface ReceiptState {
  receiptId: string | null;
  receiptNumber: string | null;
  invoiceId: string | null;
  orderId: string | number | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  receiptStatus: ReceiptStatus;
  receiptDate: string | null;
  loading: boolean;
  error: string;
  validationErrors: ReceiptValidationError[];
}

export interface ReceiptValidationError {
  field: string;
  message: string;
}

export interface ReceiptValidationResult {
  valid: boolean;
  errors: ReceiptValidationError[];
}

export interface ReceiptNumberResult {
  receiptNumber: string;
  prefix: string;
  sequence: number;
  generatedAt: Date;
}

export interface ReceiptStatusResult {
  success: boolean;
  receipt: Receipt | null;
  previousStatus: ReceiptStatus | null;
  currentStatus: ReceiptStatus | null;
  updatedAt: Date | null;
  error: string | null;
}

export interface ReceiptRepositoryResult {
  success: boolean;
  receipts: Receipt[];
  receipt: Receipt | null;
  error: string | null;
}

export interface ReceiptProcessResult {
  success: boolean;
  receipt: Receipt | null;
  validation: ReceiptValidationResult | null;
  receiptNumber: ReceiptNumberResult | null;
  error: string | null;
}

export interface ReceiptActions {
  setReceiptId: (receiptId: string | null) => void;
  setReceiptNumber: (receiptNumber: string | null) => void;
  setInvoiceId: (invoiceId: string | null) => void;
  setOrderId: (orderId: string | number | null) => void;
  setCustomerId: (customerId: string | number | null) => void;
  setPaymentId: (paymentId: string | number | null) => void;
  setReceiptStatus: (status: ReceiptStatus) => void;
  setReceiptDate: (receiptDate: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetReceipt: () => void;
  createReceipt: (input: ReceiptCreationInput) => ReceiptCreationResult;
  validateReceipt: () => ReceiptValidationResult;
  clearValidation: () => void;
  generateReceiptNumber: () => ReceiptNumberResult;
  processReceipt: (input: ReceiptCreationInput) => ReceiptProcessResult;
}
