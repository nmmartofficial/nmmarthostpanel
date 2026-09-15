import { useCallback } from 'react';
import { toast } from 'sonner';

export default function usePosActions() {
  const addToCart = useCallback((product, setCart, setLastAddedId, setSelectedCartId) => {
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    setLastAddedId(product.id);
    setSelectedCartId(product.id);
    toast.success(`${product.itname || product.name} added`);
  }, []);

  return { addToCart };
}
