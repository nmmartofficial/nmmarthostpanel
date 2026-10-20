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
  const timestamp = (bill) => {
    if (Number.isFinite(Number(bill?.created_at))) return Number(bill.created_at);
    const parsed = Date.parse(bill?.created_at || bill?.time || '');
    if (Number.isFinite(parsed)) return parsed;
    const numericId = Number(bill?.id);
    return Number.isFinite(numericId) ? numericId : 0;
  };
  list.sort((a, b) => {
    switch (criteria) {
      case 'newest': return timestamp(b) - timestamp(a);
      case 'oldest': return timestamp(a) - timestamp(b);
      case 'highest': return b.total - a.total;
      case 'lowest': return a.total - b.total;
      default: return 0;
    }
  });
  return list;
};
