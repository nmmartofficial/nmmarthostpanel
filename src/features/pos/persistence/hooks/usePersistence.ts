import { usePersistenceContext } from '../context/PersistenceContext';
import {
  selectPersistenceId,
  selectPersistenceStatus,
  selectCurrentEntity,
  selectPersistenceIsPersisting,
  selectPersistenceStartedAt,
  selectPersistenceFinishedAt,
  selectPersistenceLoading,
  selectPersistenceError,
  selectExecutionReference,
  selectRuntimeReference,
  selectCheckoutReference,
  selectOrderReference,
  selectInvoiceReference,
  selectPrinterReference
} from '../store/persistence.selectors';

export const usePersistence = () => {
  const { state, actions } = usePersistenceContext();

  const derived = {
    persistenceId: selectPersistenceId(state),
    persistenceStatus: selectPersistenceStatus(state),
    currentEntity: selectCurrentEntity(state),
    persistenceIsPersisting: selectPersistenceIsPersisting(state),
    persistenceStartedAt: selectPersistenceStartedAt(state),
    persistenceFinishedAt: selectPersistenceFinishedAt(state),
    persistenceLoading: selectPersistenceLoading(state),
    persistenceError: selectPersistenceError(state),
    executionReference: selectExecutionReference(state),
    runtimeReference: selectRuntimeReference(state),
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
