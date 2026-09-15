/**
 * Customer Module Selectors
 * Phase 5 - Step 1
 */

import type { CustomerState, Customer } from '../types/customer.types';

export const customerSelectors = {
  getCustomerState: (state: CustomerState): CustomerState => {
    throw new Error('Not Implemented');
  },
  getSelectedCustomer: (state: CustomerState): Customer | null => {
    throw new Error('Not Implemented');
  },
  getCustomers: (state: CustomerState): Customer[] => {
    throw new Error('Not Implemented');
  },
  getWalletBalance: (state: CustomerState): number => {
    throw new Error('Not Implemented');
  },
  getCreditBalance: (state: CustomerState): number => {
    throw new Error('Not Implemented');
  },
  getLoyaltyPoints: (state: CustomerState): number => {
    throw new Error('Not Implemented');
  },
  getSearchQuery: (state: CustomerState): string => {
    throw new Error('Not Implemented');
  },
  isLoading: (state: CustomerState): boolean => {
    throw new Error('Not Implemented');
  },
  getError: (state: CustomerState): string => {
    throw new Error('Not Implemented');
  },
};
