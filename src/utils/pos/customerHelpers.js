/**
 * Customer Management Utilities
 */

/**
 * Normalizes search terms for customer lookup
 */
export const normalizeSearch = (term) => {
  return String(term || '').toLowerCase().trim();
};

export const getPOSCustomerPhone = (user) => (
  user?.mobile || user?.phone || user?.phone_number || ''
);

export const getPOSCustomerSelection = (user) => {
  if (!user) {
    return { user: null, searchValue: '', activityLabel: 'Switched to Walk-in' };
  }

  const phone = getPOSCustomerPhone(user);
  return {
    user,
    searchValue: phone || user.name || '',
    activityLabel: user.name || phone || user.id
  };
};

export const filterPOSCustomers = (users = [], searchTerm = '') => {
  const term = normalizeSearch(searchTerm);
  if (!term) return [];

  return users.filter((user) => {
    if (user?.is_active === false) return false;
    return normalizeSearch(user?.name).includes(term)
      || normalizeSearch(getPOSCustomerPhone(user)).includes(term)
      || normalizeSearch(user?.id).includes(term);
  }).slice(0, 10);
};

export const isCurrentCustomerRequest = (requestId, currentRequestId) => (
  requestId === currentRequestId
);

/**
 * Formats customer display name
 */
export const formatCustomerDisplayName = (user) => {
  if (!user) return 'Walk-in Customer';
  return user.name || getPOSCustomerPhone(user) || 'Unnamed Customer';
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
  const phone = getPOSCustomerPhone(user);
  const userOrders = orders.filter(o => o.user_mobile === phone || o.user_id === user.id);
  if (userOrders.length === 0) return { count: 0, lastDate: 'Never', lastAmount: 0 };

  // Assuming orders are sorted by date descending, or we take the first one
  const lastOrder = userOrders[0];
  return {
    count: userOrders.length,
    lastDate: lastOrder.created_at, // Hook will format it
    lastAmount: lastOrder.total_amount
  };
};
