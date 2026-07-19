import { debugWarn, debugError } from './debugLogger';

export const safeAsync = async (fn, fallbackValue = null, context = 'safeAsync') => {
  try {
    return await fn();
  } catch (error) {
    debugError(context, 'Async operation failed', error);
    return fallbackValue;
  }
};

export const safeParseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

export const safeArray = (value) => {
  return Array.isArray(value) ? value : [];
};
