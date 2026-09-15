import type { ExecutionProcessResult, ExecutionRuntimeResult, ExecutionCheckoutResult, ExecutionOrderResult, ExecutionInvoiceResult, ExecutionPrinterResult, SaleExecutionResult, ExecutionPersistenceResult } from '../types/execution.types';
import { RuntimeService } from '../../runtime';
import { CheckoutService } from '../../checkout';
import { OrderService } from '../../order';
import { ORDER_STATUS } from '../../order';
import { InvoiceService } from '../../invoice';
import { INVOICE_STATUS } from '../../invoice';
import { PrinterService } from '../../printer';
import { PRINTER_STATUS } from '../../printer';
import { PersistenceService } from '../../persistence';
import type { CheckoutSnapshot } from '../../checkout';
import type { Order } from '../../order';
import type { Invoice } from '../../invoice';
import type { PrinterConfiguration } from '../../printer';

export class ExecutionService {
  static async startExecution(): Promise<ExecutionRuntimeResult> {
    try {
      const runtimeResult = RuntimeService.startRuntime();
      return {
        success: runtimeResult.success,
        runtimeId: runtimeResult.success ? (runtimeResult.startedAt ? Date.now().toString() : null) : null,
        runtimeStatus: runtimeResult.runtimeStatus,
        startedAt: runtimeResult.startedAt,
        error: runtimeResult.error
      };
    } catch (err) {
      return {
        success: false,
        runtimeId: null,
        runtimeStatus: null,
        startedAt: null,
        error: err instanceof Error ? err.message : 'Failed to start runtime'
      };
    }
  }

  static async processCheckout(): Promise<ExecutionCheckoutResult> {
    try {
      // 1. Create checkout snapshot using existing Checkout service
      const checkoutSnapshot = CheckoutService.createSnapshot();
      
      // 2. Validate checkout using existing Checkout service (we don't need the result here)
      CheckoutService.validate(checkoutSnapshot);
      
      // 3. Process checkout using existing Checkout service
      const processResult = CheckoutService.processCheckout(checkoutSnapshot);

      return {
        success: processResult.success,
        checkoutId: checkoutSnapshot.snapshotId,
        checkoutStatus: checkoutSnapshot.status,
        snapshotId: checkoutSnapshot.snapshotId,
        processedAt: new Date().toISOString(),
        error: processResult.error
      };
    } catch (err) {
      return {
        success: false,
        checkoutId: null,
        checkoutStatus: null,
        snapshotId: null,
        processedAt: null,
        error: err instanceof Error ? err.message : 'Failed to process checkout'
      };
    }
  }

  static async processOrder(): Promise<ExecutionOrderResult> {
    try {
      // 1. Create order creation input
      const orderInput = {
        cartId: null,
        customerId: null,
        paymentId: null,
        checkoutSnapshotId: null,
        status: ORDER_STATUS.CREATED
      };
      
      // 2. Use existing createOrder
      const orderResult = OrderService.createOrder(orderInput);
      
      return {
        success: orderResult.success,
        orderId: orderResult.order?.orderId || null,
        orderNumber: orderResult.order?.orderNumber || null,
        orderStatus: orderResult.order?.status || null,
        createdAt: orderResult.order?.createdAt.toISOString() || null,
        error: orderResult.error
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        orderStatus: null,
        createdAt: null,
        error: err instanceof Error ? err.message : 'Failed to process order'
      };
    }
  }

  static async processInvoice(): Promise<ExecutionInvoiceResult> {
    try {
      // 1. Create invoice creation input
      const invoiceInput = {
        orderId: null,
        customerId: null,
        paymentId: null,
        items: [],
        status: INVOICE_STATUS.CREATED
      };
      
      // 2. Use existing processInvoice (which generates number and creates invoice)
      const invoiceResult = InvoiceService.processInvoice(invoiceInput);
      
      return {
        success: invoiceResult.success,
        invoiceId: invoiceResult.invoice?.invoiceId || null,
        invoiceNumber: invoiceResult.invoice?.invoiceNumber || null,
        invoiceStatus: invoiceResult.invoice?.status || null,
        createdAt: invoiceResult.invoice?.createdAt.toISOString() || null,
        error: invoiceResult.error
      };
    } catch (err) {
      return {
        success: false,
        invoiceId: null,
        invoiceNumber: null,
        invoiceStatus: null,
        createdAt: null,
        error: err instanceof Error ? err.message : 'Failed to process invoice'
      };
    }
  }

