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

export const summarizePOSPaymentAmounts = (paymentAmounts = {}, payableAmount) => {
  const payable = Number(payableAmount);
  if (!Number.isFinite(payable) || payable < 0) {
    return {
      isValid: false,
      error: 'INVALID_PAYMENT_TOTAL',
      paidTotal: 0,
      changeReturn: 0,
      remainingToPay: 0
    };
  }

  const amounts = {};
  for (const method of ['Cash', 'UPI', 'Card']) {
    const rawAmount = paymentAmounts?.[method];
    const amount = rawAmount == null || String(rawAmount).trim() === ''
      ? 0
      : Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return {
        isValid: false,
        error: 'INVALID_PAYMENT_AMOUNT',
        paidTotal: 0,
        changeReturn: 0,
        remainingToPay: roundTo(payable, 2)
      };
    }
    amounts[method] = roundTo(amount, 2);
  }

  const unsupportedTender = Object.entries(paymentAmounts || {}).some(([method, amount]) => (
    !['Cash', 'UPI', 'Card'].includes(method)
    && amount != null
    && String(amount).trim() !== ''
    && Number(amount) !== 0
  ));
  if (unsupportedTender) {
    return {
      isValid: false,
      error: 'INVALID_PAYMENT_METHOD',
      paidTotal: 0,
      changeReturn: 0,
      remainingToPay: roundTo(payable, 2)
    };
  }

  const paidTotal = roundTo(amounts.Cash + amounts.UPI + amounts.Card, 2);
  const digitalTender = roundTo(amounts.UPI + amounts.Card, 2);
  const paymentMethod = getPaymentMethod(amounts);
  const remainingToPay = roundTo(Math.max(0, payable - paidTotal), 2);
  if (digitalTender > roundTo(payable, 2)) {
    return {
      isValid: false,
      error: 'NON_CASH_PAYMENT_EXCEEDS_TOTAL',
      paidTotal,
      changeReturn: 0,
      remainingToPay,
      paymentMethod
    };
  }

  const cashDue = Math.max(0, payable - digitalTender);
  return {
    isValid: remainingToPay === 0,
    error: remainingToPay > 0 ? 'INSUFFICIENT_PAYMENT' : '',
    paidTotal,
    changeReturn: roundTo(Math.max(0, amounts.Cash - cashDue), 2),
    remainingToPay,
    paymentMethod
  };
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
 * @param gstPercent Applicable GST percentage
 * @returns {{ taxableAmount: number, gstAmount: number }}
 */
export const calcReverseGST = (inclusiveTotal, gstPercent) => {
  const total = Number(inclusiveTotal);
  const rate = Number(gstPercent);
  if (
    inclusiveTotal === null
    || inclusiveTotal === undefined
    || String(inclusiveTotal).trim() === ''
    || !Number.isFinite(total)
    || total < 0
    || gstPercent === null
    || gstPercent === undefined
    || String(gstPercent).trim() === ''
    || !Number.isFinite(rate)
    || rate < 0
  ) {
    throw new Error('INVALID_GST_INPUT');
  }

  const taxableAmount = total / (1 + rate / 100);
  const gstAmount = total - taxableAmount;
  return { taxableAmount: roundTo(taxableAmount, 2), gstAmount: roundTo(gstAmount, 2) };
};

export const getCartUnitPrice = (item = {}) => {
  const onlineRate = item.onlinerate;
  const value = onlineRate || item.sale_rate;
  if (value === null || value === undefined || value === '') {
    return onlineRate === 0 || onlineRate === '0' ? 0 : null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

export const validatePOSDiscountInput = (type, value, subtotal) => {
  if (!['percent', 'flat'].includes(type)) {
    return { valid: false, error: 'Invalid Discount Type' };
  }
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: false, error: 'Enter a discount value' };
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return { valid: false, error: 'Invalid Discount Value' };
  }
  if (type === 'percent' && amount > 100) {
    return { valid: false, error: 'Percentage discount cannot exceed 100%' };
  }
  if (type === 'flat' && amount > toFloat(subtotal)) {
    return { valid: false, error: 'Discount cannot exceed subtotal' };
  }

  return { valid: true, value: amount };
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
  return (cart || []).reduce((sum, item) => sum + calcCartLineTotal(item), 0);
};

export const calcCartLineTotal = (item) => {
  const rate = getCartUnitPrice(item) ?? 0;
  const qty = toFloat(item?.quantity);
  return rate * qty;
};

/**
 * Calculates cart total GST
 */
