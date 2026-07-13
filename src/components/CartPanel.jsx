import React, { memo } from 'react';
import { ShoppingCart, Clock, RefreshCw, Pause, ArrowLeftRight, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/helpers';
import CartItem from './CartItem';
import { toast } from 'sonner';
import { usePOS } from '../context';

const CartPanel = memo(() => {
  const {
    cart,
    selectedCartId,
    setSelectedCartId,
    removeFromCart,
    updateQty,
    handlePriceChangeAttempt,
    lastAddedId,
    isTouchMode,
    openKeypad,
    cartContainerRef,
    holdSuccessMsg,
    heldBills = [],
    setShowHoldQueue,
    subTotal,
    totalGst,
    billDiscount,
    flatDiscount,
    discountAmount,
    flatDiscountVal,
    roundOff,
    finalTotal,
    isProcessing,
    setShowDiscountPanel,
    setPaymentAmounts,
    setShowPaymentModal,
    handleClearCartAttempt,
    handleHoldBill,
    isSplitPayment,
    setIsSplitPayment
  } = usePOS();

  return (
    <>
      {/* Cart Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <span className="w-[45%]">Item Details</span>
        <span className="w-[30%] text-center">Quantity</span>
        <span className="w-[25%] text-right">Amount</span>
      </div>

      {/* Cart List */}
      <div ref={cartContainerRef} className="flex-1 overflow-y-auto bg-white relative custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 p-8">
            <div className={cn("bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner", isTouchMode ? "w-32 h-32" : "w-20 h-20")}>
              <ShoppingCart size={isTouchMode ? 56 : 40} className="text-slate-200" />
            </div>
            <div className="text-center">
              <p className={cn("font-black uppercase tracking-widest text-slate-400", isTouchMode ? "text-sm" : "text-xs")}>Cart is Empty</p>
              <p className={cn("font-bold text-slate-300 uppercase mt-1", isTouchMode ? "text-xs" : "text-[9px]")}>Scan Barcode or Select Product</p>
            </div>
          </div>
        ) : (
          cart.map((item, idx) => (
            <CartItem
              key={`cart-${item.id}-${idx}`}
              item={item}
              removeFromCart={removeFromCart}
              updateQty={updateQty}
              updatePrice={handlePriceChangeAttempt}
              isSelected={selectedCartId === item.id}
              onSelect={setSelectedCartId}
              lastAddedId={lastAddedId}
              isTouchMode={isTouchMode}
              onOpenKeypad={openKeypad}
            />
          ))
        )}
      </div>

      {/* Summary Footer */}
      <div className={cn("border-t border-slate-200 bg-slate-50 sticky bottom-0 z-20 shadow-2xl", isTouchMode ? "p-8 space-y-6" : "p-5 space-y-4")}>
        <AnimatePresence>
          {holdSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-12 left-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase text-center shadow-lg"
            >
              Bill Held Successfully
            </motion.div>
          )}
        </AnimatePresence>

        {heldBills.length > 0 && (
          <button
            onClick={() => setShowHoldQueue(true)}
            className={cn(
              "w-full bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-black uppercase flex items-center justify-center gap-2 mb-2 transition-all",
              isTouchMode ? "py-4 text-xs shadow-md" : "py-1.5 text-[10px]"
            )}
          >
            <Clock size={isTouchMode ? 16 : 12} /> Held Bills ({heldBills.length}) - F4
          </button>
        )}

        <div className={cn("flex justify-between items-center", isTouchMode ? "text-sm" : "text-xs")}>
          <span className="font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
          <span className="font-black text-slate-800">₹{(subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className={cn("flex justify-between items-center text-slate-400", isTouchMode ? "text-xs" : "text-[10px]")}>
          <span className="font-bold uppercase tracking-widest">GST Amount</span>
          <span className="font-bold">₹{totalGst.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center group cursor-pointer" onClick={() => { if (cart.length > 0) setShowDiscountPanel(true); }}>
          <div className="flex items-center gap-2">
            <span className={cn("font-bold text-slate-500 uppercase tracking-widest", isTouchMode ? "text-sm" : "text-xs")}>Discount</span>
            {(billDiscount > 0 || flatDiscount > 0) && (
              <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-tighter animate-pulse">PROMO APPLIED</span>
            )}
          </div>
          <span className={cn("font-black text-red-500", isTouchMode ? "text-sm" : "text-xs")}>-₹{(discountAmount + flatDiscountVal).toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
          <span className={cn("font-bold text-slate-400 uppercase tracking-widest", isTouchMode ? "text-xs" : "text-[10px]")}>Round Off</span>
          <span className="font-bold text-slate-400">{roundOff.toFixed(2)}</span>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <span className={cn("font-black text-slate-800 uppercase tracking-tighter", isTouchMode ? "text-sm" : "text-xs")}>Net Payable</span>
          <h3 className={cn("font-black text-primary-900 tracking-tighter leading-none transition-all", isTouchMode ? "text-6xl" : "text-4xl")}>₹{finalTotal.toLocaleString()}</h3>
        </div>

        <button
          disabled={cart.length === 0 || isProcessing}
          onClick={() => {
            setPaymentAmounts({ Cash: finalTotal, UPI: 0, Card: 0 });
            setShowPaymentModal(true);
          }}
          className={cn(
            "w-full bg-primary-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-primary-700 active:scale-95 transition-all",
            isTouchMode ? "py-8 text-xl" : "py-5 text-sm"
          )}
        >
          Complete Bill (F12)
        </button>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleClearCartAttempt}
            className="bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            title="Clear Cart (Void Sale)"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            title="Hold Bill"
          >
            <Pause size={14} />
          </button>
          <button
            onClick={() => toast.info("Return functionality not implemented in this step")}
            className="bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 disabled:opacity-50 transition-colors"
            title="Return / Create CN"
          >
            <ArrowLeftRight size={14} />
          </button>
          <button
            onClick={() => {
              setIsSplitPayment(!isSplitPayment);
              setPaymentAmounts({ Cash: finalTotal, UPI: 0, Card: 0 });
            }}
            className={cn(
              "border py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
              isSplitPayment ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
            )}
            title="Split Payment"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>
    </>
  );
});

CartPanel.displayName = 'CartPanel';

export default CartPanel;
