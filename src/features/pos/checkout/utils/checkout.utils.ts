/**
 * Checkout Module Utilities
 * Phase 6 - Step 3
 */

import type { CheckoutSnapshot, CheckoutStatus } from '../types/checkout.types';
import { CHECKOUT_STATUS } from '../constants/checkout.constants';

export const generateSnapshotId = (): string => {
  return `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createCheckoutSnapshot = (data?: Partial<CheckoutSnapshot>): CheckoutSnapshot => {
  const snapshot: CheckoutSnapshot = {
    snapshotId: generateSnapshotId(),
    cartId: data?.cartId ?? null,
    customerId: data?.customerId ?? null,
    paymentId: data?.paymentId ?? null,
    subtotal: data?.subtotal ?? 0,
    discount: data?.discount ?? 0,
    gst: data?.gst ?? 0,
    grandTotal: data?.grandTotal ?? 0,
    payableAmount: data?.payableAmount ?? 0,
    createdAt: new Date(),
    status: data?.status ?? CHECKOUT_STATUS.IDLE,
  };
  return Object.freeze({ ...snapshot });
};

export const cloneCheckoutSnapshot = (snapshot: CheckoutSnapshot): CheckoutSnapshot => {
  return Object.freeze({ ...snapshot });
};

export const freezeCheckoutSnapshot = (snapshot: CheckoutSnapshot): CheckoutSnapshot => {
  return Object.freeze({ ...snapshot });
};
