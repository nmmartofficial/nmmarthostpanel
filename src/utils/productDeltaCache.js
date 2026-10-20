const DATABASE_NAME = 'nm-mart-product-cache';
const DATABASE_VERSION = 1;
const PRODUCT_STORE = 'products';
const SYNC_STATE_STORE = 'syncState';
export const PRODUCT_DELTA_OVERLAP_MS = 2 * 60 * 1000;

let databasePromise;
const writeQueues = new Map();
const syncJobs = new Map();

const getScopeKey = (scope, includeDeleted) => {
  const tenantId = scope?.tenantId ?? scope?.tenant_id;
  const companyCode = scope?.companyCode ?? scope?.company_code;
  if (tenantId === null || tenantId === undefined || !companyCode) {
    throw new Error('A tenant and store scope are required for product caching.');
  }
  return `${String(tenantId)}:${String(companyCode)}:${includeDeleted ? 'all' : 'active'}`;
};

const openDatabase = () => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable; product cache cannot be opened.'));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PRODUCT_STORE)) {
          const productStore = database.createObjectStore(PRODUCT_STORE, { keyPath: ['scopeKey', 'idKey'] });
          productStore.createIndex('scopeKey', 'scopeKey', { unique: false });
        }
        if (!database.objectStoreNames.contains(SYNC_STATE_STORE)) {
          database.createObjectStore(SYNC_STATE_STORE, { keyPath: 'scopeKey' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the IndexedDB product cache.'));
      request.onblocked = () => reject(new Error('IndexedDB product cache upgrade is blocked by another tab.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
};

export const readProductSnapshot = async (scope, { includeDeleted = false } = {}) => {
  const scopeKey = getScopeKey(scope, includeDeleted);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PRODUCT_STORE, SYNC_STATE_STORE], 'readonly');
    const productsRequest = transaction.objectStore(PRODUCT_STORE).index('scopeKey').getAll(scopeKey);
    const stateRequest = transaction.objectStore(SYNC_STATE_STORE).get(scopeKey);
    let products;
    let state;
    const finish = () => {
      if (products === undefined || state === undefined) return;
      if (!state) {
        resolve(null);
        return;
      }
      resolve({ ...state, products: products.map((record) => record.product) });
    };
    productsRequest.onsuccess = () => {
      products = productsRequest.result || [];
      finish();
    };
    stateRequest.onsuccess = () => {
      state = stateRequest.result || null;
      finish();
    };
    productsRequest.onerror = () => reject(productsRequest.error || new Error('Could not read the IndexedDB product cache.'));
    stateRequest.onerror = () => reject(stateRequest.error || new Error('Could not read the IndexedDB product sync cursor.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB product cache read was aborted.'));
  });
};

export const writeProductSnapshot = async (
  scope,
  products,
  { cursor = null, includeDeleted = false } = {}
) => {
  if (!Array.isArray(products)) throw new TypeError('Product cache requires an array of products.');
  if (products.some((product) => product?.id === null || product?.id === undefined)) {
    throw new Error('Product cache snapshot contains a row without an ID.');
  }
  const scopeKey = getScopeKey(scope, includeDeleted);
  const previousWrite = writeQueues.get(scopeKey) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => {}).then(async () => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([PRODUCT_STORE, SYNC_STATE_STORE], 'readwrite');
      const productStore = transaction.objectStore(PRODUCT_STORE);
      const productIndex = productStore.index('scopeKey');
      const stateStore = transaction.objectStore(SYNC_STATE_STORE);
      const keyRequest = productIndex.getAllKeys(scopeKey);
      keyRequest.onsuccess = () => {
        keyRequest.result.forEach((key) => productStore.delete(key));
        products.forEach((product) => {
          productStore.put({ scopeKey, idKey: String(product.id), product });
        });
        const stateRequest = stateStore.get(scopeKey);
        stateRequest.onsuccess = () => {
          const existing = stateRequest.result;
          stateStore.put({
            scopeKey,
            tenantId: String(scope?.tenantId ?? scope?.tenant_id),
            companyCode: String(scope?.companyCode ?? scope?.company_code),
            includeDeleted,
            cursor: cursor || existing?.cursor || null,
            savedAt: new Date().toISOString()
          });
        };
        stateRequest.onerror = () => transaction.abort();
      };
      keyRequest.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not save the IndexedDB product cache.'));
      transaction.onabort = () => reject(transaction.error || keyRequest.error || new Error('IndexedDB product cache write was aborted.'));
    });
  });
  writeQueues.set(scopeKey, nextWrite);
  try {
    await nextWrite;
  } finally {
    if (writeQueues.get(scopeKey) === nextWrite) writeQueues.delete(scopeKey);
  }
};

