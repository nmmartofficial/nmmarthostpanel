import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canManagePOSLayoutSettings,
  getPOSLayoutSettingsRow,
  normalizePOSLayoutSettings,
  parsePOSLayoutSettings,
  POS_LAYOUT_CONFIG_KEY,
  POS_LAYOUT_DEFAULTS
} from './posLayoutSettings.js';

test('normalizes and clamps presentation settings to safe supported values', () => {
  const settings = normalizePOSLayoutSettings({
    billingRatio: 9,
    fontScale: 0.2,
    cartRowHeight: 100,
    productGridColumns: 1,
    theme: 'unsupported',
    cartColumns: { mrp: false, qty: false }
  });

  assert.equal(settings.billingRatio, 2.2);
  assert.equal(settings.fontScale, 0.9);
  assert.equal(settings.cartRowHeight, 64);
  assert.equal(settings.productGridColumns, 2);
  assert.equal(settings.theme, POS_LAYOUT_DEFAULTS.theme);
  assert.equal(settings.cartColumns.mrp, false);
  assert.equal(settings.cartColumns.discount, true);
  assert.equal(settings.cartColumns.qty, undefined);
});

test('parses stored JSON and safely uses defaults for malformed values', () => {
  assert.equal(parsePOSLayoutSettings('{"theme":"blue"}').theme, 'blue');
  assert.deepEqual(parsePOSLayoutSettings('{broken'), normalizePOSLayoutSettings());
  assert.deepEqual(parsePOSLayoutSettings(null), normalizePOSLayoutSettings());
});

test('loads settings only from the current tenant and company scope', () => {
  const user = { tenant_id: 7, company_code: 'STORE-7' };
  const rows = [
    { key: POS_LAYOUT_CONFIG_KEY, tenant_id: 8, company_code: 'STORE-7', value: '{}' },
    { key: POS_LAYOUT_CONFIG_KEY, tenant_id: 7, company_code: 'STORE-8', value: '{}' },
    { key: POS_LAYOUT_CONFIG_KEY, tenant_id: 7, company_code: 'STORE-7', value: '{}', is_active: false },
    { key: POS_LAYOUT_CONFIG_KEY, tenant_id: 7, company_code: 'STORE-7', value: '{"theme":"blue"}' }
  ];

  assert.equal(getPOSLayoutSettingsRow(rows, user), rows[3]);
  assert.equal(getPOSLayoutSettingsRow(rows, { company_code: 'STORE-7' }), null);
});

test('requires an active supported role and store scope to manage settings', () => {
  const admin = {
    role: 'admin',
    status: 'active',
    is_active: true,
    tenant_id: 7,
    company_code: 'STORE-7'
  };

  assert.equal(canManagePOSLayoutSettings(admin), true);
  assert.equal(canManagePOSLayoutSettings({ ...admin, is_active: false }), false);
  assert.equal(canManagePOSLayoutSettings({ ...admin, status: 'disabled' }), false);
  assert.equal(canManagePOSLayoutSettings({ ...admin, role: 'cashier' }), false);
});
