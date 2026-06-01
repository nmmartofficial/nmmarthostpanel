import React from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'

export default function MasterViewControls(props) {
  const { variant } = props

  if (variant === 'form') {
    const { onSave, onCancel, isSubmitting } = props
    return (
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onSave}
          disabled={isSubmitting}
          className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-8 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (variant === 'header') {
    const { onCreateNew } = props
    return (
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-bold transition-all"
      >
        <Plus size={18} /> Create New
      </button>
    )
  }

  if (variant === 'row') {
    const { onEdit, onDelete } = props
    return (
      <>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all"
        >
          <Edit2 size={14} /> Edit
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all shadow-sm"
        >
          <Trash2 size={14} /> Delete
        </button>
      </>
    )
  }

  if (variant === 'pagination') {
    const {
      rowsPerPage,
      onRowsPerPageChange,
      startIndex,
      currentPage,
      totalPages,
      filteredCount,
      onPrev,
      onNext,
    } = props

    return (
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            className="bg-transparent border border-slate-300 dark:border-slate-600 px-2 py-1 rounded outline-none cursor-pointer"
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <span>{startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredCount)} of {filteredCount}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded border transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border-slate-200' : 'hover:bg-slate-100 border-slate-300 dark:border-slate-600 dark:hover:bg-slate-800'}`}
          >
            ❮
          </button>
          <button
            onClick={onNext}
            disabled={currentPage >= totalPages || totalPages === 0}
            className={`px-3 py-1 rounded border transition-all ${currentPage >= totalPages || totalPages === 0 ? 'opacity-30 cursor-not-allowed border-slate-200' : 'hover:bg-slate-100 border-slate-300 dark:border-slate-600 dark:hover:bg-slate-800'}`}
          >
            ❯
          </button>
        </div>
      </div>
    )
  }

  return null
}

