import { calculateTotalGST } from './gst';
import { calculateDiscountAmount } from './discounts';

export const calculateSubtotal = (cart) => {
  return cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const itemDiscount = item.discount
      ? item.discount.type === 'percentage'
        ? itemTotal * (item.discount.value / 100)
        : item.discount.value
      : 0;
    return sum + (itemTotal - itemDiscount);
  }, 0);
};

export const calculateRoundOff = (amount) => {
  return Math.round(amount * 100) / 100;
};

export const calculateGrandTotal = (cart, discount, roundOff = true) => {
  const subtotal = calculateSubtotal(cart);
  const { totalGST } = calculateTotalGST(cart);
  const discountAmount = calculateDiscountAmount(subtotal, discount);
  let grandTotal = subtotal + totalGST - discountAmount;
  if (roundOff) {
    grandTotal = calculateRoundOff(grandTotal);
  }
  return grandTotal;
};

export { calculateDiscountAmount, calculateTotalGST };