export const writeProductDelta = async (
  scope,
  deltaProducts,
  { cursor, includeDeleted = false, deletedIds = [] } = {}
) => {
  if (!Array.isArray(deltaProducts) || !Array.isArray(deletedIds)) {
    throw new TypeError('Product cache delta requires valid arrays.');
  }
  if (deltaProducts.some((product) => product?.id === null || product?.id === undefined)) {
    throw new Error('Product cache delta contains a row without an ID.');
  }
  const scopeKey = getScopeKey(scope, includeDeleted);
  const previousWrite = writeQueues.get(scopeKey) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => {}).then(async () => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([PRODUCT_STORE, SYNC_STATE_STORE], 'readwrite');
      const productStore = transaction.objectStore(PRODUCT_STORE);
      const stateStore = transaction.objectStore(SYNC_STATE_STORE);
      const stateRequest = stateStore.get(scopeKey);
      stateRequest.onsuccess = () => {
        const existing = stateRequest.result;
        if (!existing) return;
        deltaProducts.forEach((product) => {
          const idKey = String(product.id);
          const key = [scopeKey, idKey];
          if (!includeDeleted && isInactive(product.is_active)) {
            productStore.delete(key);
            return;
          }
          const existingProductRequest = productStore.get(key);
          existingProductRequest.onsuccess = () => {
            const existingUpdatedAt = Date.parse(existingProductRequest.result?.product?.updated_at);
            const incomingUpdatedAt = Date.parse(product.updated_at);
            if (Number.isFinite(existingUpdatedAt) && Number.isFinite(incomingUpdatedAt)
              && existingUpdatedAt > incomingUpdatedAt) return;
            productStore.put({ scopeKey, idKey, product });
          };
          existingProductRequest.onerror = () => transaction.abort();
        });
        deletedIds.forEach((id) => productStore.delete([scopeKey, String(id)]));
        stateStore.put({
          scopeKey,
          tenantId: String(scope?.tenantId ?? scope?.tenant_id),
          companyCode: String(scope?.companyCode ?? scope?.company_code),
          includeDeleted,
          cursor: cursor || existing?.cursor || null,
          savedAt: new Date().toISOString()
        });
      };
      stateRequest.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not apply product changes to IndexedDB.'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB product delta write was aborted.'));
    });
  });
  writeQueues.set(scopeKey, nextWrite);
  try {
    await nextWrite;
  } finally {
    if (writeQueues.get(scopeKey) === nextWrite) writeQueues.delete(scopeKey);
  }
};

const isInactive = (value) => value === false || value === 0
  || (typeof value === 'string' && ['false', 'inactive'].includes(value.trim().toLowerCase()));

const compareCreatedAtDescending = (first, second) => {
  const firstTime = Date.parse(first?.created_at);
  const secondTime = Date.parse(second?.created_at);
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return 0;
  return secondTime - firstTime;
};

export const mergeProductDelta = (previousProducts, deltaProducts, { includeDeleted = false } = {}) => {
  if (!Array.isArray(previousProducts) || !Array.isArray(deltaProducts)) {
    throw new TypeError('Product delta merge requires valid product arrays.');
  }
  const merged = new Map();
  previousProducts.forEach((product) => {
    if (product?.id !== null && product?.id !== undefined) merged.set(String(product.id), product);
  });
  deltaProducts.forEach((product) => {
    if (product?.id === null || product?.id === undefined) {
      throw new Error('Product delta contains a row without an ID.');
    }
    const id = String(product.id);
    if (!includeDeleted && isInactive(product.is_active)) merged.delete(id);
    else merged.set(id, product);
  });
  return [...merged.values()].sort(compareCreatedAtDescending);
};

const maxUpdatedAt = (products) => products.reduce((latest, product) => {
  const timestamp = Date.parse(product?.updated_at);
  return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest;
}, 0);

const performProductSnapshotSync = async ({
  scope,
  currentProducts = [],
  includeDeleted = false,
  forceFull = false,
  fetchFull,
  fetchDelta,
  overlapMs = PRODUCT_DELTA_OVERLAP_MS,
  now = () => new Date()
}) => {
  if (typeof fetchFull !== 'function' || typeof fetchDelta !== 'function') {
    throw new TypeError('Full and delta product fetch functions are required.');
  }
  const cached = forceFull ? null : await readProductSnapshot(scope, { includeDeleted });
  const startedAt = now().toISOString();

  const hasValidCache = cached
    && Array.isArray(cached.products)
    && Boolean(cached.cursor)
    && Number.isFinite(Date.parse(cached.cursor));
  if (!hasValidCache) {
    if (cached) console.warn('[Product cache] Invalid snapshot metadata; rebuilding the scoped product baseline.');
    const baseline = await fetchFull();
    if (!Array.isArray(baseline)) throw new Error('Full product fetch returned an invalid response.');
    const products = mergeProductDelta([], baseline, { includeDeleted });
    const latestUpdatedAt = maxUpdatedAt(products);
    const cursor = new Date(Math.max(Date.parse(startedAt), latestUpdatedAt)).toISOString();
    await writeProductSnapshot(scope, products, { cursor, includeDeleted });
    return products;
  }

  const initialProducts = mergeProductDelta(cached.products, currentProducts, { includeDeleted });
  const overlapStart = Math.max(0, Date.parse(cached.cursor) - Math.max(0, overlapMs));
  const delta = await fetchDelta(new Date(overlapStart).toISOString());
  if (!Array.isArray(delta)) throw new Error('Product delta fetch returned an invalid response.');
  const products = mergeProductDelta(initialProducts, delta, { includeDeleted });
  const cursor = new Date(Math.max(Date.parse(startedAt), maxUpdatedAt(delta))).toISOString();
  await writeProductDelta(scope, delta, { cursor, includeDeleted });
  return products;
};

export const syncProductSnapshot = (options) => {
  const scopeKey = getScopeKey(options?.scope, options?.includeDeleted === true);
  const existing = syncJobs.get(scopeKey);
  if (existing) return existing;
  const syncJob = performProductSnapshotSync(options).finally(() => {
    if (syncJobs.get(scopeKey) === syncJob) syncJobs.delete(scopeKey);
  });
  syncJobs.set(scopeKey, syncJob);
  return syncJob;
};
