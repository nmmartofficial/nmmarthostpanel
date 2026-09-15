/**
 * Repository Module Types
 * Phase 17 - Step 3
 */

import { REPOSITORY_STATUS, REPOSITORY_PROVIDER } from '../constants/repository.constants';
import type { CheckoutSnapshot } from '../../checkout/types/checkout.types';
import type { Order } from '../../order/types/order.types';
import type { Invoice } from '../../invoice/types/invoice.types';
import type { PrinterConfiguration } from '../../printer/types/printer.types';

export type RepositoryStatus = typeof REPOSITORY_STATUS[keyof typeof REPOSITORY_STATUS];

export interface RepositoryState {
  repositoryId: string | null;
  repositoryStatus: RepositoryStatus;
  currentEntity: any | null;
  isConnected: boolean;
  loading: boolean;
  error: string;
  runtimeReference: any | null;
  executionReference: any | null;
  persistenceReference: any | null;
  checkoutReference: any | null;
  orderReference: any | null;
  invoiceReference: any | null;
  printerReference: any | null;
}

export interface RepositoryProcessResult {
  success: boolean;
  repositoryId: string | null;
  repositoryStatus: RepositoryStatus;
  currentEntity: any | null;
  processedAt: Date;
  error: string | null;
}

export interface RepositoryPersistenceResult {
  success: boolean;
  persistenceId: string | null;
  persistenceStatus: any;
  processedAt: Date;
  error: string | null;
}

export interface RepositoryPipelineResult {
  success: boolean;
  repository: RepositoryProcessResult | null;
  persistence: RepositoryPersistenceResult | null;
  completedAt: Date | null;
  error: string | null;
}

export interface RepositoryActions {
  setRepositoryId: (repositoryId: string | null) => void;
  setRepositoryStatus: (status: RepositoryStatus) => void;
  setCurrentEntity: (entity: any | null) => void;
  setConnected: (isConnected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetRepository: () => void;
  setRuntimeReference: (reference: any | null) => void;
  setExecutionReference: (reference: any | null) => void;
  setPersistenceReference: (reference: any | null) => void;
  setCheckoutReference: (reference: any | null) => void;
  setOrderReference: (reference: any | null) => void;
  setInvoiceReference: (reference: any | null) => void;
  setPrinterReference: (reference: any | null) => void;
  processRepository: () => RepositoryProcessResult;
  processPersistence: () => RepositoryPersistenceResult;
  executeRepository: () => RepositoryPipelineResult;
}

// Repository Contracts
export interface RepositoryEntity {
  id: string;
  [key: string]: any;
}

export interface RepositorySaveRequest<T> {
  entity: T;
}

export interface RepositorySaveResult<T> {
  success: boolean;
  entity: T | null;
  error: string | null;
}

export interface RepositoryFindRequest {
  id: string;
}

export interface RepositoryFindResult<T> {
  success: boolean;
  entity: T | null;
  error: string | null;
}

export interface RepositoryDeleteRequest {
  id: string;
}

export interface RepositoryDeleteResult {
  success: boolean;
  error: string | null;
}

export interface RepositoryListRequest {
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface RepositoryListResult<T> {
  success: boolean;
  entities: T[];
  total: number;
  error: string | null;
}

// Typed entities for repositories (extend RepositoryEntity)
export interface CheckoutRepositoryEntity extends RepositoryEntity, Omit<CheckoutSnapshot, 'snapshotId'> {
  id: string; // snapshotId maps to id
}

export interface OrderRepositoryEntity extends RepositoryEntity, Omit<Order, 'orderId'> {
  id: string; // orderId maps to id
}

export interface InvoiceRepositoryEntity extends RepositoryEntity, Omit<Invoice, 'invoiceId'> {
  id: string; // invoiceId maps to id
}

export interface PrinterRepositoryEntity extends RepositoryEntity, Omit<PrinterConfiguration, 'configurationId'> {
  id: string; // configurationId maps to id
}

export interface RuntimeRepositoryEntity extends RepositoryEntity {
  // Placeholder runtime entity
}

export interface ExecutionRepositoryEntity extends RepositoryEntity {
  // Placeholder execution entity
}

export interface PersistenceRepositoryEntity extends RepositoryEntity {
  // Placeholder persistence entity
}

// Repository store type
export type RepositoryStore<T extends RepositoryEntity> = ReturnType<typeof import('../utils/repository.utils').createRepositoryStore<T>>;

// Repository Factory Types (Phase 17 - Step 4)
export type RepositoryEntityName =
  | 'checkout'
  | 'order'
  | 'invoice'
  | 'printer'
  | 'runtime'
  | 'execution'
  | 'persistence';

export interface RepositoryFactoryResult {
  checkout: RepositoryStore<CheckoutRepositoryEntity>;
  order: RepositoryStore<OrderRepositoryEntity>;
  invoice: RepositoryStore<InvoiceRepositoryEntity>;
  printer: RepositoryStore<PrinterRepositoryEntity>;
  runtime: RepositoryStore<RuntimeRepositoryEntity>;
  execution: RepositoryStore<ExecutionRepositoryEntity>;
  persistence: RepositoryStore<PersistenceRepositoryEntity>;
}

export interface RepositoryFactory {
  getRepository: <T extends RepositoryEntity>(entityName: RepositoryEntityName) => RepositoryStore<T>;
}

// Repository Adapter Types (Phase 17 - Step 5)
export const REPOSITORY_ADAPTER_STATUS = {
  READY: 'READY',
  BUSY: 'BUSY',
  ERROR: 'ERROR',
} as const;

export type RepositoryAdapterStatus = typeof REPOSITORY_ADAPTER_STATUS[keyof typeof REPOSITORY_ADAPTER_STATUS];

export interface RepositoryAdapterResult {
  success: boolean;
  status: RepositoryAdapterStatus;
  data: any;
  error: string | null;
  timestamp: Date;
}

export interface RepositoryAdapter {
  save: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    entity: T
  ) => RepositoryAdapterResult;
  find: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    id: string
  ) => RepositoryAdapterResult;
  list: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    filters?: Record<string, any>,
    limit?: number,
    offset?: number
  ) => RepositoryAdapterResult;
  update: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    entity: T
  ) => RepositoryAdapterResult;
  remove: (
    entityName: RepositoryEntityName,
    id: string
  ) => RepositoryAdapterResult;
  exists: (
    entityName: RepositoryEntityName,
    id: string
  ) => boolean;
}

export type RepositoryStorageProvider = typeof REPOSITORY_PROVIDER[keyof typeof REPOSITORY_PROVIDER];

export interface RepositoryStorageResult {
  success: boolean;
  data: any;
  error: string | null;
  timestamp: Date;
}

export interface RepositoryStorageAdapter {
  save: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    entity: T
  ) => RepositoryStorageResult;
  find: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    id: string
  ) => RepositoryStorageResult;
  list: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    filters?: Record<string, any>,
    limit?: number,
    offset?: number
  ) => RepositoryStorageResult;
  update: <T extends RepositoryEntity>(
    entityName: RepositoryEntityName,
    entity: T
  ) => RepositoryStorageResult;
  remove: (
    entityName: RepositoryEntityName,
    id: string
  ) => RepositoryStorageResult;
  exists: (
    entityName: RepositoryEntityName,
    id: string
  ) => boolean;
}
