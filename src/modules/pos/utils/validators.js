
export const validateDiscount = (discount, subtotal) => {
  if (!discount) return { valid: true };
  if (discount.type === 'percentage' && discount.value > 100) {
    return { valid: false, message: 'Discount cannot exceed 100%' };
  }
  if (discount.type === 'fixed' && discount.value > subtotal) {
    return { valid: false, message: 'Discount cannot exceed subtotal' };
  }
  return { valid: true };
};

export const validateQuantity = (qty, stock) => {
  if (qty <= 0) return { valid: false, message: 'Quantity must be at least 1' };
  if (stock && qty > stock) {
    return { valid: false, message: `Only ${stock} in stock` };
  }
  return { valid: true };
};
