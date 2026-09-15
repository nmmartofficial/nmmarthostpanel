/**
 * Customer Module Hook
 * Phase 5 - Step 1
 */

import { useCustomerContext } from '../context/CustomerContext';

export const useCustomer = () => {
  const context = useCustomerContext();
  return context;
};
