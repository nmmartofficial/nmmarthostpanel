/**
 * Checkout Module Context
 * Phase 6 - Step 2
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialCheckoutState } from '../store/checkout.state';
import type { CheckoutState, CheckoutActions } from '../types/checkout.types';
import { CHECKOUT_STATUS } from '../constants/checkout.constants';

const CheckoutContext = createContext<{
  checkoutState: CheckoutState;
  actions: CheckoutActions;
} | null>(null);

export const CheckoutProvider = ({ children }) => {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(initialCheckoutState);

  const actions: CheckoutActions = useMemo(() => ({
    setStatus: (status) => setCheckoutState(prev => ({ ...prev, status })),
    setLoading: (loading) => setCheckoutState(prev => ({ ...prev, loading })),
    setError: (error) => setCheckoutState(prev => ({ ...prev, error })),
    setCartId: (cartId) => setCheckoutState(prev => ({ ...prev, cartId })),
    setCustomerId: (customerId) => setCheckoutState(prev => ({ ...prev, customerId })),
    setPaymentId: (paymentId) => setCheckoutState(prev => ({ ...prev, paymentId })),
    setOrderId: (orderId) => setCheckoutState(prev => ({ ...prev, orderId })),
    startCheckout: () => setCheckoutState(prev => ({
      ...prev,
      status: CHECKOUT_STATUS.STARTED,
      checkoutStarted: new Date(),
      createdAt: new Date(),
    })),
    completeCheckout: () => setCheckoutState(prev => ({
      ...prev,
      status: CHECKOUT_STATUS.COMPLETED,
      checkoutCompleted: new Date(),
      completedAt: new Date(),
    })),
    cancelCheckout: () => setCheckoutState(prev => ({
      ...prev,
      status: CHECKOUT_STATUS.CANCELLED,
      checkoutCancelled: new Date(),
    })),
    resetCheckout: () => setCheckoutState(initialCheckoutState),
  }), []);

  const value = useMemo(() => ({
    checkoutState,
    actions,
  }), [checkoutState, actions]);

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckoutContext = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckoutContext must be used within a CheckoutProvider');
  }
  return context;
};

export default CheckoutContext;
