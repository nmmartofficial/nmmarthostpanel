import { useState, useCallback } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState({ type: 'none', value: 0 });
  const [coupon, setCoupon] = useState(null);
  const [notes, setNotes] = useState('');

  const addItem = useCallback((product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { ...product, quantity, discount: 0 }];
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCart(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity } 
          : item
      )
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomer(null);
    setDiscount({ type: 'none', value: 0 });
    setCoupon(null);
    setNotes('');
  }, []);

  const updateItemDiscount = useCallback((productId, discountValue) => {
    setCart(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, discount: discountValue } 
          : item
      )
    );
  }, []);

  return {
    cart,
    customer,
    discount,
    coupon,
    notes,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setCustomer,
    setDiscount,
    setCoupon,
    setNotes,
    updateItemDiscount
  };
};
