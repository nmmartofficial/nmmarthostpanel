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
          { label: 'Inventory', value: stats.products, icon: <Package size={18} />, color: 'bg-primary-600' },
          { label: 'Total Orders', value: stats.orders, icon: <ShoppingCart size={18} />, color: 'bg-primary-600' },
          { label: 'Customer Base', value: stats.users, icon: <Users size={18} />, color: 'bg-secondary-600' },
          { label: 'Today\'s Sales', value: `₹${todaysSales.toLocaleString()}`, icon: <Zap size={18} />, color: 'bg-success-600' },
          { label: 'Total Sales', value: `₹${revenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: 'bg-primary-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-enterprise flex items-center gap-4 hover:shadow-card transition-all cursor-default">
            <div className={cn("p-2.5 rounded-lg text-white shadow-sm", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
              <h3 className="text-base font-black text-neutral-800 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions Table & Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-enterprise">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-tighter">Recent Business Transactions</h3>
              <button onClick={() => setActiveTab('Orders')} className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest transition-colors">View All</button>
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
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-enterprise">
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-tighter mb-5">Payment Methods</h3>
              <div className="space-y-4">
                {paymentStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                      <span className="text-neutral-400">{stat.name}</span>
                      <span className="text-neutral-800">{stat.count}</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(stat.count / (orders.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-enterprise">
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-tighter mb-5">Order Status</h3>
              <div className="space-y-4">
                {statusStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                      <span className="text-neutral-400">{stat.name}</span>
                      <span className="text-neutral-800">{stat.count}</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          stat.name === 'delivered' ? 'bg-success-500' : 'bg-warning-500'
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
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-enterprise">
            <h3 className="text-xs font-black text-neutral-800 uppercase tracking-tighter mb-5">Inventory Health</h3>
            <div className="space-y-5 mb-6">
              {[
                { label: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-warning-500' },
                { label: 'Out of Stock', value: products.filter(p => p.stock <= 0).length, color: 'bg-error-500' },
                { label: 'Expiring (30d)', value: products.filter(p => p.expiry_date && (new Date(p.expiry_date) - new Date()) / (1000*60*60*24) <= 30).length, color: 'bg-info-500' },
                { label: 'Healthy', value: products.filter(p => p.stock > 5).length, color: 'bg-success-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-neutral-400">{item.label}</span>
                    <span className="text-neutral-800">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${(item.value / (products.length || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Low Stock & Expiry Items List */}
            <div className="space-y-2.5 border-t border-neutral-100 pt-5">
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Critical Stock Alerts</h4>
              {[
                ...products.filter(p => p.stock <= 5).map(p => ({ ...p, alert_type: 'STOCK' })),
                ...products.filter(p => p.expiry_date && (new Date(p.expiry_date) - new Date()) / (1000*60*60*24) <= 30).map(p => ({ ...p, alert_type: 'EXPIRY' }))
              ].slice(0, 5).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-white hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image_url} alt="" className="w-7 h-7 object-contain bg-white rounded shadow-sm p-1" />
                    <span className="text-[10px] font-bold text-neutral-700 line-clamp-1">{p.name}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded shadow-sm",
                    p.alert_type === 'EXPIRY' ? "bg-info-100 text-info-700" : (p.stock <= 0 ? "bg-error-100 text-error-700" : "bg-warning-100 text-warning-700")
                  )}>{p.alert_type === 'EXPIRY' ? 'EXPIRY' : `${p.stock} STK`}</span>
                </div>
              ))}
              {products.filter(p => p.stock <= 5).length > 5 && (
                <button onClick={() => setActiveTab('Products')} className="w-full text-[9px] font-black text-primary-600 hover:text-primary-700 uppercase mt-3 transition-colors">View All Alerts</button>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group mb-4">
            <Bot className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500" size={80} />
            <h3 className="text-xs font-black uppercase tracking-widest mb-4">AI APP BUILDER</h3>
            <button 
              onClick={() => setActiveTab('AppBuilderAI')}
              className="w-full bg-white/10 hover:bg-white/20 p-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/20 shadow-inner"
            >
              <Bot size={14} /> Open AI Builder
            </button>
          </div>
          
          <div className="bg-neutral-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group">
            <Zap className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500" size={80} />
            <h3 className="text-xs font-black uppercase tracking-widest mb-4">ERP Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('Products')} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/5">
                <PlusCircle size={12} /> Add Item
              </button>
              <button onClick={() => setActiveTab('Orders')} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/5">
                <ShoppingCart size={12} /> New Order
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
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/5"
              >
                <Printer size={12} /> Bill Print
              </button>
              <button 
                onClick={() => handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: 'Inventory_Export' })}
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/5"
              >
                <Download size={12} /> Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
