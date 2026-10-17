export const formatWalletCurrency = (value, { unavailable = '—', decimals = 0 } = {}) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return unavailable;
  return `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const getWalletActivityStatus = (lastPurchase, now = Date.now()) => {
  if (!lastPurchase) return 'inactive';
  const purchaseTime = new Date(lastPurchase).getTime();
  if (!Number.isFinite(purchaseTime)) return null;
  const elapsed = Math.max(0, now - purchaseTime);
  if (elapsed <= 30 * 86_400_000) return 'active';
  if (elapsed <= 90 * 86_400_000) return 'low_activity';
  return 'inactive';
};

export const enrichWalletCustomer = (customer, population = []) => {
  const rows = population.length ? population : [customer];
  const highestOrders = Math.max(...rows.map((row) => Number(row.orders_count) || 0));
  const highestLifetimeSpend = Math.max(...rows.map((row) => Number(row.lifetime_shopping) || 0));
  const highest90DaySpend = Math.max(...rows.map((row) => Number(row.spend_90d) || 0));
  const orderCount = Number(customer.orders_count) || 0;
  const lifetimeShopping = Number(customer.lifetime_shopping) || 0;
  const spend90d = Number(customer.spend_90d) || 0;
  const activityStatus = getWalletActivityStatus(customer.last_purchase);
  const hasPurchaseHistory = orderCount > 0 && Number.isFinite(new Date(customer.last_purchase).getTime());
  const purchaseTime = customer.last_purchase ? new Date(customer.last_purchase).getTime() : NaN;
  const daysSincePurchase = Number.isFinite(purchaseTime)
    ? Math.max(0, (Date.now() - purchaseTime) / 86_400_000)
    : null;
  const recencyScore = daysSincePurchase === null
    ? null
    : Math.max(0, 25 * (1 - Math.min(daysSincePurchase / 365, 1)));
  const scoreComponents = {
    shoppingFrequency: highestOrders > 0 ? 25 * Math.min(orderCount / highestOrders, 1) : null,
    recentSpending: highest90DaySpend > 0 ? 25 * Math.min(spend90d / highest90DaySpend, 1) : null,
    customerValue: highestLifetimeSpend > 0 ? 25 * Math.min(lifetimeShopping / highestLifetimeSpend, 1) : null,
    recency: recencyScore,
  };
  const score = hasPurchaseHistory
    ? Math.round(Object.values(scoreComponents).reduce((total, component) => total + (component || 0), 0))
    : null;
  const recommendation = 'review';
  const recommendationReason = 'Verified repayment and outstanding credit data are unavailable; manual review is required.';
  const suggestedLimit = null;

  return {
    ...customer,
    activity_status: activityStatus,
    payment_history: 'No History',
    payment_history_ratio: null,
    score,
    score_components: scoreComponents,
    recommendation,
    recommendation_reason: recommendationReason,
    suggested_limit: suggestedLimit,
    customer_type: orderCount === 0
      ? 'inactive'
      : orderCount === 1
        ? 'new'
        : 'regular',
  };
};

export const getWalletTrendDirection = (trend = []) => {
  const amounts = trend
    .map((row) => Number(row?.amount))
    .filter((amount) => Number.isFinite(amount) && amount >= 0);
  if (!amounts.some((amount) => amount > 0)) return 'inactive';
  if (amounts.length < 2) return 'insufficient_data';

  const split = Math.floor(amounts.length / 2);
  const previous = amounts.slice(0, split);
  const recent = amounts.slice(split);
  const previousAverage = previous.reduce((sum, amount) => sum + amount, 0) / previous.length;
  const recentAverage = recent.reduce((sum, amount) => sum + amount, 0) / recent.length;
  if (previousAverage === 0) return recentAverage > 0 ? 'increasing' : 'stable';
  const change = (recentAverage - previousAverage) / previousAverage;
  if (change >= 0.2) return 'increasing';
  if (change <= -0.2) return 'decreasing';
  return 'stable';
};

export const buildWalletIntelligenceKpis = (customers) => {
  const rows = Array.isArray(customers) ? customers : [];
  const sum = (key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  return {
    totalCustomers: rows.length,
    activeCustomers: rows.filter((row) => row.activity_status === 'active').length,
    lowActivityCustomers: rows.filter((row) => row.activity_status === 'low_activity').length,
    inactiveCustomers: rows.filter((row) => row.activity_status === 'inactive').length,
    totalWalletBalance: sum('wallet_balance'),
    outstandingCredit: null,
    creditEligible: rows.filter((row) => row.recommendation === 'eligible').length,
    needsReview: rows.filter((row) => row.recommendation === 'review').length,
    notRecommended: rows.filter((row) => row.recommendation === 'not_recommended').length,
    totalShoppingValue: sum('lifetime_shopping'),
  };
};

export const getWalletPeriodStart = (period, now = new Date()) => {
  const start = new Date(now);
  if (period === '30 Days') start.setDate(start.getDate() - 30);
  else if (period === '90 Days') start.setDate(start.getDate() - 90);
  else if (period === '6 Months') start.setMonth(start.getMonth() - 6);
  else if (period === '1 Year') start.setFullYear(start.getFullYear() - 1);
  else return null;
  return start;
};
