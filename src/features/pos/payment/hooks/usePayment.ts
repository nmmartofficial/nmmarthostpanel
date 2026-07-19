/**
 * Payment Module Hook
 * Phase 4 - Step 1.1
 */

import { usePayment as usePaymentContext } from '../context/PaymentContext';

export const usePayment = () => {
  return usePaymentContext();
};
