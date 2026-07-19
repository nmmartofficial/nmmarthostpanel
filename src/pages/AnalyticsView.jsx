import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, ShoppingBag, Users, IndianRupee, 
  ArrowUpRight, ArrowDownRight, Activity, Package 
} from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  buildSalesTrendData,
  buildStatusData,
  buildCategoryData,
  buildAnalyticsMetrics,
  buildTopSellingProducts
} from '../utils/analyticsHelpers';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsView({ orders, products, users }) {
  const salesTrendData = useMemo(() => buildSalesTrendData(orders), [orders]);
  const statusData = useMemo(() => buildStatusData(orders), [orders]);
  const categoryData = useMemo(() => buildCategoryData(orders), [orders]);
  const metrics = useMemo(() => buildAnalyticsMetrics(orders), [orders]);
  const topSellingProducts = useMemo(() => buildTopSellingProducts(orders, products), [orders, products]);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">App Performance Analytics</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insights & Business Trends</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Live Sync Enabled</span>
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
                  m.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {m.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
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
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Category Revenue</h3>
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
                { label: 'Low Stock', count: products.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-amber-500' },
                { label: 'Out of Stock', count: products.filter(p => p.stock <= 0).length, color: 'bg-red-500' },
                { label: 'Healthy Stock', count: products.filter(p => p.stock > 5).length, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <span className="text-xs font-black text-slate-800">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", item.color)}
                      style={{ width: `${(item.count / products.length) * 100}%` }}
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
              <span className="text-xs font-black text-slate-800">{products.length}</span>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Top Selling Products</h3>
              <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Full Report</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Price</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                    <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.slice(0, 5).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2">
                        <p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[200px]">{p.name}</p>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-[8px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded-full">{p.category_name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-2 text-center text-[10px] font-black text-slate-800">₹{p.sale_rate}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded-full",
                          p.stock <= 5 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${80 - (i * 10)}%` }} />
                          </div>
                          <span className="text-[8px] font-black text-slate-400">{80 - (i * 10)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
