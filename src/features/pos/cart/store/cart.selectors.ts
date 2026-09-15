import type { Cart, CartItem, CartTotals, CartSummary } from '../types/cart.types';

export const cartSelectors = {
  getCart: (cart: Cart): Cart => {
    throw new Error("Not Implemented");
  },

  getItems: (cart: Cart): CartItem[] => {
    throw new Error("Not Implemented");
  },

  getItemById: (cart: Cart, itemId: string | number): CartItem | undefined => {
    throw new Error("Not Implemented");
  },

  getSelectedItem: (cart: Cart): CartItem | null => {
    throw new Error("Not Implemented");
  },

  getTotals: (cart: Cart): CartTotals => {
    throw new Error("Not Implemented");
  },

  getSummary: (cart: Cart): CartSummary => {
    throw new Error("Not Implemented");
  },

  isEmpty: (cart: Cart): boolean => {
    throw new Error("Not Implemented");
  },

  isLoading: (cart: Cart): boolean => {
    throw new Error("Not Implemented");
  },

  getError: (cart: Cart): string | null => {
    throw new Error("Not Implemented");
  },
};
