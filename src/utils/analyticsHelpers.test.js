import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesTrendData, buildStatusData, buildCategoryData, buildAnalyticsMetrics } from './analyticsHelpers.js';

test('buildSalesTrendData returns 7 days of revenue summary', () => {
  const orders = [{ created_at: new Date().toISOString(), total_amount: 100 }];
  const result = buildSalesTrendData(orders);

  assert.equal(result.length, 7);
  assert.equal(result[3].orders, 1);
});

test('buildStatusData aggregates order statuses', () => {
  const orders = [{ status: 'paid' }, { status: 'pending' }, { status: 'paid' }];
  const result = buildStatusData(orders);

  assert.equal(result.find((entry) => entry.name === 'PAID').value, 2);
  assert.equal(result.find((entry) => entry.name === 'PENDING').value, 1);
});

test('buildCategoryData summarizes revenue by category', () => {
  const orders = [{ category_name: 'General', total_amount: 120 }, { category_name: 'General', total_amount: 80 }];
  const result = buildCategoryData(orders);

  assert.equal(result[0].name, 'General');
  assert.equal(result[0].revenue, 200);
});

test('buildAnalyticsMetrics creates summary metrics', () => {
  const result = buildAnalyticsMetrics([{ total_amount: 100 }, { total_amount: 300 }]);

  assert.equal(result[0].label, 'Total Revenue');
  assert.equal(result[1].value, 2);
});
