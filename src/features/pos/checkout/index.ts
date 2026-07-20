/**
 * Checkout Module Barrel Exports
 * Phase 6 - Step 1
 */

export { CheckoutProvider, useCheckoutContext } from './context/CheckoutContext';
export { useCheckout } from './hooks/useCheckout';
export { CHECKOUT_STATUS } from './constants/checkout.constants';
export type { CheckoutStatus, CheckoutSummary, CheckoutResult, CheckoutState, CheckoutActions } from './types/checkout.types';
export { initialCheckoutState } from './store/checkout.state';
export { checkoutActions } from './store/checkout.actions';
export { checkoutSelectors } from './store/checkout.selectors';
export { CheckoutService } from './services/checkout.service';
export { validateCheckout, formatCheckoutSummary } from './utils/checkout.utils';
