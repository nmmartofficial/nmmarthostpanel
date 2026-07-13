import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';

const VoidDialog = memo(() => {
  const {
    showVoidDialog: open,
    isVoiding: loading,
    selectedUser,
    cartSummary,
    voidForm,
    setVoidForm,
    confirmVoidSale: onConfirm,
    setShowVoidDialog,
    isTouchMode,
    barcodeInputRef
  } = usePOS();

  const customer = selectedUser?.name || 'Walk-in Customer';
  const reason = voidForm.reason;
  const notes = voidForm.remarks;

  const onReasonChange = (val) => setVoidForm({ ...voidForm, reason: val });
  const onNotesChange = (val) => setVoidForm({ ...voidForm, remarks: val });
  const onCancel = () => {
    setShowVoidDialog(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
        >
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4 text-red-600">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Void Current Sale?</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-wrap">This action will cancel and clear the entire cart.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Customer</span>
                <span className="text-slate-800">{customer}</span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Items Count</span>
                <span className="text-slate-800">{cartSummary.itemsCount} Products</span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Total Amount</span>
                <span className="text-red-600 font-black">₹{cartSummary.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Reason for Void <span className="text-red-500">*</span>
                </label>
                <select
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-red-500/20"
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                >
                  <option value="">Select Reason...</option>
                  <option>Wrong Customer</option>
                  <option>Wrong Items</option>
                  <option>Duplicate Bill</option>
                  <option>Customer Cancelled</option>
                  <option>Cashier Mistake</option>
                  <option>Price Issue</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Additional Remarks</label>
                <textarea
                  placeholder="Optional details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none h-20 resize-none focus:ring-2 focus:ring-red-500/20"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  "flex-1 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                  isTouchMode ? "py-6 text-sm" : "py-4"
                )}
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <XCircle size={16} />}
                Void Sale (Enter)
              </button>
              <button
                onClick={onCancel}
                className={cn(
                  "px-8 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all",
                  isTouchMode ? "py-6" : ""
                )}
              >
                Keep Sale (Esc)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

VoidDialog.displayName = 'VoidDialog';

export default VoidDialog;
