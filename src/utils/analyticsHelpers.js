const formatCurrency = (value) => `₹${Math.round(value).toLocaleString()}`;

export const buildSalesTrendData = (orders = []) => {
  const last7Days = [...Array(7)].map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return date.toDateString();
  }).reverse();

  return last7Days.map((date) => {
    const dayOrders = (orders || []).filter((order) => new Date(order.created_at).toDateString() === date);
    const revenue = dayOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);

    return {
      name: date.split(' ').slice(0, 3).join(' '),
      revenue: Math.round(revenue),
      orders: dayOrders.length
    };
  });
};

export const buildStatusData = (orders = []) => {
  const counts = {};

  (orders || []).forEach((order) => {
    const status = order.status || 'pending';
    counts[status] = (counts[status] || 0) + 1;
  });

  return Object.entries(counts).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  }));
};

export const buildCategoryData = (orders = []) => {
  const categoryRevenue = {};

  (orders || []).forEach((order) => {
    const category = order.category_name || 'General';
    categoryRevenue[category] = (categoryRevenue[category] || 0) + (parseFloat(order.total_amount) || 0);
  });

  return Object.entries(categoryRevenue)
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
};

export const buildAnalyticsMetrics = (orders = []) => {
  const totalRevenue = (orders || []).reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
  const avgOrderValue = (orders || []).length > 0 ? totalRevenue / (orders || []).length : 0;
  const today = new Date().toDateString();
  const todaysOrders = (orders || []).filter((order) => new Date(order.created_at).toDateString() === today);
  const todaysRevenue = todaysOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);

  return [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), trend: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Orders', value: (orders || []).length, trend: '+5%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "Today's Sales", value: formatCurrency(todaysRevenue), trend: '+18%', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avg Order Value', value: formatCurrency(avgOrderValue), trend: '-2%', color: 'text-purple-600', bg: 'bg-purple-50' }
  ];
};

export const buildTopSellingProducts = (orders = [], products = []) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return (products || []).slice(0, 5);
  }

  return (products || []).slice(0, 5);
};
