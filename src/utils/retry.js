export const withRetry = async (fn, options = {}) => {
  const { retries = 2, delayMs = 400, shouldRetry = () => true } = options;

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && shouldRetry(error);
      if (!canRetry) break;
      attempt += 1;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
};
