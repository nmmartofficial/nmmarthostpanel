
import React from 'react';
import CartHeader from './CartHeader';
import CartSummary from './CartSummary';
import CartItem from './CartItem';
import CartTotals from './CartTotals';
import CartActions from './CartActions';
import {
  calculateSubtotal,
  calculateGrandTotal,
  calculateTotalGST,
  calculateDiscountAmount,
} from '../utils/calculations';
import { usePOS } from '../context/POSContext';

export default function CartPanel() {
  const {
    cart,
    discount,
    updateQuantity,
    removeItem,
    clearCart,
    openDiscountDialog,
    openPaymentDialog,
  } = usePOS();

  const subtotal = calculateSubtotal(cart);
  const { totalGST, gstBreakdown } = calculateTotalGST(cart);
  const discountAmount = calculateDiscountAmount(subtotal, discount);
  const grandTotal = calculateGrandTotal(cart, discount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleIncrease = (id) => {
    const item = cart.find((i) => i.id === id);
    if (item) {
      updateQuantity(id, item.quantity + 1);
    }
  };

  const handleDecrease = (id) => {
    const item = cart.find((i) => i.id === id);
    if (item) {
      const newQty = item.quantity - 1;
      if (newQty <= 0) {
        removeItem(id);
      } else {
        updateQuantity(id, newQty);
      }
    }
  };

  return (
    <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-xl h-full">
      <CartHeader itemCount={itemCount} />
      {cart.length === 0 ? (
        <CartSummary />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            {cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                onRemove={removeItem}
              />
            ))}
          </div>
          <CartTotals
            subtotal={subtotal}
            totalGST={totalGST}
            discountAmount={discountAmount}
            grandTotal={grandTotal}
            gstBreakdown={gstBreakdown}
          />
          <CartActions
            onOpenDiscount={openDiscountDialog}
            onOpenPayment={openPaymentDialog}
            onClearCart={clearCart}
            cartEmpty={cart.length === 0}
          />
        </>
      )}
    </div>
  );
}
