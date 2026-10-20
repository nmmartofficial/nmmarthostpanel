export const shouldSkipGlobalFetch = ({ isFetching, force, lastFetchedAt, now, throttleMs }) => {
  if (isFetching && !force) return true;
  if (!force && lastFetchedAt && now - lastFetchedAt < throttleMs) return true;
  return false;
};

export const shouldLoadInitialDataForScope = (scopeKey, loadedScopeKey) => (
  typeof scopeKey === 'string' && scopeKey.length > 0 && scopeKey !== loadedScopeKey
);
