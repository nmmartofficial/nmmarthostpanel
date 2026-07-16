import React, { useMemo } from 'react';
import { toast } from 'sonner';
import {
  Package, ShoppingCart, Users, Zap, DollarSign,
  PlusCircle, Download, Bot, Sparkles, PartyPopper, UserCheck, TrendingUp, Globe
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

export default function DashboardView(props) {
  const { stats, orders, products, setActiveTab, festivals, activeFestival, loading, currentUser } = props;
  const orderItems = props.orderItems || [];

  // --- Multi-Tenant Store Link Logic ---
  const shopSlug = currentUser?.store_slug || currentUser?.shop_id || 'default';
  const storeUrl = `https://nmmart.in/store/${shopSlug}`;

  const copyStoreLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Store Link Copied to Clipboard!");
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-2xl w-full" />
        <div className="grid grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-[300px] bg-slate-50 rounded-3xl" />
          <div className="h-[300px] bg-slate-50 rounded-3xl" />
        </div>
      </div>
    );
  }

  // --- Chart Data Preparation ---

  // 1. Weekly Sales Trend
  const salesTrendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dailyTotal = orders
        .filter(o => new Date(o.created_at).toISOString().split('T')[0] === date)
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      return { day: dayName, amount: dailyTotal };
    });
  }, [orders]);

  // 2. Payment Distribution (Pie Chart)
  const paymentChartData = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const method = o.payment_method || 'CASH';
      const cleanMethod = method.toUpperCase().split(' ')[0];
      counts[cleanMethod] = (counts[cleanMethod] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  // 3. Category Performance
  const categoryChartData = useMemo(() => {
    const catSales = {};
    orderItems.forEach(item => {
      const cat = item.category_name || 'General';
      catSales[cat] = (catSales[cat] || 0) + (parseFloat(item.total) || 0);
    });
    return Object.entries(catSales)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [orderItems]);

  const getUpcomingFestivals = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return festivals
      ?.filter(f => f.isActive && new Date(f.date) >= today)
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0,1) || [];
  };
  
  const upcomingFestivals = getUpcomingFestivals();

  // --- Inventory Intelligence Logic ---
  const smartInsights = useMemo(() => {
    const today = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(today.getDate() + 15);

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

  const handleQuickReorder = (product) => {
    const itemsToOrder = [{
      product_id: product.id,
      name: product.name || product.itname,
      barcode: product.barcode,
      qty: (product.low_stock_threshold || 10) * 3,
      rate: product.purchase_rate || 0
    }];
    localStorage.setItem('nm_po_draft', JSON.stringify(itemsToOrder));
    toast.success(`Reorder draft created for ${product.name || product.itname}`);
    setActiveTab('PurchaseOrderPO');
  };

  const handleMarkClearance = async (product) => {
    const res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.UPDATE, {
      id: product.id,
      restrate: (parseFloat(product.restrate) * 0.8).toFixed(2), // 20% Discount
      narration: 'CLEARANCE SALE'
    });
    if (res.success) {
      toast.success(`${product.name || product.itname} moved to Clearance Sale!`);
      props.fetchInitialData(true, true);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4 overflow-y-auto pr-2 custom-scrollbar">
      {/* Active Festival Banner */}
      {activeFestival && (
        <div className="rounded-xl p-3 text-white shadow-sm overflow-hidden relative bg-gradient-to-r from-indigo-700 to-blue-600 flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-[-20deg] translate-x-16" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg"><PartyPopper size={20} /></div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider leading-none">{activeFestival.name}</h3>
                <p className="text-[10px] font-bold opacity-90 mt-0.5">{activeFestival.description}</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('FestivalManager')} className="text-[8px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-full transition-all">Configure Theme</button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 flex-shrink-0">
        {[
          { label: 'Inventory', value: stats.products, icon: <Package size={16} />, color: 'bg-blue-600' },
          { label: 'Orders', value: stats.orders, icon: <ShoppingCart size={16} />, color: 'bg-cyan-600' },
          { label: 'Customers', value: stats.users, icon: <Users size={16} />, color: 'bg-purple-600' },
          { label: 'Today Sale', value: `₹${todaysSales}`, icon: <Zap size={16} />, color: 'bg-emerald-600' },
          { label: 'Total Revenue', value: `₹${revenue.toLocaleString()}`, icon: <DollarSign size={16} />, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white px-3 py-2.5 rounded-xl border border-neutral-200 shadow-enterprise flex items-center gap-3">
            <div className={cn("p-2 rounded-lg text-white shadow-sm flex-shrink-0", stat.color)}>{stat.icon}</div>
            <div className="min-w-0">
              <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1 truncate">{stat.label}</p>
              <h3 className="text-xs font-black text-neutral-800 tracking-tighter truncate">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Multi-Tenant Store Link Section */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden flex-shrink-0 border border-white/10 group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-transform">
              <Globe size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-[0.2em]">Customer Web Portal</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">
                Connect directly with your customers. Share this unique link for orders.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/10 w-full md:w-auto">
            <div className="px-4 py-2 bg-slate-800 rounded-xl">
              <code className="text-xs font-black text-blue-400 truncate max-w-[200px] block">{storeUrl}</code>
            </div>
            <button
              onClick={copyStoreLink}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
            >
              <PlusCircle size={16} /> Generate & Copy Link
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main Charts Area */}
        <div className="lg:col-span-2 space-y-3">
          {/* Sales Trend Chart */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-enterprise">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-tighter">7-Day Sales Trend</h3>
              </div>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">+12% Growth</span>
            </div>
            <div className="h-[180px] w-full min-h-[180px] min-w-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={180}>
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748B'}} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 800 }}
                    cursor={{ stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Payment Distribution Chart */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-enterprise">
              <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-tighter mb-4 text-center">Payment Methods</h3>
              <div className="h-[150px] w-full relative min-h-[150px] min-w-[150px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={150} minHeight={150}>
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {paymentChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                      <span className="text-[8px] font-black text-neutral-500 uppercase">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-enterprise">
              <h3 className="text-[10px] font-black text-neutral-800 uppercase tracking-tighter mb-4">Top Categories</h3>
              <div className="h-[150px] w-full min-h-[150px] min-w-[150px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={150} minHeight={150}>
                  <BarChart data={categoryChartData} layout="vertical" margin={{ left: -20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#64748B'}} width={80} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Intelligence & Activity */}
        <div className="space-y-3 flex flex-col">
          {/* Intelligence Panel */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-enterprise flex-1 min-h-[300px]">
            <h4 className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Inventory Intelligence
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </div>
            </h4>

            <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
              {/* Predictive: Run-out Risk */}
              {smartInsights.runOutRisk.slice(0, 4).map((p, idx) => (
                <div key={`runout-${idx}`} className="p-2 bg-red-50 rounded-xl border border-red-100 flex flex-col gap-2 group transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-xs shadow-sm shrink-0">📉</div>
                      <span className="text-[10px] font-black text-red-900 truncate uppercase">{p.name || p.itname}</span>
                    </div>
                    <span className="text-[8px] font-black px-2 py-0.5 bg-red-600 text-white rounded-full">STOCK: {p.stock}</span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[8px] font-bold text-red-400 uppercase">Ends in {p.daysRemaining} days</p>
                    <button
                      onClick={() => handleQuickReorder(p)}
                      className="bg-white border border-red-200 text-red-600 px-2 py-1 rounded-md text-[8px] font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      Reorder Now
                    </button>
                  </div>
                </div>
              ))}

              {/* Urgent Expiry */}
              {smartInsights.urgentExpiry.slice(0, 4).map((p, idx) => (
                <div key={`expiry-${idx}`} className="p-2 bg-amber-50 rounded-xl border border-amber-100 flex flex-col gap-2 group transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-xs shadow-sm shrink-0">⏳</div>
                      <span className="text-[10px] font-black text-amber-900 truncate uppercase">{p.name || p.itname}</span>
                    </div>
                    <span className="text-[8px] font-black px-2 py-0.5 bg-amber-600 text-white rounded-full">EXPIRY</span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[8px] font-bold text-amber-600 uppercase">In {p.daysToExpiry} days</p>
                    <button
                      onClick={() => handleMarkClearance(p)}
                      className="bg-white border border-amber-200 text-amber-600 px-2 py-1 rounded-md text-[8px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                    >
                      Clearance Sale
                    </button>
                  </div>
                </div>
              ))}

              {products.filter(p => (parseFloat(p.stock || 0)) <= 0).slice(0, 3).map((p, idx) => (
                <div key={`out-${idx}`} className="p-2 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-xs shadow-sm shrink-0">🚫</div>
                    <span className="text-[9px] font-black text-neutral-700 truncate">{p.name || p.itname}</span>
                  </div>
                  <span className="text-[8px] font-black px-2 py-0.5 bg-neutral-900 text-white rounded-full uppercase">OUT</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
            <h3 className="text-[9px] font-black uppercase tracking-widest mb-3 text-slate-400">System Ops</h3>
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <button onClick={() => setActiveTab('POS')} className="bg-blue-600 hover:bg-blue-700 p-2.5 rounded-lg text-[9px] font-black uppercase flex flex-col items-center gap-1 transition-all">
                <ShoppingCart size={14} /> New Bill
              </button>
              <button onClick={() => setActiveTab('Products')} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg text-[9px] font-black uppercase flex flex-col items-center gap-1 transition-all border border-white/5">
                <PlusCircle size={14} /> Add Item
              </button>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-enterprise flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[8px] font-black uppercase text-neutral-400 leading-none tracking-widest">Server Live & Sync: Just Now</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Mini-Row */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-enterprise">
        <h3 className="text-[9px] font-black text-neutral-800 uppercase tracking-widest mb-2 px-1">Recent Activity</h3>
        <div className="flex gap-4 overflow-x-auto pb-1 custom-scrollbar">
          {orders.slice(0, 8).map((order) => (
            <div key={order.id} className="flex-shrink-0 flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[9px] font-black text-neutral-800">#{order.order_number || 'New'}</span>
              <span className="text-[9px] font-bold text-neutral-400">₹{order.total_amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
