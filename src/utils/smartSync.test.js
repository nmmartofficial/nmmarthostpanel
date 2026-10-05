import assert from 'node:assert/strict';
import test from 'node:test';
import { createSmartSyncEngine } from './smartSync.js';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test('batches repeated invalidations and emits refreshed resource data', async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const emittedEvents = [];
  globalThis.CustomEvent = class extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
  globalThis.window = { dispatchEvent: (event) => emittedEvents.push(event) };
  const engine = createSmartSyncEngine({ batchMs: 5 });
  let refreshCount = 0;
  const unregister = engine.registerResource('products', async () => {
    refreshCount += 1;
    return [{ id: 1 }];
  });

  engine.invalidateResource('products');
  engine.invalidateResource('products');
  await delay(25);

  assert.equal(refreshCount, 1);
  assert.deepEqual(emittedEvents[0]?.detail, {
    resources: ['products'],
    data: { products: [{ id: 1 }] }
  });
  unregister();
  engine.dispose();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
  if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
  else globalThis.CustomEvent = previousCustomEvent;
});

test('holds invalidated resources while an edit pause is active', async () => {
  const engine = createSmartSyncEngine({ batchMs: 5 });
  let refreshCount = 0;
  engine.registerResource('orders', async () => {
    refreshCount += 1;
  });
  const resume = engine.pauseSyncDuringEdit('orders');
  engine.invalidateResource('orders');
  await delay(15);
  assert.equal(refreshCount, 0);

  resume();
  await delay(15);
  assert.equal(refreshCount, 1);
  engine.dispose();
});

test('deduplicates scoped watchers and rejects other tenant or company events', () => {
  const engine = createSmartSyncEngine();
  let subscribeCount = 0;
  let unsubscribeCount = 0;
  let notifyCount = 0;
  let deliver;
  const subscribe = (callback) => {
    subscribeCount += 1;
    deliver = callback;
    return { unsubscribe: () => { unsubscribeCount += 1; } };
  };
  const watch = (onChange) => engine.watchTable({
    table: 'orders',
    tenantId: 10,
    companyCode: 'NMM001',
    subscribe,
    onChange
  });
  const stopFirst = watch(() => { notifyCount += 1; });
  const stopSecond = watch(() => { notifyCount += 1; });

  assert.equal(subscribeCount, 1);
  deliver({ new: { tenant_id: 11, company_code: 'NMM001' } });
  deliver({ new: { tenant_id: 10, company_code: 'OTHER' } });
  assert.equal(notifyCount, 0);
  deliver({ new: { tenant_id: 10, company_code: 'NMM001' } });
  assert.equal(notifyCount, 2);

  stopFirst();
  assert.equal(unsubscribeCount, 0);
  stopSecond();
  assert.equal(unsubscribeCount, 1);
  engine.dispose();
});

test('queues invalidations while offline and refreshes after reconnect', async () => {
  const engine = createSmartSyncEngine({ batchMs: 5 });
  let refreshCount = 0;
  engine.registerResource('wallet_master', async () => {
    refreshCount += 1;
  });

  engine.setConnectionState(false);
  engine.invalidateResource('wallet_master');
  await delay(15);
  assert.equal(refreshCount, 0);

  engine.setConnectionState(true);
  await delay(15);
  assert.equal(refreshCount, 1);
  engine.dispose();
});

test('reports refresh failures without emitting successful resource data', async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const emittedEvents = [];
  globalThis.CustomEvent = class extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
  globalThis.window = { dispatchEvent: (event) => emittedEvents.push(event) };
  const engine = createSmartSyncEngine({ batchMs: 5 });
  engine.registerResource('orders', async () => {
    throw new Error('refresh failed');
  });
  const statuses = [];
  const unsubscribeStatus = engine.subscribeStatus((status) => statuses.push(status.state));

  engine.invalidateResource('orders');
  await delay(20);

  assert.ok(statuses.includes('error'));
  assert.equal(emittedEvents.length, 0);
  unsubscribeStatus();
  engine.dispose();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
  if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
  else globalThis.CustomEvent = previousCustomEvent;
});
