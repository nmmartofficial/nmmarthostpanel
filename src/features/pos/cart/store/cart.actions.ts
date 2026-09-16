import type { CartItem, CartDiscount, CartTax, Cart } from '../types/cart.types';
import type { Product } from '../../types';
import { initialCartState } from './cart.state';

export const createCartActions = (state: Cart, setState: (state: Cart) => void) => {
  return {
    addItem: (product: Product, quantity: number = 1): void => {
      const existingItem = state.items.find(item => item.id === product.id);
      let newItems: CartItem[];

      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [...state.items, { id: product.id, product, quantity }];
      }

      setState({
        ...state,
        items: newItems,
        totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalItems: newItems.length,
        status: 'active',
        lastUpdated: new Date(),
      });
    },

    removeItem: (itemId: string | number): void => {
      const newItems = state.items.filter(item => item.id !== itemId);
      setState({
        ...state,
        items: newItems,
        selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
        totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalItems: newItems.length,
        status: newItems.length === 0 ? 'empty' : 'active',
        lastUpdated: new Date(),
      });
    },

    increaseQty: (itemId: string | number): void => {
      const newItems = state.items.map(item =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      );
      setState({
        ...state,
        items: newItems,
        totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
        lastUpdated: new Date(),
      });
    },

    decreaseQty: (itemId: string | number): void => {
      const newItems = state.items.map(item => {
        if (item.id === itemId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      });
      setState({
        ...state,
        items: newItems,
        totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
        lastUpdated: new Date(),
      });
    },

    updateQty: (itemId: string | number, quantity: number): void => {
      if (quantity <= 0) {
        const newItems = state.items.filter(item => item.id !== itemId);
        setState({
          ...state,
          items: newItems,
          selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
          totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
          totalItems: newItems.length,
          status: newItems.length === 0 ? 'empty' : 'active',
          lastUpdated: new Date(),
        });
        return;
      }
      const newItems = state.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      setState({
        ...state,
        items: newItems,
        totalQty: newItems.reduce((sum, item) => sum + item.quantity, 0),
        lastUpdated: new Date(),
      });
    },

    selectItem: (item: CartItem | null): void => {
      setState({ ...state, selectedItem: item });
    },

    clearSelection: (): void => {
      setState({ ...state, selectedItem: null });
    },

    clearCart: (): void => {
      setState({
        ...state,
        items: [],
        selectedItem: null,
        subtotal: 0,
        discount: 0,
        subtotalAfterDiscount: 0,
        tax: 0,
        grandTotal: 0,
        payableAmount: 0,
        totalQty: 0,
        totalItems: 0,
        customerId: null,
        notes: '',
        status: 'empty',
        lastUpdated: new Date(),
      });
    },

    setCustomer: (customerId: string | number | null): void => {
      setState({ ...state, customerId, lastUpdated: new Date() });
    },

    setDiscount: (discount: CartDiscount): void => {
      setState({
        ...state,
        discount: discount.amount,
        discountType: discount.type,
        discountValue: discount.value,
        subtotalAfterDiscount: state.subtotal - discount.amount,
        lastUpdated: new Date(),
      });
    },

    setTax: (tax: CartTax): void => {
      setState({
        ...state,
        tax: tax.amount,
        gstRate: tax.rate,
        lastUpdated: new Date(),
      });
    },

    setNotes: (notes: string): void => {
      setState({ ...state, notes, lastUpdated: new Date() });
    },

    setLoading: (loading: boolean): void => {
      setState({ ...state, loading });
    },

    setError: (error: string | null): void => {
      setState({ ...state, error });
    },

    resetCart: (): void => {
      setState(initialCartState);
    },
  };
};
