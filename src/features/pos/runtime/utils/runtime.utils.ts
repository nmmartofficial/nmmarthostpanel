import { RUNTIME_STATUS } from '../constants/runtime.constants';
import type { RuntimeLifecycleResult, RuntimeState, RuntimeValidationError, RuntimeValidationResult } from '../types/runtime.types';

// Pure utility function to create runtime start result
export const createRuntimeStart = (): RuntimeLifecycleResult => {
  return Object.freeze({
    success: true,
    runtimeStatus: RUNTIME_STATUS.PROCESSING,
    currentModule: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: ''
  });
};

// Pure utility function to create runtime stop result
export const createRuntimeStop = (): RuntimeLifecycleResult => {
  return Object.freeze({
    success: true,
    runtimeStatus: RUNTIME_STATUS.COMPLETED,
    currentModule: null,
    startedAt: null,
    finishedAt: new Date().toISOString(),
    error: ''
  });
};

// Pure utility function to create runtime restart result
export const createRuntimeRestart = (): RuntimeLifecycleResult => {
  return Object.freeze({
    success: true,
    runtimeStatus: RUNTIME_STATUS.IDLE,
    currentModule: null,
    startedAt: null,
    finishedAt: null,
    error: ''
  });
};

// Pure utility function to freeze lifecycle result
export const freezeRuntimeLifecycle = (result: RuntimeLifecycleResult): RuntimeLifecycleResult => {
  return Object.freeze({ ...result });
};

// Pure utility function to clone lifecycle result
export const cloneRuntimeLifecycle = (result: RuntimeLifecycleResult): RuntimeLifecycleResult => {
  return Object.freeze({ ...result });
};

// Pure validation functions
export const validateRuntimeId = (runtimeId: string | null): RuntimeValidationError[] => {
  const errors: RuntimeValidationError[] = [];
  if (runtimeId !== null && (typeof runtimeId !== 'string' || runtimeId.trim() === '')) {
    errors.push({
      field: 'runtimeId',
      message: 'Runtime ID must be a non-empty string or null',
      code: 'INVALID_RUNTIME_ID'
    });
  }
  return errors;
};

export const validateRuntimeStatus = (runtimeStatus: string): RuntimeValidationError[] => {
  const errors: RuntimeValidationError[] = [];
  const validStatuses = Object.values(RUNTIME_STATUS);
  if (!validStatuses.includes(runtimeStatus as any)) {
    errors.push({
      field: 'runtimeStatus',
      message: `Runtime status must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_RUNTIME_STATUS'
    });
  }
  return errors;
};

export const validateCurrentModule = (currentModule: string | null): RuntimeValidationError[] => {
  const errors: RuntimeValidationError[] = [];
  if (currentModule !== null && (typeof currentModule !== 'string' || currentModule.trim() === '')) {
    errors.push({
      field: 'currentModule',
      message: 'Current module must be a non-empty string or null',
      code: 'INVALID_CURRENT_MODULE'
    });
  }
  return errors;
};

export const validateReferences = (state: RuntimeState): RuntimeValidationError[] => {
  const errors: RuntimeValidationError[] = [];
  const referenceFields = [
    'cartReference',
    'customerReference',
    'checkoutReference',
    'orderReference',
    'invoiceReference',
    'printerReference'
  ];
  
  referenceFields.forEach(field => {
    const value = state[field as keyof RuntimeState];
    if (value !== null && typeof value !== 'object') {
      errors.push({
        field,
        message: `${field} must be an object or null`,
        code: 'INVALID_REFERENCE'
      });
    }
  });
  
  return errors;
};

export const validateRuntime = (state: RuntimeState): RuntimeValidationResult => {
  const errors: RuntimeValidationError[] = [
    ...validateRuntimeId(state.runtimeId),
    ...validateRuntimeStatus(state.runtimeStatus),
    ...validateCurrentModule(state.currentModule),
    ...validateReferences(state)
  ];
  
  return Object.freeze({
    valid: errors.length === 0,
    errors
  });
};

// Keep existing functions (not used yet but preserved)
export const buildRuntimePayload = () => {
  throw new Error('buildRuntimePayload - Not Implemented');
};

export const formatRuntimeResult = () => {
  throw new Error('formatRuntimeResult - Not Implemented');
};

export const validateRuntimeInput = () => {
  throw new Error('validateRuntimeInput - Not Implemented');
};
