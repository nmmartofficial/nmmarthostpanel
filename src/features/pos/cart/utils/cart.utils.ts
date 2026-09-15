import type { Cart, CartItem } from '../types/cart.types';
import type { Product } from '../../types';
import { initialCartState } from '../store/cart.state';

export const createCart = (): Cart => {
  return { ...initialCartState };
};

export const createCartItem = (product: Product, quantity: number = 1): CartItem => {
  return {
    id: product.id,
    product,
    quantity,
  };
};

export const emptyCart = (): Cart => {
  return { ...initialCartState };
};

export const cloneCart = (cart: Cart): Cart => {
  return {
    ...cart,
    items: [...cart.items],
  };
};

// Pure calculation functions
export const calculateLineTotal = (item: CartItem): number => {
  return (item.product.price || 0) * item.quantity;
};

export const calculateSubtotal = (cart: Cart): number => {
  return cart.items.reduce((acc, item) => acc + calculateLineTotal(item), 0);
};

export const calculateTotalQuantity = (cart: Cart): number => {
  return cart.items.reduce((acc, item) => acc + item.quantity, 0);
};

export const calculateTotalItems = (cart: Cart): number => {
  return cart.items.length;
};

// Discount calculation functions
export const calculateDiscountAmount = (
  subtotal: number,
  discountType: 'percentage' | 'fixed' | null,
  discountValue: number | null
): number => {
  if (!discountType || discountValue === null || discountValue <= 0) {
    return 0;
  }

  let discount = 0;
  if (discountType === 'percentage') {
    discount = (subtotal * discountValue) / 100;
  } else {
    discount = discountValue;
  }

  // Ensure discount doesn't exceed subtotal and isn't negative
  return Math.max(0, Math.min(subtotal, discount));
};

export const calculateSubtotalAfterDiscount = (
  subtotal: number,
  discountAmount: number
): number => {
  return subtotal - discountAmount;
};

// GST calculation functions
export const calculateGST = (
  subtotalAfterDiscount: number,
  gstRate: number | null
): number => {
  if (!gstRate || gstRate <= 0) {
    return 0;
  }
  return (subtotalAfterDiscount * gstRate) / 100;
};

export const calculateCGST = (
  gstAmount: number
): number => {
  return gstAmount / 2;
};

export const calculateSGST = (
  gstAmount: number
): number => {
  return gstAmount / 2;
};

export const calculateIGST = (
  gstAmount: number
): number => {
  return gstAmount;
};

// Bill summary calculation functions
export const calculateRoundOff = (
  amount: number
): number => {
  // Round to nearest integer
  const rounded = Math.round(amount);
  return rounded - amount;
};

export const calculateGrandTotal = (
  subtotalAfterDiscount: number,
  taxAmount: number,
  roundOff: number
): number => {
  return subtotalAfterDiscount + taxAmount + roundOff;
};

export const calculatePayableAmount = (
  grandTotal: number
): number => {
  return grandTotal;
};
