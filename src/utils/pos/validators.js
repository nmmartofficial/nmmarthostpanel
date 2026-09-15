/**
 * POS Validation Utilities
 */

/**
 * Validates if a quantity is valid for sale
 */
export const isValidQty = (qty) => {
  const q = parseFloat(qty);
  return !isNaN(q) && q > 0;
};

/**
 * Validates discount values
 */
export const isValidDiscount = (type, value, subtotal) => {
  const val = parseFloat(value) || 0;
  if (val < 0) return false;
  if (type === 'percent' && val > 100) return false;
  if (type === 'flat' && val > subtotal) return false;
  return true;
};

/**
 * Checks if a payment is sufficient
 */
export const isPaymentSufficient = (paid, required) => {
  return parseFloat(paid) >= parseFloat(required);
};

/**
 * Validates PIN codes (simple check)
 */
export const isValidPin = (pin) => {
  return pin && pin.length >= 4;
};
