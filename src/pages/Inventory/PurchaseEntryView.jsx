import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Trash2, Save, X, RefreshCw, ChevronDown, Package, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { DB_SCHEMA } from '../../dbSchema';
import {
  toFloat, calcGst, calcPurchaseTotals, sumField
} from '../../utils/pos/calculations';

export default function PurchaseEntryView({ products, accounts, fetchInitialData }) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    paid_amount: 0,
    balance_due: 0,
    notes: '',
    tax_type: 'Exclude'
  });

  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const suppliers = useMemo(() => accounts.filter(a => a.account_type === 'Supplier'), [accounts]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      (p.itname || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Calculate totals (pure calc delegation + sumField helper)
  useEffect(() => {
    const totals = calcPurchaseTotals(items);
    const total = totals.finalBillAmt || totals.subTotal || sumField(items, 'total');
    setFormData(prev => {
      const paid = toFloat(prev.paid_amount);
      return {
        ...prev,
        total_amount: total,
        balance_due: Math.max(0, total - paid)
      };
    });
  }, [items]);

  const addItem = (product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      alert("Product already added to list!");
      return;
    }

    const rate = toFloat(product.purcrate || product.purchase_rate);
    const gstPercent = toFloat(product.gst || product.gst_percent);
    const qty = 1;
    const gstAmtPerQty = calcGst(rate, gstPercent);
    const lineTotal = (rate + gstAmtPerQty) * qty;

    setItems([...items, {
      product_id: product.id,
      item_name: product.itname || product.name,
      barcode: product.barcode,
      quantity: qty,
      rate,
      gst_percent: gstPercent,
      gst_amount: gstAmtPerQty * qty,
      total: lineTotal
    }]);
    setSearchTerm('');
    setShowProductSearch(false);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    const qty = toFloat(newItems[index].quantity);
    const rate = toFloat(newItems[index].rate);
    const gstPercent = toFloat(newItems[index].gst_percent);

    const gstAmtPerQty = calcGst(rate, gstPercent);
    newItems[index].gst_amount = gstAmtPerQty * qty;
    newItems[index].total = (rate + gstAmtPerQty) * qty;

    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id) return alert("Please select a supplier");
    if (items.length === 0) return alert("Please add at least one item");

    setIsSubmitting(true);
    try {
      const totals = calcPurchaseTotals(items);
      const total = totals.finalBillAmt || totals.subTotal || sumField(items, 'total');
      const paid = toFloat(formData.paid_amount);

      const purchaseRes = await handleERPAction(DB_SCHEMA.PURCHASES.table, ACTION_TYPES.ATOMIC_PURCHASE, {
        purchase_header: {
          supplier_id: formData.supplier_id,
          invoice_number: formData.invoice_number,
          invoice_date: formData.invoice_date,
          subtotal: totals.subTotal || 0,
          gst_amount: totals.totalGst || 0,
          discount_amount: totals.discountTotal || 0,
          round_off: totals.roundOff || 0,
          total_amount: total,
          paid_amount: paid,
          balance_due: Math.max(0, total - paid),
          tax_type: formData.tax_type || 'Exclude',
          notes: formData.notes || formData.remarks,
          status: 'completed',
          payment_status: paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'unpaid')
        },
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.item_name || item.itname || item.name,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          gst_percent: Number(item.gst_percent || 0),
          gst_amount: Number(item.gst_amount || 0),
          discount_percent: Number(item.discount_percent || 0),
          discount_amount: Number(item.discount_amount || 0),
          total: Number(item.total || 0)
        }))
      });

      if (!purchaseRes.success || !purchaseRes.data?.purchase_id) {
        throw new Error(purchaseRes.error || 'Atomic purchase transaction failed');
      }

      alert("Purchase recorded successfully! Stock updated.");
      setItems([]);
      setFormData({
        invoice_number: '',
        supplier_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        paid_amount: 0,
        balance_due: 0,
        notes: '',
        tax_type: 'Exclude'
      });
      fetchInitialData();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-md">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Purchase Entry</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Record Stock Inward from Suppliers</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* Left: Invoice Details */}
        <div className="lg:col-span-1 space-y-6 flex flex-col min-h-0">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex-shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Invoice Details</h3>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Supplier *</label>
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={formData.supplier_id}
                  onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Invoice No</label>
                  <input 
                    type="text" 
                    placeholder="INV-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    value={formData.invoice_number}
                    onChange={e => setFormData({...formData, invoice_number: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    value={formData.invoice_date}
                    onChange={e => setFormData({...formData, invoice_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Notes</label>
                <textarea 
                  placeholder="Extra notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none h-20 resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-100 space-y-4 flex-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold opacity-80">Total Amount:</span>
                <span className="text-xl font-black">₹{formData.total_amount.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-80">Amount Paid Now</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">₹</span>
                  <input 
                    type="number" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-4 py-3 text-sm font-black outline-none focus:bg-white/20 transition-all"
                    value={formData.paid_amount}
                    onChange={e => setFormData({...formData, paid_amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-xs font-bold opacity-80">Balance Dues:</span>
                <span className="text-lg font-black text-red-100">₹{formData.balance_due.toLocaleString()}</span>
              </div>
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="w-full bg-white text-emerald-700 font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Complete Purchase Entry
            </button>
          </div>
        </div>

        {/* Right: Items List */}
        <div className="lg:col-span-2 space-y-4 flex flex-col min-h-0">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Scan Barcode or Search Product to add..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowProductSearch(true);
                  }}
                  onFocus={() => setShowProductSearch(true)}
                />
              </div>
            </div>

            {/* Product Search Results Dropdown */}
            <AnimatePresence>
              {showProductSearch && searchTerm && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute left-4 right-4 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] max-h-64 overflow-y-auto"
                >
                  {filteredProducts.length > 0 ? filteredProducts.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full p-3 flex items-center justify-between hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <img src={p.image_url} alt="" className="w-8 h-8 object-contain bg-slate-50 rounded" />
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{p.itname || p.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Barcode: {p.barcode || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-600">₹{p.purcrate || p.purchase_rate || 0}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Stock: {p.opstock || p.stock}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase">No products found</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Product</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest w-20 text-center">Qty</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest w-24 text-right">Rate</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest w-16 text-center">GST %</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest w-24 text-right">GST Amt</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest w-24 text-right">Total</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length > 0 ? items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{item.item_name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.barcode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                          value={item.rate}
                          onChange={e => updateItem(idx, 'rate', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-[10px] font-black text-slate-600">{item.gst_percent}%</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[10px] font-black text-slate-600">₹{(parseFloat(item.gst_amount) * parseFloat(item.quantity || 0)).toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[10px] font-black text-slate-800">₹{parseFloat(item.total).toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-200">
                          <Package size={64} strokeWidth={1} />
                          <p className="text-[10px] font-black uppercase tracking-widest">Add products to start purchase entry</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
