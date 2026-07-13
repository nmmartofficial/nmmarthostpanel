import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { formatTime } from '../utils/pos';
import { usePOS } from '../context';

const ManagerOverrideDialog = memo(() => {
  const {
    showOverride: open,
    isApproving: loading,
    overrideAction,
    overrideData,
    setOverrideData,
    handleOverrideApprove: onConfirm,
    setShowOverride,
    pinInputRef,
    isTouchMode,
    appConfig
  } = usePOS();

  const onOverrideDataChange = (data) => setOverrideData(data);
  const onCancel = () => setShowOverride(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Manager Override</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sensitive action approval required</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onConfirm} className="p-8 space-y-6">
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-1">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Requested Action</p>
            <h4 className="text-lg font-black text-red-700 uppercase tracking-tight">{overrideAction.label}</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Reason for Override</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-red-500/20"
                value={overrideData.reason}
                onChange={(e) => onOverrideDataChange({ ...overrideData, reason: e.target.value })}
              >
                <option>Manager Approval</option>
                <option>Price Override</option>
                <option>Special Discount</option>
                <option>Customer Complaint</option>
                <option>Damaged Product</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Manager PIN</label>
              <input
                ref={pinInputRef}
                type="password"
                placeholder="Enter Security PIN"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-center tracking-[0.5em] outline-none focus:bg-white focus:border-red-500 transition-all shadow-inner"
                value={overrideData.pin}
                onChange={(e) => onOverrideDataChange({ ...overrideData, pin: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Remarks (Optional)</label>
              <textarea
                placeholder="Add some details..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none h-20 resize-none"
                value={overrideData.remarks}
                onChange={(e) => onOverrideDataChange({ ...overrideData, remarks: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2",
                isTouchMode ? "py-6 text-sm" : "py-4"
              )}
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              Approve Action
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                "px-8 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200",
                isTouchMode ? "py-6" : ""
              )}
            >
              Cancel
            </button>
          </div>

          <div className="flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] pt-2">
            <span>Cashier: {appConfig?.username || 'SYSTEM'}</span>
            <span>Time: {formatTime(new Date())}</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
});

ManagerOverrideDialog.displayName = 'ManagerOverrideDialog';

export default ManagerOverrideDialog;
