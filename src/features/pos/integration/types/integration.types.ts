import { INTEGRATION_STATUS } from '../constants/integration.constants';

export type IntegrationStatus = typeof INTEGRATION_STATUS[keyof typeof INTEGRATION_STATUS];

export const WORKFLOW_STEP = {
  CART: 'CART',
  CUSTOMER: 'CUSTOMER',
  CHECKOUT: 'CHECKOUT',
  ORDER: 'ORDER',
  INVOICE: 'INVOICE',
  PRINTER: 'PRINTER'
} as const;

export type WorkflowStep = typeof WORKFLOW_STEP[keyof typeof WORKFLOW_STEP];

export const WORKFLOW_STATUS = {
  IDLE: 'IDLE',
  READY: 'READY',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

export type WorkflowStatus = typeof WORKFLOW_STATUS[keyof typeof WORKFLOW_STATUS];

export interface WorkflowResult {
  success: boolean;
  currentStep?: WorkflowStep;
  completedSteps?: WorkflowStep[];
  error?: string;
}

export interface IntegrationState {
  cartReference: any;
  customerReference: any;
  checkoutReference: any;
  orderReference: any;
  invoiceReference: any;
  printerReference: any;
  integrationStatus: IntegrationStatus;
  loading: boolean;
  error: string;
  workflowStatus: WorkflowStatus;
  currentWorkflowStep?: WorkflowStep;
  workflowResult?: WorkflowResult;
}

export interface IntegrationActions {
  setCartReference: (ref: any) => void;
  setCustomerReference: (ref: any) => void;
  setCheckoutReference: (ref: any) => void;
  setOrderReference: (ref: any) => void;
  setInvoiceReference: (ref: any) => void;
  setPrinterReference: (ref: any) => void;
  setIntegrationStatus: (status: IntegrationStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetIntegration: () => void;
  processWorkflow: () => void;
  resetWorkflow: () => void;
}
