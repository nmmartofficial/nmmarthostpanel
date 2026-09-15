import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function PaginationFooter({ currentPage, totalPages, rowsPerPage, setRowsPerPage, setCurrentPage, totalRecords }) {
  if (totalRecords === 0) return null;

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all"
          >
            {[10, 20, 50, 100, 500].map(val => <option key={val} value={val}>{val}</option>)}
          </select>
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
          title="First Page"
        >
          <div className="flex items-center">
            <ChevronDown size={14} className="rotate-90" />
            <ChevronDown size={14} className="rotate-90 -ml-2" />
          </div>
        </button>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
        >
          <ChevronDown size={14} className="rotate-90" />
        </button>

        <div className="flex items-center gap-1">
          {(() => {
            const pages = [];
            const maxVisible = 5;
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + maxVisible - 1);

            if (end - start < maxVisible - 1) {
              start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-[10px] font-black transition-all',
                    currentPage === i ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {i}
                </button>
              );
            }
            return pages;
          })()}
        </div>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
        >
          <ChevronDown size={14} className="-rotate-90" />
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
          title="Last Page"
        >
          <div className="flex items-center">
            <ChevronDown size={14} className="-rotate-90" />
            <ChevronDown size={14} className="-rotate-90 -ml-2" />
          </div>
        </button>
      </div>
    </div>
  );
}
