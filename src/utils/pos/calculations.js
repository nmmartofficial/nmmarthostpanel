/**
 * POS & Commerce Calculation Utilities (Pure Functions)
 *
 * ALL monetary calculations for NM MART ERP live here ONLY.
 * UI components / data layer helpers / React hooks MUST delegate
 * to these pure fns — no currency math inline in Views or Context.
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
 * Reverse GST calculation — extracts base amount + GST from an all-inclusive total
 * @param inclusiveTotal Total amount that already includes GST
 * @param gstPercent Applicable GST % (default 5)
 * @returns {{ taxableAmount: number, gstAmount: number }}
 */
export const calcReverseGST = (inclusiveTotal, gstPercent = 5) => {
  const total = toFloat(inclusiveTotal);
  const rate = toFloat(gstPercent);
  const taxableAmount = total / (1 + rate / 100);
  const gstAmount = total - taxableAmount;
  return { taxableAmount: roundTo(taxableAmount, 2), gstAmount: roundTo(gstAmount, 2) };
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
 * Sums a numeric field across an array of objects. Safe for reduce + parseFloat boilerplate.
 */
export const sumField = (arr, field, fallback = 0) => {
  return (arr || []).reduce((sum, rec) => sum + (toFloat(rec?.[field]) ?? fallback), 0);
};

/**
 * Purchase line item calculator
 * Handles Tax Type: "Include" (GST already in purch_rate) vs "Exclude" (add GST on top)
 * @returns {{ gstAmount: number, discountAmount: number, lineTotal: number, baseAmount: number }}
 */
export const calcPurchaseLineItem = ({
  purchRate, qty = 1, disPercent = 0, gstPercent = 0, taxType = 'Include'
} = {}) => {
  const rate = toFloat(purchRate);
  const quantity = toFloat(qty);
  const discPct = toFloat(disPercent);
  const gstPct = toFloat(gstPercent);

  const grossLine = rate * quantity;
  const discountAmount = grossLine * (discPct / 100);
  const afterDiscount = Math.max(0, grossLine - discountAmount);

  let baseAmount;
  let gstAmount;
  if (String(taxType).toLowerCase() === 'exclude') {
    baseAmount = afterDiscount;
    gstAmount = calcGst(baseAmount, gstPct);
  } else {
    const reversed = calcReverseGST(afterDiscount, gstPct);
    baseAmount = reversed.taxableAmount;
    gstAmount = reversed.gstAmount;
  }

  const lineTotal = afterDiscount + (taxType === 'Exclude' ? gstAmount : 0);

  return {
    gstAmount: roundTo(gstAmount, 2),
    discountAmount: roundTo(discountAmount, 2),
    lineTotal: roundTo(lineTotal, 2),
    baseAmount: roundTo(baseAmount, 2)
  };
};

/**
 * Purchase document totals aggregator
 */
export const calcPurchaseTotals = (items = []) => {
  const safeItems = Array.isArray(items) ? items : [];
  const totalQty = safeItems.reduce((s, i) => s + toFloat(i.qty ?? i.quantity), 0);
  const totalGst = safeItems.reduce((s, i) => s + toFloat(i.gst_amt ?? i.gst_amount), 0);
  const discountTotal = safeItems.reduce((s, i) => s + toFloat(i.disc_amt ?? i.discount_amount), 0);
  const subTotal = safeItems.reduce((s, i) => s + toFloat(i.amount ?? i.total ?? i.lineTotal), 0);
  const finalBillAmt = Math.round(subTotal);
  const roundOff = roundTo(subTotal - finalBillAmt, 2);

  return {
    totalQty: roundTo(totalQty, 2),
    totalGst: roundTo(totalGst, 2),
    discountTotal: roundTo(discountTotal, 2),
    subTotal: roundTo(subTotal, 2),
    finalBillAmt,
    roundOff
  };
};

/**
 * GST Invoice breakdown — splits order total into CGST/SGST halves
 * @returns {{ subtotal: number, discount: number, deliveryCharge: number, taxableAmount: number, gstAmount: number, cgst: number, sgst: number }}
 */
export const calcInvoiceGSTBreakdown = (order = {}, appConfig = {}, defaultGstRate = 5) => {
  const gstRate = toFloat(appConfig?.gst_rate) || toFloat(defaultGstRate);
  const subtotal = toFloat(order.subtotal) || toFloat(order.total_amount);
  const discount = toFloat(order.discount);
  const deliveryCharge = toFloat(order.delivery_charge);
  const taxableAmount = subtotal - discount + deliveryCharge;
  const gstAmount = (taxableAmount * gstRate) / (100 + gstRate);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return {
    subtotal: roundTo(subtotal, 2),
    discount: roundTo(discount, 2),
    deliveryCharge: roundTo(deliveryCharge, 2),
    taxableAmount: roundTo(taxableAmount, 2),
    gstAmount: roundTo(gstAmount, 2),
    cgst: roundTo(cgst, 2),
    sgst: roundTo(sgst, 2),
    gstRate
  };
};

/**
 * Invoice line row calculator — per-item total for display (table rows / print)
 */
export const calcInvoiceItemRow = (item = {}) => {
  const rate = toFloat(item.rate || item.price);
  const qty = toFloat(item.quantity || item.qty);
  const total = toFloat(item.total) || (qty * rate);
  return {
    rate: roundTo(rate, 2),
    qty,
    total: roundTo(total, 2)
  };
};

/**
 * Aggregated P&L / KPI summary for analytics views
 */
export const calcProfitLossSummary = ({ orders = [], purchases = [], expenses = [] } = {}) => {
  const sales = sumField(orders, 'total_amount');
  const purchase = sumField(purchases, 'total_amount');
  const expensesTotal = sumField(expenses, 'amount');
  const grossProfit = sales - purchase;
  const netProfit = grossProfit - expensesTotal;
  const margin = sales > 0 ? (netProfit / sales) * 100 : 0;
  return {
    sales: roundTo(sales, 2),
    purchase: roundTo(purchase, 2),
    expenses: roundTo(expensesTotal, 2),
    grossProfit: roundTo(grossProfit, 2),
    profit: roundTo(netProfit, 2),
    margin: roundTo(margin, 1)
  };
};

/**
 * Billing totals helper — pure version of the hook math (so tests can run
 * without React). useBillingCalculations delegates to this for numeric core.
 */
export const calcBillTotals = ({
  cart, billDiscount = 0, deliveryChargePercent = 0, flatDiscount = 0,
  redeemPoints = 0, rupeePerPoint = 1, discountInput = null
} = {}) => {
  const subTotal = calcCartSubtotal(cart);
  const totalGst = calcCartTotalGst(cart);
  const discountAmount = fromPercent(billDiscount, subTotal);
  const flatDiscountVal = toFloat(flatDiscount);
  const pointsDiscountVal = toFloat(redeemPoints) * toFloat(rupeePerPoint);
  const totalDiscount = discountAmount + flatDiscountVal + pointsDiscountVal;
  const manualDiscount = discountAmount + flatDiscountVal;
  const deliveryChargeAmount = fromPercent(deliveryChargePercent, subTotal);
  const rawTotal = subTotal - discountAmount + deliveryChargeAmount - flatDiscountVal - pointsDiscountVal;
  const finalTotal = Math.round(rawTotal);
  const roundOff = roundTo(finalTotal - rawTotal, 2);

  const savingAmount = discountInput
    ? (discountInput.type === 'percent' ? fromPercent(discountInput.value, subTotal) : toFloat(discountInput.value))
    : 0;
  const newNetTotal = Math.round(subTotal - savingAmount + deliveryChargeAmount - pointsDiscountVal);

  return {
    subTotal: roundTo(subTotal, 2),
    totalGst: roundTo(totalGst, 2),
    discountAmount: roundTo(discountAmount, 2),
    flatDiscountVal: roundTo(flatDiscountVal, 2),
    pointsDiscountVal: roundTo(pointsDiscountVal, 2),
    totalDiscount: roundTo(totalDiscount, 2),
    manualDiscount: roundTo(manualDiscount, 2),
    deliveryChargeAmount: roundTo(deliveryChargeAmount, 2),
    rawTotal: roundTo(rawTotal, 2),
    finalTotal,
    roundOff,
    savingAmount: roundTo(savingAmount, 2),
    newNetTotal
  };
};

/**
 * Calculates session/shift statistics
 */
export const calcShiftStats = (sessionOrders) => {
  const totalBills = sessionOrders.length;
  const grossSales = sumField(sessionOrders, 'subtotal');
  const totalDiscount = sumField(sessionOrders, 'discount');
  const totalGst = sumField(sessionOrders, 'gst_amount');
  const netSales = sumField(sessionOrders, 'total_amount');

  const cashSales = sumField(sessionOrders.filter(o => o.payment_method === 'Cash'), 'total_amount');
  const upiSales = sumField(sessionOrders.filter(o => o.payment_method === 'UPI'), 'total_amount');
  const splitSales = sumField(sessionOrders.filter(o => o.payment_method === 'Split'), 'total_amount');

  const amounts = (sessionOrders || []).map(o => toFloat(o.total_amount));
  const highest = amounts.length ? Math.max(...amounts) : 0;
  const lowest = amounts.length ? Math.min(...amounts) : 0;
  const average = amounts.length && totalBills > 0 ? netSales / totalBills : 0;

  return {
    totalBills, grossSales: roundTo(grossSales, 2), totalDiscount: roundTo(totalDiscount, 2),
    totalGst: roundTo(totalGst, 2), netSales: roundTo(netSales, 2),
    cashSales: roundTo(cashSales, 2), upiSales: roundTo(upiSales, 2),
    splitSales: roundTo(splitSales, 2), highest: roundTo(highest, 2),
    lowest: roundTo(lowest, 2), average: roundTo(average, 2)
  };
};

/**
 * Determines payment method based on amounts
 */
export const getPaymentMethod = (paymentAmounts) => {
  const { Cash, UPI, Card, Credit } = paymentAmounts || {};
  const hasCash = toFloat(Cash) > 0;
  const hasUPI = toFloat(UPI) > 0;
  const hasCard = toFloat(Card) > 0;
  const hasCredit = toFloat(Credit) > 0;

  const count = [hasCash, hasUPI, hasCard, hasCredit].filter(Boolean).length;
  if (count > 1) return 'mixed';
  if (hasUPI) return 'upi';
  if (hasCard) return 'card';
  if (hasCredit) return 'credit';
  return 'cash';
};
