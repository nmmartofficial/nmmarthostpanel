import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Eye, Printer, Trash2, X, Edit2, User, MapPin, CreditCard, Truck, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';

export default function OrdersView({ orders, filter, fetchInitialData }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('Today'); // Default to Today as requested
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // Status filter from props
    if (filter) {
      result = result.filter(o => o.order_status?.toLowerCase() === filter);
    }

    // Payment filter
    if (paymentFilter !== 'All') {
      result = result.filter(o => {
        const method = (o.payment_method || 'Cash').toLowerCase();
        if (paymentFilter === 'Self-Checkout') return method.includes('self') || method.includes('app');
        return method === paymentFilter.toLowerCase();
      });
    }

    // Date filtering
    const now = new Date();
    if (dateFilter === 'Today') {
      result = result.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
    } else if (dateFilter === '1 Month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      result = result.filter(o => new Date(o.created_at) >= oneMonthAgo);
    } else if (dateFilter === '2 Months') {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(now.getMonth() - 2);
      result = result.filter(o => new Date(o.created_at) >= twoMonthsAgo);
    } else if (dateFilter === '4 Months') {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(now.getMonth() - 4);
      result = result.filter(o => new Date(o.created_at) >= fourMonthsAgo);
    } else if (dateFilter === 'Full Year') {
      result = result.filter(o => new Date(o.created_at).getFullYear() === now.getFullYear());
    }

    // Search by Bill No or Mobile
    if (searchTerm) {
      result = result.filter(o => 
        (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (o.user_mobile || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [orders, filter, dateFilter, paymentFilter, searchTerm]);

  const totalFilteredSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  }, [filteredOrders]);

  useEffect(() => {
    if (selectedOrder) {
      fetchOrderItems(selectedOrder.id);
      setEditFormData(selectedOrder);
    }
  }, [selectedOrder]);

  const fetchOrderItems = async (orderId) => {
    setLoadingItems(true);
    try {
      const data = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, {
        eq: { column: 'order_id', value: orderId }
      });
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.UPDATE, { id, order_status: status });
      fetchInitialData();
      alert("Status Updated");
    } catch (error) {
      alert("Update Error");
    }
  };

  const handleEditSave = async () => {
    try {
      const res = await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.UPDATE, {
        id: selectedOrder.id,
        total_amount: editFormData.total_amount,
        payment_method: editFormData.payment_method,
        payment_status: editFormData.payment_status,
        customer_name: editFormData.customer_name,
        user_mobile: editFormData.user_mobile,
        address: editFormData.address
      });
      if (res.success) {
        alert("Bill updated successfully!");
        setIsEditing(false);
        setSelectedOrder({ ...selectedOrder, ...editFormData });
        fetchInitialData(true, true);
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      alert("Update failed: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary for Filtered Data */}
      <div className="bg-blue-600 p-4 rounded-xl text-white shadow-lg flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Report for {dateFilter}</p>
          <h3 className="text-xl font-black tracking-tighter">Total Sales: ₹{totalFilteredSales.toLocaleString()}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Bills Found</p>
          <h3 className="text-xl font-black tracking-tighter">{filteredOrders.length}</h3>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search Bill No / Mobile"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['Today', '1 Month', '2 Months', '4 Months', 'Full Year', 'All'].map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all border",
                dateFilter === f ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pay:</span>
          {['All', 'Cash', 'UPI', 'Self-Checkout'].map(m => (
            <button
              key={m}
              onClick={() => setPaymentFilter(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border",
                paymentFilter === m ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Bill #</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Customer / Mobile</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Method</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order, idx) => (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5 font-black text-blue-700 text-[10px]">#{order.order_number || (orders.length - orders.indexOf(order))}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-[10px] font-bold text-slate-800 leading-none">{order.user_mobile}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{order.customer_name || 'Walk-in'}</p>
                  </td>
                  <td className="px-4 py-2.5 text-[10px] font-black text-slate-800">₹{order.total_amount}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border",
                      (order.payment_method || 'Cash').toLowerCase() === 'cash' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {order.payment_method || 'Cash'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    <button onClick={() => setSelectedOrder(order)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Eye size={14} /></button>
                    <button 
                      onClick={async () => {
                        const items = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: order.id } });
                        const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order, items });
                        alert("Printer Command Generated");
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all"
                    >
                      <Printer size={14} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm("ARE YOU SURE? This will permanently delete this Bill History!")) {
                          await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.DELETE, { id: order.id });
                          fetchInitialData();
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-4 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No orders found for this selection</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Edit Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                    {isEditing ? "Edit Bill" : "Order Details"}: #{selectedOrder.order_number}
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase border border-blue-100"
                    >
                      <Edit2 size={12} /> Edit Bill
                    </button>
                  )}
                  <button onClick={() => { setSelectedOrder(null); setIsEditing(false); }} className="p-2 hover:bg-white rounded-lg border border-slate-200 transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">Customer Info</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Name</label>
                            <input 
                              type="text" 
                              value={editFormData.customer_name} 
                              onChange={(e) => setEditFormData({...editFormData, customer_name: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Mobile</label>
                            <input 
                              type="text" 
                              value={editFormData.user_mobile} 
                              onChange={(e) => setEditFormData({...editFormData, user_mobile: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Address</label>
                            <textarea 
                              value={editFormData.address} 
                              onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold h-20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">Billing Info</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Total Amount</label>
                            <input 
                              type="number" 
                              value={editFormData.total_amount} 
                              onChange={(e) => setEditFormData({...editFormData, total_amount: Number(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-bold font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Payment Method</label>
                            <select 
                              value={editFormData.payment_method} 
                              onChange={(e) => setEditFormData({...editFormData, payment_method: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-black uppercase"
                            >
                              <option value="Cash">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="Online">Online</option>
                              <option value="Credit">Credit</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Payment Status</label>
                            <select 
                              value={editFormData.payment_status} 
                              onChange={(e) => setEditFormData({...editFormData, payment_status: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-[10px] font-black uppercase"
                            >
                              <option value="paid">Paid</option>
                              <option value="unpaid">Unpaid</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <User size={12} /> Customer Info
                          </h4>
                          <p className="text-[11px] font-black text-slate-800 uppercase">{selectedOrder.customer_name || 'Walk-in Customer'}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">Mobile: {selectedOrder.user_mobile}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <MapPin size={12} /> Address
                          </h4>
                          <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                            {selectedOrder.address || 'No address provided'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CreditCard size={12} /> Payment Details
                          </h4>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Method:</span>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{selectedOrder.payment_method}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Status:</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              selectedOrder.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                            )}>{selectedOrder.payment_status}</span>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Truck size={12} /> Logistics Status
                          </h4>
                          <select 
                            value={selectedOrder.order_status} 
                            onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                            className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 focus:ring-2 focus:ring-blue-500 transition-all"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {loadingItems ? (
                            <tr><td colSpan="4" className="px-4 py-8 text-center"><RefreshCw className="animate-spin mx-auto text-blue-500" size={20} /></td></tr>
                          ) : orderItems.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-700 uppercase">{item.product_name}</span>
                              </td>
                              <td className="px-4 py-3 text-center text-[10px] font-black text-slate-800">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-[10px] font-bold text-slate-600">₹{item.rate}</td>
                              <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800">₹{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-full md:w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>Subtotal:</span>
                          <span>₹{selectedOrder.subtotal || selectedOrder.total_amount}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          <span>Discount:</span>
                          <span>-₹{selectedOrder.discount}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>Delivery:</span>
                          <span>+₹{selectedOrder.delivery_charge}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-800 uppercase tracking-tighter">
                          <span>Grand Total:</span>
                          <span>₹{selectedOrder.total_amount}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleEditSave}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 hover:translate-y-[-1px] transition-all"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Close
                    </button>
                    <button 
                      onClick={async () => {
                        const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order: selectedOrder, items: orderItems });
                        alert("Printer Command Generated");
                      }}
                      className="px-6 py-2 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:translate-y-[-1px] transition-all"
                    >
                      <Printer size={14} /> Print Invoice
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
