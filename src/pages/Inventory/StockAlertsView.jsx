import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Clock, Package, Search, ShoppingBag, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { toast } from 'sonner';

export default function StockAlertsView({ products, fetchInitialData, setActiveTab }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedForPO, setSelectedForPO] = useState([]);

  const getAlertType = (product) => {
    const threshold = product.low_stock_threshold || product.min_qty || 10;
    if (product.expiry_date && new Date(product.expiry_date) <= new Date()) {
      return { type: 'expired', label: 'Expired', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
    }
    if (product.expiry_date && new Date(product.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return { type: 'expiring', label: 'Expiring Soon', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock };
    }
    if ((parseFloat(product.stock) || 0) <= threshold) {
      return { type: 'low_stock', label: 'Low Stock', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle };
    }
    return { type: 'ok', label: 'OK', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.is_active !== false);

    if (activeFilter === 'low_stock') {
      const threshold = p => p.low_stock_threshold || p.min_qty || 10;
      list = list.filter(p => (parseFloat(p.stock) || 0) <= threshold(p));
    } else if (activeFilter === 'expiring') {
      list = list.filter(p => p.expiry_date && new Date(p.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } else if (activeFilter === 'expired') {
      list = list.filter(p => p.expiry_date && new Date(p.expiry_date) <= new Date());
    }

    return list.filter(p =>
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, activeFilter, searchTerm]);

  const alertCounts = useMemo(() => {
    const counts = { all: 0, low_stock: 0, expiring: 0, expired: 0 };
    products.filter(p => p.is_active !== false).forEach(p => {
      const alert = getAlertType(p);
      if (alert.type !== 'ok') counts.all++;
      if (counts[alert.type] !== undefined) counts[alert.type]++;
    });
    return counts;
  }, [products]);

  const toggleSelectForPO = (id) => {
    setSelectedForPO(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGeneratePO = () => {
    if (selectedForPO.length === 0) {
      toast.error('Please select items to generate PO');
      return;
    }

    // Logic to store selected items in session/local storage for PO View
    const itemsToOrder = products.filter(p => selectedForPO.includes(p.id)).map(p => ({
      product_id: p.id,
      name: p.name,
      barcode: p.barcode,
      qty: (p.low_stock_threshold || 10) * 2, // Suggest double the threshold
      rate: p.purchase_rate || 0
    }));

    localStorage.setItem('nm_po_draft', JSON.stringify(itemsToOrder));
    toast.success(`${selectedForPO.length} items added to PO draft!`);
    setActiveTab('PurchaseOrderPO');
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-700 border border-amber-100">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Stock Alerts</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Manage Low Stock & Expiry</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedForPO.length > 0 && (
            <button
              onClick={handleGeneratePO}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center gap-2 animate-in slide-in-from-right duration-300"
            >
              <ShoppingBag size={14} /> Create PO ({selectedForPO.length})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        {[
          { id: 'all', label: 'Total Alerts', value: alertCounts.all, color: 'slate', icon: AlertTriangle },
          { id: 'low_stock', label: 'Low Stock', value: alertCounts.low_stock, color: 'orange', icon: Package },
          { id: 'expiring', label: 'Expiring Soon', value: alertCounts.expiring, color: 'amber', icon: Clock },
          { id: 'expired', label: 'Expired', value: alertCounts.expired, color: 'red', icon: AlertCircle }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left group",
              activeFilter === filter.id
                ? `bg-${filter.color}-50 border-${filter.color}-300 ring-4 ring-${filter.color}-100`
                : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  activeFilter === filter.id ? `text-${filter.color}-600` : "text-slate-500"
                )}>{filter.label}</p>
                <p className={cn(
                  "text-2xl font-black mt-1",
                  activeFilter === filter.id ? `text-${filter.color}-700` : "text-slate-800"
                )}>{filter.value}</p>
              </div>
              <div className={cn(
                "p-2.5 rounded-xl transition-all group-hover:scale-110",
                activeFilter === filter.id ? `bg-${filter.color}-100 text-${filter.color}-600` : "bg-slate-50 text-slate-400"
              )}>
                <filter.icon size={20} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12">
                  <div className="flex items-center justify-center">
                    <ShoppingBag size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Alert Status</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Product Information</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Stock Control</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest">No critical alerts</p>
                    <p className="text-[10px] font-bold mt-1 uppercase">Everything is looking good!</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const alert = getAlertType(product);
                  const Icon = alert.icon;
                  const isSelected = selectedForPO.includes(product.id);

                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "group transition-colors",
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/50"
                      )}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleSelectForPO(product.id)}
                          className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                              : "border-slate-200 hover:border-blue-400 bg-white"
                          )}
                        >
                          {isSelected ? <Plus size={14} className="stroke-[3px]" /> : <Plus size={14} className="opacity-0 group-hover:opacity-100 text-blue-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit", alert.bg, "border", alert.bg.replace('bg-', 'border-').replace('50', '200'))}>
                          <Icon className={alert.color} size={14} />
                          <span className={cn("text-[10px] font-black uppercase tracking-wider", alert.color)}>
                            {alert.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {product.barcode || 'NO-BARCODE'}
                          </span>
                          <span className="text-[9px] font-black text-blue-600 uppercase">
                            {product.category_name || 'General'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className={cn(
                            "text-xs font-black",
                            (parseFloat(product.stock) || 0) <= (product.low_stock_threshold || 10) ? "text-orange-600" : "text-emerald-600"
                          )}>
                            {product.stock || 0}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">
                              Limit: {product.low_stock_threshold || product.min_qty || 10}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {product.expiry_date ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-lg",
                              alert.type === 'expired' ? "bg-red-100 text-red-700" :
                              alert.type === 'expiring' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                            )}>
                              {new Date(product.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {product.batch_no && (
                              <span className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-tighter">
                                Batch: {product.batch_no}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-slate-300 italic">No Expiry Data</div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Action Footer */}
        {selectedForPO.length > 0 && (
          <div className="bg-slate-900 p-4 border-t border-slate-800 flex justify-between items-center animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-white text-sm font-black uppercase tracking-tight">{selectedForPO.length} Items Selected</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase">Ready for Purchase Order generation</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedForPO([])}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-400 uppercase hover:bg-white/5 transition-all"
              >
                Clear Selection
              </button>
              <button
                onClick={handleGeneratePO}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all flex items-center gap-2"
              >
                Generate PO Draft <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
