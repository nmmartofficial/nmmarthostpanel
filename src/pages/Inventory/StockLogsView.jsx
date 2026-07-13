import React, { useState, useMemo } from 'react';
import { 
  History, Search, Calendar, Package, ArrowUpRight, ArrowDownLeft, RefreshCw, Filter
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { DB_SCHEMA } from '../../dbSchema';
import PaginationFooter from '../../components/PaginationFooter';

export default function StockLogsView({ inventoryLogs, products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const enrichedLogs = useMemo(() => {
    return inventoryLogs.map(log => {
      const product = products.find(p => p.id === log.product_id);
      return {
        ...log,
        product_name: product?.item_name || 'Unknown Product',
        barcode: product?.barcode || 'N/A',
        image_url: product?.image_url
      };
    });
  }, [inventoryLogs, products]);

  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter(log => {
      const search = (searchTerm || '').toLowerCase();
      const typeF = (typeFilter || 'All').toLowerCase();
      const matchesSearch = (log.product_name || '').toLowerCase().includes(search) ||
                          (log.barcode || '').toLowerCase().includes(search) ||
                          (log.reference_id || '').toLowerCase().includes(search);
      const matchesType = typeF === 'all' || (log.change_type || '').toLowerCase() === typeF;
      return matchesSearch && matchesType;
    });
  }, [enrichedLogs, searchTerm, typeFilter]);

  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      {/* Header & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 rounded-lg text-white shadow-md">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Inventory Audit Logs</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">History of all stock movements</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search Product / Ref ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-amber-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            {['All', 'Sale', 'Purchase', 'Manual', 'Return'].map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border",
                  typeFilter === f ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Product</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Movement</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Reference</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Stock Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length > 0 ? paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-800">{new Date(log.created_at).toLocaleDateString()}</p>
                    <p className="text-[9px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={log.image_url} alt="" className="w-8 h-8 object-contain bg-slate-50 rounded" />
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{log.product_name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{log.barcode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                      log.change_type === 'purchase' ? 'bg-emerald-100 text-emerald-600' : 
                      log.change_type === 'sale' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                    )}>
                      {log.change_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[10px] font-black text-slate-600 uppercase">#{log.reference_id || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Old: {log.old_stock}</p>
                        <p className="text-[10px] font-black text-slate-800">New: {log.new_stock}</p>
                      </div>
                      <div className={cn(
                        "p-1 rounded-md",
                        log.new_stock > log.old_stock ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {log.new_stock > log.old_stock ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <History size={48} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No inventory logs found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex-shrink-0">
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setCurrentPage={setCurrentPage}
            totalRecords={filteredLogs.length}
          />
        </div>
      </div>
    </div>
  );
}
