const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', {
  maximumFractionDigits: 2
})}`;

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getOrderStatus = (order = {}) => String(
  order.order_status ?? order.status ?? 'unknown'
).trim().toLowerCase();

export const filterRowsToCurrentStore = (rows = [], currentUser) => {
  if (!Array.isArray(rows) || currentUser?.tenant_id == null || !currentUser?.company_code) {
    return [];
  }
  return rows.filter((row) => (
    String(row?.tenant_id ?? '') === String(currentUser.tenant_id)
    && String(row?.company_code ?? '') === String(currentUser.company_code)
  ));
};

export const isEligiblePaidSale = (order = {}) => (
  String(order.payment_status ?? '').trim().toLowerCase() === 'paid'
  && !['cancelled', 'canceled', 'returned'].includes(getOrderStatus(order))
);

export const getLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const summarizePaidSales = (orders = []) => {
  const sales = (Array.isArray(orders) ? orders : []).filter(isEligiblePaidSale);
  return sales.reduce((summary, order) => {
    summary.orderCount += 1;
    summary.revenue += numeric(order.total_amount);
    summary.discounts += numeric(order.discount);
    summary.gst += numeric(order.total_gst);

    const method = String(order.payment_method ?? '').trim().toUpperCase();
    if (method) {
      summary.payments[method] = (summary.payments[method] || 0) + numeric(order.total_amount);
    }
    return summary;
  }, { orderCount: 0, revenue: 0, discounts: 0, gst: 0, payments: {} });
};

export const buildSalesTrendData = (orders = [], now = new Date()) => {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const eligibleSales = (Array.isArray(orders) ? orders : []).filter(isEligiblePaidSale);

  return dates.map((date) => {
    const key = getLocalDateKey(date);
    const dayOrders = eligibleSales.filter((order) => getLocalDateKey(order.created_at) === key);
    return {
      name: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      revenue: dayOrders.reduce((sum, order) => sum + numeric(order.total_amount), 0),
      orders: dayOrders.length
    };
  });
};

export const buildStatusData = (orders = []) => {
  const counts = {};
  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const status = getOrderStatus(order);
    counts[status] = (counts[status] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  }));
};

export const buildCategoryData = (orderItems = [], products = [], orders = []) => {
  const eligibleOrderIds = new Set(
    (Array.isArray(orders) ? orders : [])
      .filter(isEligiblePaidSale)
      .map((order) => String(order.id))
  );
  const productMap = new Map((Array.isArray(products) ? products : []).map((product) => [
    String(product.id),
    product
  ]));
  const categoryRevenue = {};
  (Array.isArray(orderItems) ? orderItems : []).forEach((item) => {
    if (item.order_id == null || !eligibleOrderIds.has(String(item.order_id))) return;
    const product = productMap.get(String(item.product_id));
    const category = item.category_name
      || product?.category_name
      || (product?.category_id != null ? `Category ${product.category_id}` : null);
    if (!category) return;
    const total = item.total == null
      ? numeric(item.rate ?? item.price) * numeric(item.quantity ?? item.qty)
      : numeric(item.total);
    categoryRevenue[category] = (categoryRevenue[category] || 0) + total;
  });

  return Object.entries(categoryRevenue)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
};

export const buildAnalyticsMetrics = (orders = [], now = new Date()) => {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const summary = summarizePaidSales(safeOrders);
  const todayKey = getLocalDateKey(now);
  const todaysOrders = safeOrders.filter((order) => (
    isEligiblePaidSale(order) && getLocalDateKey(order.created_at) === todayKey
  ));
  const todaysRevenue = todaysOrders.reduce((sum, order) => sum + numeric(order.total_amount), 0);
  const average = summary.orderCount ? summary.revenue / summary.orderCount : 0;

  return [
    { label: 'Paid Sales Revenue', value: formatCurrency(summary.revenue), trend: 'Loaded data' },
    { label: 'Paid Orders', value: summary.orderCount, trend: 'Loaded data' },
    { label: "Today's Paid Sales", value: formatCurrency(todaysRevenue), trend: 'Local date' },
    { label: 'Average Paid Sale', value: formatCurrency(average), trend: 'Loaded data' }
  ];
};

export const buildTopSellingProducts = (orderItems = [], products = [], orders = []) => {
  const eligibleOrderIds = new Set(
    (Array.isArray(orders) ? orders : [])
      .filter(isEligiblePaidSale)
      .map((order) => String(order.id))
  );
  const productMap = new Map((Array.isArray(products) ? products : []).map((product) => [
    String(product.id),
    product
  ]));
  const sold = new Map();
  (Array.isArray(orderItems) ? orderItems : []).forEach((item) => {
    if (item.order_id == null || !eligibleOrderIds.has(String(item.order_id))) return;
    const key = String(item.product_id);
    const current = sold.get(key) || { quantity: 0, revenue: 0 };
    current.quantity += numeric(item.quantity ?? item.qty);
    current.revenue += item.total == null
      ? numeric(item.rate ?? item.price) * numeric(item.quantity ?? item.qty)
      : numeric(item.total);
    sold.set(key, current);
  });
  return [...sold.entries()]
    .map(([id, totals]) => ({ ...productMap.get(id), id, ...totals }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
};