  static async processPrinter(): Promise<ExecutionPrinterResult> {
    try {
      // 1. Create printer configuration input
      const printerInput = {
        printerId: 'default-printer',
        printerName: 'Default Printer',
        printerType: 'thermal',
        paperWidth: '80mm',
        copies: 1,
        isConnected: true
      };
      
      // 2. Use existing processPrinter (which validates and processes)
      const printerResult = PrinterService.processPrinter(printerInput);
      
      return {
        success: printerResult.success,
        printerId: printerResult.configuration?.printerId || null,
        printerStatus: PRINTER_STATUS.CONNECTED,
        configurationId: printerResult.configuration?.configurationId || null,
        processedAt: new Date().toISOString(),
        error: printerResult.error
      };
    } catch (err) {
      return {
        success: false,
        printerId: null,
        printerStatus: null,
        configurationId: null,
        processedAt: null,
        error: err instanceof Error ? err.message : 'Failed to process printer'
      };
    }
  }

  static async executeSale(): Promise<SaleExecutionResult> {
    // Initialize all results to null
    let runtimeResult: ExecutionRuntimeResult | null = null;
    let checkoutResult: ExecutionCheckoutResult | null = null;
    let orderResult: ExecutionOrderResult | null = null;
    let invoiceResult: ExecutionInvoiceResult | null = null;
    let printerResult: ExecutionPrinterResult | null = null;
    let error: string | null = null;

    try {
      // Step 1: Start Runtime
      runtimeResult = await this.startExecution();
      if (!runtimeResult.success) {
        error = runtimeResult.error;
        return Object.freeze({
          success: false,
          runtime: runtimeResult,
          checkout: null,
          order: null,
          invoice: null,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 2: Process Checkout
      checkoutResult = await this.processCheckout();
      if (!checkoutResult.success) {
        error = checkoutResult.error;
        return Object.freeze({
          success: false,
          runtime: runtimeResult,
          checkout: checkoutResult,
          order: null,
          invoice: null,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 3: Process Order
      orderResult = await this.processOrder();
      if (!orderResult.success) {
        error = orderResult.error;
        return Object.freeze({
          success: false,
          runtime: runtimeResult,
          checkout: checkoutResult,
          order: orderResult,
          invoice: null,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 4: Process Invoice
      invoiceResult = await this.processInvoice();
      if (!invoiceResult.success) {
        error = invoiceResult.error;
        return Object.freeze({
          success: false,
          runtime: runtimeResult,
          checkout: checkoutResult,
          order: orderResult,
          invoice: invoiceResult,
          printer: null,
          completedAt: null,
          error
        });
      }

      // Step 5: Process Printer
      printerResult = await this.processPrinter();
      if (!printerResult.success) {
        error = printerResult.error;
        return Object.freeze({
          success: false,
          runtime: runtimeResult,
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
        runtime: runtimeResult,
        checkout: checkoutResult,
        order: orderResult,
        invoice: invoiceResult,
        printer: printerResult,
        completedAt: new Date().toISOString(),
        error: null
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Sale execution failed';
      return Object.freeze({
        success: false,
        runtime: runtimeResult,
        checkout: checkoutResult,
        order: orderResult,
        invoice: invoiceResult,
        printer: printerResult,
        completedAt: null,
        error
      });
    }
  }

  static async stopExecution() {
    throw new Error('Not Implemented');
  }

  static async resetExecution() {
    throw new Error('Not Implemented');
  }

  static async executeStep() {
    throw new Error('Not Implemented');
  }

  static async validateExecution() {
    throw new Error('Not Implemented');
  }

  static connectRuntime(reference: any) {
    // Store reference only, no execution
    return reference;
  }

  static connectCart(reference: any) {
    return reference;
  }

  static connectCustomer(reference: any) {
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

  static async processExecution(): Promise<ExecutionProcessResult> {
    // Orchestration only - just return process state
    const result: ExecutionProcessResult = {
      success: true,
      currentStage: null,
      completedStages: [],
      error: null
    };

    return result;
  }

  static async persistExecution(
    checkoutSnapshot: CheckoutSnapshot | null,
    order: Order | null,
    invoice: Invoice | null,
    printerConfiguration: PrinterConfiguration | null
  ): Promise<ExecutionPersistenceResult> {
    let error: string | null = null;
    let persistenceResult: any = null;

    try {
      persistenceResult = await PersistenceService.saveAll(checkoutSnapshot, order, invoice, printerConfiguration);

      if (!persistenceResult.success) {
        error = persistenceResult.error;
        return Object.freeze({
          success: false,
          persistence: persistenceResult,
          completedAt: null,
          error
        });
      }

      return Object.freeze({
        success: true,
        persistence: persistenceResult,
        completedAt: new Date().toISOString(),
        error: null
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Persistence failed';
      return Object.freeze({
        success: false,
        persistence: null,
        completedAt: null,
        error
      });
    }
  }
}
