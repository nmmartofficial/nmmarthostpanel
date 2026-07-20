/**
 * Checkout Module Hook
 * Phase 6 - Step 2
 */

import { useCheckoutContext } from '../context/CheckoutContext';

export const useCheckout = () => {
  const { checkoutState, actions } = useCheckoutContext();
  return {
    checkoutState,
    ...actions,
  };
};
