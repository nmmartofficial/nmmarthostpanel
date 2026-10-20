import { useMemo } from 'react';
import {
  calcBillTotals,
  calcCartTotalQuantity,
  summarizePOSPaymentAmounts
} from '../utils/pos';

export const useBillingCalculations = ({
  cart = [],
  billDiscount = 0,
  deliveryChargePercent = 0,
  flatDiscount = 0,
  redeemPoints = 0,
  paymentAmounts = { Cash: 0, UPI: 0, Card: 0 },
  discountInput = null,
  promotion = null,
  gstPricingMode = null
}) => {
  const totals = useMemo(() => calcBillTotals({
    cart,
    billDiscount,
    deliveryChargePercent,
    flatDiscount,
    redeemPoints,
    discountInput,
    promotion,
    gstPricingMode
  }), [
    cart,
    billDiscount,
    deliveryChargePercent,
    flatDiscount,
    redeemPoints,
    discountInput,
    promotion,
    gstPricingMode
  ]);

  const paymentSummary = useMemo(
    () => summarizePOSPaymentAmounts(paymentAmounts, totals.finalTotal),
    [paymentAmounts, totals.finalTotal]
  );
  const paidTotal = paymentSummary.paidTotal;
  const totalQuantity = useMemo(() => calcCartTotalQuantity(cart), [cart]);
  const avgItemPrice = useMemo(
    () => (cart.length > 0 ? totals.subTotal / cart.length : 0),
    [cart.length, totals.subTotal]
  );
  const changeReturn = paymentSummary.changeReturn;
  const remainingToPay = paymentSummary.remainingToPay;
  const isPaymentValid = !totals.taxError
    && !totals.billingError
    && paymentSummary.isValid;

  const cartSummary = useMemo(() => ({
    itemsCount: cart.length,
    totalItems: cart.length,
    totalQuantity,
    avgItemPrice,
    totalAmount: totals.finalTotal,
    taxAmount: totals.totalGst,
    discountAmount: totals.totalDiscount,
    savings: totals.savingAmount
  }), [cart.length, totalQuantity, avgItemPrice, totals]);

  return {
    ...totals,
    taxAmount: totals.totalGst,
    grandTotal: totals.finalTotal,
    netTotal: totals.newNetTotal,
    customerPayable: totals.finalTotal,
    customerSavings: totals.totalDiscount > 0 ? totals.totalDiscount : totals.savingAmount,
    paidTotal,
    paidAmount: paidTotal,
    changeReturn,
    remainingToPay,
    remainingAmount: remainingToPay,
    paymentValidationError: paymentSummary.error,
    splitPaymentTotals: paymentAmounts,
    isPaymentValid,
    cartSummary,
    totalItems: cart.length,
    totalQuantity,
    avgItemPrice
  };
};
