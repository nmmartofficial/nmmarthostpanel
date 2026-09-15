import type { RuntimeState } from '../types/runtime.types';
import { RUNTIME_STATUS } from '../constants/runtime.constants';

export const initialRuntimeState: RuntimeState = {
  runtimeId: null,
  runtimeStatus: RUNTIME_STATUS.IDLE,
  currentModule: null,
  isRunning: false,
  startedAt: null,
  finishedAt: null,
  loading: false,
  error: '',
  cartReference: null,
  customerReference: null,
  checkoutReference: null,
  orderReference: null,
  invoiceReference: null,
  printerReference: null,
  validationErrors: [],
  processResult: null
};
