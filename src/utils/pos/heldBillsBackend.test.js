import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteStoreHeldBill,
  listStoreHeldBills,
  resumeStoreHeldBill,
  saveStoreHeldBill
} from './heldBillsBackend.js';
import { sortHeldBills } from './holdHelpers.js';
import { formatHoldAge } from './formatters.js';

const user = { tenant_id: 'tenant-7', company_code: 'STORE-7' };
const row = {
  id: 'b26b7c01-5851-4ef7-8334-15bbad5384dc',
  tenant_id: user.tenant_id,
  company_code: user.company_code,
  cart: [{ id: 42, quantity: 1 }],
  customer_info: { name: 'Walk-in' },
  total: '25.50',
  created_at: '2026-10-20T10:00:00.000Z'
};

const createClient = (responses) => {
  const calls = [];
  return {
    calls,
    client: {
      rpc: async (procedure, parameters) => {
        calls.push({ procedure, parameters });
        const response = responses[procedure];
        if (response instanceof Error) return { data: null, error: response };
        return { data: typeof response === 'function' ? response(parameters) : response, error: null };
      }
    }
  };
};

test('lists held bills from the authenticated store RPC and maps persisted values', async () => {
  const { client, calls } = createClient({ pos_held_bills_list: [row] });
  const bills = await listStoreHeldBills(client, user);

  assert.deepEqual(bills, [{
    id: row.id,
    cart: row.cart,
    customerInfo: row.customer_info,
    time: row.created_at,
    created_at: row.created_at,
    total: 25.5
  }]);
  assert.deepEqual(calls[0], {
    procedure: 'pos_held_bills_list',
    parameters: { p_tenant_id: user.tenant_id, p_company_code: user.company_code }
  });
});

test('saves a bill with an idempotency ID and validates backend scope before returning', async () => {
  const { client, calls } = createClient({ pos_held_bill_save: row });
  const bill = await saveStoreHeldBill(client, user, {
    id: row.id,
    cart: row.cart,
    customerInfo: row.customer_info,
    total: 25.5
  });

  assert.equal(bill.id, row.id);
  assert.equal(calls[0].parameters.p_bill_id, row.id);
  assert.deepEqual(calls[0].parameters.p_customer_info, row.customer_info);

  const wrongScope = createClient({
    pos_held_bill_save: { ...row, company_code: 'STORE-8' }
  });
  await assert.rejects(
    saveStoreHeldBill(wrongScope.client, user, {
      id: row.id, cart: row.cart, customerInfo: row.customer_info, total: 25.5
    }),
    /invalid bill/
  );
});

test('resumes and deletes only through backend-confirmed RPC results', async () => {
  const resumeClient = createClient({ pos_held_bill_resume: row });
  assert.equal((await resumeStoreHeldBill(resumeClient.client, user, row.id)).id, row.id);
  assert.equal(resumeClient.calls[0].procedure, 'pos_held_bill_resume');

  const deleteClient = createClient({ pos_held_bill_delete: true });
  assert.equal(await deleteStoreHeldBill(deleteClient.client, user, row.id), true);
  await assert.rejects(
    deleteStoreHeldBill(createClient({ pos_held_bill_delete: false }).client, user, row.id),
    /did not confirm/
  );
  await assert.rejects(listStoreHeldBills(createClient({}).client, {}), /Tenant and store scope/);
});

test('surfaces RPC errors instead of treating backend failures as successful holds', async () => {
  const { client } = createClient({
    pos_held_bill_save: new Error('RLS or RPC unavailable')
  });
  await assert.rejects(
    saveStoreHeldBill(client, user, {
      id: row.id, cart: row.cart, customerInfo: row.customer_info, total: row.total
    }),
    /RLS or RPC unavailable/
  );
});

test('sorts and displays persisted held-bill timestamps rather than UUID arithmetic', () => {
  const older = { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', created_at: '2026-10-19T10:00:00.000Z', total: 10 };
  const newer = { id: '00000000-0000-4000-8000-000000000001', created_at: '2026-10-20T10:00:00.000Z', total: 20 };

  assert.deepEqual(sortHeldBills([older, newer], 'newest'), [newer, older]);
  assert.deepEqual(sortHeldBills([older, newer], 'oldest'), [older, newer]);
  assert.notEqual(formatHoldAge(newer.created_at), 'Time unavailable');
});
