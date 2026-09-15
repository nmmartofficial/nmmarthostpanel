import { PERSISTENCE_STATUS } from '../constants/persistence.constants';
import type { CheckoutRepositoryResult } from '../../checkout/types/checkout.types';
import type { OrderRepositoryResult } from '../../order/types/order.types';
import type { InvoiceRepositoryResult } from '../../invoice/types/invoice.types';
import type { PrinterRepositoryResult } from '../../printer/types/printer.types';

export type PersistenceStatus = typeof PERSISTENCE_STATUS[keyof typeof PERSISTENCE_STATUS];

export interface PersistenceProcessResult {
  success: boolean;
  executionReference: any | null;
  runtimeReference: any | null;
  checkoutReference: any | null;
  orderReference: any | null;
  invoiceReference: any | null;
  printerReference: any | null;
  processedAt: string | null;
  error: string | null;
}

export interface PersistenceExecutionResult {
  success: boolean;
  executionId: string | null;
  executionStatus: string | null;
  processedAt: string | null;
  error: string | null;
}

export interface PersistencePipelineResult {
  success: boolean;
  execution: PersistenceExecutionResult | null;
  persistence: PersistenceProcessResult | null;
  completedAt: string | null;
  error: string | null;
}

export interface PersistenceSavePipelineResult {
  success: boolean;
  checkout: CheckoutRepositoryResult | null;
  order: OrderRepositoryResult | null;
  invoice: InvoiceRepositoryResult | null;
  printer: PrinterRepositoryResult | null;
  completedAt: string | null;
  error: string | null;
}

export interface PersistenceState {
  persistenceId: string | null;
  persistenceStatus: PersistenceStatus;
  currentEntity: string | null;
  isPersisting: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  loading: boolean;
  error: string;
  executionReference: any | null;
  runtimeReference: any | null;
  checkoutReference: any | null;
  orderReference: any | null;
  invoiceReference: any | null;
  printerReference: any | null;
}

export interface PersistenceRepositoryResult {
  success: boolean;
  repositoryAdapterResult: any | null;
  processedAt: string | null;
  error: string | null;
}

export interface PersistenceActions {
  setPersistenceId: (persistenceId: string | null) => void;
  setPersistenceStatus: (status: PersistenceStatus) => void;
  setCurrentEntity: (entity: string | null) => void;
  setPersisting: (isPersisting: boolean) => void;
  setStartedAt: (startedAt: string | null) => void;
  setFinishedAt: (finishedAt: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetPersistence: () => void;
  setExecutionReference: (reference: any | null) => void;
  setRuntimeReference: (reference: any | null) => void;
  setCheckoutReference: (reference: any | null) => void;
  setOrderReference: (reference: any | null) => void;
  setInvoiceReference: (reference: any | null) => void;
  setPrinterReference: (reference: any | null) => void;
  processPersistence: () => Promise<void>;
  processExecution: () => Promise<void>;
  executePersistence: () => Promise<void>;
  processRepository: () => Promise<void>;
  saveAll: () => Promise<void>;
}
