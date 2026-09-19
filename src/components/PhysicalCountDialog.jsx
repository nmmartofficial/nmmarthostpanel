import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Save, Calculator, AlertTriangle } from 'lucide-react';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { toast } from 'sonner';
import { cn } from '../utils/helpers';

export default function PhysicalCountDialog({ isOpen, onClose, product, fetchInitialData }) {
  const [physicalQty, setPhysicalQty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setPhysicalQty('');
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const systemStock = parseFloat(product.stock || 0);
  const physical = parseFloat(physicalQty) || 0;
  const difference = physical - systemStock;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (physicalQty === '' || isNaN(physical)) {
      return toast.error("Please enter physical quantity");
    }

    setIsSubmitting(true);
    try {
      const res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.ADJUST_STOCK, {
        product_id: product.id,
        change_qty: difference,
        change_type: 'adjustment',
        narration: `Physical Stock Count: System(${systemStock}) vs Physical(${physical})`,
        reference_number: 'PHYSICAL-COUNT'
      });

      if (res.success) {
        toast.success("Stock reconciled successfully");
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
              <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Physical Stock Count</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify and correct system inventory</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Information</p>
              <h4 className="text-sm font-black text-slate-800 uppercase truncate">{product.name}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase">{product.barcode || 'No Barcode'}</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Quantity</p>
                <div className="bg-slate-100 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-slate-500">{systemStock}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 text-center">Physical Count</p>
                <input
                  type="number"
                  step="0.001"
                  required
                  autoFocus
                  className="w-full bg-white border-4 border-indigo-100 rounded-xl p-4 text-2xl font-black text-center outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                  placeholder="0.00"
                  value={physicalQty}
                  onChange={e => setPhysicalQty(e.target.value)}
                />
              </div>
            </div>

            {physicalQty !== '' && (
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between border transition-all animate-in fade-in zoom-in duration-200",
                difference === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    difference === 0 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {difference === 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Adjustment required</p>
                    <p className={cn("text-xl font-black", difference === 0 ? "text-emerald-700" : "text-amber-700")}>
                      {difference > 0 ? `+${difference.toFixed(3)}` : difference.toFixed(3)} {product.unit_name || 'Nos'}
                    </p>
                  </div>
                </div>
                {difference !== 0 && (
                  <p className="text-[9px] font-black text-amber-600 uppercase bg-white/50 px-2 py-1 rounded-lg">Correction needed</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || physicalQty === ''}
                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Confirm & Reconcile
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
