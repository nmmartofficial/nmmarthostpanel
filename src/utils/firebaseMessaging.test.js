import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseConfig, firebaseVapidKey } from '../lib/firebase.js';
import { requestAdminFcmToken } from './firebaseMessaging.js';

test('uses the NM Mart Firebase web app configuration and public VAPID key', () => {
  assert.equal(firebaseConfig.projectId, 'nmmart-ca8f7');
  assert.equal(firebaseConfig.messagingSenderId, '349627616977');
  assert.equal(firebaseConfig.appId, '1:349627616977:web:32ba36717fb00d5e053ff0');
  assert.equal(firebaseVapidKey, 'BJUBjGNZwhv123Q21HaFJI7pP5jopDd7ZfROQvAaPUzNqgxdlgNQkJ08JDdg-7mFttX-ukJJrOHY45ubNmQGKjE');
});

test('returns an unsupported result outside a secure browser context', async () => {
  const response = await requestAdminFcmToken();
  assert.deepEqual(response, { status: 'unsupported', token: null });
});