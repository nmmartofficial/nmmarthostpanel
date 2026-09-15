import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialPersistenceState } from '../store/persistence.state';
import { createPersistenceActions } from '../store/persistence.actions';
import { PersistenceService } from '../services/persistence.service';
import { useCheckoutContext } from '../../checkout';
import { useOrderContext } from '../../order';
import { useInvoiceContext } from '../../invoice';
import { usePrinterContext } from '../../printer';

const PersistenceContext = createContext(null);

export const usePersistenceContext = () => {
  const context = useContext(PersistenceContext);
  if (!context) {
    throw new Error('usePersistenceContext must be used within a PersistenceProvider');
  }
  return context;
};

export const PersistenceProvider = ({ children }) => {
  const [persistenceId, setPersistenceId] = useState(initialPersistenceState.persistenceId);
  const [persistenceStatus, setPersistenceStatus] = useState(initialPersistenceState.persistenceStatus);
  const [currentEntity, setCurrentEntity] = useState(initialPersistenceState.currentEntity);
  const [isPersisting, setPersisting] = useState(initialPersistenceState.isPersisting);
  const [startedAt, setStartedAt] = useState(initialPersistenceState.startedAt);
  const [finishedAt, setFinishedAt] = useState(initialPersistenceState.finishedAt);
  const [loading, setLoading] = useState(initialPersistenceState.loading);
  const [error, setError] = useState(initialPersistenceState.error);
  const [executionReference, setExecutionReference] = useState(initialPersistenceState.executionReference);
  const [runtimeReference, setRuntimeReference] = useState(initialPersistenceState.runtimeReference);
  const [checkoutReference, setCheckoutReference] = useState(initialPersistenceState.checkoutReference);
  const [orderReference, setOrderReference] = useState(initialPersistenceState.orderReference);
  const [invoiceReference, setInvoiceReference] = useState(initialPersistenceState.invoiceReference);
  const [printerReference, setPrinterReference] = useState(initialPersistenceState.printerReference);

  // Get contexts
  const { checkoutState } = useCheckoutContext();
  const { orderState } = useOrderContext();
  const { invoiceState } = useInvoiceContext();
  const { state: printerState } = usePrinterContext();

  const resetPersistence = useCallback(() => {
    setPersistenceId(initialPersistenceState.persistenceId);
    setPersistenceStatus(initialPersistenceState.persistenceStatus);
    setCurrentEntity(initialPersistenceState.currentEntity);
    setPersisting(initialPersistenceState.isPersisting);
    setStartedAt(initialPersistenceState.startedAt);
    setFinishedAt(initialPersistenceState.finishedAt);
    setLoading(initialPersistenceState.loading);
    setError(initialPersistenceState.error);
    setExecutionReference(initialPersistenceState.executionReference);
    setRuntimeReference(initialPersistenceState.runtimeReference);
    setCheckoutReference(initialPersistenceState.checkoutReference);
    setOrderReference(initialPersistenceState.orderReference);
    setInvoiceReference(initialPersistenceState.invoiceReference);
    setPrinterReference(initialPersistenceState.printerReference);
  }, []);

  const processPersistence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const currentState = {
        persistenceId,
        persistenceStatus,
        currentEntity,
        isPersisting,
        startedAt,
        finishedAt,
        loading,
        error,
        executionReference,
        runtimeReference,
        checkoutReference,
        orderReference,
        invoiceReference,
        printerReference
      };
      PersistenceService.processPersistence(currentState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Persistence processing failed');
    } finally {
      setLoading(false);
    }
  }, [persistenceId, persistenceStatus, currentEntity, isPersisting, startedAt, finishedAt, loading, error, executionReference, runtimeReference, checkoutReference, orderReference, invoiceReference, printerReference]);

  const processExecution = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await PersistenceService.processExecution();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution processing failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const executePersistence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const currentState = {
        persistenceId,
        persistenceStatus,
        currentEntity,
        isPersisting,
        startedAt,
        finishedAt,
        loading,
        error,
        executionReference,
        runtimeReference,
        checkoutReference,
        orderReference,
        invoiceReference,
        printerReference
      };
      await PersistenceService.executePersistence(currentState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Persistence pipeline failed');
    } finally {
      setLoading(false);
    }
  }, [persistenceId, persistenceStatus, currentEntity, isPersisting, startedAt, finishedAt, loading, error, executionReference, runtimeReference, checkoutReference, orderReference, invoiceReference, printerReference]);

  const processRepository = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      PersistenceService.processRepository();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository processing failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAll = useCallback(async () => {
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

      await PersistenceService.saveAll(checkoutSnapshot, order, invoice, printerConfiguration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save pipeline failed');
    } finally {
      setLoading(false);
    }
  }, [checkoutState.currentSnapshot, orderState.selectedOrder, invoiceState, printerState]);

  const state = useMemo(() => ({
    persistenceId,
    persistenceStatus,
    currentEntity,
    isPersisting,
    startedAt,
    finishedAt,
    loading,
    error,
    executionReference,
    runtimeReference,
    checkoutReference,
    orderReference,
    invoiceReference,
    printerReference
  }), [persistenceId, persistenceStatus, currentEntity, isPersisting, startedAt, finishedAt, loading, error, executionReference, runtimeReference, checkoutReference, orderReference, invoiceReference, printerReference]);

  const actions = useMemo(() => createPersistenceActions(
    setPersistenceId,
    setPersistenceStatus,
    setCurrentEntity,
    setPersisting,
    setStartedAt,
    setFinishedAt,
    setLoading,
    setError,
    resetPersistence,
    setExecutionReference,
    setRuntimeReference,
    setCheckoutReference,
    setOrderReference,
    setInvoiceReference,
    setPrinterReference,
    processPersistence,
    processExecution,
    executePersistence,
    processRepository,
    saveAll
  ), [resetPersistence, processPersistence, processExecution, executePersistence, processRepository, saveAll]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>;
};
