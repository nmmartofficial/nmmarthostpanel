import React, { useState, useMemo } from 'react';
import {
  Package, Truck, CheckCircle2, Clock,
  Search, ExternalLink, MessageCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';

export default function OnlineOrderView({ orders, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');

  const liveOrders = useMemo(() => {
    return orders.filter(o =>
      ['pending', 'confirmed', 'packed', 'out_for_delivery'].includes(o.order_status?.toLowerCase())
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [orders]);

  const stats = useMemo(() => ({
    pending: liveOrders.filter(o => o.order_status === 'pending').length,
    confirmed: liveOrders.filter(o => o.order_status === 'confirmed').length,
    packed: liveOrders.filter(o => o.order_status === 'packed').length,
    delivery: liveOrders.filter(o => o.order_status === 'out_for_delivery').length,
  }), [liveOrders]);

  const updateStatus = async (id, newStatus) => {
    const res = await handleERPAction('orders', ACTION_TYPES.UPDATE, { id, order_status: newStatus });
    if (res.success) fetchInitialData(true, true);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-6 overflow-hidden">
      {/* fulfillment Stats */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        {[
          { label: 'New Orders', count: stats.pending, color: 'bg-red-500', icon: <Clock size={16} /> },
          { label: 'Preparing', count: stats.confirmed, color: 'bg-blue-500', icon: <Package size={16} /> },
          { label: 'Ready to Ship', count: stats.packed, color: 'bg-purple-500', icon: <CheckCircle2 size={16} /> },
          { label: 'On The Way', count: stats.delivery, color: 'bg-emerald-500', icon: <Truck size={16} /> },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-800">{s.count}</h3>
            </div>
            <div className={cn("p-3 rounded-xl text-white shadow-lg", s.color)}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Live Order List */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-enterprise overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Fulfillment Queue
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search active orders..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {liveOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 opacity-40"
              >
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                  <Package size={48} className="text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-800">No Orders in Queue</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Live fulfillment queue is currently empty</p>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {liveOrders.map((order) => (
                <motion.div
                  layout
                  key={order.id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-600">#{order.order_number}</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                          order.order_status === 'pending' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {order.order_status}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-800 mt-1 uppercase">{order.customer_name}</p>
                      <p className="text-[9px] font-medium text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">₹{order.total_amount}</p>
                      <p className="text-[8px] font-black text-emerald-600 uppercase mt-1">{order.payment_method}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {order.order_status === 'pending' && (
                      <button onClick={() => updateStatus(order.id, 'confirmed')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-blue-100">Confirm Order</button>
                    )}
                    {order.order_status === 'confirmed' && (
                      <button onClick={() => updateStatus(order.id, 'packed')} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-purple-100">Mark as Packed</button>
                    )}
                    {order.order_status === 'packed' && (
                      <button onClick={() => updateStatus(order.id, 'out_for_delivery')} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-emerald-100">Send for Delivery</button>
                    )}
                    <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600 transition-colors border border-slate-100">
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={() => window.open(`https://wa.me/91${order.user_mobile}`)}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
