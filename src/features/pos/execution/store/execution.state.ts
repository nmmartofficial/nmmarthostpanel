import type { ExecutionState } from '../types/execution.types';
import { EXECUTION_STATUS } from '../constants/execution.constants';

export const initialExecutionState: ExecutionState = {
  executionId: null,
  executionStatus: EXECUTION_STATUS.IDLE,
  runtimeReference: null,
  cartReference: null,
  customerReference: null,
  checkoutReference: null,
  orderReference: null,
  invoiceReference: null,
  printerReference: null,
  currentPhase: null,
  startedAt: null,
  finishedAt: null,
  loading: false,
  error: '',
  processResult: null
};
