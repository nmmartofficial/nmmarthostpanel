import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';

const CustomerPanel = memo(() => {
  const {
    selectedUser,
    selectCustomer: onSelectCustomer,
    custSearch,
    setCustSearch,
    showCustDropdown,
    setShowCustDropdown,
    filteredUsers,
    selectedCustIdx,
    setSelectedCustIdx,
    handleCustSearchKeyDown: onKeyDown,
    custSearchRef,
    customerLoyalty,
    isTouchMode
  } = usePOS();

  const onResetWalkIn = () => onSelectCustomer(null);
  const onSearchChange = (e) => {
    setCustSearch(e.target.value);
    setShowCustDropdown(true);
  };

  return (
    <div className={cn("bg-primary-900 text-white space-y-4 relative shadow-lg", isTouchMode ? "p-8" : "p-5")}>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <label className={cn("font-black text-primary-300 uppercase tracking-widest", isTouchMode ? "text-xs" : "text-[10px]")}>Customer (F2)</label>
          {selectedUser && (
            <button
              onClick={onResetWalkIn}
              className={cn("font-black bg-white/10 hover:bg-red-500 text-white px-2 py-0.5 rounded transition-all", isTouchMode ? "text-[11px] py-1.5 px-4" : "text-[9px]")}
            >
              Reset to Walk-In
            </button>
          )}
        </div>
        <input
          ref={custSearchRef}
          type="text"
          placeholder="Mobile / Name..."
          className={cn(
            "w-full bg-white/10 border border-white/10 rounded-xl font-semibold outline-none focus:bg-white/20 shadow-inner",
            isTouchMode ? "px-6 py-4 text-base" : "px-4 py-2.5 text-sm"
          )}
          value={custSearch}
          onChange={onSearchChange}
          onFocus={() => setShowCustDropdown(true)}
          onKeyDown={onKeyDown}
        />
        {showCustDropdown && filteredUsers.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-2xl rounded-xl border border-slate-200 z-[150] overflow-hidden">
            {filteredUsers.map((u, idx) => (
              <button
                key={u.id}
                onClick={() => onSelectCustomer(u)}
                onMouseEnter={() => setSelectedCustIdx(idx)}
                className={cn(
                  "w-full text-left border-b border-slate-50",
                  selectedCustIdx === idx ? "bg-primary-600 text-white" : "hover:bg-slate-50",
                  isTouchMode ? "px-6 py-4" : "px-4 py-2"
                )}
              >
                <div className="flex flex-col">
                  <span className={cn("font-black uppercase", isTouchMode ? "text-sm" : "text-[11px]")}>{u.name}</span>
                  <span className={cn("font-bold", isTouchMode ? "text-xs" : "text-[9px]")}>{u.mobile}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedUser && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn("bg-white/5 rounded-2xl border border-white/10 space-y-2", isTouchMode ? "p-6" : "p-4")}>
           <div className="flex justify-between items-center">
             <h4 className={cn("font-black uppercase", isTouchMode ? "text-base" : "text-sm")}>{selectedUser.name}</h4>
             <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">Regular</span>
           </div>
           <div className={cn("flex justify-between font-black text-yellow-400", isTouchMode ? "text-sm" : "text-xs")}>
             <span>Loyalty Points: {customerLoyalty.points}</span>
             <span>Wallet: ₹{parseFloat(customerLoyalty.wallet).toFixed(2)}</span>
           </div>
        </motion.div>
      )}
    </div>
  );
});

CustomerPanel.displayName = 'CustomerPanel';

export default CustomerPanel;
