import type { CartItem, CartDiscount, CartTax } from '../types/cart.types';
import type { Product } from '../../types';

export const cartActions = {
  addItem: (product: Product, quantity: number = 1): void => {
    throw new Error("Not Implemented");
  },

  removeItem: (itemId: string | number): void => {
    throw new Error("Not Implemented");
  },

  increaseQty: (itemId: string | number): void => {
    throw new Error("Not Implemented");
  },

  decreaseQty: (itemId: string | number): void => {
    throw new Error("Not Implemented");
  },

  updateQty: (itemId: string | number, quantity: number): void => {
    throw new Error("Not Implemented");
  },

  selectItem: (item: CartItem | null): void => {
    throw new Error("Not Implemented");
  },

  clearSelection: (): void => {
    throw new Error("Not Implemented");
  },

  clearCart: (): void => {
    throw new Error("Not Implemented");
  },

  setCustomer: (customerId: string | number | null): void => {
    throw new Error("Not Implemented");
  },

  setDiscount: (discount: CartDiscount): void => {
    throw new Error("Not Implemented");
  },

  setTax: (tax: CartTax): void => {
    throw new Error("Not Implemented");
  },

  setNotes: (notes: string): void => {
    throw new Error("Not Implemented");
  },

  setLoading: (loading: boolean): void => {
    throw new Error("Not Implemented");
  },

  setError: (error: string | null): void => {
    throw new Error("Not Implemented");
  },

  resetCart: (): void => {
    throw new Error("Not Implemented");
  },
};
