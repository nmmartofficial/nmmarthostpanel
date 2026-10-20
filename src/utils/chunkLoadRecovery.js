export const CHUNK_RELOAD_QUERY_PARAM = '__nm_chunk_reload';
export const CHUNK_RELOAD_COOLDOWN_MS = 30000;

export function installChunkLoadRecovery(windowObject = window) {
  const currentUrl = new URL(windowObject.location.href);

  if (currentUrl.searchParams.has(CHUNK_RELOAD_QUERY_PARAM)) {
    windowObject.setTimeout(() => {
      const recoveredUrl = new URL(windowObject.location.href);
      if (!recoveredUrl.searchParams.has(CHUNK_RELOAD_QUERY_PARAM)) return;
      recoveredUrl.searchParams.delete(CHUNK_RELOAD_QUERY_PARAM);
      windowObject.history.replaceState(
        windowObject.history.state,
        '',
        `${recoveredUrl.pathname}${recoveredUrl.search}${recoveredUrl.hash}`
      );
    }, CHUNK_RELOAD_COOLDOWN_MS);
  }

  windowObject.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const failedUrl = new URL(windowObject.location.href);
    if (failedUrl.searchParams.has(CHUNK_RELOAD_QUERY_PARAM)) return;
    failedUrl.searchParams.set(CHUNK_RELOAD_QUERY_PARAM, '1');
    windowObject.location.replace(failedUrl.href);
  });
}
