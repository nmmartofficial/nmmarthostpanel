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
