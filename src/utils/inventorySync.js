const getInventoryId = (record) => (
  record?.id === null || record?.id === undefined ? null : String(record.id)
);

const isInactive = (value) => value === false || value === 0
  || (typeof value === 'string' && ['false', 'inactive'].includes(value.trim().toLowerCase()));

const equalValue = (first, second) => {
  if (Object.is(first, second)) return true;
  if (!first || !second || typeof first !== 'object' || typeof second !== 'object') return false;
  if (Array.isArray(first) !== Array.isArray(second)) return false;
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);
  return firstKeys.length === secondKeys.length
    && firstKeys.every((key) => Object.prototype.hasOwnProperty.call(second, key)
      && equalValue(first[key], second[key]));
};

export const areInventoryRecordsEqual = (first, second) => {
  if (first === second) return true;
  if (!first || !second || typeof first !== 'object' || typeof second !== 'object') return false;
  return equalValue(first, second);
};

const getScopeMatch = (record, scope) => {
  if (!record || record.tenant_id === null || record.tenant_id === undefined
    || record.company_code === null || record.company_code === undefined) {
    return 'unknown';
  }
  return String(record.tenant_id) === String(scope.tenantId)
    && String(record.company_code) === String(scope.companyCode)
    ? 'match'
    : 'mismatch';
};

const insertByCreatedAt = (rows, record) => {
  const createdAt = Date.parse(record.created_at);
  if (!Number.isFinite(createdAt)) return [...rows, record];
  const index = rows.findIndex((row) => {
    const rowCreatedAt = Date.parse(row.created_at);
    return Number.isFinite(rowCreatedAt) && rowCreatedAt < createdAt;
  });
  if (index === -1) return [...rows, record];
  return [...rows.slice(0, index), record, ...rows.slice(index)];
};

export function applyInventoryRealtimeChange(rows, payload, { scope, includeDeleted = false } = {}) {
  if (!Array.isArray(rows)) throw new TypeError('Inventory cache must be an array.');
  if (!scope?.tenantId || !scope?.companyCode) {
    return { rows, changed: false, requiresReconciliation: true };
  }

  const eventType = String(payload?.eventType || '').toUpperCase();
  if (eventType === 'DELETE') {
    const deleted = payload?.old;
    const id = getInventoryId(deleted);
    const scopeMatch = getScopeMatch(deleted, scope);
    if (scopeMatch === 'mismatch') {
      return { rows, changed: false, requiresReconciliation: false };
    }
    if (id === null || scopeMatch === 'unknown') {
      return { rows, changed: false, requiresReconciliation: true };
    }
    const index = rows.findIndex((row) => getInventoryId(row) === id);
    if (index === -1) return { rows, changed: false, requiresReconciliation: false };
    const previousUpdatedAt = Date.parse(rows[index].updated_at);
    const deletedUpdatedAt = Date.parse(deleted.updated_at);
    if (Number.isFinite(previousUpdatedAt) && Number.isFinite(deletedUpdatedAt)
      && deletedUpdatedAt < previousUpdatedAt) {
      return { rows, changed: false, requiresReconciliation: false };
    }
    return {
      rows: [...rows.slice(0, index), ...rows.slice(index + 1)],
      changed: true,
      requiresReconciliation: false
    };
  }

  if (eventType !== 'INSERT' && eventType !== 'UPDATE') {
    return { rows, changed: false, requiresReconciliation: true };
  }

  const record = payload?.new;
  const id = getInventoryId(record);
  const scopeMatch = getScopeMatch(record, scope);
  if (scopeMatch === 'mismatch') {
    return { rows, changed: false, requiresReconciliation: false };
  }
  if (id === null || scopeMatch === 'unknown') {
    return { rows, changed: false, requiresReconciliation: true };
  }
  const index = rows.findIndex((row) => getInventoryId(row) === id);
  if (index !== -1) {
    const previousUpdatedAt = Date.parse(rows[index].updated_at);
    const incomingUpdatedAt = Date.parse(record.updated_at);
    if (Number.isFinite(previousUpdatedAt) && Number.isFinite(incomingUpdatedAt)
      && incomingUpdatedAt < previousUpdatedAt) {
      return { rows, changed: false, requiresReconciliation: false };
    }
  }
  if (isInactive(record.is_active) && !includeDeleted) {
    if (index === -1) return { rows, changed: false, requiresReconciliation: false };
    return {
      rows: [...rows.slice(0, index), ...rows.slice(index + 1)],
      changed: true,
      requiresReconciliation: false
    };
  }

  if (index !== -1) {
    if (areInventoryRecordsEqual(rows[index], record)) {
      return { rows, changed: false, requiresReconciliation: false };
    }
    const nextRows = [...rows.slice(0, index), ...rows.slice(index + 1)];
    if (rows[index].created_at !== record.created_at) {
      return {
        rows: insertByCreatedAt(nextRows, record),
        changed: true,
        requiresReconciliation: false
      };
    }
    nextRows.splice(index, 0, record);
    return { rows: nextRows, changed: true, requiresReconciliation: false };
  }
  return {
    rows: insertByCreatedAt(rows, record),
    changed: true,
    requiresReconciliation: false
  };
}

export function reconcileInventoryRows(previousRows, fetchedRows) {
  if (!Array.isArray(previousRows) || !Array.isArray(fetchedRows)) {
    throw new TypeError('Inventory reconciliation requires valid row arrays.');
  }

  const fetchedById = new Map();
  for (const row of fetchedRows) {
    const id = getInventoryId(row);
    if (id === null) throw new Error('Inventory reconciliation received a row without an item ID.');
    fetchedById.set(id, row);
  }

  const previousById = new Map(previousRows
    .filter((row) => getInventoryId(row) !== null)
    .map((row) => [getInventoryId(row), row]));
  const nextRows = [...fetchedById].map(([id, row]) => {
    const previous = previousById.get(id);
    return previous && areInventoryRecordsEqual(previous, row) ? previous : row;
  });

  if (nextRows.length === previousRows.length
    && nextRows.every((row, index) => row === previousRows[index])) {
    return previousRows;
  }
  return nextRows;
}

const INVENTORY_CART_FIELDS = [
  'stock',
  'available_stock',
  'availstock',
  'low_stock_threshold',
  'stock_status',
  'is_active'
];

export function syncCartInventory(cart, products) {
  if (!Array.isArray(cart) || !Array.isArray(products)) {
    throw new TypeError('Cart inventory synchronization requires valid row arrays.');
  }

  const productsById = new Map(products
    .filter((product) => getInventoryId(product) !== null)
    .map((product) => [getInventoryId(product), product]));
  let changed = false;
  const nextCart = cart.map((item) => {
    const product = productsById.get(getInventoryId(item));
    if (!product) return item;
    let nextItem = item;
    INVENTORY_CART_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(product, field)
        && !Object.is(item[field], product[field])) {
        if (nextItem === item) nextItem = { ...item };
        nextItem[field] = product[field];
      }
    });
    if (nextItem !== item) changed = true;
    return nextItem;
  });
  return changed ? nextCart : cart;
}

export async function fetchAndReconcileInventoryRows(previousRows, fetchRows) {
  if (typeof fetchRows !== 'function') throw new TypeError('An inventory fetch function is required.');
  return reconcileInventoryRows(previousRows, await fetchRows());
}
