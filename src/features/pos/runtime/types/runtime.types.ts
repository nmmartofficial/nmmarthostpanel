import { RUNTIME_STATUS } from '../constants/runtime.constants';

export type RuntimeStatus = typeof RUNTIME_STATUS[keyof typeof RUNTIME_STATUS];

export interface RuntimeValidationError {
  field: string;
  message: string;
  code: string;
}

export interface RuntimeValidationResult {
  valid: boolean;
  errors: RuntimeValidationError[];
}

export interface RuntimeLifecycleResult {
  success: boolean;
  runtimeStatus: RuntimeStatus;
  currentModule: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string;
}

export interface RuntimeProcessResult {
  success: boolean;
  runtimeStatus: RuntimeStatus;
  currentModule: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string;
}

export interface RuntimeState {
  runtimeId: string | null;
  runtimeStatus: RuntimeStatus;
  currentModule: string | null;
  isRunning: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  loading: boolean;
  error: string;
  cartReference: any | null;
  customerReference: any | null;
  checkoutReference: any | null;
  orderReference: any | null;
  invoiceReference: any | null;
  printerReference: any | null;
  validationErrors: RuntimeValidationError[];
  processResult: RuntimeProcessResult | null;
}

export interface RuntimeActions {
  setRuntimeId: (runtimeId: string | null) => void;
  setRuntimeStatus: (status: RuntimeStatus) => void;
  setCurrentModule: (module: string | null) => void;
  setRunning: (isRunning: boolean) => void;
  setStartedAt: (startedAt: string | null) => void;
  setFinishedAt: (finishedAt: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetRuntime: () => void;
  setCartReference: (reference: any | null) => void;
  setCustomerReference: (reference: any | null) => void;
  setCheckoutReference: (reference: any | null) => void;
  setOrderReference: (reference: any | null) => void;
  setInvoiceReference: (reference: any | null) => void;
  setPrinterReference: (reference: any | null) => void;
  startRuntime: () => void;
  stopRuntime: () => void;
  restartRuntime: () => void;
  validateRuntime: () => void;
  clearValidation: () => void;
  processRuntime: () => void;
  resetRuntimeProcess: () => void;
}
