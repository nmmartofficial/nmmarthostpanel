/**
 * Checkout Module Context
 * Phase 6 - Step 2
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialCheckoutState } from '../store/checkout.state';
import { CHECKOUT_STATUS } from '../constants/checkout.constants';
import { CheckoutService } from '../services/checkout.service';

const CheckoutContext = createContext(null);

export const CheckoutProvider = ({ children }) => {
  const [checkoutState, setCheckoutState] = useState(initialCheckoutState);

  const actions = useMemo(() => ({
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
    createSnapshot: (data) => {
      const snapshotData = {
        cartId: data?.cartId ?? checkoutState.cartId,
        customerId: data?.customerId ?? checkoutState.customerId,
        paymentId: data?.paymentId ?? checkoutState.paymentId,
        status: data?.status ?? checkoutState.status,
        ...data,
      };
      const newSnapshot = CheckoutService.createSnapshot(snapshotData);
      setCheckoutState(prev => ({ ...prev, currentSnapshot: newSnapshot }));
    },
    clearSnapshot: () => setCheckoutState(prev => ({ ...prev, currentSnapshot: null })),
    validateCheckout: () => {
      const validationResult = CheckoutService.validate(checkoutState.currentSnapshot);
      setCheckoutState(prev => ({ ...prev, lastValidationResult: validationResult }));
    },
    clearValidation: () => setCheckoutState(prev => ({ ...prev, lastValidationResult: null })),
    processCheckout: () => {
      return CheckoutService.processCheckout(checkoutState.currentSnapshot);
    },
    createOrderSnapshot: () => {
      return CheckoutService.createOrderSnapshot(checkoutState.currentSnapshot);
    },
    saveCheckout: () => {
      return CheckoutService.saveCheckout(checkoutState.currentSnapshot);
    },
  }), [checkoutState.cartId, checkoutState.customerId, checkoutState.paymentId, checkoutState.status, checkoutState.currentSnapshot]);

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
