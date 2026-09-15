import { useState, useCallback, useMemo } from 'react';
import type { Cart, CartItem, CartSummary } from '../types/cart.types';
import { cartSelectors } from '../store/cart.selectors';
import { initialCartState } from '../store/cart.state';
import { CartService } from '../services/cart.service';
import type { Product } from '../../types';

export const useCart = () => {
  const [cart, setCart] = useState<Cart>(initialCartState);

  const items: CartItem[] = cart.items;

  const summary: CartSummary = useMemo(() => {
    return {
      items: cart.items,
      totals: {
        subtotal: cart.subtotal,
        discount: cart.discount,
        subtotalAfterDiscount: cart.subtotalAfterDiscount,
        tax: cart.tax,
        grandTotal: cart.grandTotal,
        roundOff: cart.roundOff,
        payableAmount: cart.payableAmount,
        totalQty: cart.totalQty,
        totalItems: cart.totalItems,
      },
      discounts: [],
      taxes: [],
      payments: [],
    };
  }, [cart]);

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setCart(prev => CartService.add(prev, product, quantity));
  }, []);

  const increaseQty = useCallback((itemId: string | number) => {
    setCart(prev => CartService.increaseQty(prev, itemId));
  }, []);

  const decreaseQty = useCallback((itemId: string | number) => {
    setCart(prev => CartService.decreaseQty(prev, itemId));
  }, []);

  const updateQty = useCallback((itemId: string | number, quantity: number) => {
    setCart(prev => CartService.updateQty(prev, itemId, quantity));
  }, []);

  const removeItem = useCallback((itemId: string | number) => {
    setCart(prev => CartService.remove(prev, itemId));
  }, []);
  const selectItem = () => { throw new Error("Not Implemented"); };
  const clearSelection = () => { throw new Error("Not Implemented"); };
  const clearCart = useCallback(() => {
    setCart(prev => CartService.clear(prev));
  }, []);
  const attachCustomer = useCallback((customerId: string | number) => {
    setCart(prev => CartService.attachCustomer(prev, customerId));
  }, []);
  const clearCustomer = useCallback(() => {
    setCart(prev => CartService.clearCustomer(prev));
  }, []);
  const setDiscount = useCallback((discountType: 'percentage' | 'fixed', discountValue: number) => {
    setCart(prev => CartService.setDiscount(prev, discountType, discountValue));
  }, []);

  const clearDiscount = useCallback(() => {
    setCart(prev => CartService.clearDiscount(prev));
  }, []);
  const setGSTRate = useCallback((gstRate: number) => {
    setCart(prev => CartService.setGSTRate(prev, gstRate));
  }, []);

  const setGSTMode = useCallback((gstMode: 'cgst_sgst' | 'igst') => {
    setCart(prev => CartService.setGSTMode(prev, gstMode));
  }, []);

  const clearGST = useCallback(() => {
    setCart(prev => CartService.clearGST(prev));
  }, []);
  const setNotes = () => { throw new Error("Not Implemented"); };
  const setLoading = () => { throw new Error("Not Implemented"); };
  const setError = () => { throw new Error("Not Implemented"); };
  const resetCart = () => { throw new Error("Not Implemented"); };

  return {
    cart,
    items,
    summary,
    selectedItem: cart.selectedItem,
    loading: cart.loading,
    error: cart.error,
    addItem,
    increaseQty,
    decreaseQty,
    updateQty,
    removeItem,
    selectItem,
    clearSelection,
    clearCart,
    attachCustomer,
    clearCustomer,
    setDiscount,
    clearDiscount,
    setGSTRate,
    setGSTMode,
    clearGST,
    setNotes,
    setLoading,
    setError,
    resetCart,
    selectors: cartSelectors,
  };
};
