import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPOSCustomers,
  getPOSCustomerPhone,
  getPOSCustomerSelection,
  isCurrentCustomerRequest
} from './customerHelpers.js';

test('searches authoritative user records by name, phone variants, or record id', () => {
  const users = [
    { id: 12, name: 'Asha Rao', phone: '9876543210' },
    { id: 13, name: 'Karan Das', mobile: '9123456780' },
    { id: 14, name: 'Inactive User', phone: '9999999999', is_active: false }
  ];

  assert.deepEqual(filterPOSCustomers(users, 'asha'), [users[0]]);
  assert.deepEqual(filterPOSCustomers(users, '912345'), [users[1]]);
  assert.deepEqual(filterPOSCustomers(users, '13'), [users[1]]);
  assert.equal(getPOSCustomerPhone(users[0]), '9876543210');
  assert.deepEqual(filterPOSCustomers(users, '99999'), []);
});

test('selects the real customer record, contact search value, and walk-in state', () => {
  const customer = { id: 22, name: 'Meera Shah', phone: '9876543210' };

  assert.deepEqual(getPOSCustomerSelection(customer), {
    user: customer,
    searchValue: '9876543210',
    activityLabel: 'Meera Shah'
  });
  assert.deepEqual(getPOSCustomerSelection(null), {
    user: null,
    searchValue: '',
    activityLabel: 'Switched to Walk-in'
  });
});

test('ignores results from an earlier customer lookup after selection changes', () => {
  assert.equal(isCurrentCustomerRequest(4, 5), false);
  assert.equal(isCurrentCustomerRequest(5, 5), true);
});
