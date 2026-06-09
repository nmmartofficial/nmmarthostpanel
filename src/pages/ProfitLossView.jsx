import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, 
  ArrowUpRight, ArrowDownRight, PieChart, 
  Calendar, Download, RefreshCw, FileText
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie, Legend 
} from 'recharts';

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];

export default function ProfitLossView({ orders, purchases, expenses }) {
  const [dateRange, setDateFilter] = useState('Month');

  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const totalPurchase = purchases.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    // Simplified Gross Profit calculation
    const grossProfit = totalSales - totalPurchase;
    const netProfit = grossProfit - totalExpenses;
    const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      sales: totalSales,
      purchase: totalPurchase,
      expenses: totalExpenses,
      profit: netProfit,
      margin: margin.toFixed(1)
    };
  }, [orders, purchases, expenses]);

  const chartData = useMemo(() => {
    // Grouping by Month for the last 12 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(m => ({ name: m, sales: 0, purchase: 0, expenses: 0, profit: 0 }));

    orders.forEach(o => {
      const d = new Date(o.created_at);
      data[d.getMonth()].sales += parseFloat(o.total_amount) || 0;
    });

    purchases.forEach(p => {
      const d = new Date(p.created_at);
      data[d.getMonth()].purchase += parseFloat(p.total_amount) || 0;
    });

    (expenses || []).forEach(e => {
      const d = new Date(e.date);
      data[d.getMonth()].expenses += parseFloat(e.amount) || 0;
    });

    return data.map(d => ({ ...d, profit: d.sales - d.purchase - d.expenses })).filter(d => d.sales > 0 || d.purchase > 0 || d.expenses > 0);
  }, [orders, purchases, expenses]);

  const handleExportGST = () => {
    // Basic GST Export logic
    const gstData = orders.map(o => ({
      'Invoice No': o.order_number,
      'Date': new Date(o.created_at).toLocaleDateString(),
      'Customer': o.customer_name,
      'Total Amount': o.total_amount,
      'Taxable Amount': (o.total_amount / 1.05).toFixed(2),
      'GST (5%)': (o.total_amount - (o.total_amount / 1.05)).toFixed(2)
    }));
    
    // Using simple alert as mock, in real we would use XLSX
    console.table(gstData);
    alert("GST Report generated in console. In production, this will download an Excel file.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Financial Intelligence</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">P&L Analysis & Margin Tracking</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${Math.round(stats.sales).toLocaleString()}`, trend: '+15%', icon: <DollarSign size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Operating Expenses', value: `₹${Math.round(stats.expenses).toLocaleString()}`, trend: '+5%', icon: <Receipt size={20} />, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Actual Net Profit', value: `₹${Math.round(stats.profit).toLocaleString()}`, trend: '+12%', icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Net Margin', value: `${stats.margin}%`, trend: '+2%', icon: <PieChart size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2.5 rounded-xl", s.bg, s.color)}>
                {s.icon}
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1",
                s.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {s.trend.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {s.trend}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Revenue vs Expenses vs Net Profit</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Expenses</span>
            </div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}}
              />
              <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Details Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Breakdown</h3>
          <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Expenses</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Profit</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {chartData.reverse().map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">{d.name}</td>
                  <td className="px-6 py-4 text-[11px] font-black text-emerald-600 text-right">₹{d.sales.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[11px] font-black text-red-600 text-right">₹{d.expenses.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[11px] font-black text-blue-600 text-right">₹{d.profit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full",
                      d.profit > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {d.sales > 0 ? ((d.profit / d.sales) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

