import React, { useMemo } from 'react';
import {
  Package, ShoppingCart, Users, Zap, DollarSign,
  PlusCircle, Download, Bot, Sparkles, PartyPopper
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';

export default function DashboardView({ stats, orders, orderItems, products, setActiveTab, festivals, activeFestival }) {
  const getUpcomingFestivals = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return festivals
      ?.filter(f => f.isActive && new Date(f.date) >= today)
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0,1) || []; // Only show 1 to save space
  };
  
  const upcomingFestivals = getUpcomingFestivals();

  // --- Inventory Intelligence Logic ---
  const smartInsights = useMemo(() => {
    const today = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    // 1. Predictive Stock (Last 30 days analysis)
    // Calculate average daily sales per product
    const salesMap = {};
    (orderItems || []).forEach(item => {
      const pId = item.product_id;
      salesMap[pId] = (salesMap[pId] || 0) + (parseFloat(item.quantity) || 0);
    });

    const runOutRisk = products
      .map(p => {
        const totalSold = salesMap[p.id] || 0;
        const avgDailySales = totalSold / 30;
        const currentStock = parseFloat(p.stock || p.opstock || 0);

        if (avgDailySales === 0) return null;

        const daysRemaining = currentStock / avgDailySales;
        if (daysRemaining <= 5 && currentStock > 0) {
          return { ...p, daysRemaining: Math.round(daysRemaining), type: 'RUN_OUT' };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // 2. Urgent Expiry (Next 15 days)
    const urgentExpiry = products
      .filter(p => {
        if (!p.expiry_date) return false;
        const expDate = new Date(p.expiry_date);
        return expDate >= today && expDate <= fifteenDaysFromNow;
      })
      .map(p => ({ ...p, type: 'EXPIRY', daysToExpiry: Math.ceil((new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    return { runOutRisk, urgentExpiry };
  }, [products, orderItems]);

  const revenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  }, [orders]);

  const todaysSales = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter(o => new Date(o.created_at).toDateString() === today)
      .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  }, [orders]);

  // Analytics: Payment Method Distribution
  const paymentStats = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const method = o.payment_method || 'Unknown';
      counts[method] = (counts[method] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).slice(0, 3);
  }, [orders]);

  // Analytics: Order Status Distribution
  const statusStats = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const status = o.order_status || 'Pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).slice(0, 3);
  }, [orders]);

  return (
    <div className="space-y-2 h-full">
      {/* Active Festival Banner (Enterprise Indigo-Blue Gradient) */}
      {activeFestival && (
        <div 
          className="rounded-xl p-3 text-white shadow-sm overflow-hidden relative bg-gradient-to-r from-indigo-700 to-blue-600"
        >
          {/* Subtle Decorative Overlays */}
          <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-[-20deg] translate-x-16" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <PartyPopper size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider leading-none">
                  {activeFestival.name}
                </h3>
                <p className="text-[10px] font-bold opacity-90 mt-0.5">
                  {activeFestival.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('FestivalManager')}
              className="text-[8px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-full transition-all"
            >
              Configure Theme
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Festivals Banner (Subtle Neutral) */}
      {upcomingFestivals.length > 0 && !activeFestival && (
        <div className="bg-white border border-neutral-200 rounded-xl p-2.5 shadow-enterprise">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Upcoming: <span className="text-neutral-900">{upcomingFestivals[0].name}</span> in {
                  (() => {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffDays = Math.ceil((new Date(upcomingFestivals[0].date) - today) / (1000 * 60 * 60 * 24));
                    return diffDays === 1 ? 'tomorrow!' : `${diffDays} days`;
                  })()
                }</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Cards (Semantic Visual Hierarchy) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {[
          { label: 'Inventory', value: stats.products, icon: <Package size={16} />, color: 'bg-blue-600' },
          { label: 'Orders', value: stats.orders, icon: <ShoppingCart size={16} />, color: 'bg-cyan-600' },
          { label: 'Customers', value: stats.users, icon: <Users size={16} />, color: 'bg-purple-600' },
          { label: 'Today Sale', value: `₹${todaysSales}`, icon: <Zap size={16} />, color: 'bg-emerald-600' },
          { label: 'Total Revenue', value: `₹${revenue.toLocaleString()}`, icon: <DollarSign size={16} />, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white px-3 py-2.5 rounded-xl border border-neutral-200 shadow-enterprise flex items-center gap-3 hover:border-neutral-300 transition-colors">
            <div className={cn("p-2 rounded-lg text-white shadow-sm flex-shrink-0", stat.color)}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1 truncate">{stat.label}</p>
              <h3 className="text-xs font-black text-neutral-800 tracking-tighter truncate">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-2">
          <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-enterprise overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-tighter">Business Activity</h3>
              <button onClick={() => setActiveTab('Orders')} className="text-[8px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View Report</button>
            </div>
            
            <div className="overflow-x-auto border border-neutral-100 rounded-lg">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/80">
                    <th className="px-3 py-1.5 text-[8px] font-black text-neutral-500 uppercase tracking-widest">Order #</th>
                    <th className="px-3 py-1.5 text-[8px] font-black text-neutral-500 uppercase tracking-widest">Amount</th>
                    <th className="px-3 py-1.5 text-[8px] font-black text-neutral-500 uppercase tracking-widest">Method</th>
                    <th className="px-3 py-1.5 text-[8px] font-black text-neutral-500 uppercase tracking-widest">Status</th>
                    <th className="px-3 py-1.5 text-[8px] font-black text-neutral-500 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {orders.slice(0, 6).map((order, idx) => (
                    <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-3 py-1.5 text-[9px] font-black text-blue-600">#{order.order_number || (orders.length - idx)}</td>
                      <td className="px-3 py-1.5 text-[9px] font-black text-neutral-800">₹{order.total_amount}</td>
                      <td className="px-3 py-1.5 text-[9px] font-black text-neutral-500 uppercase">{String(order.payment_method || 'CASH').split(' ')[0]}</td>
                      <td className="px-3 py-1.5">
                        <span className={cn(
                          "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                          order.order_status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        )}>
                          {order.order_status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[8px] font-medium text-neutral-400">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-enterprise">
              <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-tighter mb-2">Payment Insights</h3>
              <div className="space-y-2">
                {paymentStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-0.5">
                      <span className="text-neutral-400">{stat.name}</span>
                      <span className="text-neutral-800">{stat.count}</span>
                    </div>
                    <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stat.count / (orders.length || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-enterprise">
              <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-tighter mb-2">Stock Health</h3>
              <div className="space-y-2">
                {[
                  { label: 'Low', value: products.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-amber-500' },
                  { label: 'Out', value: products.filter(p => p.stock <= 0).length, color: 'bg-red-500' },
                  { label: 'Healthy', value: products.filter(p => p.stock > 5).length, color: 'bg-emerald-500' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-0.5">
                      <span className="text-neutral-400">{item.label}</span>
                      <span className="text-neutral-800">{item.value}</span>
                    </div>
                    <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", item.color)} style={{ width: `${(item.value / (products.length || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions & Smart Inventory Insights */}
        <div className="space-y-2 flex flex-col h-full">
          <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-enterprise flex-1 flex flex-col min-h-0">
            <h4 className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2 flex items-center justify-between">
              Inventory Intelligence
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </div>
            </h4>

            <div className="space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
              {/* Predictive: Run-out Risk */}
              {smartInsights.runOutRisk.slice(0, 3).map((p, idx) => (
                <div key={`runout-${idx}`} className="flex items-center justify-between p-1.5 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-[10px] shadow-xs shrink-0">📉</div>
                    <span className="text-[8px] font-bold text-red-900 truncate">{p.name || p.itname}</span>
                  </div>
                  <span className="text-[7px] font-black px-1.5 py-0.5 bg-red-600 text-white rounded flex-shrink-0 uppercase">
                    Ends in {p.daysRemaining}d
                  </span>
                </div>
              ))}

              {/* Urgent Expiry */}
              {smartInsights.urgentExpiry.slice(0, 3).map((p, idx) => (
                <div key={`expiry-${idx}`} className="flex items-center justify-between p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-[10px] shadow-xs shrink-0">⏳</div>
                    <span className="text-[8px] font-bold text-amber-900 truncate">{p.name || p.itname}</span>
                  </div>
                  <span className="text-[7px] font-black px-1.5 py-0.5 bg-amber-600 text-white rounded flex-shrink-0 uppercase">
                    Exp: {p.daysToExpiry}d
                  </span>
                </div>
              ))}

              {/* Legacy Critical Stock */}
              {products.filter(p => (parseFloat(p.stock || p.opstock || 0)) <= 0).slice(0, 2).map((p, idx) => (
                <div key={`out-${idx}`} className="flex items-center justify-between p-1.5 bg-neutral-100 rounded-lg border border-neutral-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-[10px] shadow-xs shrink-0">🚫</div>
                    <span className="text-[8px] font-bold text-neutral-700 truncate">{p.name || p.itname}</span>
                  </div>
                  <span className="text-[7px] font-black px-1.5 py-0.5 bg-neutral-900 text-white rounded flex-shrink-0 uppercase">
                    OUT
                  </span>
                </div>
              ))}

              {smartInsights.runOutRisk.length === 0 && smartInsights.urgentExpiry.length === 0 && products.filter(p => (parseFloat(p.stock || p.opstock || 0)) <= 0).length === 0 && (
                <div className="flex flex-col items-center justify-center py-4 opacity-40">
                  <UserCheck size={20} className="text-emerald-500" />
                  <p className="text-[8px] font-black uppercase mt-1">All Good</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-3 text-white shadow-lg relative overflow-hidden group">
            <h3 className="text-[9px] font-black uppercase tracking-widest mb-2 text-slate-400">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-1.5 relative z-10">
              <button onClick={() => setActiveTab('POS')} className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all shadow-md">
                <ShoppingCart size={12} /> New Bill
              </button>
              <button onClick={() => setActiveTab('AppBuilderAI')} className="bg-violet-600 hover:bg-violet-700 p-2 rounded-lg text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all shadow-md">
                <Bot size={12} /> AI Tools
              </button>
              <button onClick={() => setActiveTab('Products')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all border border-white/5">
                <PlusCircle size={12} /> Add Item
              </button>
              <button 
                onClick={() => handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: 'Inventory_Export' })}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all border border-white/5"
              >
                <Download size={12} /> Export
              </button>
            </div>
            {/* Background Texture */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-enterprise relative overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <p className="text-[8px] font-black uppercase text-neutral-400 leading-none">ERP Node Status</p>
                <p className="text-[10px] font-black text-neutral-800 mt-0.5">Live & Synchronized</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
