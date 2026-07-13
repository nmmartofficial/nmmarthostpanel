import React, { memo } from 'react';
import { X, Search, Clock, Trash2, ArrowRight, Filter, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';
import { getShortHoldId, formatCurrency, formatHoldAge } from '../utils/pos';
import { usePOS } from '../context';

const HoldQueueDialog = memo(() => {
  const {
    showHoldQueue: open,
    heldBills,
    filteredHeldBills,
    selectedHoldIdx: selectedHoldIndex,
    holdSearch: searchText,
    holdSort: sortOption,
    setShowHoldQueue: onClose,
    setHoldSearch: onSearchChange,
    setHoldSort: onSortChange,
    setSelectedHoldIdx: onSelectBill,
    resumeHoldBill: onRestoreBill,
    deleteHeldBill: onDeleteBill,
    handleGlobalKey: onKeyDown
  } = usePOS();

  if (!open) return null;

  const previewBill = selectedHoldIndex >= 0 ? filteredHeldBills[selectedHoldIndex] : null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onKeyDown={onKeyDown}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden h-[85vh] border border-white/20"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-200">
              <Clock size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Hold Queue Manager</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage suspended transactions and resumes</p>
            </div>
          </div>
          <button onClick={() => onClose(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar: Search & Sort */}
        <div className="p-6 bg-white border-b border-slate-50 flex gap-4 items-center">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Name or Mobile..."
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-black outline-none focus:bg-white focus:border-amber-500 transition-all shadow-inner"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
            <select
              className="bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 px-6 text-xs font-black outline-none focus:bg-white focus:border-amber-500 transition-all cursor-pointer"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left: Hold List */}
          <div className="w-[40%] border-r border-slate-100 flex flex-col bg-slate-50/30">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredHeldBills.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
                  <Clock size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Held Bills Found</p>
                </div>
              ) : (
                filteredHeldBills.map((hb, idx) => (
                  <button
                    key={hb.id}
                    onClick={() => onSelectBill(idx)}
                    className={cn(
                      "w-full text-left p-5 rounded-[1.5rem] border-2 transition-all flex flex-col gap-3 group relative overflow-hidden",
                      selectedHoldIndex === idx
                        ? "bg-white border-amber-500 shadow-xl shadow-amber-900/5 translate-x-2"
                        : "bg-white border-white hover:border-slate-200 hover:shadow-md"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: #{getShortHoldId(hb.id)}</span>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{hb.customerInfo?.name || 'Walk-In Customer'}</h4>
                      </div>
                      <span className="text-lg font-black text-amber-600 tracking-tighter">{formatCurrency(hb.total)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                         <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {hb.cart?.length || 0} Items
                         </span>
                         <span className="text-[9px] font-bold text-slate-400">{formatHoldAge(hb.id)}</span>
                      </div>
                      <ChevronRight size={16} className={cn("transition-transform", selectedHoldIndex === idx ? "text-amber-500 translate-x-1" : "text-slate-300")} />
                    </div>

                    {idx === 0 && sortOption === 'newest' && (
                       <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm">NEW</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Preview Panel */}
          <div className="flex-1 flex flex-col bg-white">
            {previewBill ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Preview</p>
                      <h3 className="text-xl font-black text-slate-800 uppercase">#{getShortHoldId(previewBill.id)} • {previewBill.customerInfo?.name || 'Walk-In'}</h3>
                   </div>
                   <div className="flex gap-2">
                      <button
                        onClick={() => onDeleteBill(previewBill.id)}
                        className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Customer Contact</p>
                         <p className="text-xs font-black text-slate-700">{previewBill.customerInfo?.mob || 'Not Provided'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Suspended Time</p>
                         <p className="text-xs font-black text-slate-700">{formatHoldAge(previewBill.id)}</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Items Summary</p>
                      {previewBill.cart?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                           <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800 uppercase">{item.itname || item.name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">₹{item.sale_rate} x {item.quantity}</span>
                           </div>
                           <span className="text-sm font-black text-slate-700">₹{(item.sale_rate * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Total</span>
                      <span className="text-3xl font-black text-slate-800 tracking-tighter">₹{previewBill.total.toLocaleString()}</span>
                   </div>
                   <button
                     onClick={() => onRestoreBill(previewBill)}
                     className="bg-amber-500 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all flex items-center gap-3 active:scale-95"
                   >
                     Restore Transaction <ArrowRight size={20} />
                   </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-200 gap-6">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-100 shadow-inner">
                   <Clock size={48} className="opacity-20" />
                </div>
                <div className="text-center space-y-2">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Transaction Preview</h3>
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Select a bill from the left to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

HoldQueueDialog.displayName = 'HoldQueueDialog';

export default HoldQueueDialog;
