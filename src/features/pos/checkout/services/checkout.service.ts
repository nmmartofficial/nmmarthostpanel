/**
 * Checkout Module Service
 * Phase 6 - Step 3
 */

import { createCheckoutSnapshot, validateCheckout, createOrderSnapshot } from '../utils/checkout.utils';
import type { CheckoutSnapshot, CheckoutValidationResult, CheckoutProcessResult, OrderSnapshot, CheckoutRepositoryResult } from '../types/checkout.types';
import { RepositoryService } from '../../repository';

export const CheckoutService = {
  startCheckout: () => {
    throw new Error('Not Implemented');
  },
  completeCheckout: () => {
    throw new Error('Not Implemented');
  },
  cancelCheckout: () => {
    throw new Error('Not Implemented');
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

    const adapter = RepositoryService.createStorageAdapter('IN_MEMORY');
    const entity = {
      ...snapshot,
      id: snapshot.snapshotId,
    };
    const result = adapter.save('checkout', entity);

    return {
      success: result.success,
      snapshot: result.data,
      error: result.error,
      timestamp: result.timestamp,
    };
  },
};
