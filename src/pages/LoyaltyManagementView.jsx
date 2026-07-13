import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Star, Coins, UserPlus, Plus, Trash2, Edit2, CheckCircle2, Search, X, Award 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';

// Loyalty Tiers Configuration
const LOYALTY_TIERS = [
  { name: 'Bronze', minPoints: 0, discount: 2, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: 'Silver', minPoints: 1000, discount: 5, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  { name: 'Gold', minPoints: 5000, discount: 10, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
];

export default function LoyaltyManagementView({ orders, fetchInitialData }) {
  const [loyaltyCustomers, setLoyaltyCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ user_mobile: '', total_points: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Process customer loyalty data
  const processedCustomers = useMemo(() => {
    // Aggregate data from orders
    const customerAgg = {};
    orders.forEach(order => {
      const mobile = order.user_mobile || 'Guest';
      if (!customerAgg[mobile]) {
        customerAgg[mobile] = {
          user_mobile: mobile,
          customer_name: order.customer_name || 'Customer',
          totalSpent: 0,
          orderCount: 0
        };
      }
      customerAgg[mobile].totalSpent += parseFloat(order.total_amount || 0);
      customerAgg[mobile].orderCount += 1;
    });

    // Convert to array and calculate points (1 point per ₹100 spent)
    return Object.values(customerAgg).map(customer => {
      const points = Math.floor(customer.totalSpent / 100);
      const tier = LOYALTY_TIERS.findLast(tier => points >= tier.minPoints) || LOYALTY_TIERS[0];
      return {
        ...customer,
        total_points: points,
        tier
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    return processedCustomers.filter(customer =>
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.user_mobile.includes(searchTerm)
    );
  }, [processedCustomers, searchTerm]);

  const handleSave = async () => {
    if (!formData.user_mobile) return;
    setIsLoading(true);
    try {
      if (editingCustomer) {
        await handleERPAction(DB_SCHEMA.LOYALTY_POINTS.table, ACTION_TYPES.UPDATE, {
          id: editingCustomer.id,
          total_points: parseInt(formData.total_points) || 0
        });
      } else {
        await handleERPAction(DB_SCHEMA.LOYALTY_POINTS.table, ACTION_TYPES.INSERT, {
          id: crypto.randomUUID(),
          user_mobile: formData.user_mobile,
          total_points: parseInt(formData.total_points) || 0
        });
      }
      fetchInitialData();
      setShowForm(false);
      setEditingCustomer(null);
      setFormData({ user_mobile: '', total_points: 0 });
    } catch (e) {
      console.error('Error saving loyalty customer:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6 gap-6 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Trophy size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Loyalty Program</h1>
            <p className="text-sm text-slate-500 font-bold">Manage customer rewards and tiers</p>
          </div>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditingCustomer(null); setFormData({ user_mobile: '', total_points: 0 }); }}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all"
        >
          <UserPlus size={18} />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        {LOYALTY_TIERS.map((tier) => (
          <div key={tier.name} className={`p-4 rounded-2xl border-2 ${tier.bg} ${tier.border} shadow-md`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-black text-sm ${tier.color}`}>{tier.name}</h3>
              <Trophy size={18} className={tier.color} />
            </div>
            <p className="text-[10px] font-bold text-slate-600">Min: {tier.minPoints} pts</p>
            <p className="text-xl font-black text-slate-800 mt-1">{tier.discount}% OFF</p>
          </div>
        ))}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-sm text-green-700">Total Users</h3>
            <Users size={18} className="text-green-700" />
          </div>
          <p className="text-2xl font-black text-green-800 mt-1">{processedCustomers.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold shadow-sm outline-none"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">Mobile</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">Tier</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest text-center">Points</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest text-center">Spent</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest text-center">Orders</th>
                <th className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <motion.tr key={customer.user_mobile} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${customer.tier.bg}`}>
                        {customer.customer_name[0]}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{customer.customer_name}</p>
                        <p className="text-xs text-slate-500 font-bold">Loyal Customer</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{customer.user_mobile}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${customer.tier.bg} ${customer.tier.color}`}>
                      {customer.tier.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-800">
                    <div className="flex items-center justify-center gap-2">
                      <Coins size={16} className="text-yellow-600" />
                      {customer.total_points}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-800">
                    ₹{Math.round(customer.totalSpent).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-700">{customer.orderCount}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { 
                          setEditingCustomer(customer); 
                          setFormData({ user_mobile: customer.user_mobile, total_points: customer.total_points }); 
                          setShowForm(true); 
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">{editingCustomer ? 'Edit Customer' : 'Add Loyalty Customer'}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.user_mobile}
                    onChange={(e) => setFormData({ ...formData, user_mobile: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                    placeholder="Enter mobile number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Total Points</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.total_points}
                    onChange={(e) => setFormData({ ...formData, total_points: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                    placeholder="Enter points"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowForm(false)} 
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-black text-sm uppercase shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add missing import
function Users({ size = 24, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
