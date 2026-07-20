/**
 * Checkout Module Initial State
 * Phase 6 - Step 2
 */

import { CheckoutState } from '../types/checkout.types';
import { CHECKOUT_STATUS } from '../constants/checkout.constants';

export const initialCheckoutState: CheckoutState = {
  status: CHECKOUT_STATUS.IDLE,
  loading: false,
  error: '',
  cartId: null,
  customerId: null,
  paymentId: null,
  orderId: null,
  checkoutStarted: null,
  checkoutCompleted: null,
  checkoutCancelled: null,
  createdAt: null,
  completedAt: null,
  currentSnapshot: null,
};
