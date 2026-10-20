import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';
import { getPaymentMethod } from '../utils/pos';

const PaymentDialog = memo(() => {
  const {
    showPaymentModal,
    setShowPaymentModal,
    finalTotal,
    subTotal,
    totalGst,
    flatDiscountVal,
    cashInputRef,
    paymentAmounts,
    setPaymentAmounts,
    setPaymentError,
    paymentError,
    paymentValidationError,
    isTouchMode,
    openKeypad,
    changeReturn,
    handleCompletePayment,
    isProcessing,
    paidTotal,
    isPaymentValid,
    checkoutStep
  } = usePOS();

  const updatePaymentAmount = (method, value) => {
    setPaymentAmounts((current) => ({ ...current, [method]: value }));
    setPaymentError('');
  };
  const paymentMessages = {
    INVALID_PAYMENT_TOTAL: 'The payable total is invalid.',
    INVALID_PAYMENT_AMOUNT: 'Enter valid, non-negative payment amounts.',
    INVALID_PAYMENT_METHOD: 'This payment method is not supported.',
    NON_CASH_PAYMENT_EXCEEDS_TOTAL: 'UPI and card amounts cannot exceed the payable total.',
    INSUFFICIENT_PAYMENT: `Insufficient payment: ₹${Math.max(0, Number(finalTotal) - paidTotal).toFixed(2)} remaining`
  };

  return (
    <>
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-800 uppercase">Payment Engine</h3>
                <button onClick={() => setShowPaymentModal(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 flex flex-col lg:flex-row p-5 sm:p-8 gap-6 lg:gap-8">
                <div className="w-full lg:w-[35%] space-y-6">
                  <div className="bg-primary-900 rounded-3xl p-6 text-white text-center">
                    <p className="text-[10px] opacity-40 uppercase">Net Payable</p>
                    <p className="text-4xl font-black">₹{Number(finalTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs"><span>Subtotal</span><span className="font-black">₹{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span>Total GST</span><span className="font-black">{totalGst == null ? 'Unavailable' : `₹${totalGst.toFixed(2)}`}</span></div>
                    <div className="flex justify-between text-xs text-red-500"><span>Discounts</span><span className="font-black">-₹{flatDiscountVal.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase">Cash Amount</label>
                      <input
                        ref={cashInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="w-full bg-slate-50 border-2 rounded-2xl p-4 text-2xl font-black outline-none focus:border-primary-500"
                        value={paymentAmounts.Cash || ''}
                        onChange={(e) => updatePaymentAmount('Cash', e.target.value)}
                        onClick={() => {
                          if (isTouchMode) {
                            openKeypad("Enter Cash Amount", paymentAmounts.Cash, (val) => updatePaymentAmount('Cash', val));
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase">UPI / Digital</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="w-full bg-slate-50 border-2 rounded-2xl p-4 text-2xl font-black outline-none focus:border-blue-500"
                        value={paymentAmounts.UPI || ''}
                        onChange={(e) => updatePaymentAmount('UPI', e.target.value)}
                        onClick={() => {
                          if (isTouchMode) {
                            openKeypad("Enter UPI Amount", paymentAmounts.UPI, (val) => updatePaymentAmount('UPI', val));
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase">Card Payment</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="w-full bg-slate-50 border-2 rounded-2xl p-4 text-2xl font-black outline-none focus:border-indigo-500"
                        value={paymentAmounts.Card || ''}
                        onChange={(e) => updatePaymentAmount('Card', e.target.value)}
                        onClick={() => {
                          if (isTouchMode) {
                            openKeypad("Enter Card Amount", paymentAmounts.Card, (val) => updatePaymentAmount('Card', val));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <p className="text-center text-xs font-semibold text-slate-500">
                      Tender: {paidTotal > 0 ? getPaymentMethod(paymentAmounts) : 'Not entered'}
                    </p>
                    {(paymentError || (!isPaymentValid && paymentValidationError)) && (
                      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {paymentError || paymentMessages[paymentValidationError] || 'Check payment amounts before completing the sale.'}
                      </p>
                    )}
                    <div className={cn("rounded-3xl text-center", changeReturn > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400", isTouchMode ? "p-10" : "p-6")}>
                      <p className="text-[10px] uppercase">Change Return</p>
                      <p className={cn("font-black transition-all", isTouchMode ? "text-7xl" : "text-5xl")}>₹{changeReturn.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={handleCompletePayment}
                      disabled={isProcessing || !isPaymentValid}
                      className={cn(
                        "w-full bg-primary-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-primary-700 disabled:bg-slate-200 transition-all",
                        isTouchMode ? "py-8 text-xl" : "py-5"
                      )}
                    >
                      {isProcessing ? 'Processing...' : 'Complete Sale (Enter)'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutStep === 'processing' && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="flex flex-col items-center gap-6 text-center">
              <RefreshCw size={80} className="text-primary-500 animate-spin" />
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest">Processing...</h3>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

PaymentDialog.displayName = 'PaymentDialog';

export default PaymentDialog;
