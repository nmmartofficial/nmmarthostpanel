/**
 * Receipt Generation Utilities
 */

/**
 * Formats receipt headers
 */
export const formatReceiptHeader = (shopName) => {
  return shopName.toUpperCase();
};

/**
 * Calculates item row totals for receipt
 */
export const calcRowTotal = (rate, qty) => {
  return (parseFloat(rate) || 0) * (parseFloat(qty) || 0);
};

/**
 * Generates print timestamp
 */
export const getPrintTimestamp = () => {
  const now = new Date();
  return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
};
