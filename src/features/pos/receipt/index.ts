/**
 * Receipt Module
 * Phase 9 - Step 1
 * Barrel Export
 */

// Constants
export { RECEIPT_STATUS } from './constants/receipt.constants';

// Types
export type {
  ReceiptStatus,
  ReceiptSummary,
  ReceiptResult,
  ReceiptSnapshot,
  ReceiptItem,
  Receipt,
  ReceiptCreationInput,
  ReceiptCreationResult,
  ReceiptState,
  ReceiptValidationError,
  ReceiptValidationResult,
  ReceiptNumberResult,
  ReceiptStatusResult,
  ReceiptRepositoryResult,
  ReceiptProcessResult,
  ReceiptActions
} from './types/receipt.types';

// State
export { initialReceiptState } from './store/receipt.state';

// Actions
export { createReceiptActions } from './store/receipt.actions';

// Selectors
export {
  selectReceiptId,
  selectReceiptNumber,
  selectOrderId,
  selectCustomerId,
  selectPaymentId,
  selectReceiptStatus,
  selectLoading,
  selectError,
  selectValidationErrors
} from './store/receipt.selectors';

// Service
export { ReceiptService } from './services/receipt.service';

// Context
export { ReceiptProvider, useReceipt as useReceiptContext } from './context/ReceiptContext';

// Hook
export { useReceipt } from './hooks/useReceipt';
