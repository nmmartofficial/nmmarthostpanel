import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialExecutionState } from '../store/execution.state';
import { createExecutionActions } from '../store/execution.actions';
import { ExecutionService } from '../services/execution.service';
import { useCheckoutContext } from '../../checkout';
import { useOrderContext } from '../../order';
import { useInvoiceContext } from '../../invoice';
import { usePrinterContext } from '../../printer';

const ExecutionContext = createContext(null);

export const useExecutionContext = () => {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error('useExecutionContext must be used within a ExecutionProvider');
  }
  return context;
};

export const ExecutionProvider = ({ children }) => {
  const [executionId, setExecutionId] = useState(initialExecutionState.executionId);
  const [executionStatus, setExecutionStatus] = useState(initialExecutionState.executionStatus);
  const [runtimeReference, setRuntimeReference] = useState(initialExecutionState.runtimeReference);
  const [cartReference, setCartReference] = useState(initialExecutionState.cartReference);
  const [customerReference, setCustomerReference] = useState(initialExecutionState.customerReference);
  const [checkoutReference, setCheckoutReference] = useState(initialExecutionState.checkoutReference);
  const [orderReference, setOrderReference] = useState(initialExecutionState.orderReference);
  const [invoiceReference, setInvoiceReference] = useState(initialExecutionState.invoiceReference);
  const [printerReference, setPrinterReference] = useState(initialExecutionState.printerReference);
  const [currentPhase, setCurrentPhase] = useState(initialExecutionState.currentPhase);
  const [startedAt, setStartedAt] = useState(initialExecutionState.startedAt);
  const [finishedAt, setFinishedAt] = useState(initialExecutionState.finishedAt);
  const [loading, setLoading] = useState(initialExecutionState.loading);
  const [error, setError] = useState(initialExecutionState.error);
  const [processResult, setProcessResult] = useState(initialExecutionState.processResult);

  // Get contexts
  const { checkoutState } = useCheckoutContext();
  const { orderState } = useOrderContext();
  const { invoiceState } = useInvoiceContext();
  const { state: printerState } = usePrinterContext();

  const resetExecution = useCallback(() => {
    setExecutionId(initialExecutionState.executionId);
    setExecutionStatus(initialExecutionState.executionStatus);
    setRuntimeReference(initialExecutionState.runtimeReference);
    setCartReference(initialExecutionState.cartReference);
    setCustomerReference(initialExecutionState.customerReference);
    setCheckoutReference(initialExecutionState.checkoutReference);
    setOrderReference(initialExecutionState.orderReference);
    setInvoiceReference(initialExecutionState.invoiceReference);
    setPrinterReference(initialExecutionState.printerReference);
    setCurrentPhase(initialExecutionState.currentPhase);
    setStartedAt(initialExecutionState.startedAt);
    setFinishedAt(initialExecutionState.finishedAt);
    setLoading(initialExecutionState.loading);
    setError(initialExecutionState.error);
    setProcessResult(initialExecutionState.processResult);
  }, []);

  const processExecution = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.processExecution();
      setProcessResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetExecutionProcess = useCallback(() => {
    setProcessResult(initialExecutionState.processResult);
    setError('');
  }, []);

  const startExecution = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.startExecution();
      if (result.success) {
        setExecutionId(result.runtimeId);
        setStartedAt(result.startedAt);
      }
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const processCheckout = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.processCheckout();
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout processing failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const processOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.processOrder();
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order processing failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const processInvoice = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.processInvoice();
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invoice processing failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const processPrinter = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.processPrinter();
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Printer processing failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const executeSale = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ExecutionService.executeSale();
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sale execution failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const persistExecution = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Get data from contexts
      const checkoutSnapshot = checkoutState.currentSnapshot;
      const order = orderState.selectedOrder;
      const invoice = {
        invoiceId: invoiceState.invoiceId || `inv-temp-${Date.now()}`,
        invoiceNumber: invoiceState.invoiceNumber,
        orderId: invoiceState.orderId,
        customerId: invoiceState.customerId,
        paymentId: invoiceState.paymentId,
        items: [],
        subtotal: invoiceState.subtotal,
        discount: invoiceState.discount,
        tax: invoiceState.tax,
        grandTotal: invoiceState.grandTotal,
        status: invoiceState.invoiceStatus,
        createdAt: invoiceState.invoiceDate || new Date(),
        updatedAt: invoiceState.invoiceDate || new Date()
      };
      const printerConfiguration = {
        configurationId: `printer-config-${Date.now()}`,
        printerId: printerState.printerId || `printer-${Date.now()}`,
        printerName: printerState.printerName || 'Default Printer',
        printerType: printerState.printerType || 'thermal',
        paperWidth: printerState.paperWidth || '80mm',
        copies: printerState.copies || 1,
        isConnected: printerState.isConnected || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await ExecutionService.persistExecution(checkoutSnapshot, order, invoice, printerConfiguration);
      setError(result.error || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Persistence failed');
    } finally {
      setLoading(false);
    }
  }, [checkoutState.currentSnapshot, orderState.selectedOrder, invoiceState, printerState]);

  const state = useMemo(() => ({
    executionId,
    executionStatus,
    runtimeReference,
    cartReference,
    customerReference,
    checkoutReference,
    orderReference,
    invoiceReference,
    printerReference,
    currentPhase,
    startedAt,
    finishedAt,
    loading,
    error,
    processResult
  }), [executionId, executionStatus, runtimeReference, cartReference, customerReference, checkoutReference, orderReference, invoiceReference, printerReference, currentPhase, startedAt, finishedAt, loading, error, processResult]);

  const actions = useMemo(() => createExecutionActions(
    setExecutionId,
    setExecutionStatus,
    setRuntimeReference,
    setCartReference,
    setCustomerReference,
    setCheckoutReference,
    setOrderReference,
    setInvoiceReference,
    setPrinterReference,
    setCurrentPhase,
    setStartedAt,
    setFinishedAt,
    setLoading,
    setError,
    resetExecution,
    processExecution,
    resetExecutionProcess,
    startExecution,
    processCheckout,
    processOrder,
    processInvoice,
    processPrinter,
    executeSale,
    persistExecution
  ), [resetExecution, processExecution, resetExecutionProcess, startExecution, processCheckout, processOrder, processInvoice, processPrinter, executeSale, persistExecution]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <ExecutionContext.Provider value={value}>{children}</ExecutionContext.Provider>;
};
