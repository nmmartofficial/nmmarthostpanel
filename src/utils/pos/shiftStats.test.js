import assert from 'node:assert/strict';
import test from 'node:test';
import { calcShiftStats } from './calculations.js';

test('session payment totals recognize persisted lowercase methods and authoritative GST fields', () => {
  const stats = calcShiftStats([
    { subtotal: 100, discount: 5, total_amount: 95, total_gst: 4.52, payment_method: 'cash' },
    { subtotal: 40, discount: 0, total_amount: 40, total_gst: 1.90, payment_method: 'UPI' },
    { subtotal: 60, discount: 0, total_amount: 60, total_gst: 2.86, payment_method: 'card' },
    { subtotal: 90, discount: 0, total_amount: 90, total_gst: 4.29, payment_method: 'mixed' }
  ]);

  assert.equal(stats.totalBills, 4);
  assert.equal(stats.grossSales, 290);
  assert.equal(stats.totalDiscount, 5);
  assert.equal(stats.totalGst, 13.57);
  assert.equal(stats.netSales, 285);
  assert.equal(stats.cashSales, 95);
  assert.equal(stats.upiSales, 40);
  assert.equal(stats.cardSales, 60);
  assert.equal(stats.splitSales, 90);
});

test('session statistics treat missing order data as an empty session', () => {
  const stats = calcShiftStats(null);

  assert.equal(stats.totalBills, 0);
  assert.equal(stats.cashSales, 0);
  assert.equal(stats.cardSales, 0);
  assert.equal(stats.totalGst, 0);
});
