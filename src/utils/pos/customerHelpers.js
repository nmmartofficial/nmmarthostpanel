/**
 * Customer Management Utilities
 */

/**
 * Normalizes search terms for customer lookup
 */
export const normalizeSearch = (term) => {
  return String(term || '').toLowerCase().trim();
};

/**
 * Formats customer display name
 */
export const formatCustomerDisplayName = (user) => {
  if (!user) return 'Walk-in Customer';
  return user.name || user.mobile || 'Unnamed Customer';
};

/**
 * Validates mobile number format
 */
export const isValidMobile = (mobile) => {
  return /^[6-9]\d{9}$/.test(String(mobile));
};

/**
 * Calculates customer statistics from orders
 */
export const calcCustomerStats = (user, orders = []) => {
  if (!user) return null;
  const userOrders = orders.filter(o => o.user_mobile === user.mobile || o.user_id === user.id);
  if (userOrders.length === 0) return { count: 0, lastDate: 'Never', lastAmount: 0 };

  // Assuming orders are sorted by date descending, or we take the first one
  const lastOrder = userOrders[0];
  return {
    count: userOrders.length,
    lastDate: lastOrder.created_at, // Hook will format it
    lastAmount: lastOrder.total_amount
  };
};
