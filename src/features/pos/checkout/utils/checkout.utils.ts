/**
 * Checkout Module Utilities
 * Phase 6 - Step 3
 */

import type { CheckoutSnapshot, CheckoutStatus, CheckoutValidationError, CheckoutValidationResult, OrderSnapshot } from '../types/checkout.types';
import { CHECKOUT_STATUS } from '../constants/checkout.constants';

export const generateSnapshotId = (): string => {
  return `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateOrderSnapshotId = (): string => {
  return `order-snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createOrderSnapshot = (checkoutSnapshot: CheckoutSnapshot): OrderSnapshot => {
  const orderSnapshot: OrderSnapshot = {
    orderSnapshotId: generateOrderSnapshotId(),
    checkoutSnapshotId: checkoutSnapshot.snapshotId,
    cartId: checkoutSnapshot.cartId,
    customerId: checkoutSnapshot.customerId,
    paymentId: checkoutSnapshot.paymentId,
    subtotal: checkoutSnapshot.subtotal,
    discount: checkoutSnapshot.discount,
    gst: checkoutSnapshot.gst,
    grandTotal: checkoutSnapshot.grandTotal,
    payableAmount: checkoutSnapshot.payableAmount,
    createdAt: new Date(),
    status: checkoutSnapshot.status,
  };
  return Object.freeze({ ...orderSnapshot });
};

export const cloneOrderSnapshot = (snapshot: OrderSnapshot): OrderSnapshot => {
  return Object.freeze({ ...snapshot });
};

export const freezeOrderSnapshot = (snapshot: OrderSnapshot): OrderSnapshot => {
  return Object.freeze({ ...snapshot });
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

export const validateCartReference = (cartId: string | number | null): CheckoutValidationError | null => {
  if (cartId === null || cartId === undefined) {
    return {
      field: 'cartId',
      message: 'Cart reference is required',
    };
  }
  return null;
};

export const validateCustomerReference = (customerId: string | number | null): CheckoutValidationError | null => {
  if (customerId === null || customerId === undefined) {
    return {
      field: 'customerId',
      message: 'Customer reference is required',
    };
  }
  return null;
};

export const validatePaymentReference = (paymentId: string | number | null): CheckoutValidationError | null => {
  if (paymentId === null || paymentId === undefined) {
    return {
      field: 'paymentId',
      message: 'Payment reference is required',
    };
  }
  return null;
};

export const validateSnapshot = (snapshot: CheckoutSnapshot | null): CheckoutValidationError[] => {
  const errors: CheckoutValidationError[] = [];
  
  if (!snapshot) {
    errors.push({ field: 'snapshot', message: 'Checkout snapshot is required' });
    return errors;
  }

  const cartError = validateCartReference(snapshot.cartId);
  if (cartError) errors.push(cartError);

  const customerError = validateCustomerReference(snapshot.customerId);
  if (customerError) errors.push(customerError);

  const paymentError = validatePaymentReference(snapshot.paymentId);
  if (paymentError) errors.push(paymentError);

  return errors;
};

export const validateCheckout = (snapshot: CheckoutSnapshot | null): CheckoutValidationResult => {
  const errors = validateSnapshot(snapshot);
  return {
    isValid: errors.length === 0,
    errors,
  };
};
