import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPOSCartItem,
  changePOSCartItemQuantity,
  setPOSCartItemQuantity,
  isPOSQuantityWithinStock
} from './usePosActions.js';

test('adding an existing product increments its cart quantity without adding a duplicate', () => {
  const original = { id: 7, name: 'Rice', quantity: 2 };
  const other = { id: 8, name: 'Oil', quantity: 1 };

  const updated = addPOSCartItem([original, other], { id: 7, name: 'Rice' });

  assert.equal(updated.length, 2);
  assert.equal(updated[0].quantity, 3);
  assert.equal(updated[1], other);
});

test('adding a product preserves its separate MRP and selling-price source fields', () => {
  const product = { id: 9, mrp: 60, onlinerate: 0, sale_rate: 45.5 };

  const [cartItem] = addPOSCartItem([], product);

  assert.equal(cartItem.mrp, 60);
  assert.equal(cartItem.onlinerate, 0);
  assert.equal(cartItem.sale_rate, 45.5);
  assert.equal(cartItem.quantity, 1);
});

test('cart quantity changes apply to the latest state and preserve other items', () => {
  const first = { id: 7, name: 'Rice', quantity: 1 };
  const other = { id: 8, name: 'Oil', quantity: 1 };
  const initialCart = [first, other];

  const afterFirstTap = changePOSCartItemQuantity(initialCart, 7, 1);
  const afterSecondTap = changePOSCartItemQuantity(afterFirstTap, 7, 1);

  assert.equal(afterSecondTap[0].quantity, 3);
  assert.equal(afterSecondTap[1], other);
});

test('setting quantity to zero removes only the selected cart item', () => {
  const cart = [
    { id: 7, name: 'Rice', quantity: 1 },
    { id: 8, name: 'Oil', quantity: 1 }
  ];

  assert.deepEqual(setPOSCartItemQuantity(cart, 7, 0), [cart[1]]);
});

test('invalid quantity changes preserve the current cart', () => {
  const cart = [{ id: 7, name: 'Rice', quantity: 1 }];

  assert.equal(setPOSCartItemQuantity(cart, 7, Number.NaN), cart);
  assert.equal(changePOSCartItemQuantity(cart, 7, Number.NaN), cart);
});

test('stock limits prevent adding or increasing cart quantities beyond current availability', () => {
  const product = { id: 7, stock: '2' };

  assert.equal(isPOSQuantityWithinStock(product, 2), true);
  assert.equal(isPOSQuantityWithinStock(product, 3), false);
  assert.equal(isPOSQuantityWithinStock({ ...product, stock: 0 }, 1), false);
  assert.equal(isPOSQuantityWithinStock({ id: 8, stock: null }, 100), true);
  assert.equal(isPOSQuantityWithinStock({ id: 9, stock: 'unknown' }, 1), false);
  assert.equal(isPOSQuantityWithinStock({ id: 10, stock: 5 }, -1), false);
});
