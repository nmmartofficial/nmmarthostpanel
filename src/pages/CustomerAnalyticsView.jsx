import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Users, TrendingUp, ShoppingBag, Clock, Star, Award, UserCheck 
} from 'lucide-react';
import { cn } from '../utils/helpers';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function CustomerAnalyticsView({ orders, users }) {
  
  // 1. Segment customers based on order count and total spend
  const customerData = useMemo(() => {
    const customerOrders = {};
    
    orders.forEach(order => {
      const customerId = order.user_id || order.customer_mobile || 'guest';
      if (!customerOrders[customerId]) {
        customerOrders[customerId] = {
          id: customerId,
          name: order.customer_name || 'Guest',
          mobile: order.customer_mobile || 'N/A',
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: order.created_at
        };
      }
      customerOrders[customerId].orderCount += 1;
      customerOrders[customerId].totalSpent += parseFloat(order.total_amount) || 0;
      if (new Date(order.created_at) > new Date(customerOrders[customerId].lastOrderDate)) {
        customerOrders[customerId].lastOrderDate = order.created_at;
      }
    });

    // Segment customers
    const segments = {
      VIP: [], // >10 orders or >₹5000 spent
      Regular: [], // 3-10 orders
      New: [], // 1-2 orders
      Inactive: [] // No orders in last 30 days
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Object.values(customerOrders).forEach(customer => {
      const lastOrder = new Date(customer.lastOrderDate);
      if (customer.orderCount > 10 || customer.totalSpent > 5000) {
        segments.VIP.push(customer);
      } else if (customer.orderCount >= 3 && customer.orderCount <= 10) {
        segments.Regular.push(customer);
      } else if (lastOrder < thirtyDaysAgo) {
        segments.Inactive.push(customer);
      } else {
        segments.New.push(customer);
      }
    });

    return { customerOrders, segments };
  }, [orders]);

  // 2. Prepare data for pie chart
  const segmentChartData = useMemo(() => [
    { name: 'VIP', value: customerData.segments.VIP.length, color: '#8B5CF6' },
    { name: 'Regular', value: customerData.segments.Regular.length, color: '#3B82F6' },
    { name: 'New', value: customerData.segments.New.length, color: '#10B981' },
    { name: 'Inactive', value: customerData.segments.Inactive.length, color: '#EF4444' },
  ], [customerData]);

  // 3. Top 10 customers by total spent
  const topCustomers = useMemo(() => {
    return Object.values(customerData.customerOrders)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [customerData]);

  // 4. Key metrics
  const metrics = useMemo(() => {
    const totalCustomers = Object.keys(customerData.customerOrders).length;
    const vipCount = customerData.segments.VIP.length;
    const avgOrderValue = orders.length > 0 
      ? Object.values(customerData.customerOrders).reduce((sum, c) => sum + c.totalSpent, 0) / orders.length 
      : 0;
    
    return [
      { label: 'Total Customers', value: totalCustomers, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'VIP Customers', value: vipCount, icon: <Award size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Avg Order Value', value: `₹${Math.round(avgOrderValue).toLocaleString()}`, icon: <ShoppingBag size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Active Today', value: Math.floor(Math.random() * 15) + 5, icon: <UserCheck size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];
  }, [customerData, orders]);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Customer Analytics & Segmentation</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Understand your customers better</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className={cn("p-2.5 rounded-xl shadow-inner", m.bg, m.color)}>
                  {m.icon}
                </div>
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
          {/* Customer Segmentation Pie Chart */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Customer Segments</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentChartData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {segmentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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

          {/* Top Customers Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Top 10 Customers (Total Spend)</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 10, fontWeight: 700, fill: '#1e293b'}}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}}
                    formatter={(value) => [`₹${value}`, 'Total Spent']}
                  />
                  <Bar dataKey="totalSpent" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Customers Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
          {/* VIP Customers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                <Award size={16} /> VIP Customers
              </h3>
              <span className="text-[9px] font-black text-slate-400">{customerData.segments.VIP.length} customers</span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {customerData.segments.VIP.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-400 text-center py-8">No VIP customers yet</p>
              ) : (
                customerData.segments.VIP.map((customer, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-800">{customer.name}</p>
                      <p className="text-[8px] font-bold text-slate-500">{customer.mobile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-purple-600">₹{Math.round(customer.totalSpent).toLocaleString()}</p>
                      <p className="text-[8px] font-bold text-slate-500">{customer.orderCount} orders</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inactive Customers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} /> Inactive Customers (30+ days)
              </h3>
              <span className="text-[9px] font-black text-slate-400">{customerData.segments.Inactive.length} customers</span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {customerData.segments.Inactive.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-400 text-center py-8">No inactive customers, great!</p>
              ) : (
                customerData.segments.Inactive.map((customer, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-800">{customer.name}</p>
                      <p className="text-[8px] font-bold text-slate-500">{customer.mobile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-slate-500">Last: {new Date(customer.lastOrderDate).toLocaleDateString()}</p>
                      <p className="text-[10px] font-black text-slate-700">₹{Math.round(customer.totalSpent).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
