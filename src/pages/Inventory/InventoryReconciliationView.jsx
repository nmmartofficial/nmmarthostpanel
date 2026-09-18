import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw, Search, Package, AlertCircle, CheckCircle2, ArrowRight, Filter, Download
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';

export default function InventoryReconciliationView({ products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsProcessing] = useState(false);
  const [reconciliationData, setReconciliationData] = useState([]);

  const analyzeStock = async () => {
    setIsProcessing(true);
    try {
      // 1. Fetch all inventory logs for relevant products
      const logs = await dbSync.fetch(DB_SCHEMA.INVENTORY_LOGS.table);

      const analysis = products.map(p => {
        const productLogs = logs.filter(l => l.product_id === p.id);

        // Calculate theoretical stock based on logs
        // This is simplified: it assumes logs are the source of truth
        // In a real reconciliation, we compare System Stock (current) vs (Opening + Sum of Changes)

        const openingLog = productLogs.find(l => l.change_type === 'opening');
        const openingStock = openingLog ? parseFloat(openingLog.new_stock) : 0;

        const netChange = productLogs.reduce((sum, l) => {
          if (l.change_type === 'opening') return sum;
          const qty = parseFloat(l.change_qty);
          // If new_stock > old_stock, it was an increase
          return sum + (parseFloat(l.new_stock) > parseFloat(l.old_stock) ? qty : -qty);
        }, 0);

        const theoreticalStock = openingStock + netChange;
        const currentStock = parseFloat(p.stock || 0);
        const difference = currentStock - theoreticalStock;

        return {
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          currentStock,
          theoreticalStock,
          difference,
          status: Math.abs(difference) < 0.001 ? 'match' : 'mismatch'
        };
      });

      setReconciliationData(analysis);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    analyzeStock();
  }, [products]);

  const filteredData = useMemo(() => {
    return reconciliationData.filter(d =>
      (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.barcode || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reconciliationData, searchTerm]);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700 border border-indigo-100">
            <RefreshCw size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Inventory Reconciliation</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Compare Current Stock vs Movement History</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={analyzeStock}
            disabled={isAnalyzing}
            className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <RefreshCw className={cn(isAnalyzing && "animate-spin")} size={14} />
            Re-Analyze
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Product Information</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">System Stock</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">History Stock</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Discrepancy</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center text-slate-400">
                    <p className="text-sm font-black uppercase tracking-widest">No reconciliation data</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{row.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{row.barcode || 'NO-BARCODE'}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-black text-slate-700">{row.currentStock}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs font-black text-slate-500">{row.theoreticalStock.toFixed(3)}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "text-xs font-black px-2 py-1 rounded-lg",
                        row.status === 'match' ? "text-slate-400" : "bg-red-50 text-red-600"
                      )}>
                        {row.difference > 0 ? `+${row.difference.toFixed(3)}` : row.difference.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {row.status === 'match' ? (
                        <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 size={12} />
                          <span className="text-[9px] font-black uppercase">Verified</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                          <AlertCircle size={12} />
                          <span className="text-[9px] font-black uppercase">Mismatch</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
