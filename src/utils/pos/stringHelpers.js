/**
 * Reusable utility function to escape special characters in regular expressions
 */
export const escapeRegExp = (string) => {
  return String(string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
