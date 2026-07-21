/**
 * Invoice Module Barrel Exports
 * Phase 8 - Step 8
 */

export { InvoiceProvider, useInvoiceContext } from './context/InvoiceContext';
export { useInvoice } from './hooks/useInvoice';
export { INVOICE_STATUS } from './constants/invoice.constants';
export type { 
  InvoiceStatus, 
  InvoiceSummary, 
  InvoiceResult, 
  InvoiceState, 
  InvoiceActions, 
  InvoiceSnapshot,
  InvoiceItem,
  Invoice,
  InvoiceCreationInput,
  InvoiceCreationResult,
  InvoiceValidationError, 
  InvoiceValidationResult,
  InvoiceNumberResult,
  InvoiceStatusResult,
  InvoiceRepositoryResult,
  InvoiceProcessResult,
} from './types/invoice.types';
export { initialInvoiceState } from './store/invoice.state';
export { invoiceActions } from './store/invoice.actions';
export { invoiceSelectors } from './store/invoice.selectors';
export { InvoiceService } from './services/invoice.service';
export { 
  createInvoice,
  cloneInvoice,
  freezeInvoice,
  createInvoiceItem,
  cloneInvoiceItem,
  freezeInvoiceItem,
  generateInvoicePrefix,
  generateInvoiceSequence,
  generateInvoiceNumber,
  validateInvoiceId,
  validateOrderReference,
  validateCustomerReference,
  validatePaymentReference,
  validateInvoiceItems,
  validateInvoice,
  generateInvoiceSnapshotId,
  createInvoiceSnapshot,
  cloneInvoiceSnapshot,
  freezeInvoiceSnapshot,
  validateSnapshot,
} from './utils/invoice.utils';
