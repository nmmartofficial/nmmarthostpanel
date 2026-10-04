import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_TAB_IDS, getTabFromRouteSegment, getTabRouteSegment } from './tabRoutes.js';

test('uses readable, unique routes for master navigation items', () => {
  const masterTabs = [
    'Products',
    'Units',
    'Categories',
    'Subcategories',
    'Brands',
    'HSNMaster',
    'Departments',
    'Accounts',
    'UserMaster',
    'Banners'
  ];
  const segments = masterTabs.map(getTabRouteSegment);

  assert.equal(getTabRouteSegment('Products'), 'item-master');
  assert.equal(getTabRouteSegment('Banners'), 'banner');
  assert.equal(getTabRouteSegment('Brands'), 'brand');
  assert.equal(getTabRouteSegment('Categories'), 'item-main-category');
  assert.equal(getTabRouteSegment('Dashboard'), 'dashboard');
  assert.equal(new Set(segments).size, masterTabs.length);
  assert.deepEqual(
    segments.map((segment) => getTabFromRouteSegment(segment, masterTabs)),
    masterTabs
  );
});

test('recognizes previous master routes for old links', () => {
  assert.equal(getTabFromRouteSegment('banner-master', APP_TAB_IDS), 'Banners');
  assert.equal(getTabFromRouteSegment('brand-master', APP_TAB_IDS), 'Brands');
});

test('builds distinct routes for standard dashboard tabs', () => {
  const tabs = ['Dashboard', 'Orders', 'POS', 'Purchase', 'StockAlerts'];
  const segments = tabs.map(getTabRouteSegment);

  assert.deepEqual(segments, ['dashboard', 'orders', 'sale-entry', 'purchase', 'stock-alerts']);
  assert.equal(new Set(segments).size, tabs.length);
  assert.deepEqual(
    segments.map((segment) => getTabFromRouteSegment(segment, tabs)),
    tabs
  );
});

test('assigns a unique route to every configured navigation module', () => {
  const segments = APP_TAB_IDS.map(getTabRouteSegment);

  assert.equal(new Set(segments).size, APP_TAB_IDS.length);
  assert.deepEqual(
    segments.map((segment) => getTabFromRouteSegment(segment, APP_TAB_IDS)),
    APP_TAB_IDS
  );
});
