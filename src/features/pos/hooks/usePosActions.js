import { useCallback } from 'react';
import { toast } from 'sonner';

export const isPOSQuantityWithinStock = (product, quantity) => {
  const requestedQuantity = Number(quantity);
  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 0) return false;
  const stockValue = product?.stock;
  if (stockValue === null || stockValue === undefined || stockValue === '') return true;
  const stock = Number(stockValue);
  return Number.isFinite(stock) && stock >= 0 && requestedQuantity <= stock;
};

export const addPOSCartItem = (cart, product) => {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    return cart.map(item => item.id === product.id
      ? { ...item, quantity: item.quantity + 1 }
      : item);
  }
  return [...cart, { ...product, quantity: 1 }];
};

export const changePOSCartItemQuantity = (cart, productId, change) => {
  const item = cart.find(entry => entry.id === productId);
  if (!item || !Number.isFinite(change)) return cart;

  const nextQuantity = Number(item.quantity) + change;
  if (nextQuantity <= 0) return cart.filter(entry => entry.id !== productId);
  return cart.map(entry => entry.id === productId
    ? { ...entry, quantity: nextQuantity }
    : entry);
};

export const setPOSCartItemQuantity = (cart, productId, quantity) => {
  const nextQuantity = Number(quantity);
  if (!Number.isFinite(nextQuantity)) return cart;
  if (nextQuantity <= 0) return cart.filter(entry => entry.id !== productId);
  return cart.map(entry => entry.id === productId
    ? { ...entry, quantity: nextQuantity }
    : entry);
};

export default function usePosActions() {
  const addToCart = useCallback((product, setCart, setLastAddedId, setSelectedCartId) => {
    if (!product) return;

    setCart(prev => addPOSCartItem(prev, product));

    setLastAddedId(product.id);
    setSelectedCartId(product.id);
    toast.success(`${product.itname || product.name} added`);
  }, []);

  return { addToCart };
}
