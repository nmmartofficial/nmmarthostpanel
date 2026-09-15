import type { PersistenceState } from '../types/persistence.types';
import { PERSISTENCE_STATUS } from '../constants/persistence.constants';

export const initialPersistenceState: PersistenceState = {
  persistenceId: null,
  persistenceStatus: PERSISTENCE_STATUS.IDLE,
  currentEntity: null,
  isPersisting: false,
  startedAt: null,
  finishedAt: null,
  loading: false,
  error: '',
  executionReference: null,
  runtimeReference: null,
  checkoutReference: null,
  orderReference: null,
  invoiceReference: null,
  printerReference: null
};
