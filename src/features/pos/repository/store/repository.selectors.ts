/**
 * Repository Module Selectors
 * Phase 16 - Step 3
 */

import type { RepositoryState } from '../types/repository.types';

export const repositorySelectors = {
  getRepositoryState: (state: RepositoryState) => state,
  getRepositoryId: (state: RepositoryState) => state.repositoryId,
  getRepositoryStatus: (state: RepositoryState) => state.repositoryStatus,
  getCurrentEntity: (state: RepositoryState) => state.currentEntity,
  getIsConnected: (state: RepositoryState) => state.isConnected,
  getLoading: (state: RepositoryState) => state.loading,
  getError: (state: RepositoryState) => state.error,
  getRuntimeReference: (state: RepositoryState) => state.runtimeReference,
  getExecutionReference: (state: RepositoryState) => state.executionReference,
  getPersistenceReference: (state: RepositoryState) => state.persistenceReference,
  getCheckoutReference: (state: RepositoryState) => state.checkoutReference,
  getOrderReference: (state: RepositoryState) => state.orderReference,
  getInvoiceReference: (state: RepositoryState) => state.invoiceReference,
  getPrinterReference: (state: RepositoryState) => state.printerReference,
};
