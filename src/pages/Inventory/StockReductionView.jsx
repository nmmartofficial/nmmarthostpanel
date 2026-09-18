import React, { useState, useMemo } from 'react';
import {
  Trash2, Search, Package, AlertTriangle, ArrowDownLeft, RefreshCw, Filter, CheckCircle2
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { toast } from 'sonner';
import StockAdjustmentDialog from '../../components/StockAdjustmentDialog';

export default function StockReductionView({ products, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [reductionType, setReductionType] = useState('damage'); // damage, expiry, wastage

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.is_active !== false &&
      ((p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 50); // Limit results for performance
  }, [products, searchTerm]);

  const handleOpenReduction = (product, type) => {
    setSelectedProduct(product);
    setReductionType(type);
    setShowAdjustDialog(true);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg text-red-700 border border-red-100">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Damage & Wastage</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Remove damaged, expired or wasted items from stock</p>
          </div>
        </div>

        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search items to reduce..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-red-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto p-6">
          {searchTerm ? (
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 hover:border-red-200 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 uppercase text-xs truncate">{p.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.barcode || 'No Barcode'}</p>
                      </div>
                      <div className="bg-white px-2 py-1 rounded-lg border border-slate-100 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Stock</p>
                        <p className="text-xs font-black text-slate-800">{p.stock}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenReduction(p, 'damage')}
                        className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex flex-col items-center gap-1"
                      >
                        <AlertTriangle size={14} />
                        Damage
                      </button>
                      <button
                        onClick={() => handleOpenReduction(p, 'expiry')}
                        className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all flex flex-col items-center gap-1"
                      >
                        <RefreshCw size={14} />
                        Expiry
                      </button>
                      <button
                        onClick={() => handleOpenReduction(p, 'wastage')}
                        className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all flex flex-col items-center gap-1"
                      >
                        <ArrowDownLeft size={14} />
                        Wastage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
                <Search size={48} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-widest mt-4">No matching products found</p>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
              <Package size={64} strokeWidth={1} />
              <p className="text-sm font-black uppercase tracking-widest mt-4">Search for a product to report reduction</p>
              <p className="text-[10px] font-bold mt-1 uppercase">Enter name or barcode in the search box above</p>
            </div>
          )}
        </div>
      </div>

      <StockAdjustmentDialog
        isOpen={showAdjustDialog}
        onClose={() => {
          setShowAdjustDialog(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        fetchInitialData={fetchInitialData}
        // Custom props for initial type
        initialType={reductionType}
      />
    </div>
  );
}
