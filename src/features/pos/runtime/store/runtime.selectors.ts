import type { RuntimeState } from '../types/runtime.types';

export const selectRuntimeId = (state: RuntimeState) => state.runtimeId;
export const selectRuntimeStatus = (state: RuntimeState) => state.runtimeStatus;
export const selectCurrentModule = (state: RuntimeState) => state.currentModule;
export const selectIsRunning = (state: RuntimeState) => state.isRunning;
export const selectStartedAt = (state: RuntimeState) => state.startedAt;
export const selectFinishedAt = (state: RuntimeState) => state.finishedAt;
export const selectRuntimeLoading = (state: RuntimeState) => state.loading;
export const selectRuntimeError = (state: RuntimeState) => state.error;
export const selectCartReference = (state: RuntimeState) => state.cartReference;
export const selectCustomerReference = (state: RuntimeState) => state.customerReference;
export const selectCheckoutReference = (state: RuntimeState) => state.checkoutReference;
export const selectOrderReference = (state: RuntimeState) => state.orderReference;
export const selectInvoiceReference = (state: RuntimeState) => state.invoiceReference;
export const selectPrinterReference = (state: RuntimeState) => state.printerReference;
