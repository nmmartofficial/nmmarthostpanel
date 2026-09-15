/**
 * Repository Module Initial State
 * Phase 16 - Step 3
 */

import { RepositoryState } from '../types/repository.types';
import { REPOSITORY_STATUS } from '../constants/repository.constants';

export const initialRepositoryState: RepositoryState = {
  repositoryId: null,
  repositoryStatus: REPOSITORY_STATUS.IDLE,
  currentEntity: null,
  isConnected: false,
  loading: false,
  error: '',
  runtimeReference: null,
  executionReference: null,
  persistenceReference: null,
  checkoutReference: null,
  orderReference: null,
  invoiceReference: null,
  printerReference: null,
};
