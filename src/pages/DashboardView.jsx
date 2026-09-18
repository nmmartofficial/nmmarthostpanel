import React, { useMemo } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Copy,
  DollarSign,
  FilePlus2,
  Globe,
  Package,
  PlusCircle,
  ShoppingCart,
  TrendingUp,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../utils/helpers';

const PAYMENT_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#64748b'];
const KPI_TONES = {
  blue: 'bg-blue-50 text-blue-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
};
const currency = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
const numeric = (value) => Number(value) || 0;
const dateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const EmptyState = ({ children }) => (
  <div className="flex min-h-[150px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-[11px] font-bold text-slate-400">
    {children}
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-4 pb-4" aria-label="Loading dashboard">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />)}
    </div>
    <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="h-64 animate-pulse rounded-xl bg-slate-100 xl:col-span-2" />
      <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, detail }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-blue-600" />
      <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-800">{title}</h2>
    </div>
    {detail && <span className="text-[10px] font-semibold text-slate-400">{detail}</span>}
  </div>
);

export default function DashboardView(props) {
  const {
    stats = {},
    orders = [],
    products = [],
    orderItems = [],
    purchases = [],
    inventoryLogs = [],
    categories = [],
    deliveryCustomers = [],
    users = [],
    setActiveTab,
    loading,
    dashboardError,
    fetchInitialData,
    currentUser,
  } = props;

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const safeInventoryLogs = Array.isArray(inventoryLogs) ? inventoryLogs : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const customerRows = Array.isArray(deliveryCustomers) ? deliveryCustomers : [];
  const safeCustomers = customerRows.length > 0 ? customerRows : (Array.isArray(users) ? users : []);

  const storeSlug = currentUser?.store_slug || currentUser?.shop_id;
  const storeBaseUrl = import.meta.env.VITE_STORE_BASE_URL || 'https://nmmart.in';
  const storeUrl = storeSlug
    ? `${storeBaseUrl.replace(/\/$/, '')}/store/${encodeURIComponent(storeSlug)}`
    : '';

  const copyStoreLink = async () => {
    if (!storeUrl) {
      toast.error('Store link is unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success('Store link copied');
    } catch {
      toast.error('Unable to copy store link');
    }
  };

  const totals = useMemo(() => {
    const totalRevenue = safeOrders.reduce((sum, order) => sum + numeric(order.total_amount), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = safeOrders
      .filter((order) => dateKey(order.created_at) === today)
      .reduce((sum, order) => sum + numeric(order.total_amount), 0);
    return { totalRevenue, todaySales };
  }, [safeOrders]);

  const salesTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    return days.map((date) => {
      const key = date.toISOString().slice(0, 10);
      const total = safeOrders
        .filter((order) => dateKey(order.created_at) === key)
        .reduce((sum, order) => sum + numeric(order.total_amount), 0);
      return {
        date: key,
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        amount: total,
      };
    });
  }, [safeOrders]);

  const paymentData = useMemo(() => {
    const totalsByMethod = {};
    safeOrders.forEach((order) => {
      const method = String(order.payment_method || '').trim().toUpperCase();
      if (!method) return;
      const normalized = method.includes('CASH') ? 'CASH'
        : method.includes('UPI') ? 'UPI'
          : method.includes('CARD') ? 'CARD'
            : method.includes('CREDIT') ? 'CREDIT' : method;
      totalsByMethod[normalized] = (totalsByMethod[normalized] || 0) + numeric(order.total_amount);
    });
    const total = Object.values(totalsByMethod).reduce((sum, value) => sum + value, 0);
    return Object.entries(totalsByMethod)
      .map(([name, amount]) => ({ name, amount, percent: total ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [safeOrders]);

  const categoryData = useMemo(() => {
    const productMap = new Map(safeProducts.map((product) => [String(product.id), product]));
    const categoryMap = new Map(safeCategories.map((category) => [String(category.id), category.name]));
    const totalsByCategory = {};
    safeOrderItems.forEach((item) => {
      const product = productMap.get(String(item.product_id));
      const category = product?.category_name || categoryMap.get(String(product?.category_id)) || item.category_name;
      if (!category) return;
      totalsByCategory[category] = (totalsByCategory[category] || 0) + numeric(item.total || (item.rate * item.quantity));
    });
    return Object.entries(totalsByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [safeCategories, safeOrderItems, safeProducts]);

  const inventoryAlerts = useMemo(() => {
    const lowStock = safeProducts.filter((product) => {
      const stock = numeric(product.stock ?? product.opstock);
      const threshold = numeric(product.low_stock_threshold || product.min_qty || 0);
      return stock > 0 && threshold > 0 && stock <= threshold;
    });
    const outOfStock = safeProducts.filter((product) => numeric(product.stock ?? product.opstock) <= 0);
    return { lowStock, outOfStock };
  }, [safeProducts]);

  const recentActivity = useMemo(() => {
    const sales = safeOrders.map((order) => ({
      id: `sale-${order.id}`,
      label: `Sale ${order.order_number || `#${order.id}`}`,
      detail: currency(order.total_amount),
      date: order.created_at,
      color: 'bg-blue-500',
    }));
    const purchaseRows = safePurchases.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      label: `Purchase ${purchase.invoice_number || `#${purchase.id}`}`,
      detail: currency(purchase.total_amount),
      date: purchase.created_at || purchase.invoice_date,
      color: 'bg-amber-500',
    }));
    const stockRows = safeInventoryLogs.map((log) => ({
      id: `stock-${log.id}`,
      label: `Stock ${log.change_type || 'movement'}`,
      detail: `Product #${log.product_id}`,
      date: log.created_at,
      color: 'bg-emerald-500',
    }));
    return [...sales, ...purchaseRows, ...stockRows]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [safeInventoryLogs, safeOrders, safePurchases]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (dashboardError) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="mx-auto mb-3 text-red-600" size={28} />
          <h2 className="text-sm font-black uppercase tracking-widest text-red-800">Unable to load dashboard data</h2>
          <button onClick={() => fetchInitialData?.(true, true)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-black uppercase text-white">Retry</button>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Inventory', value: stats.products ?? safeProducts.length, detail: 'Items in catalog', icon: Package, tone: 'blue' },
    { label: 'Orders', value: stats.orders ?? safeOrders.length, detail: 'Recorded orders', icon: ShoppingCart, tone: 'cyan' },
    { label: 'Customers', value: safeCustomers.length, detail: 'Customer records', icon: Users, tone: 'violet' },
    { label: 'Today Sale', value: currency(totals.todaySales), detail: 'Today', icon: TrendingUp, tone: 'emerald' },
    { label: 'Total Revenue', value: currency(totals.totalRevenue), detail: 'All recorded orders', icon: DollarSign, tone: 'amber' },
  ];

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
            <div key={label} className="min-h-[112px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-3 truncate text-xl font-black tracking-tight text-slate-900">{value}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{detail}</p>
                </div>
                <div className={cn('rounded-lg p-2', KPI_TONES[tone])}><Icon size={18} /></div>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-3"><Globe size={22} /></div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Customer Web Portal</h2>
                <p className="mt-1 text-xs text-slate-400">Share the live customer storefront for this tenant.</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <code className="min-w-0 rounded-lg bg-slate-800 px-3 py-2 text-xs text-blue-300">{storeUrl || 'Store link unavailable'}</code>
              <button onClick={copyStoreLink} disabled={!storeUrl} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                <Copy size={14} /> Generate & Copy Link
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader icon={TrendingUp} title="7-Day Sales Trend" detail="Recorded orders" />
            {safeOrders.length === 0 ? <EmptyState>No sales trend available yet</EmptyState> : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs><linearGradient id="dashboardSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip formatter={(value) => [currency(value), 'Sales']} labelFormatter={(label) => label} />
                    <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fill="url(#dashboardSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader icon={AlertTriangle} title="Inventory Intelligence" />
            {inventoryAlerts.lowStock.length === 0 && inventoryAlerts.outOfStock.length === 0 ? <EmptyState>No active inventory alerts</EmptyState> : (
              <div className="space-y-2">
                {inventoryAlerts.outOfStock.slice(0, 3).map((product) => <div key={`out-${product.id}`} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3"><span className="truncate text-xs font-black text-red-900">{product.name || product.itname}</span><span className="text-[10px] font-black uppercase text-red-600">Out of stock</span></div>)}
                {inventoryAlerts.lowStock.slice(0, 3).map((product) => <div key={`low-${product.id}`} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 p-3"><span className="truncate text-xs font-black text-amber-900">{product.name || product.itname}</span><span className="text-[10px] font-black uppercase text-amber-600">Low stock</span></div>)}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader icon={WalletCards} title="Payment Methods" />
            {paymentData.length === 0 ? <EmptyState>No payment data available</EmptyState> : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="h-[170px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentData} dataKey="amount" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={4}>{paymentData.map((entry, index) => <Cell key={entry.name} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => currency(value)} /></PieChart></ResponsiveContainer></div>
                <div className="space-y-2">{paymentData.map((entry, index) => <div key={entry.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-black text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }} />{entry.name}</span><span className="font-black text-slate-900">{currency(entry.amount)} <span className="text-slate-400">({entry.percent}%)</span></span></div>)}</div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader icon={BarChart3} title="Top Categories" />
            {categoryData.length === 0 ? <EmptyState>No category sales data yet</EmptyState> : (
              <div className="h-[190px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 12 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} /><Tooltip formatter={(value) => currency(value)} /><Bar dataKey="amount" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16} /></BarChart></ResponsiveContainer></div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl bg-slate-900 p-4 text-white shadow-sm">
            <SectionHeader icon={Activity} title="System Ops" />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveTab('POS')} className="flex flex-col items-center gap-2 rounded-lg bg-blue-600 p-3 text-[10px] font-black uppercase tracking-wider hover:bg-blue-500"><FilePlus2 size={18} /> New Bill</button>
              <button onClick={() => setActiveTab('Products')} className="flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-3 text-[10px] font-black uppercase tracking-wider hover:bg-slate-700"><PlusCircle size={18} /> Add Item</button>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <SectionHeader icon={ClipboardList} title="Recent Activity" />
            {recentActivity.length === 0 ? <EmptyState>No recent activity</EmptyState> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{recentActivity.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="flex min-w-0 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} /><span className="truncate text-xs font-black text-slate-700">{item.label}</span></span><span className="ml-2 shrink-0 text-xs font-black text-slate-900">{item.detail}</span></div>)}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
