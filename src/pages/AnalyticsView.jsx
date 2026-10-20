import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import {
  Package
} from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  buildSalesTrendData,
  buildStatusData,
  buildCategoryData,
  buildAnalyticsMetrics,
  buildTopSellingProducts,
  filterRowsToCurrentStore
} from '../utils/analyticsHelpers';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsView({ orders, products, orderItems = [], currentUser }) {
  const safeOrders = useMemo(
    () => filterRowsToCurrentStore(orders, currentUser),
    [orders, currentUser]
  );
  const safeProducts = useMemo(
    () => filterRowsToCurrentStore(products, currentUser),
    [products, currentUser]
  );
  const safeOrderItems = useMemo(
    () => filterRowsToCurrentStore(orderItems, currentUser),
    [orderItems, currentUser]
  );
  const salesTrendData = useMemo(() => buildSalesTrendData(safeOrders), [safeOrders]);
  const statusData = useMemo(() => buildStatusData(safeOrders), [safeOrders]);
  const categoryData = useMemo(
    () => buildCategoryData(safeOrderItems, safeProducts, safeOrders),
    [safeOrderItems, safeProducts, safeOrders]
  );
  const metrics = useMemo(() => buildAnalyticsMetrics(safeOrders), [safeOrders]);
  const topSellingProducts = useMemo(
    () => buildTopSellingProducts(safeOrderItems, safeProducts, safeOrders),
    [safeOrderItems, safeProducts, safeOrders]
  );

  if (currentUser?.tenant_id == null || !currentUser?.company_code) {
    return (
      <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Analytics are unavailable until the authenticated tenant and store scope is established.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">App Performance Analytics</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insights & Business Trends</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Loaded persisted records</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className={cn("p-2 rounded-xl shadow-inner", m.bg, m.color)}>
                  {m.icon}
                </div>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1",
                  "bg-slate-100 text-slate-500"
                )}>
                  {m.trend}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">{m.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Revenue Trend (Last 7 Days)</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}}
                  />
                  <Tooltip
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Pie */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Order Status</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Categories Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Paid Category Sales</h3>
            <p className="mb-4 text-[9px] font-semibold text-slate-400">Based on the loaded order-item snapshot (currently limited to 30 days); accepted returns are not deducted.</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 10, fontWeight: 700, fill: '#1e293b'}}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inventory Status Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Inventory Health</h3>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {[
                { label: 'Low Stock', count: safeProducts.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-amber-500' },
                { label: 'Out of Stock', count: safeProducts.filter(p => p.stock <= 0).length, color: 'bg-red-500' },
                { label: 'Healthy Stock', count: safeProducts.filter(p => p.stock > 5).length, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <span className="text-xs font-black text-slate-800">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", item.color)}
                      style={{ width: `${safeProducts.length ? (item.count / safeProducts.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase">Total SKUs</span>
              </div>
              <span className="text-xs font-black text-slate-800">{safeProducts.length}</span>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Top Selling Products</h3>
            </div>
            <p className="mb-3 text-[9px] font-semibold text-slate-400">Ranks loaded item records only; older sales and accepted returns are not represented.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Sales Value</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topSellingProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2">
                        <p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[200px]">{p.name || p.itname || 'Product name unavailable'}</p>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-[8px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded-full">{p.category_name || 'Unavailable'}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-[10px] font-black text-slate-800">₹{Number(p.revenue).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-[10px] font-black text-slate-700">{p.quantity}</td>
                    </tr>
                  ))}
                  {topSellingProducts.length === 0 && (
                    <tr><td colSpan="4" className="px-4 py-8 text-center text-xs text-slate-400">No eligible paid item records are available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
