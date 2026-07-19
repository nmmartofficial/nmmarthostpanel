import React from 'react';

export default function LoadingState({ title = 'Loading...', subtitle = 'Please wait while we prepare your workspace.' }) {
  return (
    <div className="min-h-[260px] flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <h3 className="text-sm font-black uppercase tracking-[0.28em] text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
