import { useRuntimeContext } from '../context/RuntimeContext';
import {
  selectRuntimeId,
  selectRuntimeStatus,
  selectCurrentModule,
  selectIsRunning,
  selectStartedAt,
  selectFinishedAt,
  selectRuntimeLoading,
  selectRuntimeError,
  selectCartReference,
  selectCustomerReference,
  selectCheckoutReference,
  selectOrderReference,
  selectInvoiceReference,
  selectPrinterReference
} from '../store/runtime.selectors';

export const useRuntime = () => {
  const { state, actions } = useRuntimeContext();

  const derived = {
    runtimeId: selectRuntimeId(state),
    runtimeStatus: selectRuntimeStatus(state),
    currentModule: selectCurrentModule(state),
    isRunning: selectIsRunning(state),
    startedAt: selectStartedAt(state),
    finishedAt: selectFinishedAt(state),
    runtimeLoading: selectRuntimeLoading(state),
    runtimeError: selectRuntimeError(state),
    cartReference: selectCartReference(state),
    customerReference: selectCustomerReference(state),
    checkoutReference: selectCheckoutReference(state),
    orderReference: selectOrderReference(state),
    invoiceReference: selectInvoiceReference(state),
    printerReference: selectPrinterReference(state)
  };

  return {
    state,
    actions,
    derived
  };
};
