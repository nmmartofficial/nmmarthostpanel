/**
 * Customer Module Barrel Exports
 * Phase 5 - Step 1
 */

// Context & Provider
export { CustomerProvider, useCustomerContext } from './context/CustomerContext';

// Hook
export { useCustomer } from './hooks/useCustomer';

// Constants
export { CUSTOMER_STATUS, CUSTOMER_TYPES, LOYALTY_TYPES } from './constants/customer.constants';

// Types
export type {
  CustomerAddress,
  CustomerWallet,
  CustomerCredit,
  CustomerLoyalty,
  Customer,
  CustomerState,
  CustomerActions
} from './types/customer.types';

// State
export { initialCustomerState } from './store/customer.state';

// Actions
export { customerActions } from './store/customer.actions';

// Selectors
export { customerSelectors } from './store/customer.selectors';

// Service
export { CustomerService } from './services/customer.service';

// Utils
export {
  normalizeCustomerSearch,
  normalizeMobile,
  safeCustomerCompare,
  validateCustomerCode,
  validateCustomerMobile,
  validateCustomerEmail,
  validateCustomer,
  normalizeCustomerCode,
  normalizeCustomerName,
} from './utils/customer.utils';
