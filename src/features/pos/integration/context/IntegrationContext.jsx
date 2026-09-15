import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { initialIntegrationState } from '../store/integration.state';
import { IntegrationService } from '../services/integration.service';
import { WORKFLOW_STATUS, WORKFLOW_STEP } from '../types/integration.types';

const IntegrationContext = createContext(null);

export const useIntegrationContext = () => {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrationContext must be used within an IntegrationProvider');
  }
  return context;
};

export const IntegrationProvider = ({ children }) => {
  const [cartReference, setCartReference] = useState(initialIntegrationState.cartReference);
  const [customerReference, setCustomerReference] = useState(initialIntegrationState.customerReference);
  const [checkoutReference, setCheckoutReference] = useState(initialIntegrationState.checkoutReference);
  const [orderReference, setOrderReference] = useState(initialIntegrationState.orderReference);
  const [invoiceReference, setInvoiceReference] = useState(initialIntegrationState.invoiceReference);
  const [printerReference, setPrinterReference] = useState(initialIntegrationState.printerReference);
  const [integrationStatus, setIntegrationStatus] = useState(initialIntegrationState.integrationStatus);
  const [loading, setLoading] = useState(initialIntegrationState.loading);
  const [error, setError] = useState(initialIntegrationState.error);
  const [workflowStatus, setWorkflowStatus] = useState(initialIntegrationState.workflowStatus);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(initialIntegrationState.currentWorkflowStep);
  const [workflowResult, setWorkflowResult] = useState(initialIntegrationState.workflowResult);

  const processWorkflow = useCallback(async () => {
    setWorkflowStatus(WORKFLOW_STATUS.PROCESSING);
    setCurrentWorkflowStep(WORKFLOW_STEP.CART);
    
    const result = await IntegrationService.processWorkflow({
      cartReference,
      customerReference,
      checkoutReference,
      orderReference,
      invoiceReference,
      printerReference
    });
    
    setWorkflowResult(result);
    setWorkflowStatus(result.success ? WORKFLOW_STATUS.COMPLETED : WORKFLOW_STATUS.FAILED);
  }, [cartReference, customerReference, checkoutReference, orderReference, invoiceReference, printerReference]);

  const resetWorkflow = useCallback(() => {
    setWorkflowStatus(initialIntegrationState.workflowStatus);
    setCurrentWorkflowStep(initialIntegrationState.currentWorkflowStep);
    setWorkflowResult(initialIntegrationState.workflowResult);
  }, []);

  const resetIntegration = useCallback(() => {
    setCartReference(initialIntegrationState.cartReference);
    setCustomerReference(initialIntegrationState.customerReference);
    setCheckoutReference(initialIntegrationState.checkoutReference);
    setOrderReference(initialIntegrationState.orderReference);
    setInvoiceReference(initialIntegrationState.invoiceReference);
    setPrinterReference(initialIntegrationState.printerReference);
    setIntegrationStatus(initialIntegrationState.integrationStatus);
    setLoading(initialIntegrationState.loading);
    setError(initialIntegrationState.error);
    resetWorkflow();
  }, [resetWorkflow]);

  const state = useMemo(() => ({
    cartReference,
    customerReference,
    checkoutReference,
    orderReference,
    invoiceReference,
    printerReference,
    integrationStatus,
    loading,
    error,
    workflowStatus,
    currentWorkflowStep,
    workflowResult
  }), [cartReference, customerReference, checkoutReference, orderReference, invoiceReference, printerReference, integrationStatus, loading, error, workflowStatus, currentWorkflowStep, workflowResult]);

  const actions = useMemo(() => ({
    setCartReference,
    setCustomerReference,
    setCheckoutReference,
    setOrderReference,
    setInvoiceReference,
    setPrinterReference,
    setIntegrationStatus,
    setLoading,
    setError,
    resetIntegration,
    processWorkflow,
    resetWorkflow
  }), [resetIntegration, processWorkflow, resetWorkflow]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
};
