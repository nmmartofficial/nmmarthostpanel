/**
 * POS Calculation Utilities (Pure Functions)
 */

/**
 * Safely converts any value to a float
 */
export const toFloat = (val) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Rounds a number to specific decimal places
 */
export const roundTo = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Calculates percentage of a value
 */
export const calcPercent = (value, total) => {
  if (!total) return 0;
  return (value / total) * 100;
};

/**
 * Calculates value from percentage
 */
export const fromPercent = (percent, total) => {
  return (toFloat(total) * toFloat(percent)) / 100;
};

/**
 * Calculates GST amount from base price
 */
export const calcGst = (basePrice, gstPercent) => {
  return (toFloat(basePrice) * toFloat(gstPercent)) / 100;
};

/**
 * Calculates net price (inclusive of GST)
 */
export const calcNetPrice = (basePrice, gstPercent) => {
  return toFloat(basePrice) + calcGst(basePrice, gstPercent);
};

/**
 * Calculates cart subtotal
 */
export const calcCartSubtotal = (cart) => {
  return (cart || []).reduce((sum, item) => {
    const rate = toFloat(item.onlinerate || item.sale_rate);
    const qty = toFloat(item.quantity);
    return sum + (rate * qty);
  }, 0);
};

/**
 * Calculates cart total GST
 */
export const calcCartTotalGst = (cart) => {
  return (cart || []).reduce((sum, item) => {
    const rate = toFloat(item.onlinerate || item.sale_rate);
    const qty = toFloat(item.quantity);
    const gstPercent = toFloat(item.gst || item.gst_percent);
    return sum + (rate * qty * (gstPercent / 100));
  }, 0);
};

/**
 * Calculates total quantity in cart
 */
export const calcCartTotalQuantity = (cart) => {
  return (cart || []).reduce((sum, item) => sum + toFloat(item.quantity), 0);
};

/**
 * Calculates session/shift statistics
 */
export const calcShiftStats = (sessionOrders) => {
  const totalBills = sessionOrders.length;
  const grossSales = sessionOrders.reduce((sum, o) => sum + toFloat(o.subtotal), 0);
  const totalDiscount = sessionOrders.reduce((sum, o) => sum + toFloat(o.discount), 0);
  const totalGst = sessionOrders.reduce((sum, o) => sum + toFloat(o.gst_amount), 0);
  const netSales = sessionOrders.reduce((sum, o) => sum + toFloat(o.total_amount), 0);

  const cashSales = sessionOrders.filter(o => o.payment_method === 'Cash').reduce((sum, o) => sum + toFloat(o.total_amount), 0);
  const upiSales = sessionOrders.filter(o => o.payment_method === 'UPI').reduce((sum, o) => sum + toFloat(o.total_amount), 0);
  const splitSales = sessionOrders.filter(o => o.payment_method === 'Split').reduce((sum, o) => sum + toFloat(o.total_amount), 0);

  const amounts = sessionOrders.map(o => toFloat(o.total_amount));
  const highest = amounts.length ? Math.max(...amounts) : 0;
  const lowest = amounts.length ? Math.min(...amounts) : 0;
  const average = amounts.length ? (totalBills > 0 ? netSales / totalBills : 0) : 0;

  return {
    totalBills, grossSales, totalDiscount, totalGst, netSales,
    cashSales, upiSales, splitSales, highest, lowest, average
  };
};

/**
 * Determines payment method based on amounts
 */
export const getPaymentMethod = (paymentAmounts) => {
  const { Cash, UPI, Card } = paymentAmounts;
  const hasCash = toFloat(Cash) > 0;
  const hasUPI = toFloat(UPI) > 0;
  const hasCard = toFloat(Card) > 0;

  const count = [hasCash, hasUPI, hasCard].filter(Boolean).length;
  if (count > 1) return 'Split';
  if (hasUPI) return 'UPI';
  if (hasCard) return 'Card';
  return 'Cash';
};
