import type { PersistenceProcessResult, PersistenceState, PersistenceExecutionResult, PersistencePipelineResult, PersistenceRepositoryResult, PersistenceSavePipelineResult } from '../types/persistence.types';
import { ExecutionService } from '../../execution';
import { EXECUTION_STATUS } from '../../execution';
import { RepositoryService } from '../../repository';
import { CheckoutService } from '../../checkout';
import { OrderService } from '../../order';
import { InvoiceService } from '../../invoice';
import { PrinterService } from '../../printer';
import type { CheckoutSnapshot } from '../../checkout/types/checkout.types';
import type { Order } from '../../order/types/order.types';
import type { Invoice } from '../../invoice/types/invoice.types';
import type { PrinterConfiguration } from '../../printer/types/printer.types';

export class PersistenceService {
  static connectExecution(reference: any) {
    return reference;
  }

  static connectRuntime(reference: any) {
    return reference;
  }

  static connectCheckout(reference: any) {
    return reference;
  }

  static connectOrder(reference: any) {
    return reference;
  }

  static connectInvoice(reference: any) {
    return reference;
  }

  static connectPrinter(reference: any) {
    return reference;
  }

  static processRepository(): PersistenceRepositoryResult {
    try {
      const repositoryAdapter = RepositoryService.createRepositoryAdapter();
      const testResult = repositoryAdapter.list('checkout');
      return Object.freeze({
        success: true,
        repositoryAdapterResult: testResult,
        processedAt: new Date().toISOString(),
        error: null
      });
    } catch (err) {
      return Object.freeze({
        success: false,
        repositoryAdapterResult: null,
        processedAt: null,
        error: err instanceof Error ? err.message : 'Failed to process repository'
      });
    }
  }

  static processPersistence(state: PersistenceState): PersistenceProcessResult {
    return Object.freeze({
      success: true,
      executionReference: state.executionReference,
      runtimeReference: state.runtimeReference,
      checkoutReference: state.checkoutReference,
      orderReference: state.orderReference,
      invoiceReference: state.invoiceReference,
      printerReference: state.printerReference,
      processedAt: new Date().toISOString(),
      error: null
    });
  }

  static async processExecution(): Promise<PersistenceExecutionResult> {
    try {
      const executionResult = await ExecutionService.processExecution();
      return {
        success: executionResult.success,
        executionId: null,
        executionStatus: EXECUTION_STATUS.IDLE,
        processedAt: new Date().toISOString(),
        error: executionResult.error
      };
    } catch (err) {
      return {
        success: false,
        executionId: null,
        executionStatus: null,
        processedAt: null,
        error: err instanceof Error ? err.message : 'Failed to process execution'
      };
    }
  }

  static async executePersistence(state: PersistenceState): Promise<PersistencePipelineResult> {
    let executionResult: PersistenceExecutionResult | null = null;
    let persistenceResult: PersistenceProcessResult | null = null;
    let error: string | null = null;

    try {
      // Step 1: Process Execution
      executionResult = await PersistenceService.processExecution();
      if (!executionResult.success) {
        error = executionResult.error;
        return Object.freeze({
          success: false,
          execution: executionResult,
          persistence: null,
          completedAt: null,
          error
        });
      }

      // Step 2: Process Persistence
      persistenceResult = PersistenceService.processPersistence(state);
      if (!persistenceResult.success) {
        error = persistenceResult.error;
        return Object.freeze({
          success: false,
          execution: executionResult,
          persistence: null,
          completedAt: null,
          error
        });
      }

      // All steps succeeded!
      return Object.freeze({
        success: true,
        execution: executionResult,
        persistence: persistenceResult,
        completedAt: new Date().toISOString(),
        error: null
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Persistence pipeline failed';
      return Object.freeze({
        success: false,
        execution: executionResult,
        persistence: persistenceResult,
        completedAt: null,
        error
      });
    }
  }

  static async saveAll(
    checkoutSnapshot: CheckoutSnapshot | null,
    order: Order | null,
    invoice: Invoice | null,
    printerConfiguration: PrinterConfiguration | null
  ): Promise<PersistenceSavePipelineResult> {
    let checkoutResult: any = null;
    let orderResult: any = null;
    let invoiceResult: any = null;
    let printerResult: any = null;
    let error: string | null = null;

    try {
      // Step 1: Save Checkout
      checkoutResult = CheckoutService.saveCheckout(checkoutSnapshot);
      if (!checkoutResult.success) {
        error = checkoutResult.error;
        return Object.freeze({
          success: false,
          checkout: checkoutResult,
          order: null,
          invoice: null,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 2: Save Order
      orderResult = OrderService.saveOrder(order);
      if (!orderResult.success) {
        error = orderResult.error;
        return Object.freeze({
          success: false,
          checkout: checkoutResult,
          order: orderResult,
          invoice: null,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 3: Save Invoice
      invoiceResult = InvoiceService.saveInvoice(invoice);
      if (!invoiceResult.success) {
        error = invoiceResult.error;
        return Object.freeze({
          success: false,
          checkout: checkoutResult,
          order: orderResult,
          invoice: invoiceResult,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 4: Save Printer
      printerResult = PrinterService.savePrinter(printerConfiguration);
      if (!printerResult.success) {
        error = printerResult.error;
        return Object.freeze({
          success: false,
          checkout: checkoutResult,
          order: orderResult,
          invoice: invoiceResult,
          printer: printerResult,
          completedAt: null,
          error
        });
      }

      // All steps succeeded!
      return Object.freeze({
        success: true,
        checkout: checkoutResult,
        order: orderResult,
        invoice: invoiceResult,
        printer: printerResult,
        completedAt: new Date().toISOString(),
        error: null
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Save pipeline failed';
      return Object.freeze({
        success: false,
        checkout: checkoutResult,
        order: orderResult,
        invoice: invoiceResult,
        printer: printerResult,
        completedAt: null,
        error
      });
    }
  }
}
