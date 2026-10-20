import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Printer, RefreshCw, XCircle, Info } from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { toast } from 'sonner';
import { usePOS } from '../context';

const ReceiptDialog = memo(() => {
  const {
    showReceiptDialog: open,
    lastOrderData,
    lastSavedOrderId,
    invoiceLoading,
    invoiceError,
    retryInvoiceLoad,
    appConfig,
    printStatus,
    handlePrintAgain,
    closeReceiptDialog
  } = usePOS();

  if (!open) return null;

  const copyInvoiceNumber = async () => {
    if (!lastOrderData?.order_number) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(String(lastOrderData.order_number));
      toast.success('Invoice number copied');
    } catch (error) {
      toast.error(error.message || 'Could not copy the invoice number.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden border border-white/20"
      >
        <div className="flex-1 p-6 sm:p-8 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sale Saved</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Backend confirmed order #{lastSavedOrderId}
              </p>
            </div>
          </div>

          {invoiceLoading && (
            <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">
              <RefreshCw size={18} className="animate-spin" /> Loading saved invoice records…
            </div>
          )}
          {invoiceError && (
            <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <p>{invoiceError}</p>
              <button
                type="button"
                onClick={() => retryInvoiceLoad(lastSavedOrderId)}
                disabled={invoiceLoading}
                className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
              >
                Retry invoice loading
              </button>
            </div>
          )}

          {lastOrderData && (
            <>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</p>
                  <p className="text-lg font-black text-slate-800">#{lastOrderData.order_number}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
                  <p className="text-sm font-bold text-slate-800">
                    {lastOrderData.created_at
                      ? new Date(lastOrderData.created_at).toLocaleString()
                      : 'Unavailable'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">
                    {lastOrderData.customer_name || 'Walk-in Customer'}
                  </p>
                  {lastOrderData.user_mobile && <p className="text-xs text-slate-500">{lastOrderData.user_mobile}</p>}
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</p>
                  <p className="text-sm font-black uppercase text-slate-800">{lastOrderData.payment_method || 'Unavailable'}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{lastOrderData.payment_status || 'Unavailable'}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-center border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Persisted Net Payable</p>
                <h3 className="text-4xl font-black text-primary-900 tracking-tighter">
                  ₹{Number(lastOrderData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handlePrintAgain}
              disabled={!lastOrderData || invoiceLoading || printStatus === 'printing'}
              className="flex items-center justify-center gap-2 bg-primary-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {printStatus === 'printing' ? <RefreshCw className="animate-spin" size={16} /> : <Printer size={16} />}
              Print Invoice
            </button>
            <button
              onClick={copyInvoiceNumber}
              disabled={!lastOrderData?.order_number}
              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              <Copy size={16} />
              Copy Invoice No.
            </button>
          </div>

          <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {printStatus === 'printing' && <span className="text-blue-600 text-[10px] font-black uppercase">Opening print dialog…</span>}
              {printStatus === 'success' && <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase"><CheckCircle2 size={12} /> Print dialog opened</span>}
              {printStatus === 'failed' && <span className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase"><XCircle size={12} /> Print failed</span>}
            </div>
            <button
              onClick={closeReceiptDialog}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest underline underline-offset-4"
            >
              Close & New Sale
            </button>
          </div>
        </div>

        <div className="w-80 bg-slate-100 border-l border-slate-200 flex-col p-6 overflow-hidden hidden md:flex">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Info size={14} /> Saved Invoice Preview
          </p>
          {lastOrderData ? (
            <div className="flex-1 overflow-y-auto bg-white shadow-sm p-4 rounded-xl custom-scrollbar">
              <ThermalReceipt orderData={lastOrderData} appConfig={appConfig} />
            </div>
          ) : (
            <div className="flex-1 grid place-items-center rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs font-semibold text-slate-500">
              Invoice preview appears after the saved order and item rows load.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});

ReceiptDialog.displayName = 'ReceiptDialog';

export default ReceiptDialog;
