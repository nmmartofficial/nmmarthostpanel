import type { ExecutionState } from '../types/execution.types';

export const selectExecutionId = (state: ExecutionState) => state.executionId;
export const selectExecutionStatus = (state: ExecutionState) => state.executionStatus;
export const selectRuntimeReference = (state: ExecutionState) => state.runtimeReference;
export const selectCartReference = (state: ExecutionState) => state.cartReference;
export const selectCustomerReference = (state: ExecutionState) => state.customerReference;
export const selectCheckoutReference = (state: ExecutionState) => state.checkoutReference;
export const selectOrderReference = (state: ExecutionState) => state.orderReference;
export const selectInvoiceReference = (state: ExecutionState) => state.invoiceReference;
export const selectPrinterReference = (state: ExecutionState) => state.printerReference;
export const selectCurrentPhase = (state: ExecutionState) => state.currentPhase;
export const selectStartedAt = (state: ExecutionState) => state.startedAt;
export const selectFinishedAt = (state: ExecutionState) => state.finishedAt;
export const selectExecutionLoading = (state: ExecutionState) => state.loading;
export const selectExecutionError = (state: ExecutionState) => state.error;
export const selectExecutionProcessResult = (state: ExecutionState) => state.processResult;
