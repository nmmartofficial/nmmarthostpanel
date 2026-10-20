const requireStoreScope = (currentUser) => {
  if (currentUser?.tenant_id == null || !currentUser?.company_code) {
    throw new Error('Tenant and store scope are required for held bills.');
  }
  const tenantId = String(currentUser.tenant_id);
  if (!/^[1-9]\d*$/.test(tenantId)) {
    throw new Error('A valid numeric tenant ID is required for held bills.');
  }
  return {
    p_tenant_id: tenantId,
    p_company_code: currentUser.company_code
  };
};

const normalizeHeldBill = (row, currentUser) => {
  if (!row || typeof row !== 'object' || !row.id
    || !Array.isArray(row.cart) || row.cart.length === 0
    || !row.customer_info || typeof row.customer_info !== 'object'
    || !Number.isFinite(Number(row.total))
    || (currentUser && (
      String(row.tenant_id) !== String(currentUser.tenant_id)
      || String(row.company_code) !== String(currentUser.company_code)
    ))) {
    throw new Error('The held bill backend returned an invalid bill.');
  }
  return {
    id: String(row.id),
    cart: row.cart,
    customerInfo: row.customer_info,
    time: row.created_at,
    created_at: row.created_at,
    total: Number(row.total)
  };
};

const callHeldBillRpc = async (client, procedure, parameters) => {
  const { data, error } = await client.rpc(procedure, parameters);
  if (error) throw error;
  return data;
};

export const listStoreHeldBills = async (client, currentUser) => {
  const data = await callHeldBillRpc(client, 'pos_held_bills_list', requireStoreScope(currentUser));
  if (!Array.isArray(data)) throw new Error('Held bill list response was invalid.');
  return data.map((row) => normalizeHeldBill(row, currentUser));
};

export const saveStoreHeldBill = async (client, currentUser, bill) => {
  if (!bill?.id || !Array.isArray(bill.cart) || bill.cart.length === 0
    || !Number.isFinite(Number(bill.total)) || Number(bill.total) < 0) {
    throw new Error('A valid bill is required before it can be held.');
  }
  const data = await callHeldBillRpc(client, 'pos_held_bill_save', {
    p_bill_id: bill.id,
    ...requireStoreScope(currentUser),
    p_cart: bill.cart,
    p_customer_info: bill.customerInfo || {},
    p_total: Number(bill.total)
  });
  return normalizeHeldBill(data, currentUser);
};

export const resumeStoreHeldBill = async (client, currentUser, billId) => {
  if (!billId) throw new Error('A held bill ID is required to resume.');
  const data = await callHeldBillRpc(client, 'pos_held_bill_resume', {
    p_bill_id: billId,
    ...requireStoreScope(currentUser)
  });
  return normalizeHeldBill(data, currentUser);
};

export const deleteStoreHeldBill = async (client, currentUser, billId) => {
  if (!billId) throw new Error('A held bill ID is required to delete.');
  const data = await callHeldBillRpc(client, 'pos_held_bill_delete', {
    p_bill_id: billId,
    ...requireStoreScope(currentUser)
  });
  if (data !== true) throw new Error('The backend did not confirm deleting this held bill.');
  return true;
};
