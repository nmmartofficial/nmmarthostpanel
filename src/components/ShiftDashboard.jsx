import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Activity, User, Monitor, Clock, TrendingUp,
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
    appConfig,
    sessionStartTime
  } = usePOS();

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
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Shift Operations Dashboard</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r pr-4 border-slate-200">
                      <User size={12} className="text-primary-600" /> Cashier: {appConfig?.username || 'SYSTEM'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r pr-4 border-slate-200">
                      <Monitor size={12} className="text-primary-600" /> Terminal: POS-01
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
              {/* Row 1: Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales (Net)</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(shiftStats.netSales)}</h3>
                  <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] uppercase">
                    <TrendingUp size={12} /> {shiftStats.totalBills} Bills Generated
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
                  <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
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
                     <div className="space-y-1 border-l pl-8 bg-emerald-100/50 -m-4 p-4 rounded-2xl border border-emerald-200 shadow-inner">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Cash In Drawer</p>
                        <p className="text-2xl font-black text-emerald-800">{formatCurrency(shiftStats.cashSales)}</p>
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
                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600"><XCircle size={16} /></div><span className="text-[10px] font-black text-slate-600 uppercase">Voided Sales</span></div>
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
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Live Session Activities</h4>
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
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard Status:</span>
                 <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Operational Data
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
