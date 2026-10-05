const DEFAULT_BATCH_MS = 180;

export const createSmartSyncEngine = ({ batchMs = DEFAULT_BATCH_MS } = {}) => {
  const refreshers = new Map();
  const pauseCounts = new Map();
  const pendingResources = new Set();
  const watchers = new Map();
  const statusListeners = new Set();
  let flushTimer = null;
  let retryTimer = null;
  let isOnline = true;
  let status = { state: 'synced', lastSyncedAt: null, error: null };

  const publishStatus = (nextStatus) => {
    status = { ...status, ...nextStatus };
    statusListeners.forEach((listener) => listener(status));
  };

  const emitInvalidation = (resources, data) => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('nm:resource-invalidated', {
        detail: { resources, data },
      }));
    }
  };

  const publishResourceUpdates = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    const resources = Object.keys(data);
    if (resources.length) emitInvalidation(resources, data);
  };

  const flush = async () => {
    flushTimer = null;
    if (!isOnline) return;
    const readyResources = [...pendingResources].filter((resource) => !pauseCounts.has(resource));
    if (!readyResources.length) return;
    readyResources.forEach((resource) => pendingResources.delete(resource));
    publishStatus({ state: 'syncing', error: null });

    const resourceResults = await Promise.all(readyResources.map(async (resource) => {
      const resourceRefreshers = [...(refreshers.get(resource) || [])];
      const refreshResults = await Promise.allSettled(resourceRefreshers.map((refresh) => refresh()));
      return { resource, refreshResults, data: refreshResults.find((result) => result.status === 'fulfilled')?.value };
    }));
    const results = resourceResults.flatMap(({ refreshResults }) => refreshResults);
    const failure = results.find((result) => result.status === 'rejected');

    if (failure) {
      resourceResults.forEach(({ resource, refreshResults }) => {
        if (refreshResults.some((result) => result.status === 'rejected')) pendingResources.add(resource);
      });
      publishStatus({ state: 'error', error: failure.reason?.message || 'Background synchronization failed' });
      retryTimer = setTimeout(() => {
        retryTimer = null;
        scheduleFlush();
      }, 10_000);
    } else if (pendingResources.size) {
      scheduleFlush();
    } else {
      publishStatus({ state: 'synced', error: null, lastSyncedAt: Date.now() });
    }
    const successfulResources = resourceResults.filter(({ refreshResults }) =>
      !refreshResults.some((result) => result.status === 'rejected'));
    if (successfulResources.length) {
      emitInvalidation(
        successfulResources.map(({ resource }) => resource),
        Object.fromEntries(successfulResources.map(({ resource, data }) => [resource, data])),
      );
    }
  };

  const scheduleFlush = () => {
    if (!isOnline) return;
    if (flushTimer || ![...pendingResources].some((resource) => !pauseCounts.has(resource))) return;
    flushTimer = setTimeout(flush, batchMs);
  };

  const registerResource = (resource, refresh) => {
    if (typeof refresh !== 'function') throw new TypeError('A resource refresh function is required');
    const handlers = refreshers.get(resource) || new Set();
    handlers.add(refresh);
    refreshers.set(resource, handlers);
    return () => {
      handlers.delete(refresh);
      if (!handlers.size) refreshers.delete(resource);
    };
  };

  const invalidateResource = (resource) => {
    if (!refreshers.has(resource)) return false;
    pendingResources.add(resource);
    publishStatus({ state: isOnline ? 'pending' : 'offline', error: null });
    scheduleFlush();
    return true;
  };

  const pauseSyncDuringEdit = (resource) => {
    pauseCounts.set(resource, (pauseCounts.get(resource) || 0) + 1);
    let resumed = false;
    return () => {
      if (resumed) return;
      resumed = true;
      const remaining = (pauseCounts.get(resource) || 1) - 1;
      if (remaining > 0) pauseCounts.set(resource, remaining);
      else {
        pauseCounts.delete(resource);
        if (pendingResources.has(resource)) scheduleFlush();
      }
    };
  };

  const watchTable = ({ table, tenantId, companyCode, subscribe, onChange }) => {
    if (!table || !tenantId || !companyCode || typeof subscribe !== 'function' || typeof onChange !== 'function') {
      throw new TypeError('Table, tenant and company scope, subscribe function, and change handler are required');
    }
    const key = `${table}:${tenantId}:${companyCode || ''}`;
    let watcher = watchers.get(key);
    if (!watcher) {
      watcher = { handlers: new Set(), subscription: null };
      watcher.subscription = subscribe((payload) => {
        const record = payload?.new && Object.keys(payload.new).length
          ? payload.new
          : payload?.old;
        if (record?.tenant_id != null && String(record.tenant_id) !== String(tenantId)) return;
        if (companyCode && record?.company_code != null
          && String(record.company_code) !== String(companyCode)) return;
        watcher.handlers.forEach((handler) => handler(payload));
      }, (channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') publishStatus({ state: 'synced', error: null });
        else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          publishStatus({ state: 'error', error: 'Realtime synchronization is temporarily unavailable' });
        } else if (channelStatus === 'CLOSED') {
          publishStatus({ state: 'pending' });
        }
      });
      watchers.set(key, watcher);
    }
    watcher.handlers.add(onChange);

    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      watcher.handlers.delete(onChange);
      if (!watcher.handlers.size) {
        watcher.subscription?.unsubscribe?.();
        watchers.delete(key);
      }
    };
  };

  const subscribeStatus = (listener) => {
    statusListeners.add(listener);
    listener(status);
    return () => statusListeners.delete(listener);
  };

  const setConnectionState = (online) => {
    if (online) {
      isOnline = true;
      publishStatus({ state: pendingResources.size ? 'pending' : 'synced', error: null });
      scheduleFlush();
    }
    else {
      isOnline = false;
      publishStatus({ state: 'offline', error: null });
    }
  };

  const dispose = () => {
    if (flushTimer) clearTimeout(flushTimer);
    if (retryTimer) clearTimeout(retryTimer);
    flushTimer = null;
    retryTimer = null;
    watchers.forEach((watcher) => watcher.subscription?.unsubscribe?.());
    watchers.clear();
    refreshers.clear();
    pendingResources.clear();
    pauseCounts.clear();
    statusListeners.clear();
  };

  return {
    dispose,
    getStatus: () => status,
    invalidateResource,
    pauseSyncDuringEdit,
    publishResourceUpdates,
    registerResource,
    setConnectionState,
    subscribeStatus,
    watchTable,
  };
};

export const smartSync = createSmartSyncEngine();
