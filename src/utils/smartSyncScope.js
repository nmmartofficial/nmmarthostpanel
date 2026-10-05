export const resolveSmartSyncScope = ({ currentUser, currentCompany, company } = {}) => {
  const activeCompany = company || currentCompany;
  const tenantId = activeCompany ? activeCompany.id : currentUser?.tenant_id;
  const companyCode = activeCompany ? activeCompany.company_code : currentUser?.company_code;
  if (tenantId === null || tenantId === undefined || tenantId === ''
    || companyCode === null || companyCode === undefined || companyCode === '') {
    return null;
  }
  return { tenantId, companyCode };
};

export const createSmartSyncSubscriptionManager = (engine) => {
  let activeKey = null;
  let stopWatching = [];

  const clear = () => {
    stopWatching.forEach((stop) => stop());
    stopWatching = [];
    activeKey = null;
  };

  const configure = ({ scope, resources = [], subscribe, onChange } = {}) => {
    if (!scope?.tenantId || !scope?.companyCode || typeof subscribe !== 'function' || typeof onChange !== 'function') {
      clear();
      return false;
    }
    const key = `${scope.tenantId}:${scope.companyCode}:${[...new Set(resources)].sort().join(',')}`;
    if (key === activeKey) return true;

    clear();
    activeKey = key;
    stopWatching = [...new Set(resources)].map((table) => engine.watchTable({
      table,
      tenantId: scope.tenantId,
      companyCode: scope.companyCode,
      subscribe: (callback, onStatus) => subscribe(table, callback, onStatus, scope),
      onChange: (payload) => onChange(table, payload)
    }));
    return true;
  };

  return {
    clear,
    configure,
    dispose: clear
  };
};
