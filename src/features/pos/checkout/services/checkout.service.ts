/**
 * Checkout Module Service
 * Phase 6 - Step 3
 */

import { createCheckoutSnapshot, validateCheckout, createOrderSnapshot } from '../utils/checkout.utils';
import type { CheckoutSnapshot, CheckoutValidationResult, CheckoutProcessResult, OrderSnapshot, CheckoutRepositoryResult } from '../types/checkout.types';
import { DB_SCHEMA } from '../../../../dbSchema';
import { dbSync } from '../../../../dbSync';
import { ACTION_TYPES, ERP_MODULES, handleERPAction } from '../../../erpController';
import { buildAtomicCheckoutPayload } from '../../../../utils/pos/atomicCheckout';
import { isLocalPosTestMode } from '../../../../utils/localPosTestMode';

const checkoutFailure = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, details: details || null },
});

export const CheckoutService = {
  startCheckout: (snapshot?: Partial<CheckoutSnapshot> | null) => {
    const created = snapshot ? createCheckoutSnapshot(snapshot) : createCheckoutSnapshot({ status: 'STARTED' as any });
    return {
      snapshot: created,
      status: created.status,
    };
  },
  completeCheckout: async (input: any) => {
    return completeCheckoutAsync(input);
  },
  cancelCheckout: (snapshot?: Partial<CheckoutSnapshot> | null) => {
    const cancelled = snapshot ? createCheckoutSnapshot({ ...snapshot, status: 'CANCELLED' as any }) : createCheckoutSnapshot({ status: 'CANCELLED' as any });
    return {
      snapshot: cancelled,
      status: cancelled.status,
    };
  },
  resetCheckout: () => {
    return;
  },
  createSnapshot: (data?: Partial<CheckoutSnapshot>): CheckoutSnapshot => {
    return createCheckoutSnapshot(data);
  },
  clearSnapshot: (): null => {
    return null;
  },
  validate: (snapshot: CheckoutSnapshot | null): CheckoutValidationResult => {
    return validateCheckout(snapshot);
  },
  processCheckout: (snapshot: CheckoutSnapshot | null): CheckoutProcessResult => {
    // Step 1: Check snapshot exists
    if (!snapshot) {
      return {
        success: false,
        snapshot: null,
        validation: null,
        error: 'No checkout snapshot available',
      };
    }
    
    // Step 2: Run validate
    const validation = validateCheckout(snapshot);
    
    // Step 3/4: Return result
    return {
      success: validation.isValid,
      snapshot: snapshot,
      validation: validation,
      error: validation.isValid ? null : 'Checkout validation failed',
    };
  },
  createOrderSnapshot: (checkoutSnapshot: CheckoutSnapshot | null): OrderSnapshot | null => {
    if (!checkoutSnapshot) {
      return null;
    }
    return createOrderSnapshot(checkoutSnapshot);
  },
  saveCheckout: (snapshot: CheckoutSnapshot | null): CheckoutRepositoryResult => {
    if (!snapshot) {
      return {
        success: false,
        snapshot: null,
        error: 'No checkout snapshot available',
        timestamp: new Date(),
      };
    }

    return {
      success: false,
      snapshot: null,
      error: 'CHECKOUT_PERSISTENCE_REQUIRES_ATOMIC_ORDER',
      timestamp: new Date(),
    };
  },
};

export const completeCheckoutAsync = async (input: any) => {
  try {
    if (isLocalPosTestMode) {
      return checkoutFailure('LOCAL_POS_TEST_MODE', 'Local POS Test Mode - Live checkout is disabled.');
    }

    const payload = input?.payload || buildAtomicCheckoutPayload({
      cart: input?.cart,
      selectedUser: input?.selectedUser,
      customerInfo: input?.customerInfo,
      subtotal: input?.subtotal,
      totalAmount: input?.totalAmount,
      discount: input?.discount,
      deliveryCharge: input?.deliveryCharge,
      paymentMethod: input?.paymentMethod,
      paidAmount: input?.paidAmount,
      referenceNo: input?.referenceNo,
    });

    if (!Array.isArray(payload.items) || payload.items.length === 0) return checkoutFailure('EMPTY_CART', 'Cart is empty');
    const productIds = payload.items.map((item: any) => item.product_id).filter(Boolean);
    const products = await dbSync.fetch(DB_SCHEMA.PRODUCTS.table, { in: { column: 'id', values: productIds } });
    const productMap = new Map(products.map((product: any) => [String(product.id), product]));
    for (const item of payload.items) {
      const product: any = productMap.get(String(item.product_id));
      const quantity = Number(item.quantity);
      const rate = Number(item.rate);
      if (!product) return checkoutFailure('INVALID_PRODUCT', `Product ${item.product_id} was not found`);
      if (!Number.isFinite(quantity) || quantity <= 0) return checkoutFailure('INVALID_QUANTITY', `Invalid quantity for product ${item.product_id}`);
      if (Number(product.stock || 0) < quantity) return checkoutFailure('INSUFFICIENT_STOCK', `Insufficient stock for ${product.name || item.product_name}`);
      const storedRate = Number(product.sale_rate ?? product.onlinerate ?? product.retail_rate ?? product.restrate ?? product.mrp ?? 0);
      if (!Number.isFinite(rate) || rate < 0 || Math.abs(rate - storedRate) > 0.01) {
        return checkoutFailure('PRICE_CHANGED', `Price changed for ${product.name || item.product_name}`);
      }
    }

    const header = payload.order_header || {};
    const total = Number(header.total_amount);
    const subtotal = Number(header.subtotal || 0);
    const discount = Number(header.discount || 0);
    const paymentAmount = Number(payload.payment?.amount ?? total);
    if (discount < 0 || discount > subtotal || !Number.isFinite(total) || total < 0 || paymentAmount < total) {
      return checkoutFailure('INVALID_TOTAL', 'Discount, total, or payment amount is invalid');
    }

    if (header.user_id) {
      const users = await dbSync.fetch(DB_SCHEMA.USERS.table, { eq: { column: 'id', value: header.user_id } });
      if (!users[0]) return checkoutFailure('INVALID_CUSTOMER', 'Customer does not belong to the active tenant');
    }

    const result = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.ATOMIC_ORDER, payload);
    if (!result.success || !result.data) return checkoutFailure(result.code || 'ATOMIC_CHECKOUT_FAILED', result.error || 'Atomic checkout failed', result.details);
    const orders = await dbSync.fetch(DB_SCHEMA.ORDERS.table, { eq: { column: 'id', value: result.data } });
    if (!orders[0]) return checkoutFailure('RECEIPT_READ_FAILED', 'Order committed but receipt data could not be read');
    const completed = createCheckoutSnapshot({ cartId: input?.cartId || null, customerId: header.user_id || null, paymentId: null, subtotal, discount, grandTotal: total, payableAmount: total, status: 'COMPLETED' as any });
    return { success: true, order: orders[0], orderId: orders[0].id, snapshot: completed, receipt: orders[0] };
  } catch (error: any) {
    return checkoutFailure(error?.code || 'CHECKOUT_FAILED', error?.message || 'Checkout failed', error?.details);
  }
};
