import React from 'react';

export default function EmptyState({ title = 'No data found', description = 'There is nothing to show right now.' }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center shadow-sm">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
