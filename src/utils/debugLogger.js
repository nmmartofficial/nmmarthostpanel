const DEBUG_ENABLED = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

export const debugLog = (scope, message, details) => {
  if (!DEBUG_ENABLED) return;

  const payload = details === undefined ? message : { message, details };
  console.debug(`[${scope}]`, payload);
};

export const debugWarn = (scope, message, details) => {
  if (!DEBUG_ENABLED) return;
  console.warn(`[${scope}]`, message, details);
};

export const debugError = (scope, message, error) => {
  if (!DEBUG_ENABLED) return;
  console.error(`[${scope}]`, message, error);
};
