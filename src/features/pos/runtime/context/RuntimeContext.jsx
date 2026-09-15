import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialRuntimeState } from '../store/runtime.state';
import { createRuntimeActions } from '../store/runtime.actions';
import { RuntimeService } from '../services/runtime.service';

const RuntimeContext = createContext(null);

export const useRuntimeContext = () => {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error('useRuntimeContext must be used within a RuntimeProvider');
  }
  return context;
};

export const RuntimeProvider = ({ children }) => {
  const [runtimeId, setRuntimeId] = useState(initialRuntimeState.runtimeId);
  const [runtimeStatus, setRuntimeStatus] = useState(initialRuntimeState.runtimeStatus);
  const [currentModule, setCurrentModule] = useState(initialRuntimeState.currentModule);
  const [isRunning, setRunning] = useState(initialRuntimeState.isRunning);
  const [startedAt, setStartedAt] = useState(initialRuntimeState.startedAt);
  const [finishedAt, setFinishedAt] = useState(initialRuntimeState.finishedAt);
  const [loading, setLoading] = useState(initialRuntimeState.loading);
  const [error, setError] = useState(initialRuntimeState.error);
  const [cartReference, setCartReference] = useState(initialRuntimeState.cartReference);
  const [customerReference, setCustomerReference] = useState(initialRuntimeState.customerReference);
  const [checkoutReference, setCheckoutReference] = useState(initialRuntimeState.checkoutReference);
  const [orderReference, setOrderReference] = useState(initialRuntimeState.orderReference);
  const [invoiceReference, setInvoiceReference] = useState(initialRuntimeState.invoiceReference);
  const [printerReference, setPrinterReference] = useState(initialRuntimeState.printerReference);
  const [validationErrors, setValidationErrors] = useState(initialRuntimeState.validationErrors);
  const [processResult, setProcessResult] = useState(initialRuntimeState.processResult);

  const resetRuntime = useCallback(() => {
    setRuntimeId(initialRuntimeState.runtimeId);
    setRuntimeStatus(initialRuntimeState.runtimeStatus);
    setCurrentModule(initialRuntimeState.currentModule);
    setRunning(initialRuntimeState.isRunning);
    setStartedAt(initialRuntimeState.startedAt);
    setFinishedAt(initialRuntimeState.finishedAt);
    setLoading(initialRuntimeState.loading);
    setError(initialRuntimeState.error);
    setCartReference(initialRuntimeState.cartReference);
    setCustomerReference(initialRuntimeState.customerReference);
    setCheckoutReference(initialRuntimeState.checkoutReference);
    setOrderReference(initialRuntimeState.orderReference);
    setInvoiceReference(initialRuntimeState.invoiceReference);
    setPrinterReference(initialRuntimeState.printerReference);
    setValidationErrors(initialRuntimeState.validationErrors);
    setProcessResult(initialRuntimeState.processResult);
  }, []);

  const startRuntime = useCallback(() => {
    const result = RuntimeService.startRuntime();
    setRuntimeStatus(result.runtimeStatus);
    setCurrentModule(result.currentModule);
    setStartedAt(result.startedAt);
    setFinishedAt(result.finishedAt);
    setError(result.error);
    setRunning(true);
  }, []);

  const stopRuntime = useCallback(() => {
    const result = RuntimeService.stopRuntime();
    setRuntimeStatus(result.runtimeStatus);
    setCurrentModule(result.currentModule);
    setStartedAt(result.startedAt);
    setFinishedAt(result.finishedAt);
    setError(result.error);
    setRunning(false);
  }, []);

  const restartRuntime = useCallback(() => {
    const result = RuntimeService.restartRuntime();
    setRuntimeStatus(result.runtimeStatus);
    setCurrentModule(result.currentModule);
    setStartedAt(result.startedAt);
    setFinishedAt(result.finishedAt);
    setError(result.error);
    setRunning(false);
  }, []);

  const validateRuntimeAction = useCallback(() => {
    const currentState = {
      runtimeId,
      runtimeStatus,
      currentModule,
      isRunning,
      startedAt,
      finishedAt,
      loading,
      error,
      cartReference,
      customerReference,
      checkoutReference,
      orderReference,
      invoiceReference,
      printerReference,
      validationErrors,
      processResult
    };
    const result = RuntimeService.validateRuntime(currentState);
    setValidationErrors(result.errors);
  }, [runtimeId, runtimeStatus, currentModule, isRunning, startedAt, finishedAt, loading, error, cartReference, customerReference, checkoutReference, orderReference, invoiceReference, printerReference, validationErrors, processResult]);

  const clearValidation = useCallback(() => {
    setValidationErrors([]);
  }, []);

  const processRuntimeAction = useCallback(() => {
    const currentState = {
      runtimeId,
      runtimeStatus,
      currentModule,
      isRunning,
      startedAt,
      finishedAt,
      loading,
      error,
      cartReference,
      customerReference,
      checkoutReference,
      orderReference,
      invoiceReference,
      printerReference,
      validationErrors,
      processResult
    };
    const result = RuntimeService.processRuntime(currentState);
    setProcessResult(result);
  }, [runtimeId, runtimeStatus, currentModule, isRunning, startedAt, finishedAt, loading, error, cartReference, customerReference, checkoutReference, orderReference, invoiceReference, printerReference, validationErrors, processResult]);

  const resetRuntimeProcess = useCallback(() => {
    setProcessResult(null);
  }, []);

  const state = useMemo(() => ({
    runtimeId,
    runtimeStatus,
    currentModule,
    isRunning,
    startedAt,
    finishedAt,
    loading,
    error,
    cartReference,
    customerReference,
    checkoutReference,
    orderReference,
    invoiceReference,
    printerReference,
    validationErrors,
    processResult
  }), [runtimeId, runtimeStatus, currentModule, isRunning, startedAt, finishedAt, loading, error, cartReference, customerReference, checkoutReference, orderReference, invoiceReference, printerReference, validationErrors, processResult]);

  const actions = useMemo(() => createRuntimeActions(
    setRuntimeId,
    setRuntimeStatus,
    setCurrentModule,
    setRunning,
    setStartedAt,
    setFinishedAt,
    setLoading,
    setError,
    resetRuntime,
    setCartReference,
    setCustomerReference,
    setCheckoutReference,
    setOrderReference,
    setInvoiceReference,
    setPrinterReference,
    startRuntime,
    stopRuntime,
    restartRuntime,
    validateRuntimeAction,
    clearValidation,
    processRuntimeAction,
    resetRuntimeProcess
  ), [resetRuntime, startRuntime, stopRuntime, restartRuntime, validateRuntimeAction, clearValidation, processRuntimeAction, resetRuntimeProcess]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
};
