/**
 * Payment Module Barrel Exports
 * Phase 4 - Step 2
 */

// Context
export { PaymentProvider, usePayment, PAYMENT_INTERFACES } from './context/PaymentContext';

// Hook
export { usePayment as usePaymentHook } from './hooks/usePayment';

// Constants
export { PAYMENT_METHODS, PAYMENT_STATUS } from './constants/payment.constants';

// Types
export type {
  PaymentInterface,
  PaymentAmounts,
  PaymentHistory,
  CreditDetails,
  PaymentState,
  PaymentActions
} from './types/payment.types';

// State
export {
  initialPaymentAmounts,
  initialPaymentStatus,
  initialPaymentError,
  initialIsSplitPayment,
  initialActivePaymentMethod,
  initialPaymentHistory,
  initialCreditDetails,
  initialPaymentState
} from './store/payment.state';

// Service
export { PaymentService } from './services/payment.service';

// Utils
export { formatCurrency, calculateTotal } from './utils/payment.utils';
