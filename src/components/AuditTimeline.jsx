import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Search } from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';

const AuditTimeline = memo(() => {
  const {
    showTimeline: open,
    timelineStats: statistics,
    timelineFilter: filter,
    timelineSearch: search,
    filteredTimeline: filteredActivities,
    isTouchMode,
    setTimelineSearch: onSearchChange,
    setTimelineFilter: onFilterChange,
    setShowTimeline: onClose,
    handleGlobalKey: onKeyDown,
    appConfig
  } = usePOS();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onKeyDown={onKeyDown}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-l-[3rem] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border-l border-white/20 h-screen fixed right-0 top-0"
          >
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <History size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Live Audit Timeline</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time session activity log</p>
                </div>
              </div>
              <button onClick={() => onClose(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
            </div>

            {/* Stats Summary */}
            <div className="px-8 pt-6">
              <div className="grid grid-cols-4 gap-3">
                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Added</p>
                    <p className="text-sm font-black text-slate-800">{statistics.added}</p>
                 </div>
                 <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Bills</p>
                    <p className="text-sm font-black text-emerald-700">{statistics.completed}</p>
                 </div>
                 <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 text-center">
                    <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Override</p>
                    <p className="text-sm font-black text-purple-700">{statistics.overrides}</p>
                 </div>
                 <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Alerts</p>
                    <p className="text-sm font-black text-red-700">{statistics.alerts}</p>
                 </div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="p-8 space-y-4">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search activities, bills, or products..."
                    className="w-full bg-slate-100 border-none rounded-xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
               </div>
               <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                  {['All', 'Sales', 'Discount', 'Payment', 'Manager', 'Void', 'Receipt', 'Inventory Alerts'].map(f => (
                     <button
                       key={f}
                       onClick={() => onFilterChange(f)}
                       className={cn(
                         "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                         filter === f ? "bg-primary-600 text-white border-primary-700 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                       )}
                     >
                       {f}
                     </button>
                  ))}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-4">
               {filteredActivities.length > 0 ? filteredActivities.map((act) => (
                  <div key={act.id} className="relative pl-10 group">
                     {/* Timeline Line */}
                     <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100 group-last:bottom-auto group-last:h-4" />

                     {/* Timeline Dot */}
                     <div className={cn(
                        "absolute left-2.5 top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10",
                        act.status === 'success' ? "bg-emerald-500" : act.status === 'error' ? "bg-red-500" : act.status === 'warning' ? "bg-amber-500" : "bg-primary-500"
                     )} />

                     <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-primary-100 transition-all">
                        <div className="flex justify-between items-start mb-1">
                           <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{act.type}</h4>
                           <span className="text-[9px] font-bold text-slate-400">{act.time}</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 uppercase leading-relaxed">{act.details}</p>
                        <div className="mt-2 flex items-center gap-2">
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                              act.category === 'Manager' ? "bg-purple-100 text-purple-700" :
                              act.category === 'Payment' ? "bg-blue-100 text-blue-700" :
                              act.category === 'Inventory Alerts' ? "bg-red-100 text-red-700" :
                              "bg-slate-100 text-slate-600"
                           )}>
                              {act.category}
                           </span>
                           <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">CASHIER: {appConfig?.username || 'SYSTEM'}</span>
                        </div>
                     </div>
                  </div>
               )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                     <History size={48} className="opacity-20" />
                     <p className="text-xs font-black uppercase tracking-widest">No activities found</p>
                  </div>
               )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

AuditTimeline.displayName = 'AuditTimeline';

export default AuditTimeline;
