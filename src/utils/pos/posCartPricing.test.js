import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAtomicCheckoutPayload } from './atomicCheckout.js';
import {
  calcBillTotals,
  calcCartLineTotal,
  calcReverseGST,
  getCartUnitPrice,
  validatePOSDiscountInput
} from './calculations.js';

test('reverse GST extracts inclusive tax with the configured rate and cent rounding', () => {
  assert.deepEqual(calcReverseGST(105, 5), { taxableAmount: 100, gstAmount: 5 });
  assert.deepEqual(calcReverseGST(109.99, 10), { taxableAmount: 99.99, gstAmount: 10 });
  assert.deepEqual(calcReverseGST(0, 5), { taxableAmount: 0, gstAmount: 0 });
  assert.deepEqual(calcReverseGST(100, 0), { taxableAmount: 100, gstAmount: 0 });
});

test('reverse GST rejects missing, malformed and negative tax inputs instead of defaulting', () => {
  assert.throws(() => calcReverseGST(100), /INVALID_GST_INPUT/);
  assert.throws(() => calcReverseGST(100, ''), /INVALID_GST_INPUT/);
  assert.throws(() => calcReverseGST(100, 'invalid'), /INVALID_GST_INPUT/);
  assert.throws(() => calcReverseGST(100, -5), /INVALID_GST_INPUT/);
  assert.throws(() => calcReverseGST(-1, 5), /INVALID_GST_INPUT/);
});

test('a zero online alias falls back to the canonical sale rate consistently across POS displays and totals', () => {
  const item = {
    id: 41,
    name: 'Rice',
    quantity: 2,
    onlinerate: 0,
    sale_rate: 45.5,
    mrp: 60,
    gst_percent: 5
  };

  const totals = calcBillTotals({ cart: [item], gstPricingMode: 'inclusive' });
  const lineAmount = calcCartLineTotal(item);
  const checkout = buildAtomicCheckoutPayload({
    cart: [item],
    customerInfo: { name: 'Walk-in' },
    subtotal: totals.subTotal,
    totalAmount: totals.finalTotal,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'Cash',
    paidAmount: totals.finalTotal,
    totalGst: totals.totalGst,
    roundOff: totals.roundOff
  });

  assert.equal(getCartUnitPrice(item), 45.5);
  assert.equal(lineAmount, totals.subTotal);
  assert.equal(totals.subTotal, 91);
  assert.equal(totals.totalGst, 4.33);
  assert.equal(totals.finalTotal, 91);
  assert.equal(totals.taxBreakdown.items['41'].total, 91);
  assert.equal(totals.taxBreakdown.items['41'].gstAmount, 4.33);
  assert.equal(checkout.items[0].rate, 45.5);
  assert.equal(checkout.items[0].total, lineAmount);
  assert.equal(item.mrp, 60);
});

test('zero-priced items remain distinguishable from missing selling prices', () => {
  assert.equal(getCartUnitPrice({ sale_rate: 0 }), 0);
  assert.equal(getCartUnitPrice({ onlinerate: 0 }), 0);
  assert.equal(getCartUnitPrice({ sale_rate: null, onlinerate: null }), null);
  assert.equal(getCartUnitPrice({ sale_rate: 'invalid' }), null);
  assert.equal(getCartUnitPrice({ sale_rate: '45abc' }), null);
});

test('a populated online rate continues to use the existing cart calculation precedence', () => {
  assert.equal(getCartUnitPrice({ onlinerate: 30, sale_rate: 45 }), 30);
});

test('checkout uses the same legacy online-rate alias as the POS totals', () => {
  const item = { id: 42, quantity: 2, onlinerate: 30, gst_percent: 0 };
  const totals = calcBillTotals({ cart: [item], gstPricingMode: 'inclusive' });
  const checkout = buildAtomicCheckoutPayload({
    cart: [item],
    subtotal: totals.subTotal,
    totalAmount: totals.finalTotal,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'Cash',
    paidAmount: totals.finalTotal
  });

  assert.equal(totals.subTotal, 60);
  assert.equal(checkout.items[0].rate, 30);
  assert.equal(checkout.items[0].total, 60);
});

test('GST-inclusive bill totals do not add included tax twice and allocate discounts before extraction', () => {
  const totals = calcBillTotals({
    cart: [
      { id: 51, quantity: 1, sale_rate: 105, gst_percent: 5 },
      { id: 52, quantity: 1, sale_rate: 110, gst_percent: 10 }
    ],
    flatDiscount: 10,
    gstPricingMode: 'inclusive'
  });

  assert.equal(totals.subTotal, 215);
  assert.equal(totals.finalTotal, 205);
  assert.equal(totals.totalGst, 14.3);
});

test('bill totals flag combined manual and promotional discounts above the subtotal', () => {
  const totals = calcBillTotals({
    cart: [{ id: 1, quantity: 1, sale_rate: 100, gst_percent: 5 }],
    billDiscount: 10,
    promotion: { discountAmount: 100, itemDiscounts: { '1': 100 } },
    gstPricingMode: 'inclusive'
  });

  assert.equal(totals.billingError, 'POS_DISCOUNT_EXCEEDS_SUBTOTAL');
});

test('delivery charges remain outside the product GST calculation', () => {
  const totals = calcBillTotals({
    cart: [{ id: 1, quantity: 1, sale_rate: 100, gst_percent: 10 }],
    deliveryChargePercent: 10,
    gstPricingMode: 'inclusive'
  });

  assert.equal(totals.deliveryChargeAmount, 10);
  assert.equal(totals.totalGst, 9.09);
  assert.equal(totals.finalTotal, 110);
});

test('missing GST configuration or item GST rate produces an explicit error without fabricating tax', () => {
  const noMode = calcBillTotals({
    cart: [{ id: 53, quantity: 1, sale_rate: 105, gst_percent: 5 }]
  });
  const noRate = calcBillTotals({
    cart: [{ id: 54, quantity: 1, sale_rate: 105 }],
    gstPricingMode: 'inclusive'
  });

  assert.equal(noMode.totalGst, null);
  assert.equal(noMode.taxError, 'POS_GST_CONFIGURATION_REQUIRED');
  assert.equal(noRate.totalGst, null);
  assert.equal(noRate.taxError, 'POS_GST_RATE_REQUIRED');
});

test('checkout rejects missing or invalid selling prices while accepting genuine zero prices', () => {
  const checkout = (item) => buildAtomicCheckoutPayload({
    cart: [{ id: 43, quantity: 1, ...item }],
    subtotal: 0,
    totalAmount: 0,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'Cash',
    paidAmount: 0
  });

  assert.throws(() => checkout({}), /INVALID_PRICE/);
  assert.throws(() => checkout({ sale_rate: 'not-a-price' }), /INVALID_PRICE/);
  assert.equal(checkout({ sale_rate: 0 }).items[0].rate, 0);
});

test('discount validation rejects blank, malformed, negative and excessive flat adjustments', () => {
  assert.equal(validatePOSDiscountInput('percent', '', 100).valid, false);
  assert.equal(validatePOSDiscountInput('flat', '12abc', 100).valid, false);
  assert.equal(validatePOSDiscountInput('flat', -1, 100).valid, false);
  assert.equal(validatePOSDiscountInput('flat', 101, 100).valid, false);
  assert.equal(validatePOSDiscountInput('percent', 101, 100).valid, false);
  assert.deepEqual(validatePOSDiscountInput('flat', '25', 100), { valid: true, value: 25 });
  assert.deepEqual(validatePOSDiscountInput('percent', '25', 100), { valid: true, value: 25 });
});
