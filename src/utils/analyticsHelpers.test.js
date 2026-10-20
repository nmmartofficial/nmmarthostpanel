import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSalesTrendData,
  buildStatusData,
  buildCategoryData,
  buildAnalyticsMetrics,
  buildTopSellingProducts,
  filterRowsToCurrentStore,
  isEligiblePaidSale,
  summarizePaidSales,
} from './analyticsHelpers.js';

test('buildSalesTrendData returns 7 days of revenue summary', () => {
  const now = new Date(2026, 9, 20, 12);
  const orders = [
    { id: 1, created_at: now.toISOString(), total_amount: 100, payment_status: 'paid' },
    { id: 2, created_at: now.toISOString(), total_amount: 20, payment_status: 'pending' },
    { id: 3, created_at: now.toISOString(), total_amount: 30, payment_status: 'paid', order_status: 'cancelled' }
  ];
  const result = buildSalesTrendData(orders, now);

  assert.equal(result.length, 7);
  assert.equal(result[6].orders, 1);
  assert.equal(result[6].revenue, 100);
});

test('buildStatusData aggregates order statuses', () => {
  const orders = [{ status: 'paid' }, { status: 'pending' }, { status: 'paid' }];
  const result = buildStatusData(orders);

  assert.equal(result.find((entry) => entry.name === 'PAID').value, 2);
  assert.equal(result.find((entry) => entry.name === 'PENDING').value, 1);
});

test('buildCategoryData summarizes persisted item totals for paid orders only', () => {
  const orders = [
    { id: 1, payment_status: 'paid', status: 'delivered' },
    { id: 2, payment_status: 'paid', status: 'returned' }
  ];
  const items = [
    { order_id: 1, product_id: 7, quantity: 2, total: 120 },
    { order_id: 2, product_id: 7, quantity: 2, total: 80 }
  ];
  const products = [{ id: 7, category_name: 'General' }];
  const result = buildCategoryData(items, products, orders);

  assert.equal(result[0].name, 'General');
  assert.equal(result[0].revenue, 120);
});

test('buildAnalyticsMetrics creates summary metrics', () => {
  const result = buildAnalyticsMetrics([
    { total_amount: 100, payment_status: 'paid' },
    { total_amount: 300, payment_status: 'paid' }
  ]);

  assert.equal(result[0].label, 'Paid Sales Revenue');
  assert.equal(result[1].value, 2);
  assert.equal(result[0].trend, 'Loaded data');
});

test('paid report summary excludes unpaid and cancelled or returned sales', () => {
  const summary = summarizePaidSales([
    { total_amount: 100, payment_status: 'paid', status: 'delivered', discount: 5, total_gst: 4.76, payment_method: 'cash' },
    { total_amount: 70, payment_status: 'pending', status: 'pending' },
    { total_amount: 40, payment_status: 'paid', order_status: 'cancelled' },
    { total_amount: 30, payment_status: 'paid', status: 'returned' }
  ]);

  assert.deepEqual(summary, {
    orderCount: 1,
    revenue: 100,
    discounts: 5,
    gst: 4.76,
    payments: { CASH: 100 }
  });
});

test('paid sale eligibility uses authoritative order status and payment status', () => {
  assert.equal(isEligiblePaidSale({ payment_status: 'paid', status: 'completed' }), true);
  assert.equal(isEligiblePaidSale({ payment_status: 'paid', order_status: 'returned', status: 'completed' }), false);
  assert.equal(isEligiblePaidSale({ status: 'completed' }), false);
});

test('report rows require an exact tenant and store match', () => {
  const scope = { tenant_id: 'tenant-a', company_code: 'STORE-A' };
  const rows = [
    { id: 1, tenant_id: 'tenant-a', company_code: 'STORE-A' },
    { id: 2, tenant_id: 'tenant-b', company_code: 'STORE-A' },
    { id: 3, tenant_id: 'tenant-a', company_code: 'STORE-B' },
    { id: 4, tenant_id: 'tenant-a' }
  ];
  assert.deepEqual(filterRowsToCurrentStore(rows, scope).map((row) => row.id), [1]);
  assert.deepEqual(filterRowsToCurrentStore(rows, null), []);
});

test('item reports aggregate only items from eligible paid orders', () => {
  const orders = [
    { id: 'paid', payment_status: 'paid', status: 'completed' },
    { id: 'pending', payment_status: 'pending', status: 'pending' }
  ];
  const orderItems = [
    { order_id: 'paid', product_id: 5, quantity: 2, total: 60 },
    { order_id: 'pending', product_id: 5, quantity: 8, total: 240 }
  ];

  assert.deepEqual(
    buildTopSellingProducts(orderItems, [{ id: 5, name: 'Item' }], orders)
      .map(({ id, quantity, revenue }) => ({ id, quantity, revenue })),
    [{ id: '5', quantity: 2, revenue: 60 }]
  );
});
