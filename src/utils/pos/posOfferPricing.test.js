import assert from 'node:assert/strict';
import test from 'node:test';
import { selectBestPOSPromotion } from './posOfferPricing.js';

const cart = [
  { id: 1, category_id: 10, quantity: 2, sale_rate: 100 },
  { id: 2, category_id: 10, quantity: 1, sale_rate: 50 }
];

test('selects the highest eligible percentage or fixed automatic offer without stacking', () => {
  const result = selectBestPOSPromotion({
    cart,
    offers: [
      { id: 1, is_active: true, offer_type: 'Percentage', discount_value: 10 },
      { id: 2, is_active: true, offer_type: 'Discount', discount_value: 25 }
    ],
    now: '2026-10-20T10:00:00Z'
  });

  assert.equal(result.selected.id, 1);
  assert.equal(result.selected.discountAmount, 25);
  assert.equal(Object.values(result.selected.itemDiscounts).reduce((sum, n) => sum + n, 0), 25);
});

test('selects one valid entered coupon against eligible automatic offers', () => {
  const result = selectBestPOSPromotion({
    cart,
    offers: [{ id: 1, is_active: true, offer_type: 'Discount', discount_value: 20 }],
    coupons: [{
      id: 8,
      code: 'SAVE30',
      is_active: true,
      discount_type: 'percentage',
      discount_value: 30,
      max_discount: 40,
      valid_from: '2026-10-01',
      valid_to: '2026-10-31'
    }],
    couponCode: ' save30 ',
    now: '2026-10-20T10:00:00Z'
  });

  assert.equal(result.selected.kind, 'coupon');
  assert.equal(result.selected.id, 8);
  assert.equal(result.selected.discountAmount, 40);
  assert.equal(result.couponError, '');
});

test('fixed coupon discounts are capped to eligible item value and coupon usage limits are honored', () => {
  const result = selectBestPOSPromotion({
    cart,
    coupons: [{
      id: 9,
      code: 'FLAT',
      is_active: true,
      discount_type: 'flat',
      discount_value: 500,
      applies_to: 'product',
      applies_to_id: 2,
      usage_limit: 2,
      used_count: 2
    }],
    couponCode: 'FLAT',
    now: '2026-10-20T10:00:00Z'
  });

  assert.equal(result.selected, null);
  assert.equal(result.couponError, 'Coupon usage limit has been reached');
});

test('Buy X Get Y rewards only quantities of the same SKU, including category-targeted offers', () => {
  const result = selectBestPOSPromotion({
    cart: [
      { id: 1, category_id: 10, quantity: 3, sale_rate: 100 },
      { id: 2, category_id: 10, quantity: 1, sale_rate: 50 }
    ],
    offers: [{
      id: 3,
      is_active: true,
      offer_type: 'BOGO',
      buy_qty: 1,
      get_qty: 1,
      applies_to_type: 'category',
      applies_to_id: 10
    }],
    now: '2026-10-20T10:00:00Z'
  });

  assert.equal(result.selected.discountAmount, 100);
  assert.deepEqual(result.selected.freeQuantities, { 1: 1 });
});

test('inactive, expired, unsupported, and invalid offers are excluded', () => {
  const result = selectBestPOSPromotion({
    cart,
    offers: [
      { id: 1, is_active: false, offer_type: 'Discount', discount_value: 500 },
      { id: 2, is_active: true, offer_type: 'Discount', discount_value: 500, valid_to: '2026-10-19' },
      { id: 3, is_active: true, offer_type: 'Bundle', discount_value: 500 },
      { id: 4, is_active: true, offer_type: 'Percentage', discount_value: 101 }
    ],
    couponCode: 'UNKNOWN',
    now: '2026-10-20T10:00:00Z'
  });

  assert.equal(result.selected, null);
  assert.equal(result.couponError, 'Coupon code not found');
});
