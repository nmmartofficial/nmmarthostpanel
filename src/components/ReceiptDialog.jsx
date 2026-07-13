import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Copy, Printer, Bell, Mail, Share2, RefreshCw, XCircle, Info } from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { toast } from 'sonner';
import { usePOS } from '../context';

const ReceiptDialog = memo(() => {
  const {
    showReceiptDialog: open,
    lastOrderData,
    cart,
    subTotal,
    discountAmount,
    deliveryChargeAmount,
    finalTotal,
    roundOff,
    appConfig,
    printStatus,
    handlePrintAgain,
    closeReceiptDialog
  } = usePOS();

  if (!open || !lastOrderData) return null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden border border-white/20"
      >
        {/* Left: Receipt Details & Summary */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sale Successful</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction completed successfully</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</p>
              <p className="text-lg font-black text-slate-800">#{lastOrderData.order_number}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
              <p className="text-sm font-bold text-slate-800">
                {new Date(lastOrderData.created_at).toLocaleDateString()} {new Date(lastOrderData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{lastOrderData.customer_name || 'Walk-in Customer'}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</p>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                {lastOrderData.payment_method}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-center border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Amount Received</p>
            <h3 className="text-5xl font-black text-primary-900 tracking-tighter">₹{parseFloat(lastOrderData.total_amount).toLocaleString()}</h3>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handlePrintAgain}
              disabled={printStatus === 'printing'}
              className="flex items-center justify-center gap-2 bg-primary-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {printStatus === 'printing' ? <RefreshCw className="animate-spin" size={16} /> : <Printer size={16} />}
              Print Again (Enter)
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastOrderData.order_number);
                toast.success("Invoice number copied");
              }}
              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              <Copy size={16} />
              Copy Invoice
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button disabled className="opacity-40 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              <Bell size={16} />
              <span className="text-[8px] font-black uppercase mt-1">SMS</span>
            </button>
            <button disabled className="opacity-40 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              <Mail size={16} />
              <span className="text-[8px] font-black uppercase mt-1">Email</span>
            </button>
            <button disabled className="opacity-40 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              <Share2 size={16} />
              <span className="text-[8px] font-black uppercase mt-1">Share</span>
            </button>
          </div>

          <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {printStatus === 'printing' && (
                <span className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase">
                  <RefreshCw size={12} className="animate-spin" /> Printing...
                </span>
              )}
              {printStatus === 'success' && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase">
                  <CheckCircle2 size={12} /> Printed Successfully
                </span>
              )}
              {printStatus === 'failed' && (
                <span className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase">
                  <XCircle size={12} /> Print Failed
                </span>
              )}
            </div>
            <button
              onClick={closeReceiptDialog}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest underline underline-offset-4"
            >
              Close & New Sale (Esc)
            </button>
          </div>
        </div>

        {/* Right: Receipt Preview (Read-only) */}
        <div className="w-80 bg-slate-100 border-l border-slate-200 flex flex-col p-6 overflow-hidden hidden md:flex">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Info size={14} /> Receipt Preview
          </p>
          <div className="flex-1 overflow-y-auto bg-white shadow-sm p-4 rounded-xl custom-scrollbar scale-90 origin-top">
            <ThermalReceipt
              orderData={lastOrderData}
              cart={cart}
              subTotal={subTotal}
              discountAmount={discountAmount}
              deliveryChargeAmount={deliveryChargeAmount}
              finalTotal={finalTotal}
              roundOff={roundOff}
              appConfig={appConfig}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
});

ReceiptDialog.displayName = 'ReceiptDialog';

export default ReceiptDialog;
