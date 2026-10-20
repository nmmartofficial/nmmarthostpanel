import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

const ReturnDialog = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-red-700 px-6 py-4 text-white">
          <h2 id="return-dialog-title" className="flex items-center gap-2 text-xl font-bold">
            <RotateCcw size={22} />
            Returns and Refunds
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/20"
            aria-label="Close returns dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <p className="text-sm font-medium">
              Returns and refunds are unavailable. This store has no verified return record,
              refund, or inventory-restocking transaction flow. No return or payment has been
              processed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnDialog;
