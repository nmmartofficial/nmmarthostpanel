import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Activity, User, Clock, TrendingUp,
  Pause, XCircle, ShieldCheck, Printer
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { formatCurrency, formatTime, roundTo } from '../utils/pos';
import { usePOS } from '../context';

const ShiftDashboard = memo(() => {
  const {
    showShiftPanel: open,
    shiftStats,
    sessionMetrics,
    sessionActivities: activityLog,
    isTouchMode,
    setShowShiftPanel: onClose,
    handleGlobalKey: onKeyDown,
    currentUser,
    sessionStartTime,
    cashierShift,
    isShiftLoading,
    isShiftProcessing,
    shiftError,
    openCashierShift,
    recordCashierMovement,
    closeCashierShift,
    refreshCashierShift
  } = usePOS();
  const [openingCash, setOpeningCash] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementType, setMovementType] = useState('cash_in');
  const [countedCash, setCountedCash] = useState('');
  const [shiftResult, setShiftResult] = useState(null);

  const handleShiftOpen = async (event) => {
    event.preventDefault();
    try {
      const result = await openCashierShift(Number(openingCash));
      setShiftResult(result);
      setOpeningCash('');
    } catch {
      // The POS context exposes the backend error in the shift panel.
    }
  };

  const handleMovement = async (event) => {
    event.preventDefault();
    try {
      await recordCashierMovement(movementType, Number(movementAmount), movementReason);
      setMovementAmount('');
      setMovementReason('');
    } catch {
      // The POS context exposes the backend error in the shift panel.
    }
  };

  const handleShiftClose = async (event) => {
    event.preventDefault();
    try {
      const result = await closeCashierShift(Number(countedCash));
      setShiftResult(result);
      setCountedCash('');
    } catch {
      // The POS context exposes the backend error in the shift panel.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[2800] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onKeyDown={onKeyDown}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden border border-white/20 h-[85vh]"
          >
            {/* Shift Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-primary-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Activity size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cashier Session Summary</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r pr-4 border-slate-200">
                      <User size={12} className="text-primary-600" /> Cashier: {currentUser?.name || currentUser?.full_name || currentUser?.username || currentUser?.email || 'Unavailable'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock size={12} className="text-primary-600" /> Started: {formatTime(sessionStartTime)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => onClose(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Persisted cashier shift</h3>
                    <p className="text-xs text-slate-500">Backend-confirmed opening, cash movements, and closing reconciliation.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshCashierShift().catch(() => {})}
                    disabled={isShiftLoading || isShiftProcessing}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {shiftError && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                    Shift service error: {shiftError}
                  </p>
                )}

                {isShiftLoading ? (
                  <p className="text-sm text-slate-500">Loading shift status…</p>
                ) : cashierShift ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                      Open shift #{cashierShift.id} · opening cash {formatCurrency(cashierShift.opening_cash)} · opened {cashierShift.opened_at ? new Date(cashierShift.opened_at).toLocaleString() : 'time unavailable'}
                    </div>
                    <form onSubmit={handleMovement} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <select value={movementType} onChange={(event) => setMovementType(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <option value="cash_in">Cash in</option>
                        <option value="cash_out">Cash out</option>
                      </select>
                      <input type="number" min="0.01" step="0.01" required value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="Amount" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <input required value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder="Reason" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <button disabled={isShiftProcessing} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Record movement</button>
                    </form>
                    <form onSubmit={handleShiftClose} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                      <label className="flex-1 text-xs font-bold text-slate-600">
                        Counted closing cash
                        <input type="number" min="0" step="0.01" required value={countedCash} onChange={(event) => setCountedCash(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </label>
                      <button disabled={isShiftProcessing} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Close shift</button>
                    </form>
                    <p className="text-xs text-amber-800">Cash drawer reconciliation is blocked if mixed-tender sales or legacy returned orders lack persisted tender/refund details.</p>
                  </div>
                ) : (
                  <form onSubmit={handleShiftOpen} className="flex flex-wrap items-end gap-3">
                    <label className="flex-1 text-xs font-bold text-slate-600">
                      Opening cash
                      <input type="number" min="0" step="0.01" required value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <button disabled={isShiftProcessing || isShiftLoading} className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Open shift</button>
                  </form>
                )}

                {shiftResult?.status === 'closed' && (
                  <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    Shift closed. Expected cash {formatCurrency(shiftResult.expected_cash)} · counted {formatCurrency(shiftResult.closing_cash)} · variance {formatCurrency(shiftResult.variance)}.
                  </div>
                )}
                {shiftResult?.status === 'open' && (
                  <p role="status" className="text-xs font-semibold text-emerald-700">Shift opening confirmed by the backend.</p>
                )}
              </section>

              {/* Row 1: Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loaded Session Sales (Net)</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(shiftStats.netSales)}</h3>
                  <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] uppercase">
                    <TrendingUp size={12} /> {shiftStats.totalBills} Saved Bills Loaded
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Sales</p>
                  <h3 className="text-3xl font-black text-slate-600 tracking-tighter">{formatCurrency(shiftStats.grossSales)}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pre-Discount Amount</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount Given</p>
                  <h3 className="text-3xl font-black text-red-500 tracking-tighter">-{formatCurrency(shiftStats.totalDiscount)}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Bill & Flat Discounts</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST Collected</p>
                  <h3 className="text-3xl font-black text-blue-600 tracking-tighter">{formatCurrency(shiftStats.totalGst)}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sales Tax Component</p>
                </div>
              </div>

              {/* Row 2: Payments & Health */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payment Distribution */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Payment Distribution</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cash</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(shiftStats.cashSales)}</p>
                     </div>
                     <div className="space-y-1 border-l pl-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UPI/Digital</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(shiftStats.upiSales)}</p>
                     </div>
                     <div className="space-y-1 border-l pl-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Split</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(shiftStats.splitSales)}</p>
                     </div>
                     <div className="space-y-1 border-l pl-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(shiftStats.cardSales)}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-white border p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Highest Bill</span>
                        <span className="text-sm font-black text-slate-800">{formatCurrency(shiftStats.highest)}</span>
                     </div>
                     <div className="bg-white border p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Average Bill</span>
                        <span className="text-sm font-black text-slate-800">{formatCurrency(roundTo(shiftStats.average, 0))}</span>
                     </div>
                     <div className="bg-white border p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Lowest Bill</span>
                        <span className="text-sm font-black text-slate-800">{formatCurrency(shiftStats.lowest)}</span>
                     </div>
                  </div>
                </div>

                {/* Health Indicators */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Session Health</h4>
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 space-y-4 shadow-sm">
                     <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><Pause size={16} /></div><span className="text-[10px] font-black text-slate-600 uppercase">Bills On Hold</span></div>
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black">{sessionMetrics.holds}</span>
                     </div>
                     <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600"><XCircle size={16} /></div>                        <span className="text-[10px] font-black text-slate-600 uppercase">Cart Discards</span></div>
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black">{sessionMetrics.voids}</span>
                     </div>
                     <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600"><ShieldCheck size={16} /></div><span className="text-[10px] font-black text-slate-600 uppercase">Overrides</span></div>
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black">{sessionMetrics.overrides}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Printer size={16} /></div><span className="text-[10px] font-black text-slate-600 uppercase">Reprints</span></div>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black">{sessionMetrics.reprints}</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Session Activities List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">In-Memory Session Activities</h4>
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activityLog.map((act) => (
                        <tr key={act.id} className="hover:bg-slate-50/50">
                          <td className="px-8 py-3 text-[10px] font-bold text-slate-400">{act.time}</td>
                          <td className="px-8 py-3 text-[11px] font-black text-slate-700 uppercase">{act.type}</td>
                          <td className="px-8 py-3 text-[11px] font-bold text-slate-500 uppercase">{act.details}</td>
                          <td className="px-8 py-3 text-right">
                             <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Shift Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex gap-3">
                 <button disabled className="bg-slate-100 text-slate-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed group relative">
                    Export PDF
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none">Future Version</span>
                 </button>
                 <button disabled className="bg-slate-100 text-slate-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed group relative">
                    Export Excel
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none">Future Version</span>
                 </button>
                 <button disabled className="bg-slate-100 text-slate-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed group relative">
                    Print Shift Summary
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none">Future Version</span>
                 </button>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Status:</span>
                 <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-2">
                    Session-only · not a cash reconciliation
                 </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

ShiftDashboard.displayName = 'ShiftDashboard';

export default ShiftDashboard;
