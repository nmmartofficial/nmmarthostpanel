/**
 * Checkout Module Types
 * Phase 6 - Step 2
 */

import { CHECKOUT_STATUS } from '../constants/checkout.constants';

export type CheckoutStatus = typeof CHECKOUT_STATUS[keyof typeof CHECKOUT_STATUS];

export interface CheckoutSummary {
  // Placeholder
}

export interface CheckoutResult {
  // Placeholder
}

export interface CheckoutState {
  status: CheckoutStatus;
  loading: boolean;
  error: string;
  cartId: string | number | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  orderId: string | number | null;
  checkoutStarted: Date | null;
  checkoutCompleted: Date | null;
  checkoutCancelled: Date | null;
  createdAt: Date | null;
  completedAt: Date | null;
}

export interface CheckoutActions {
  setStatus: (status: CheckoutStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setCartId: (cartId: string | number | null) => void;
  setCustomerId: (customerId: string | number | null) => void;
  setPaymentId: (paymentId: string | number | null) => void;
  setOrderId: (orderId: string | number | null) => void;
  startCheckout: () => void;
  completeCheckout: () => void;
  cancelCheckout: () => void;
  resetCheckout: () => void;
}
