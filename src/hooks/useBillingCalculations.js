import { useMemo } from 'react';
import { toFloat, calcCartSubtotal, calcCartTotalGst, calcCartTotalQuantity } from '../utils/pos';

/**
 * Enterprise Billing Calculation Engine
 * Extracted pure calculation logic for NM MART POS.
 */
export const useBillingCalculations = ({
  cart = [],
  billDiscount = 0,
  deliveryChargePercent = 0,
  flatDiscount = 0,
  redeemPoints = 0,
  paymentAmounts = { Cash: 0, UPI: 0, Card: 0 },
  discountInput = null
}) => {
  const RUPEE_PER_POINT = 1;

  // 1. Sub Total Calculation
  const subTotal = useMemo(() => calcCartSubtotal(cart), [cart]);

  // 2. GST / Tax Calculations
  const totalGst = useMemo(() => calcCartTotalGst(cart), [cart]);

  // 3. Discount Calculations
  const discountAmount = useMemo(() =>
    (subTotal * toFloat(billDiscount)) / 100,
    [subTotal, billDiscount]
  );

  const flatDiscountVal = useMemo(() => toFloat(flatDiscount), [flatDiscount]);

  const pointsDiscountVal = useMemo(() =>
    toFloat(redeemPoints) * RUPEE_PER_POINT,
    [redeemPoints]
  );

  const totalDiscount = useMemo(() =>
    discountAmount + flatDiscountVal + pointsDiscountVal,
    [discountAmount, flatDiscountVal, pointsDiscountVal]
  );

  const manualDiscount = useMemo(() =>
    discountAmount + flatDiscountVal,
    [discountAmount, flatDiscountVal]
  );

  // 4. Surcharges / Delivery
  const deliveryChargeAmount = useMemo(() =>
    (subTotal * toFloat(deliveryChargePercent)) / 100,
    [subTotal, deliveryChargePercent]
  );

  // 5. Totals Logic
  const rawTotal = useMemo(() =>
    subTotal - discountAmount + deliveryChargeAmount - flatDiscountVal - pointsDiscountVal,
    [subTotal, discountAmount, deliveryChargeAmount, flatDiscountVal, pointsDiscountVal]
  );

  const finalTotal = useMemo(() => Math.round(rawTotal), [rawTotal]);
  const roundOff = useMemo(() => toFloat((finalTotal - rawTotal).toFixed(2)), [finalTotal, rawTotal]);

  // 6. Savings Calculations
  const savingAmount = useMemo(() => {
    if (!discountInput) return 0;
    const val = toFloat(discountInput.value);
    return discountInput.type === 'percent' ? (subTotal * val / 100) : val;
  }, [subTotal, discountInput]);

  const newNetTotal = useMemo(() =>
    Math.round(subTotal - savingAmount + deliveryChargeAmount - pointsDiscountVal),
    [subTotal, savingAmount, deliveryChargeAmount, pointsDiscountVal]
  );

  // 7. Payment Status
  const paidTotal = useMemo(() =>
    Object.values(paymentAmounts).reduce((a, b) => a + toFloat(b), 0),
    [paymentAmounts]
  );

  const changeReturn = useMemo(() => Math.max(0, paidTotal - finalTotal), [paidTotal, finalTotal]);
  const remainingToPay = useMemo(() => Math.max(0, finalTotal - paidTotal), [finalTotal, paidTotal]);

  const isPaymentValid = useMemo(() => paidTotal >= finalTotal, [paidTotal, finalTotal]);

  // 8. Summary & Statistics
  const totalQuantity = useMemo(() => calcCartTotalQuantity(cart), [cart]);

  const avgItemPrice = useMemo(() =>
    cart.length > 0 ? subTotal / cart.length : 0,
    [cart.length, subTotal]
  );

  const cartSummary = useMemo(() => {
    return {
      itemsCount: cart.length,
      totalItems: cart.length,
      totalQuantity,
      avgItemPrice,
      totalAmount: finalTotal,
      taxAmount: totalGst,
      discountAmount: totalDiscount,
      savings: savingAmount
    };
  }, [cart.length, totalQuantity, avgItemPrice, finalTotal, totalGst, totalDiscount, savingAmount]);

  return {
    // Basic Totals
    subTotal,
    totalGst,
    taxAmount: totalGst,

    // Discounts
    discountAmount,
    flatDiscountVal,
    pointsDiscountVal,
    totalDiscount,
    manualDiscount,

    // Surcharges
    deliveryChargeAmount,

    // Final Totals
    finalTotal,
    grandTotal: finalTotal,
    netTotal: newNetTotal,
    roundOff,
    customerPayable: finalTotal,

    // Savings
    savingAmount,
    customerSavings: totalDiscount > 0 ? totalDiscount : savingAmount,

    // Payments
    paidTotal,
    paidAmount: paidTotal,
    changeReturn,
    remainingToPay,
    remainingAmount: remainingToPay,
    splitPaymentTotals: paymentAmounts,
    isPaymentValid,

    // Summary & Aliases
    cartSummary,
    totalItems: cart.length,
    totalQuantity,
    avgItemPrice
  };
};
