/**
 * Customer Module Initial State
 * Phase 5 - Step 1
 */

import { CustomerState } from '../types/customer.types';
import { CUSTOMER_STATUS, CUSTOMER_TYPES } from '../constants/customer.constants';

export const initialCustomerState: CustomerState = {
  selectedCustomer: null,
  customers: [],
  loading: false,
  error: ''
};
