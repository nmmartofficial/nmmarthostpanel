import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ModuleLoadingFallback({ title = 'Loading Module...' }) {
  return (
    <div className="flex-1 min-h-[320px] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Loader2 size={24} className="text-blue-600 animate-spin" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Preparing enterprise workspace</p>
      </div>
    </div>
  );
}
