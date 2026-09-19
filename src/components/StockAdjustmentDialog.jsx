import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Save, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { toast } from 'sonner';
import { cn } from '../utils/helpers';

export default function StockAdjustmentDialog({ isOpen, onClose, product, fetchInitialData, initialType = 'adjustment' }) {
  const [formData, setFormData] = useState({
    change_qty: '',
    change_type: initialType,
    narration: '',
    reference_number: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        change_qty: '',
        change_type: initialType,
        narration: '',
        reference_number: ''
      });
    }
  }, [isOpen, initialType]);

  if (!isOpen || !product) return null;

  const currentStock = parseFloat(product.stock || 0);
  const changeQty = parseFloat(formData.change_qty) || 0;
  const newStock = currentStock + changeQty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.change_qty || isNaN(changeQty) || changeQty === 0) {
      return toast.error("Please enter a valid non-zero adjustment quantity");
    }

    if (newStock < 0) {
      return toast.error("New stock cannot be negative");
    }

    setIsSubmitting(true);
    try {
      const res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.ADJUST_STOCK, {
        product_id: product.id,
        change_qty: changeQty,
        change_type: formData.change_type,
        narration: formData.narration,
        reference_number: formData.reference_number
      });

      if (res.success) {
        toast.success("Stock adjusted successfully");
        fetchInitialData?.();
        onClose();
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        >
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                <RefreshCw size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Stock Adjustment</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update inventory atomically</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Product Header */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</p>
                <h4 className="text-sm font-black text-slate-800 uppercase truncate max-w-[200px]">{product.name}</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{product.barcode || 'No Barcode'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                <span className="text-xl font-black text-slate-800">{currentStock}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                  value={formData.change_type}
                  onChange={e => setFormData({ ...formData, change_type: e.target.value })}
                >
                  <option value="adjustment">General Adjustment</option>
                  <option value="damage">Damage / Broken</option>
                  <option value="expiry">Expired Stock</option>
                  <option value="wastage">Wastage</option>
                  <option value="opening">Opening Stock Correction</option>
                  <option value="manual">Manual Update</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Change Qty (+ / -)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="e.g. -5 or 10"
                    value={formData.change_qty}
                    onChange={e => setFormData({ ...formData, change_qty: e.target.value })}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {changeQty > 0 ? <ArrowUpRight className="text-emerald-500" size={16} /> :
                     changeQty < 0 ? <ArrowDownLeft className="text-red-500" size={16} /> : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className={cn(
              "p-4 rounded-2xl flex items-center justify-between border transition-all",
              newStock < 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  newStock < 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {newStock < 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Resulting Stock</p>
                  <p className={cn("text-xl font-black", newStock < 0 ? "text-red-700" : "text-emerald-700")}>
                    {newStock} {product.unit_name || 'Nos'}
                  </p>
                </div>
              </div>
              {newStock < 0 && (
                <p className="text-[9px] font-black text-red-600 uppercase bg-white/50 px-2 py-1 rounded-lg">Negative stock not allowed</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reference / Voucher No</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                placeholder="e.g. ADJ-001"
                value={formData.reference_number}
                onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Narration / Reason</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none h-20 resize-none"
                placeholder="Reason for adjustment..."
                value={formData.narration}
                onChange={e => setFormData({ ...formData, narration: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || newStock < 0 || changeQty === 0}
                className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Apply Adjustment
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function CheckCircle({ size, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
