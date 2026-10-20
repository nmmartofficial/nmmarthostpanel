import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPersistedPOSInvoice,
  fetchPersistedPOSInvoice
} from './receiptHelpers.js';

const order = {
  id: 81,
  order_number: 'POS-server-generated',
  created_at: '2026-10-20T08:00:00.000Z',
  customer_name: 'Asha Rao',
  user_mobile: '9876543210',
  subtotal: 200,
  discount: 15,
  coupon_discount: 5,
  offer_discount: 0,
  points_discount: 0,
  delivery_charge: 0,
  total_gst: 8.81,
  gst_pricing_mode: 'inclusive',
  round_off: 0,
  total_amount: 185,
  payment_method: 'cash',
  payment_status: 'paid'
};

const item = {
  id: 901,
  product_id: 5,
  product_name: 'Persisted Rice',
  quantity: 2,
  rate: 100,
  discount_amount: 15,
  gst_percent: 5,
  gst_amount: 8.81,
  total: 185
};

test('invoice uses saved order and item values without recalculating billing totals', () => {
  const invoice = createPersistedPOSInvoice(order, [item]);

  assert.equal(invoice.order_number, 'POS-server-generated');
  assert.equal(invoice.total_amount, 185);
  assert.equal(invoice.discount, 15);
  assert.equal(invoice.coupon_discount, 5);
  assert.equal(invoice.total_gst, 8.81);
  assert.equal(invoice.gst_pricing_mode, 'inclusive');
  assert.equal(invoice.items[0].rate, 100);
  assert.equal(invoice.items[0].total, 185);
  assert.equal(invoice.items[0].name, 'Persisted Rice');
  assert.equal(invoice.items[0].mrp, undefined);
});

test('invoice is suppressed when saved order details or order items are incomplete', () => {
  assert.throws(() => createPersistedPOSInvoice(null, [item]), /incomplete/);
  assert.throws(() => createPersistedPOSInvoice(order, []), /items are unavailable/);
  assert.throws(
    () => createPersistedPOSInvoice(order, [{ ...item, rate: null }]),
    /item values are incomplete/
  );
});

test('invoice is suppressed when saved header totals disagree with item rows', () => {
  assert.throws(
    () => createPersistedPOSInvoice({ ...order, total_amount: 184.99 }, [item]),
    /totals do not reconcile/
  );
  assert.throws(
    () => createPersistedPOSInvoice({ ...order, discount: 14 }, [item]),
    /discounts do not reconcile/
  );
  assert.throws(
    () => createPersistedPOSInvoice({ ...order, total_gst: 8.8 }, [item]),
    /GST totals do not reconcile/
  );
});

test('invoice retrieval is scoped to the persisted order and its tenant/store', async () => {
  const calls = [];
  const client = {
    from(table) {
      const query = {
        table,
        filters: [],
        select() { return this; },
        eq(column, value) {
          this.filters.push([column, value]);
          return this;
        },
        single: async function () {
          calls.push({ table: this.table, filters: this.filters });
          return { data: order, error: null };
        },
        then(resolve) {
          calls.push({ table: this.table, filters: this.filters });
          return Promise.resolve({ data: [item], error: null }).then(resolve);
        }
      };
      return query;
    }
  };

  const invoice = await fetchPersistedPOSInvoice(client, {
    orderId: 81,
    tenantId: 4,
    companyCode: 'STORE-4'
  });

  assert.equal(invoice.id, 81);
  assert.deepEqual(calls[0].filters, [
    ['id', 81],
    ['tenant_id', 4],
    ['company_code', 'STORE-4']
  ]);
  assert.deepEqual(calls[1].filters, [
    ['order_id', 81],
    ['tenant_id', 4],
    ['company_code', 'STORE-4']
  ]);
});

test('invoice retrieval surfaces backend errors instead of returning fallback invoice data', async () => {
  const client = {
    from() {
      const query = {
        select() { return this; },
        eq() { return this; },
        single: async () => ({ data: null, error: new Error('order fetch failed') })
      };
      return query;
    }
  };

  await assert.rejects(
    fetchPersistedPOSInvoice(client, {
      orderId: 81,
      tenantId: 4,
      companyCode: 'STORE-4'
    }),
    /order fetch failed/
  );
});
