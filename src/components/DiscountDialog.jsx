import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgePercent, X, Percent, IndianRupee, Gift } from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';

const DiscountDialog = memo(() => {
  const {
    showDiscountPanel: open,
    discountInput,
    setDiscountInput,
    subTotal,
    totalGst,
    savingAmount,
    newNetTotal,
    isTouchMode,
    handleDiscountChangeAttempt: onApply,
    setShowDiscountPanel,
    openKeypad
  } = usePOS();

  if (!open) return null;

  const discountMode = discountInput.type;
  const discountValue = discountInput.value;

  const onModeChange = (type) => setDiscountInput({ ...discountInput, type });
  const onValueChange = (value) => setDiscountInput({ ...discountInput, value });
  const onCancel = () => setShowDiscountPanel(false);

  return (
    <div className="fixed inset-0 z-[2900] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden border border-white/20"
      >
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
              <BadgePercent size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Discounts & Promotions</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Apply seasonal or manual price adjustments</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-3 hover:bg-slate-200 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex p-8 gap-8">
          {/* Left: Controls */}
          <div className="flex-1 space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => onModeChange('percent')}
                className={cn(
                  "flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2",
                  discountMode === 'percent' ? "bg-red-50 border-red-600 text-red-700" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                )}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => onModeChange('flat')}
                className={cn(
                  "flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2",
                  discountMode === 'flat' ? "bg-red-50 border-red-600 text-red-700" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                )}
              >
                Flat Amount (₹)
              </button>
            </div>

            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors">
                {discountMode === 'percent' ? <Percent size={24} /> : <IndianRupee size={24} />}
              </div>
              <input
                autoFocus
                type="number"
                placeholder={`Enter ${discountMode === 'percent' ? 'Percentage' : 'Amount'}...`}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] py-6 pl-16 pr-8 text-3xl font-black text-slate-800 outline-none focus:bg-white focus:border-red-500 transition-all shadow-inner"
                value={discountValue}
                onChange={(e) => onValueChange(e.target.value)}
                onClick={() => {
                  if (isTouchMode) {
                    openKeypad(
                      `Enter ${discountMode === 'percent' ? 'Discount %' : 'Flat Amount'}`,
                      discountValue,
                      (val) => onValueChange(val)
                    );
                  }
                }}
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quick Presets</p>
              <div className="grid grid-cols-5 gap-2">
                {[2, 5, 10, 15, 20].map(p => (
                  <button
                    key={p}
                    onClick={() => { onModeChange('percent'); onValueChange(p.toString()); }}
                    className="bg-white border border-slate-200 py-2.5 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all"
                  >
                    {p}%
                  </button>
                ))}
                {[50, 100, 200, 500].map(f => (
                  <button
                    key={f}
                    onClick={() => { onModeChange('flat'); onValueChange(f.toString()); }}
                    className="bg-white border border-slate-200 py-2.5 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all"
                  >
                    ₹{f}
                  </button>
                ))}
                <button
                  onClick={() => { onModeChange('percent'); onValueChange('0'); onApply('percent', 0); }}
                  className="bg-slate-800 text-white py-2.5 rounded-xl text-[11px] font-black hover:bg-black transition-all uppercase"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Promotion Placeholders */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between opacity-60">
              <div className="flex items-center gap-3">
                <Gift size={20} className="text-blue-500" />
                <div>
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Automatic Offers</p>
                  <p className="text-[8px] font-bold text-blue-400 uppercase">Buy 1 Get 1, Combo Packs etc.</p>
                </div>
              </div>
              <span className="bg-blue-200 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded-full">UPCOMING</span>
            </div>
          </div>

          {/* Right: Live Preview Summary */}
          <div className="w-[350px] bg-slate-50 rounded-[2rem] p-8 space-y-6 border border-slate-100">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pricing Preview</h4>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span>Original Subtotal</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-red-500 bg-red-100/50 -mx-4 px-4 py-2 rounded-xl">
                <span>Discount Benefit</span>
                <span>-₹{savingAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                <span>GST (Estimated)</span>
                <span>₹{totalGst.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col items-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">New Net Total</p>
              <h3 className="text-5xl font-black text-slate-800 tracking-tighter">
                ₹{newNetTotal.toLocaleString()}
              </h3>
            </div>

            {savingAmount > 0 && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-emerald-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-200">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Customer Savings</p>
                <p className="text-xl font-black tracking-tight">₹{savingAmount.toFixed(2)}</p>
              </motion.div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
          <button
            onClick={() => onApply(discountMode, discountValue)}
            className="flex-1 bg-primary-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all"
          >
            Apply Adjustment (Enter)
          </button>
          <button
            onClick={onCancel}
            className="px-10 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Cancel (Esc)
          </button>
        </div>
      </motion.div>
    </div>
  );
});

DiscountDialog.displayName = 'DiscountDialog';

export default DiscountDialog;
