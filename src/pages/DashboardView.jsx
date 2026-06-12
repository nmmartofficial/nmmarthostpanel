import React, { useMemo } from 'react';
import { 
  Package, ShoppingCart, Users, Zap, DollarSign, 
  PlusCircle, Printer, Download, Bot, Sparkles, PartyPopper 
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';

export default function DashboardView({ stats, orders, products, setActiveTab, festivals, activeFestival }) {
  const getUpcomingFestivals = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return festivals
      ?.filter(f => f.isActive && new Date(f.date) >= today)
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0,3) || [];
  };
  
  const upcomingFestivals = getUpcomingFestivals();
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
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [orders]);

  // Analytics: Order Status Distribution
  const statusStats = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const status = o.order_status || 'Pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [orders]);

  return (
    <div className="space-y-4">
      {/* Active Festival Banner */}
      {activeFestival && (
        <div 
          className="rounded-xl p-4 text-white shadow-lg overflow-hidden relative"
          style={{background: `linear-gradient(135deg, ${activeFestival.primaryColor}, ${activeFestival.secondaryColor})`}}
        >
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PartyPopper size={32} className="animate-pulse" />
              <div>
                <h3 className="text-base font-black uppercase tracking-wider">
                  {activeFestival.name}
                </h3>
                <p className="text-xs font-bold opacity-90 mt-1">
                  {activeFestival.description}
                </p>
                <p className="text-xs font-bold opacity-75 mt-0.5">
                  {new Date(activeFestival.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
                Theme Applied ✨
              </span>
              <div className="flex gap-1">
                <div 
                  className="w-6 h-6 rounded shadow-sm border border-white/30"
                  style={{backgroundColor: activeFestival.primaryColor}}
                />
                <div 
                  className="w-6 h-6 rounded shadow-sm border border-white/30"
                  style={{backgroundColor: activeFestival.secondaryColor}}
                />
              </div>
              <button 
                onClick={() => setActiveTab('FestivalManager')}
                className="text-[8px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-all"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Festivals Banner */}
      {upcomingFestivals.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles size={24} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Upcoming Festival</h3>
                <p className="text-xs font-bold opacity-80">{upcomingFestivals[0].name} is {
                  (() => {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffDays = Math.ceil((new Date(upcomingFestivals[0].date) - today) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) return 'today!';
                    if (diffDays === 1) return 'tomorrow!';
                    return `in ${diffDays} days!`;
                  })()
                }</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('FestivalManager')}
              className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg text-xs font-black uppercase shadow-md hover:translate-y-[-1px] transition-all"
            >
              <PartyPopper size={14} />
              View All
            </button>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Inventory', value: stats.products, icon: <Package size={18} />, color: 'bg-blue-600' },
          { label: 'Total Orders', value: stats.orders, icon: <ShoppingCart size={18} />, color: 'bg-emerald-600' },
          { label: 'Customer Base', value: stats.users, icon: <Users size={18} />, color: 'bg-purple-600' },
          { label: 'Today\'s Sales', value: `₹${todaysSales.toLocaleString()}`, icon: <Zap size={18} />, color: 'bg-red-600' },
          { label: 'Total Sales', value: `₹${revenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={cn("p-2.5 rounded-lg text-white", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-base font-black text-slate-800 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions Table & Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">Recent Business Transactions</h3>
              <button onClick={() => setActiveTab('Orders')} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Order #</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.slice(0, 8).map((order, idx) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 text-[10px] font-black text-blue-700">#{order.order_number || (orders.length - idx)}</td>
                      <td className="px-3 py-2 text-[10px] font-bold text-slate-600">{order.user_mobile}</td>
                      <td className="px-3 py-2 text-[10px] font-black text-slate-800">₹{order.total_amount}</td>
                      <td className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase">{order.payment_method || 'CASH'}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          order.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                        )}>
                          {order.order_status || 'Completed'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[9px] font-medium text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Payment Methods</h3>
              <div className="space-y-3">
                {paymentStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">{stat.name}</span>
                      <span className="text-slate-800">{stat.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(stat.count / (orders.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Order Status</h3>
              <div className="space-y-3">
                {statusStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">{stat.name}</span>
                      <span className="text-slate-800">{stat.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          stat.name === 'delivered' ? 'bg-emerald-500' : 'bg-orange-500'
                        )} 
                        style={{ width: `${(stat.count / (orders.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Quick Tools */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Inventory Health</h3>
            <div className="space-y-4 mb-6">
              {[
                { label: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-orange-500' },
                { label: 'Out of Stock', value: products.filter(p => p.stock <= 0).length, color: 'bg-red-500' },
                { label: 'Expiring (30d)', value: products.filter(p => p.expiry_date && (new Date(p.expiry_date) - new Date()) / (1000*60*60*24) <= 30).length, color: 'bg-amber-500' },
                { label: 'Healthy', value: products.filter(p => p.stock > 5).length, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-800">{item.value}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: `${(item.value / (products.length || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Low Stock & Expiry Items List */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Critical Stock Alerts</h4>
              {[
                ...products.filter(p => p.stock <= 5).map(p => ({ ...p, alert_type: 'STOCK' })),
                ...products.filter(p => p.expiry_date && (new Date(p.expiry_date) - new Date()) / (1000*60*60*24) <= 30).map(p => ({ ...p, alert_type: 'EXPIRY' }))
              ].slice(0, 5).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <img src={p.image_url} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-[9px] font-bold text-slate-700 line-clamp-1">{p.name}</span>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded",
                    p.alert_type === 'EXPIRY' ? "bg-amber-100 text-amber-600" : (p.stock <= 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600")
                  )}>{p.alert_type === 'EXPIRY' ? 'EXPIRY' : `${p.stock} STK`}</span>
                </div>
              ))}
              {products.filter(p => p.stock <= 5).length > 5 && (
                <button onClick={() => setActiveTab('Products')} className="w-full text-[8px] font-black text-blue-600 uppercase mt-2">View All Alerts</button>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group mb-4">
            <Bot className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500" size={80} />
            <h3 className="text-[11px] font-black uppercase tracking-widest mb-3">AI APP BUILDER</h3>
            <button 
              onClick={() => setActiveTab('AppBuilderAI')}
              className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/20"
            >
              <Bot size={12} /> Open AI Builder
            </button>
          </div>
          
          <div className="bg-blue-700 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
            <Zap className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500" size={80} />
            <h3 className="text-[11px] font-black uppercase tracking-widest mb-3">ERP Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveTab('Products')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <PlusCircle size={10} /> Add Item
              </button>
              <button onClick={() => setActiveTab('Orders')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <ShoppingCart size={10} /> New Order
              </button>
              <button 
                onClick={async () => {
                  if (orders.length > 0) {
                    const lastOrder = orders[0];
                    const items = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: lastOrder.id } });
                    const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order: lastOrder, items });
                    alert("Printer Command Generated:\n\n" + commands.data);
                  } else {
                    alert("No orders available to print!");
                  }
                }}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Printer size={10} /> Bill Print
              </button>
              <button 
                onClick={() => handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: 'Inventory_Export' })}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Download size={10} /> Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
