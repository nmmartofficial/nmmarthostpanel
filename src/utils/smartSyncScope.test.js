import assert from 'node:assert/strict';
import test from 'node:test';
import { createSmartSyncEngine } from './smartSync.js';
import {
  createSmartSyncSubscriptionManager,
  resolveSmartSyncScope
} from './smartSyncScope.js';

const validProfile = { tenant_id: 42, company_code: 'SHOP042' };

const setupManager = () => {
  const engine = createSmartSyncEngine();
  const manager = createSmartSyncSubscriptionManager(engine);
  const subscriptions = [];
  const subscribe = (table, onChange, onStatus, scope) => {
    const subscription = {
      table,
      scope,
      onChange,
      onStatus,
      unsubscribed: false,
      unsubscribe() {
        this.unsubscribed = true;
      }
    };
    subscriptions.push(subscription);
    return subscription;
  };
  const onChange = () => {};
  return { engine, manager, onChange, subscribe, subscriptions };
};

test('authenticated profile and active company resolve the canonical tenant scope', () => {
  assert.deepEqual(resolveSmartSyncScope({ currentUser: validProfile }), {
    tenantId: 42,
    companyCode: 'SHOP042'
  });
  assert.deepEqual(resolveSmartSyncScope({
    currentUser: { tenant_id: 8, company_code: 'PROFILE' },
    currentCompany: { id: 42, company_code: 'SHOP042' }
  }), {
    tenantId: 42,
    companyCode: 'SHOP042'
  });

  const { engine, manager, subscribe, subscriptions, onChange } = setupManager();
  assert.equal(manager.configure({
    scope: resolveSmartSyncScope({ currentUser: validProfile }),
    resources: ['orders'],
    subscribe,
    onChange
  }), true);
  assert.equal(subscriptions.length, 1);
  assert.deepEqual(subscriptions[0].scope, { tenantId: 42, companyCode: 'SHOP042' });
  manager.dispose();
  engine.dispose();
});

test('scope resolution remains pending until profile and company hydration completes', () => {
  const { engine, manager, subscribe, subscriptions, onChange } = setupManager();
  assert.equal(resolveSmartSyncScope({ currentUser: null, currentCompany: null }), null);
  assert.equal(manager.configure({
    scope: null,
    resources: ['orders'],
    subscribe,
    onChange
  }), false);
  assert.equal(subscriptions.length, 0);

  const resolvedScope = resolveSmartSyncScope({ currentUser: validProfile });
  assert.equal(manager.configure({
    scope: resolvedScope,
    resources: ['orders'],
    subscribe,
    onChange
  }), true);
  assert.equal(subscriptions.length, 1);
  manager.dispose();
  engine.dispose();
});

test('unavailable or partial tenant/company scope remains fail-closed', () => {
  const { engine, manager, subscribe, subscriptions, onChange } = setupManager();
  const invalidScopes = [
    null,
    resolveSmartSyncScope({ currentUser: null }),
    resolveSmartSyncScope({ currentUser: { company_code: 'SHOP042' } }),
    resolveSmartSyncScope({ currentUser: { tenant_id: 42 } })
  ];

  invalidScopes.forEach((scope) => {
    assert.equal(manager.configure({
      scope,
      resources: ['orders'],
      subscribe,
      onChange
    }), false);
  });
  assert.equal(subscriptions.length, 0);
  manager.dispose();
  engine.dispose();
});

test('tenant/company changes clean old subscriptions and initialize the new scope', () => {
  const { engine, manager, subscribe, subscriptions, onChange } = setupManager();
  manager.configure({
    scope: { tenantId: 42, companyCode: 'SHOP042' },
    resources: ['orders', 'products'],
    subscribe,
    onChange
  });
  const oldSubscriptions = [...subscriptions];

  manager.configure({
    scope: { tenantId: 43, companyCode: 'SHOP043' },
    resources: ['orders', 'products'],
    subscribe,
    onChange
  });

  assert.equal(oldSubscriptions.every((subscription) => subscription.unsubscribed), true);
  assert.equal(subscriptions.length, 4);
  assert.ok(subscriptions.slice(2).every((subscription) => (
    subscription.scope.tenantId === 43 && subscription.scope.companyCode === 'SHOP043'
  )));
  manager.dispose();
  engine.dispose();
});

test('duplicate initialization reuses subscriptions and logout cleans all of them', () => {
  const { engine, manager, subscribe, subscriptions, onChange } = setupManager();
  const configuration = {
    scope: { tenantId: 42, companyCode: 'SHOP042' },
    resources: ['orders', 'products'],
    subscribe,
    onChange
  };
  manager.configure(configuration);
  manager.configure(configuration);
  assert.equal(subscriptions.length, 2);

  manager.clear();
  assert.equal(subscriptions.every((subscription) => subscription.unsubscribed), true);
  assert.equal(manager.configure(configuration), true);
  assert.equal(subscriptions.length, 4);
  manager.dispose();
  assert.equal(subscriptions.slice(2).every((subscription) => subscription.unsubscribed), true);
  engine.dispose();
});
