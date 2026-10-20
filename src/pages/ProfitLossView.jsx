import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, DollarSign,
  PieChart, Download, FileText, Receipt
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  calcProfitLossSummary, toFloat
} from '../utils/pos/calculations';
import { filterRowsToCurrentStore, isEligiblePaidSale } from '../utils/analyticsHelpers';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const getLocalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRangeStart = (range, now) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'Today') return start;
  if (range === 'Week') {
    const weekday = start.getDay();
    start.setDate(start.getDate() - ((weekday + 6) % 7));
    return start;
  }
  if (range === 'Year') {
    const financialYearStartMonth = 3;
    start.setMonth(start.getMonth() < financialYearStartMonth ? financialYearStartMonth - 12 : financialYearStartMonth, 1);
    return start;
  }
  start.setDate(1);
  return start;
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function ProfitLossView({ orders, purchases, expenses, currentUser }) {
  const [dateRange, setDateFilter] = useState('Month');
  const [viewType, setViewType] = useState('bar'); // 'bar' or 'area'
  const safeOrders = filterRowsToCurrentStore(orders, currentUser);
  const safePurchases = filterRowsToCurrentStore(purchases, currentUser);
  const safeExpenses = filterRowsToCurrentStore(expenses, currentUser);
  const rangeData = useMemo(() => {
    const now = new Date();
    const start = getDateRangeStart(dateRange, now);
    const isInRange = (value) => {
      const date = getLocalDate(value);
      return date !== null && date >= start && date <= now;
    };
    return {
      now,
      orders: safeOrders.filter((order) => isEligiblePaidSale(order) && isInRange(order.created_at)),
      purchases: safePurchases.filter((purchase) => isInRange(purchase.created_at || purchase.invoice_date)),
      expenses: safeExpenses.filter((expense) => isInRange(expense.date || expense.created_at))
    };
  }, [dateRange, safeOrders, safePurchases, safeExpenses]);

  const stats = useMemo(
    () => calcProfitLossSummary({
      orders: rangeData.orders,
      purchases: rangeData.purchases,
      expenses: rangeData.expenses
    }),
    [rangeData]
  );

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(m => ({ name: m, sales: 0, purchase: 0, expenses: 0, periodBalance: 0 }));

    rangeData.orders.forEach(o => {
      const d = getLocalDate(o.created_at);
      if (!d) return;
      data[d.getMonth()].sales += toFloat(o.total_amount);
    });

    rangeData.purchases.forEach(p => {
      const d = getLocalDate(p.created_at || p.invoice_date);
      if (!d) return;
      data[d.getMonth()].purchase += toFloat(p.total_amount);
    });

    rangeData.expenses.forEach(e => {
      const d = getLocalDate(e.date || e.created_at);
      if (!d) return;
      data[d.getMonth()].expenses += toFloat(e.amount);
    });

    return data.map(d => ({
      ...d,
      periodBalance: d.sales - d.purchase - d.expenses
    })).filter(d => d.sales > 0 || d.purchase > 0 || d.expenses > 0);
  }, [rangeData]);

  const expenseDistribution = useMemo(() => {
    const dist = {};
    rangeData.expenses.forEach(e => {
      const cat = e.category || 'General';
      dist[cat] = (dist[cat] || 0) + toFloat(e.amount);
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [rangeData.expenses]);

  const gstTotal = useMemo(
    () => rangeData.orders.reduce((sum, order) => sum + toFloat(order.total_gst), 0),
    [rangeData.orders]
  );

  const handleExportGST = () => {
    if (!rangeData.orders.length) {
      toast.error('No eligible paid sales are available for this date range.');
      return;
    }
    if (rangeData.orders.some((order) => (
      order.total_gst == null || !Number.isFinite(Number(order.total_gst))
    ))) {
      toast.error('GST export is unavailable because one or more eligible sales have no persisted GST total.');
      return;
    }
    const headers = ['Invoice', 'Date', 'Payment Status', 'Order Status', 'Sales Total', 'Persisted GST'];
    const rows = rangeData.orders.map((order) => [
      order.order_number || order.id,
      getLocalDate(order.created_at)?.toLocaleString('en-IN') || '',
      order.payment_status,
      order.order_status || order.status,
      Number(order.total_amount).toFixed(2),
      Number(order.total_gst).toFixed(2)
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos-gst-summary-${dateRange.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('GST summary downloaded using persisted order GST values.');
  };

  const handleExportSummary = () => {
    const headers = ['Month', 'Paid Sales', 'Purchases', 'Expenses', 'Period Balance (Sales Less Purchases And Expenses)'];
    const rows = chartData.map((row) => [
      row.name,
      row.sales.toFixed(2),
      row.purchase.toFixed(2),
      row.expenses.toFixed(2),
      row.periodBalance.toFixed(2)
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos-financial-summary-${dateRange.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (currentUser?.tenant_id == null || !currentUser?.company_code) {
    return (
      <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Financial reports are unavailable until the authenticated tenant and store scope is established.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Financial Intelligence</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loaded paid sales, purchase and expense summary</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportGST}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"
          >
            <FileText size={16} /> GST Report
          </button>
          <select 
            value={dateRange} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Today">Today</option>
            <option value="Week">This Week</option>
            <option value="Month">This Month</option>
            <option value="Year">Financial Year</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          This is a period summary, not a formal profit calculation: inventory cost of goods sold, return/refund adjustments, accruals and tender-level splits are unavailable. GST is shown only from persisted order totals.
        </p>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          {[
            { label: 'Eligible Paid Sales', value: `₹${stats.sales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: <DollarSign size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Recorded Operating Expenses', value: `₹${stats.expenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: <Receipt size={20} />, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Sales Less Purchases & Expenses', value: `₹${stats.profit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Period Balance / Paid Sales', value: `${stats.margin}%`, icon: <PieChart size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className={cn("p-2 rounded-xl", s.bg, s.color)}>
                  {s.icon}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Main Analysis Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Selected Range · {dateRange}</h3>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase">Sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase">Expenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase">Sales less purchases & expenses</span>
                </div>
              </div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setViewType('bar')} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all", viewType === 'bar' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}>Bar</button>
              <button onClick={() => setViewType('area')} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all", viewType === 'area' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400")}>Area</button>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}} />
                  <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="periodBalance" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}} />
                  <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="periodBalance" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Distribution Pie */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Expense Distribution</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie data={expenseDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </RePie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Comparison Summary */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected Range Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recorded purchases &amp; expenses / paid sales</span>
                  <span className="text-lg font-black">{stats.sales > 0 ? (((stats.purchase + stats.expenses) / stats.sales) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Persisted GST on paid sales</span>
                  <span className="text-lg font-black text-blue-300">₹{gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Period balance (sales less recorded purchases &amp; expenses)</span>
                  <span className="text-lg font-black text-emerald-400">₹{stats.profit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="pt-4">
                <div className={cn("p-4 rounded-xl border border-white/10 flex items-center gap-4", stats.profit > 0 ? "bg-emerald-500/10" : "bg-red-500/10")}>
                  <div className={cn("p-2 rounded-lg", stats.profit > 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                    {stats.profit > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase">Simple remainder, not accounting profit</p>
                    <p className="text-sm font-bold">Paid sales minus recorded purchases and expenses for the selected range.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          </div>
        </div>

        {/* Details Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Breakdown</h3>
            <button onClick={handleExportSummary} className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Purchases</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Expenses</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Period Balance</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Balance / Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {chartData.slice().reverse().map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">{d.name}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-emerald-600 text-right">₹{d.sales.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-slate-700 text-right">₹{d.purchase.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-red-600 text-right">₹{d.expenses.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-blue-600 text-right">₹{d.periodBalance.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full",
                        d.periodBalance > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {d.sales > 0 ? ((d.periodBalance / d.sales) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
