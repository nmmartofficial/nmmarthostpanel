/**
 * Customer Module Initial State
 * Phase 5 - Step 1
 */

import { CustomerState } from '../types/customer.types';
import { CUSTOMER_STATUS, CUSTOMER_TYPES, MOCK_CUSTOMERS } from '../constants/customer.constants';

export const initialCustomerState: CustomerState = {
  selectedCustomer: null,
  customers: MOCK_CUSTOMERS,
  loading: false,
  error: '',
  searchQuery: '',
  walletBalance: 0,
  creditBalance: 0,
  loyaltyPoints: 0
};
