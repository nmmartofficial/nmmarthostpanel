import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewOrderPushPayload,
  isAuthorizedPushRecipient,
  validateTenantRecipientScope,
  normalizeDeviceTokenRegistration,
  normalizeNewOrderPushData,
  buildNewOrderNotificationOptions,
  claimNewOrderNotificationSound,
  playNewOrderNotificationChime
} from './orderPushNotifications.js';

test('builds a safe new-order push payload', () => {
  const payload = buildNewOrderPushPayload({
    id: 123,
    order_number: 'NM-123',
    total_amount: 849,
    tenant_id: 1,
    company_code: 'NMM001'
  });

  assert.equal(payload.title, '🔔 New Order Received');
  assert.equal(payload.body, 'Dear NM Mart, you have received a new order.\nOrder #NM-123 • ₹849');
  assert.equal(payload.data.order_id, '123');
  assert.equal(payload.data.order_number, 'NM-123');
  assert.equal(payload.data.notification_type, 'new_order');
  assert.equal(payload.data.tenant_id, '1');
  assert.equal(payload.data.company_code, 'NMM001');
  assert.deepEqual(normalizeNewOrderPushData(payload.data), payload.data);
  assert.equal(normalizeNewOrderPushData({ notification_type: 'other' }), null);

  const presentation = buildNewOrderNotificationOptions({ data: payload.data });
  assert.equal(presentation.title, '🔔 New Order Received');
  assert.equal(presentation.options.tag, 'nm-order-123');
  assert.equal(presentation.options.renotify, false);
  assert.equal(presentation.options.silent, false);
  assert.deepEqual(presentation.options.data, payload.data);
});

test('claims one notification sound per order ID for the active app session', () => {
  const playedOrderIds = new Set();

  assert.equal(claimNewOrderNotificationSound('order-123', playedOrderIds), true);
  assert.equal(claimNewOrderNotificationSound('order-123', playedOrderIds), false);
  assert.equal(claimNewOrderNotificationSound('order-124', playedOrderIds), true);
  assert.equal(claimNewOrderNotificationSound('', playedOrderIds), false);
});

test('plays only a short two-tone chime when the audio context is unlocked', () => {
  const frequencies = [];
  const stopTimes = [];
  const audioContext = {
    state: 'running',
    currentTime: 1,
    destination: {},
    createOscillator: () => ({
      type: '',
      frequency: { setValueAtTime: (frequency) => frequencies.push(frequency) },
      connect: () => {},
      start: () => {},
      stop: (time) => stopTimes.push(time)
    }),
    createGain: () => ({
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {}
    })
  };

  assert.equal(playNewOrderNotificationChime(audioContext), true);
  assert.deepEqual(frequencies, [659.25, 880]);
  assert.equal(stopTimes.length, 2);
  assert.equal(playNewOrderNotificationChime({ ...audioContext, state: 'suspended' }), false);
});

test('authorizes only allowed admin roles for push delivery', () => {
  assert.equal(isAuthorizedPushRecipient({ role: 'super_admin' }), true);
  assert.equal(isAuthorizedPushRecipient({ role: 'admin' }), true);
  assert.equal(isAuthorizedPushRecipient({ role: 'manager' }), true);
  assert.equal(isAuthorizedPushRecipient({ role: 'cashier' }), false);
  assert.equal(isAuthorizedPushRecipient({ role: 'viewer' }), false);
});

test('rejects mismatched tenant/company scope for delivery', () => {
  const valid = validateTenantRecipientScope({ tenant_id: 1, company_code: 'NMM001' }, { tenant_id: 1, company_code: 'NMM001' });
  const invalidTenant = validateTenantRecipientScope({ tenant_id: 1, company_code: 'NMM001' }, { tenant_id: 2, company_code: 'NMM001' });
  const invalidCompany = validateTenantRecipientScope({ tenant_id: 1, company_code: 'NMM001' }, { tenant_id: 1, company_code: 'OTHER' });

  assert.equal(valid, true);
  assert.equal(invalidTenant, false);
  assert.equal(invalidCompany, false);
});

test('normalizes device token registration fields without exposing secrets', () => {
  const normalized = normalizeDeviceTokenRegistration({
    user_id: 'u-1',
    tenant_id: 1,
    company_code: 'NMM001',
    device_token: 'token-123',
    platform: 'android',
    app_version: '1.0.0',
    is_active: 'true',
    access_token: 'secret'
  });

  assert.equal(normalized.user_id, 'u-1');
  assert.equal(normalized.device_token, 'token-123');
  assert.equal(normalized.platform, 'android');
  assert.equal(normalized.is_active, true);
  assert.equal(normalized.access_token, undefined);
});
