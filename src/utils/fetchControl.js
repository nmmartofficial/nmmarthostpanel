export const shouldSkipGlobalFetch = ({ isFetching, force, lastFetchedAt, now, throttleMs }) => {
  if (isFetching && !force) return true;
  if (!force && lastFetchedAt && now - lastFetchedAt < throttleMs) return true;
  return false;
};
