import React, { useMemo } from 'react';
import { 
  Package, ShoppingCart, Users, Zap, DollarSign, 
  PlusCircle, Printer, Download 
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';

export default function DashboardView({ stats, orders, products, setActiveTab }) {
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
