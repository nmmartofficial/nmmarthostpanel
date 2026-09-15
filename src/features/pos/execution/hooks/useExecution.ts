import { useExecutionContext } from '../context/ExecutionContext';
import {
  selectExecutionId,
  selectExecutionStatus,
  selectRuntimeReference,
  selectCartReference,
  selectCustomerReference,
  selectCheckoutReference,
  selectOrderReference,
  selectInvoiceReference,
  selectPrinterReference,
  selectCurrentPhase,
  selectStartedAt,
  selectFinishedAt,
  selectExecutionLoading,
  selectExecutionError,
  selectExecutionProcessResult
} from '../store/execution.selectors';

export const useExecution = () => {
  const { state, actions } = useExecutionContext();

  const derived = {
    executionId: selectExecutionId(state),
    executionStatus: selectExecutionStatus(state),
    runtimeReference: selectRuntimeReference(state),
    cartReference: selectCartReference(state),
    customerReference: selectCustomerReference(state),
    checkoutReference: selectCheckoutReference(state),
    orderReference: selectOrderReference(state),
    invoiceReference: selectInvoiceReference(state),
    printerReference: selectPrinterReference(state),
    currentPhase: selectCurrentPhase(state),
    startedAt: selectStartedAt(state),
    finishedAt: selectFinishedAt(state),
    executionLoading: selectExecutionLoading(state),
    executionError: selectExecutionError(state),
    executionProcessResult: selectExecutionProcessResult(state)
  };

  return {
    state,
    actions,
    derived
  };
};
