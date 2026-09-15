import { EXECUTION_STATUS } from '../constants/execution.constants';
import type { PersistenceSavePipelineResult } from '../../persistence';

export type ExecutionStatus = typeof EXECUTION_STATUS[keyof typeof EXECUTION_STATUS];

export interface ExecutionProcessResult {
  success: boolean;
  currentStage: string | null;
  completedStages: string[];
  error: string | null;
}

export interface ExecutionRuntimeResult {
  success: boolean;
  runtimeId: string | null;
  runtimeStatus: string | null;
  startedAt: string | null;
  error: string | null;
}

export interface ExecutionCheckoutResult {
  success: boolean;
  checkoutId: string | null;
  checkoutStatus: string | null;
  snapshotId: string | null;
  processedAt: string | null;
  error: string | null;
}

export interface ExecutionOrderResult {
  success: boolean;
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  createdAt: string | null;
  error: string | null;
}

export interface ExecutionInvoiceResult {
  success: boolean;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  createdAt: string | null;
  error: string | null;
}

export interface ExecutionPrinterResult {
  success: boolean;
  printerId: string | null;
  printerStatus: string | null;
  configurationId: string | null;
  processedAt: string | null;
  error: string | null;
}

export interface SaleExecutionResult {
  success: boolean;
  runtime: ExecutionRuntimeResult | null;
  checkout: ExecutionCheckoutResult | null;
  order: ExecutionOrderResult | null;
  invoice: ExecutionInvoiceResult | null;
  printer: ExecutionPrinterResult | null;
  completedAt: string | null;
  error: string | null;
}

export interface ExecutionPersistenceResult {
  success: boolean;
  persistence: PersistenceSavePipelineResult | null;
  completedAt: string | null;
  error: string | null;
}

export interface ExecutionState {
  executionId: string | null;
  executionStatus: ExecutionStatus;
  runtimeReference: any | null;
  cartReference: any | null;
  customerReference: any | null;
  checkoutReference: any | null;
  orderReference: any | null;
  invoiceReference: any | null;
  printerReference: any | null;
  currentPhase: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  loading: boolean;
  error: string;
  processResult: ExecutionProcessResult | null;
}

export interface ExecutionActions {
  setExecutionId: (executionId: string | null) => void;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setRuntimeReference: (reference: any | null) => void;
  setCartReference: (reference: any | null) => void;
  setCustomerReference: (reference: any | null) => void;
  setCheckoutReference: (reference: any | null) => void;
  setOrderReference: (reference: any | null) => void;
  setInvoiceReference: (reference: any | null) => void;
  setPrinterReference: (reference: any | null) => void;
  setCurrentPhase: (phase: string | null) => void;
  setStartedAt: (startedAt: string | null) => void;
  setFinishedAt: (finishedAt: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetExecution: () => void;
  processExecution: () => Promise<void>;
  resetExecutionProcess: () => void;
  startExecution: () => Promise<void>;
  processCheckout: () => Promise<void>;
  processOrder: () => Promise<void>;
  processInvoice: () => Promise<void>;
  processPrinter: () => Promise<void>;
  executeSale: () => Promise<void>;
  persistExecution: () => Promise<void>;
}
