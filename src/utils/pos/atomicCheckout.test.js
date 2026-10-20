import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAtomicCheckoutPayload, validateAtomicCheckoutInput } from './atomicCheckout.js';

test('builds an atomic cash checkout payload without a client order number', () => {
  const payload = buildAtomicCheckoutPayload({
    cart: [{ id: 10, itname: 'Test Product', quantity: 2, sale_rate: 50 }],
    selectedUser: null,
    customerInfo: { name: 'Walk-in', mob: '', add: '' },
    subtotal: 100,
    totalAmount: 100,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'Cash',
    paidAmount: 120
  });

  assert.equal(payload.order_header.order_number, undefined);
  assert.equal(payload.order_header.payment_method, 'cash');
  assert.equal(payload.items[0].quantity, 2);
  assert.equal(payload.payment.amount, 120);
});

test('rejects insufficient payment before RPC dispatch', () => {
  assert.throws(
    () => validateAtomicCheckoutInput({
      cart: [{ id: 10, quantity: 1 }],
      totalAmount: 100,
      paidAmount: 50,
      paymentMethod: 'Cash'
    }),
    /INSUFFICIENT_PAYMENT/
  );
});

test('rejects invalid quantity before RPC dispatch', () => {
  assert.throws(
    () => validateAtomicCheckoutInput({
      cart: [{ id: 10, quantity: 0 }],
      totalAmount: 0,
      paidAmount: 0,
      paymentMethod: 'Cash'
    }),
    /INVALID_QUANTITY/
  );
});

test('normalizes split payment to the existing mixed database value', () => {
  const payload = buildAtomicCheckoutPayload({
    cart: [{ id: 10, quantity: 1, sale_rate: 100 }],
    subtotal: 100,
    totalAmount: 100,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'Split',
    paidAmount: 100
  });

  assert.equal(payload.order_header.payment_method, 'mixed');
});

test('keeps the selected user record and authoritative phone field in checkout payload', () => {
  const payload = buildAtomicCheckoutPayload({
    cart: [{ id: 10, quantity: 1, sale_rate: 50 }],
    selectedUser: { id: 24, name: 'Asha Rao', phone: '9876543210', address: 'Actual address' },
    subtotal: 50,
    totalAmount: 50,
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: 'Cash',
    paidAmount: 50,
    paymentAmounts: { Cash: 50, UPI: 0, Card: 0 }
  });

  assert.equal(payload.order_header.user_id, 24);
  assert.equal(payload.order_header.customer_name, 'Asha Rao');
  assert.equal(payload.order_header.user_mobile, '9876543210');
  assert.equal(payload.order_header.delivery_address, 'Actual address');
});

test('rejects a payment breakdown that does not match the amount passed to checkout', () => {
  assert.throws(
    () => validateAtomicCheckoutInput({
      cart: [{ id: 10, quantity: 1, sale_rate: 100 }],
      totalAmount: 100,
      paidAmount: 101,
      paymentMethod: 'Cash',
      paymentAmounts: { Cash: 100, UPI: 0, Card: 0 }
    }),
    /PAYMENT_AMOUNT_MISMATCH/
  );
});

test('rejects a payment method that differs from the entered tender', () => {
  assert.throws(
    () => validateAtomicCheckoutInput({
      cart: [{ id: 10, quantity: 1, sale_rate: 100 }],
      totalAmount: 100,
      paidAmount: 100,
      paymentMethod: 'Cash',
      paymentAmounts: { Cash: 0, UPI: 100, Card: 0 }
    }),
    /PAYMENT_METHOD_MISMATCH/
  );
});

test('includes tax, promotion and one-time override approval data in the checkout contract', () => {
  const payload = buildAtomicCheckoutPayload({
    cart: [{
      id: 10,
      itname: 'Test Product',
      quantity: 2,
      sale_rate: 50,
      gst_percent: 5,
      price_override_approval_id: 'price-approval'
    }],
    subtotal: 100,
    totalAmount: 95,
    discount: 10,
    deliveryCharge: 5,
    deliveryChargePercent: 5,
    paymentMethod: 'Cash',
    paidAmount: 95,
    totalGst: 4.29,
    roundOff: 0,
    promotion: { kind: 'offer', id: 42, discountAmount: 10 },
    pointsDiscount: 0,
    discountOverrideApprovalId: 'discount-approval',
    taxBreakdown: {
      items: {
        '10': { discountAmount: 10, gstAmount: 4.29, total: 90 }
      }
    }
  });

  assert.equal(payload.order_header.total_gst, 4.29);
  assert.equal(payload.order_header.delivery_charge_percent, 5);
  assert.equal(payload.order_header.offer_id, 42);
  assert.equal(payload.order_header.offer_discount, 10);
  assert.equal(payload.order_header.manual_discount_approval_id, 'discount-approval');
  assert.equal(payload.items[0].override_approval_id, 'price-approval');
});
