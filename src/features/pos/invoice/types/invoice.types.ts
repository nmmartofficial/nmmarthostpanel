/**
 * Invoice Module Types
 * Phase 8 - Step 1
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
  gst: number;
  grandTotal: number;
  payableAmount: number;
  createdAt: Date;
  status: InvoiceStatus;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  orderId: string | null;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceCreationInput {
  orderId: string | null;
  status: InvoiceStatus;
}

export interface InvoiceCreationResult {
  success: boolean;
  invoice: Invoice | null;
  error: string | null;
}

export interface InvoiceState {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  loading: boolean;
  error: string;
  invoiceStatus: InvoiceStatus;
  searchQuery: string;
  createdAt: Date | null;
  updatedAt: Date | null;
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

export interface InvoiceActions {
  setInvoices: (invoices: Invoice[]) => void;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  setInvoiceStatus: (status: InvoiceStatus) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetInvoice: () => void;
  generateInvoiceNumber: () => InvoiceNumberResult;
  createInvoice: (input: InvoiceCreationInput) => InvoiceCreationResult;
  updateInvoiceStatus: (invoice: Invoice, newStatus: InvoiceStatus) => InvoiceStatusResult;
  markCompleted: (invoice: Invoice) => InvoiceStatusResult;
  markCancelled: (invoice: Invoice) => InvoiceStatusResult;
  markPending: (invoice: Invoice) => InvoiceStatusResult;
  addInvoice: (invoice: Invoice) => InvoiceRepositoryResult;
  removeInvoice: (invoiceId: string) => InvoiceRepositoryResult;
  updateInvoice: (invoice: Invoice) => InvoiceRepositoryResult;
  findInvoice: (invoiceId: string) => InvoiceRepositoryResult;
  getInvoices: () => InvoiceRepositoryResult;
  clearInvoices: () => InvoiceRepositoryResult;
}