export const calcCartTaxBreakdown = (
  cart,
  { gstPricingMode, itemDiscounts = {}, billDiscount = 0 } = {}
) => {
  if (gstPricingMode !== 'inclusive') {
    throw new Error('POS_GST_CONFIGURATION_REQUIRED');
  }

  const lines = (cart || []).map((item) => {
    const rate = getCartUnitPrice(item);
    const quantity = Number(item?.quantity);
    const gstValue = item?.gst_percent ?? item?.gst;
    const gstPercent = gstValue === null || gstValue === undefined || String(gstValue).trim() === ''
      ? Number.NaN
      : Number(gstValue);
    if (
      rate === null
      || rate < 0
      || !Number.isFinite(quantity)
      || quantity < 0
      || !Number.isFinite(gstPercent)
      || gstPercent < 0
    ) {
      throw new Error('POS_GST_RATE_REQUIRED');
    }
    return {
      item,
      grossAmount: rate * quantity,
      gstPercent,
      itemDiscount: Number(itemDiscounts[String(item.id)] || 0)
    };
  });

  const totalGross = lines.reduce((sum, line) => sum + line.grossAmount, 0);
  const promoDiscount = lines.reduce((sum, line) => sum + line.itemDiscount, 0);
  if (lines.some((line) => line.itemDiscount < 0 || line.itemDiscount > line.grossAmount)) {
    throw new Error('INVALID_POS_PROMOTION_DISCOUNT');
  }
  const remainingGlobalDiscount = Math.max(
    0,
    Math.min(totalGross - promoDiscount, Number(billDiscount) || 0)
  );
  const remainingGross = totalGross - promoDiscount;
  let totalGst = 0;
  const items = {};
  lines.forEach((line) => {
    const afterPromotion = line.grossAmount - line.itemDiscount;
    const allocatedBillDiscount = remainingGross > 0
      ? remainingGlobalDiscount * (afterPromotion / remainingGross)
      : 0;
    const netAmount = Math.max(0, afterPromotion - allocatedBillDiscount);
    const tax = calcReverseGST(netAmount, line.gstPercent);
    totalGst += tax.gstAmount;
    items[String(line.item.id)] = {
      discountAmount: roundTo(line.itemDiscount + allocatedBillDiscount, 2),
      taxableAmount: tax.taxableAmount,
      gstAmount: tax.gstAmount,
      total: roundTo(netAmount, 2)
    };
  });

  return {
    totalGst: roundTo(totalGst, 2),
    items
  };
};

export const calcCartTotalGst = (cart, options) => {
  return calcCartTaxBreakdown(cart, options).totalGst;
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
  redeemPoints = 0, rupeePerPoint = 1, discountInput = null,
  promotion = null, gstPricingMode = null
} = {}) => {
  const subTotal = calcCartSubtotal(cart);
  const discountAmount = fromPercent(billDiscount, subTotal);
  const flatDiscountVal = toFloat(flatDiscount);
  const pointsDiscountVal = toFloat(redeemPoints) * toFloat(rupeePerPoint);
  const promotionDiscount = Math.max(0, Number(promotion?.discountAmount) || 0);
  const totalDiscount = discountAmount + flatDiscountVal + pointsDiscountVal + promotionDiscount;
  const billingError = totalDiscount > subTotal + 0.01
    ? 'POS_DISCOUNT_EXCEEDS_SUBTOTAL'
    : '';
  const manualDiscount = discountAmount + flatDiscountVal;
  const deliveryChargeAmount = fromPercent(deliveryChargePercent, subTotal);
  const rawTotal = subTotal - discountAmount + deliveryChargeAmount - flatDiscountVal - pointsDiscountVal - promotionDiscount;
  const finalTotal = Math.round(rawTotal);
  const roundOff = roundTo(finalTotal - rawTotal, 2);
  let taxBreakdown = null;
  let taxError = '';
  try {
    taxBreakdown = calcCartTaxBreakdown(cart, {
      gstPricingMode,
      itemDiscounts: promotion?.itemDiscounts,
      billDiscount: discountAmount + flatDiscountVal + pointsDiscountVal
    });
  } catch (error) {
    taxError = error.message;
  }

  const savingAmount = discountInput
    ? (discountInput.type === 'percent' ? fromPercent(discountInput.value, subTotal) : toFloat(discountInput.value))
    : 0;
  const newNetTotal = Math.round(subTotal - savingAmount - promotionDiscount + deliveryChargeAmount - pointsDiscountVal);

  return {
    subTotal: roundTo(subTotal, 2),
    totalGst: taxBreakdown?.totalGst ?? null,
    taxBreakdown,
    taxError,
    billingError,
    discountAmount: roundTo(discountAmount, 2),
    flatDiscountVal: roundTo(flatDiscountVal, 2),
    pointsDiscountVal: roundTo(pointsDiscountVal, 2),
    totalDiscount: roundTo(totalDiscount, 2),
    manualDiscount: roundTo(manualDiscount, 2),
    promotionDiscount: roundTo(promotionDiscount, 2),
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
  const orders = Array.isArray(sessionOrders) ? sessionOrders : [];
  const totalBills = orders.length;
  const grossSales = sumField(orders, 'subtotal');
  const totalDiscount = sumField(orders, 'discount');
  const totalGst = roundTo(orders.reduce((total, order) => (
    total + toFloat(order.total_gst ?? order.gst_amount)
  ), 0), 2);
  const netSales = sumField(orders, 'total_amount');

  const paymentMethod = (order) => String(order?.payment_method || '').trim().toLowerCase();
  const cashSales = sumField(orders.filter((order) => paymentMethod(order) === 'cash'), 'total_amount');
  const upiSales = sumField(orders.filter((order) => paymentMethod(order) === 'upi'), 'total_amount');
  const cardSales = sumField(orders.filter((order) => paymentMethod(order) === 'card'), 'total_amount');
  const splitSales = sumField(orders.filter((order) => (
    paymentMethod(order) === 'mixed' || paymentMethod(order) === 'split'
  )), 'total_amount');

  const amounts = orders.map(o => toFloat(o.total_amount));
  const highest = amounts.length ? Math.max(...amounts) : 0;
  const lowest = amounts.length ? Math.min(...amounts) : 0;
  const average = amounts.length && totalBills > 0 ? netSales / totalBills : 0;

  return {
    totalBills, grossSales: roundTo(grossSales, 2), totalDiscount: roundTo(totalDiscount, 2),
    totalGst: roundTo(totalGst, 2), netSales: roundTo(netSales, 2),
    cashSales: roundTo(cashSales, 2), upiSales: roundTo(upiSales, 2),
    cardSales: roundTo(cardSales, 2),
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
