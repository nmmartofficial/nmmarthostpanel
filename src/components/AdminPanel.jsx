import React from 'react'

export default function AdminPanel({
  isAdminAuthorized,
  onClearTransactionalLogs,
  onFactoryResetCache,
  onLockUtilities,
}) {
  if (!isAdminAuthorized) return null

  return (
    <div className="space-y-4">
      <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] text-center">
        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">System Authorized</p>
      </div>
      <button
        onClick={onClearTransactionalLogs}
        className="w-full bg-rose-600/10 text-rose-600 hover:bg-rose-600 hover:text-white py-4 rounded-2xl font-black uppercase text-xs transition-all border border-rose-600/20"
      >
        Clear All Transactional Logs
      </button>
      <button
        onClick={onFactoryResetCache}
        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black uppercase text-xs transition-all"
      >
        Factory Reset Cache
      </button>
      <button
        onClick={onLockUtilities}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs transition-all mt-4"
      >
        Lock Utilities
      </button>
    </div>
  )
}

