
export const calculateDiscountAmount = (subtotal, discount) => {
  if (!discount || discount.type === 'none') return 0;
  if (discount.type === 'percentage') {
    return subtotal * (discount.value / 100);
  }
  return discount.value;
};
