/**
 * Held Bill Management Utilities
 */

/**
 * Generates a short display ID for a held bill
 */
export const getShortHoldId = (id) => {
  return String(id).slice(-6);
};

/**
 * Sorts held bills based on criteria
 */
export const sortHeldBills = (bills, criteria) => {
  const list = [...bills];
  list.sort((a, b) => {
    switch (criteria) {
      case 'newest': return b.id - a.id;
      case 'oldest': return a.id - b.id;
      case 'highest': return b.total - a.total;
      case 'lowest': return a.total - b.total;
      default: return 0;
    }
  });
  return list;
};
