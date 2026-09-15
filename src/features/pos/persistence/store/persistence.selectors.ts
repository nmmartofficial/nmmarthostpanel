import type { PersistenceState } from '../types/persistence.types';

export const selectPersistenceId = (state: PersistenceState) => state.persistenceId;
export const selectPersistenceStatus = (state: PersistenceState) => state.persistenceStatus;
export const selectCurrentEntity = (state: PersistenceState) => state.currentEntity;
export const selectPersistenceIsPersisting = (state: PersistenceState) => state.isPersisting;
export const selectPersistenceStartedAt = (state: PersistenceState) => state.startedAt;
export const selectPersistenceFinishedAt = (state: PersistenceState) => state.finishedAt;
export const selectPersistenceLoading = (state: PersistenceState) => state.loading;
export const selectPersistenceError = (state: PersistenceState) => state.error;
export const selectExecutionReference = (state: PersistenceState) => state.executionReference;
export const selectRuntimeReference = (state: PersistenceState) => state.runtimeReference;
export const selectCheckoutReference = (state: PersistenceState) => state.checkoutReference;
export const selectOrderReference = (state: PersistenceState) => state.orderReference;
export const selectInvoiceReference = (state: PersistenceState) => state.invoiceReference;
export const selectPrinterReference = (state: PersistenceState) => state.printerReference;
