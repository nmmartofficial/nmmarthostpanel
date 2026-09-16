/**
 * Invoice Module Service
 * Phase 8 - Step 6
 */

import type {
  InvoiceNumberResult,
  InvoiceCreationInput,
  InvoiceCreationResult,
  Invoice,
  InvoiceStatus,
  InvoiceStatusResult,
  InvoiceRepositoryResult,
  InvoiceValidationResult,
  InvoiceProcessResult,
} from '../types/invoice.types';
import { INVOICE_STATUS } from '../constants/invoice.constants';
import { 
  createInvoice as createInvoiceUtil, 
  validateInvoice, 
  generateInvoiceNumber as generateInvoiceNumberUtil, 
} from '../utils/invoice.utils';
import { RepositoryService } from '../../repository';

export const InvoiceService = {
  startInvoice: () => {
    return {
      success: true,
      invoiceId: `INV-${Date.now()}`,
      status: 'DRAFT',
      startedAt: new Date(),
    };
  },
  completeInvoice: (invoice: Invoice) => {
    return {
      success: true,
      invoice: { ...invoice, status: 'COMPLETED' as InvoiceStatus },
      completedAt: new Date(),
    };
  },
  cancelInvoice: (invoice: Invoice) => {
    return {
      success: true,
      invoice: { ...invoice, status: 'CANCELLED' as InvoiceStatus },
      cancelledAt: new Date(),
    };
  },
  resetInvoice: () => {
    return {
      success: true,
      resetAt: new Date(),
    };
  },
  createSnapshot: (data?: any) => {
    return {
      success: true,
      snapshotId: `SNAP-${Date.now()}`,
      data: data || null,
      createdAt: new Date(),
    };
  },
  clearSnapshot: () => {
    return {
      success: true,
      clearedAt: new Date(),
    };
  },
  validate: (invoice: Invoice): InvoiceValidationResult => {
    return validateInvoice(invoice);
  },
  generateInvoiceNumber: (): InvoiceNumberResult => {
    return generateInvoiceNumberUtil();
  },
  createInvoice: (input: InvoiceCreationInput): InvoiceCreationResult => {
    try {
      const invoice = createInvoiceUtil(input);
      return {
        success: true,
        invoice,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        invoice: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  processInvoice: (input: InvoiceCreationInput): InvoiceProcessResult => {
    try {
      // Step 1: Generate Invoice Number
      const invoiceNumberResult = generateInvoiceNumberUtil();

      // Create invoice input with generated number
      const inputWithNumber = {
        ...input,
        invoiceNumber: invoiceNumberResult.invoiceNumber,
      };

      // Step 2: Create invoice object to validate
      const tempInvoice = createInvoiceUtil(inputWithNumber);

      // Step 3: Validate Invoice
      const validationResult = validateInvoice(tempInvoice);

      if (!validationResult.isValid) {
        return {
          success: false,
          invoice: null,
          validation: validationResult,
          invoiceNumber: invoiceNumberResult,
          error: 'Invoice validation failed',
        };
      }

      // Step 4: Create Invoice
      const creationResult = InvoiceService.createInvoice(inputWithNumber);

      if (!creationResult.success) {
        return {
          success: false,
          invoice: null,
          validation: validationResult,
          invoiceNumber: invoiceNumberResult,
          error: creationResult.error,
        };
      }

      return {
        success: true,
        invoice: creationResult.invoice,
        validation: validationResult,
        invoiceNumber: invoiceNumberResult,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        invoice: null,
        validation: null,
        invoiceNumber: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  updateStatus: (invoice: Invoice, newStatus: InvoiceStatus): InvoiceStatusResult => {
    return {
      success: true,
      invoice: { ...invoice, status: newStatus },
      previousStatus: invoice.status,
      currentStatus: newStatus,
      updatedAt: new Date(),
      error: null,
    };
  },
  markCompleted: (invoice: Invoice): InvoiceStatusResult => {
    return {
      success: true,
      invoice: { ...invoice, status: 'COMPLETED' as InvoiceStatus },
      previousStatus: invoice.status,
      currentStatus: 'COMPLETED' as InvoiceStatus,
      updatedAt: new Date(),
      error: null,
    };
  },
  markCancelled: (invoice: Invoice): InvoiceStatusResult => {
    return {
      success: true,
      invoice: { ...invoice, status: 'CANCELLED' as InvoiceStatus },
      previousStatus: invoice.status,
      currentStatus: 'CANCELLED' as InvoiceStatus,
      updatedAt: new Date(),
      error: null,
    };
  },
  markPending: (invoice: Invoice): InvoiceStatusResult => {
    return {
      success: true,
      invoice: { ...invoice, status: 'PENDING' as InvoiceStatus },
      previousStatus: invoice.status,
      currentStatus: 'PENDING' as InvoiceStatus,
      updatedAt: new Date(),
      error: null,
    };
  },
  addInvoice: (existingInvoices: Invoice[], newInvoice: Invoice): InvoiceRepositoryResult => {
    return {
      success: true,
      invoices: [...existingInvoices, newInvoice],
      invoice: newInvoice,
      error: null,
    };
  },
  removeInvoice: (existingInvoices: Invoice[], invoiceId: string): InvoiceRepositoryResult => {
    const filtered = existingInvoices.filter(inv => inv.invoiceId !== invoiceId);
    return {
      success: true,
      invoices: filtered,
      invoice: null,
      error: null,
    };
  },
  updateInvoice: (existingInvoices: Invoice[], updatedInvoice: Invoice): InvoiceRepositoryResult => {
    const updated = existingInvoices.map(inv =>
      inv.invoiceId === updatedInvoice.invoiceId ? updatedInvoice : inv
    );
    return {
      success: true,
      invoices: updated,
      invoice: updatedInvoice,
      error: null,
    };
  },
  findInvoice: (existingInvoices: Invoice[], invoiceId: string): InvoiceRepositoryResult => {
    const found = existingInvoices.find(inv => inv.invoiceId === invoiceId);
    return {
      success: !!found,
      invoices: existingInvoices,
      invoice: found || null,
      error: found ? null : 'Invoice not found',
    };
  },
  getInvoices: (existingInvoices: Invoice[]): InvoiceRepositoryResult => {
    return {
      success: true,
      invoices: existingInvoices,
      invoice: null,
      error: null,
    };
  },
  clearInvoices: (): InvoiceRepositoryResult => {
    return {
      success: true,
      invoices: [],
      invoice: null,
      error: null,
    };
  },
  saveInvoice: (invoice: Invoice | null): InvoiceRepositoryResult => {
    if (!invoice) {
      return {
        success: false,
        invoiceId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: 'No invoice provided',
      };
    }

    const adapter = RepositoryService.createStorageAdapter('IN_MEMORY');
    const entity = {
      ...invoice,
      id: invoice.invoiceId,
    };
    const result = adapter.save('invoice', entity);

    return {
      success: result.success,
      invoiceId: invoice.invoiceId,
      repositoryStatus: result.success ? 'SUCCESS' : 'ERROR',
      savedAt: result.timestamp,
      error: result.error,
    };
  },
};
