import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';
import { getPOSCustomerPhone } from '../utils/pos';

const CustomerPanel = memo(({ compact = false }) => {
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
    customerDataLoading,
    customerDataError,
    isTouchMode
  } = usePOS();

  const onResetWalkIn = () => onSelectCustomer(null);
  const onSearchChange = (e) => {
    setCustSearch(e.target.value);
    setShowCustDropdown(true);
  };

  return (
    <div className={cn(
      compact
        ? 'relative space-y-2 bg-white p-2'
        : cn('relative space-y-4 bg-primary-900 text-white shadow-lg', isTouchMode ? 'p-8' : 'p-5')
    )}>
      <div className="relative">
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className={cn(
            'font-black uppercase tracking-widest',
            compact ? 'text-[10px] text-blue-800' : 'text-primary-300',
            isTouchMode ? 'text-xs' : 'text-[10px]'
          )}>Customer (F2)</label>
          {selectedUser && (
            <button
              onClick={onResetWalkIn}
              type="button"
              className={cn(
                'rounded px-2 py-1 font-bold transition-colors',
                compact ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700' : 'bg-white/10 text-white hover:bg-red-500',
                isTouchMode ? 'text-[11px]' : 'text-[9px]'
              )}
            >
              Walk-in
            </button>
          )}
        </div>
        <input
          ref={custSearchRef}
          type="text"
          placeholder="Mobile / customer name / ID"
          className={cn(
            'w-full rounded-md border font-semibold text-slate-800 outline-none shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
            compact ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/10 text-white focus:bg-white/20',
            isTouchMode ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-xs'
          )}
          value={custSearch}
          onChange={onSearchChange}
          onFocus={() => setShowCustDropdown(true)}
          onKeyDown={onKeyDown}
        />
        {showCustDropdown && custSearch.trim() && (
          <div className="absolute top-full left-0 right-0 z-[150] mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
            {filteredUsers.length > 0 ? filteredUsers.map((u, idx) => (
              <button
                key={u.id}
                onClick={() => onSelectCustomer(u)}
                onMouseEnter={() => setSelectedCustIdx(idx)}
                className={cn(
                  'w-full border-b border-slate-50 text-left',
                  selectedCustIdx === idx ? 'bg-blue-700 text-white' : 'text-slate-800 hover:bg-slate-50',
                  isTouchMode ? 'px-4 py-3' : 'px-3 py-2'
                )}
              >
                <div className="flex flex-col">
                  <span className={cn("font-black uppercase", isTouchMode ? "text-sm" : "text-[11px]")}>{u.name || `Customer ID ${u.id}`}</span>
                  <span className={cn("font-bold", isTouchMode ? "text-xs" : "text-[9px]")}>
                    {getPOSCustomerPhone(u) ? `Mobile: ${getPOSCustomerPhone(u)}` : `Customer ID: ${u.id}`}
                  </span>
                </div>
              </button>
            )              ) : (
                <p className="p-3 text-xs font-semibold text-slate-500">No matching customer. Walk-in sale is available.</p>
            )}
          </div>
        )}
      </div>
      {selectedUser && (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border',
              compact ? 'border-slate-100 bg-slate-50 px-2 py-1.5' : 'space-y-2 border-white/10 bg-white/5 p-4'
            )}
        >
             <div>
               <h4 className={cn('font-black uppercase', compact ? 'text-[11px] text-slate-800' : 'text-sm')}>
                 {selectedUser.name || `Customer ID ${selectedUser.id}`}
               </h4>
             </div>
             <div className={cn('space-y-0.5 font-semibold', compact ? 'text-[9px] text-slate-500' : 'text-[10px] text-primary-100')}>
               <span>ID: {selectedUser.id}</span>
               {getPOSCustomerPhone(selectedUser) && <span className="ml-2">Mobile: {getPOSCustomerPhone(selectedUser)}</span>}
               {(selectedUser.address || selectedUser.address_line1 || selectedUser.city) && (
                 <p className="max-w-full truncate">
                   {[selectedUser.address || selectedUser.address_line1, selectedUser.city].filter(Boolean).join(', ')}
                 </p>
               )}
             </div>
             {!compact && (
               <div className={cn('flex w-full justify-between font-black text-yellow-400', isTouchMode ? 'text-sm' : 'text-xs')}>
                 <span>Loyalty points: {customerDataLoading ? 'Loading…' : customerLoyalty.points ?? '—'}</span>
                 <span>Wallet: {customerDataLoading ? 'Loading…' : customerLoyalty.wallet == null ? '—' : `₹${customerLoyalty.wallet.toFixed(2)}`}</span>
               </div>
             )}
             {customerDataError && <p role="alert" className={cn('w-full text-[10px] font-semibold', compact ? 'text-amber-700' : 'text-amber-200')}>{customerDataError}</p>}
        </motion.div>
      )}
      {compact && !selectedUser && (
        <p className="text-[9px] font-medium text-slate-500">Walk-in sale · choose a customer only when needed</p>
      )}
    </div>
  );
});

CustomerPanel.displayName = 'CustomerPanel';

export default CustomerPanel;
