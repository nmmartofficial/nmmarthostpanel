import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Clock, Package, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

export default function StockAlertsView({ products, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const getAlertType = (product) => {
    const threshold = product.low_stock_threshold || product.min_qty || 10;
    if (product.expiry_date && new Date(product.expiry_date) <= new Date()) {
      return { type: 'expired', label: 'Expired', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
    }
    if (product.expiry_date && new Date(product.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return { type: 'expiring', label: 'Expiring Soon', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock };
    }
    if (product.stock <= threshold) {
      return { type: 'low_stock', label: 'Low Stock', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle };
    }
    return { type: 'ok', label: 'OK', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.is_active !== false);

    if (activeFilter === 'low_stock') {
      const threshold = p => p.low_stock_threshold || p.min_qty || 10;
      list = list.filter(p => p.stock <= threshold(p));
    } else if (activeFilter === 'expiring') {
      list = list.filter(p => p.expiry_date && new Date(p.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } else if (activeFilter === 'expired') {
      list = list.filter(p => p.expiry_date && new Date(p.expiry_date) <= new Date());
    }

    return list.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-700 border border-amber-100">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Stock Alerts</h2>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            activeFilter === 'all' ? "bg-slate-50 border-slate-300" : "bg-white border-slate-100 hover:border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Alerts</p>
              <p className="text-2xl font-black text-slate-800">{alertCounts.all}</p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg">
              <AlertTriangle className="text-slate-600" size={20} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveFilter('low_stock')}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            activeFilter === 'low_stock' ? "bg-orange-50 border-orange-300" : "bg-white border-slate-100 hover:border-orange-200"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Low Stock</p>
              <p className="text-2xl font-black text-orange-700">{alertCounts.low_stock}</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="text-orange-600" size={20} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveFilter('expiring')}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            activeFilter === 'expiring' ? "bg-amber-50 border-amber-300" : "bg-white border-slate-100 hover:border-amber-200"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Expiring Soon</p>
              <p className="text-2xl font-black text-amber-700">{alertCounts.expiring}</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="text-amber-600" size={20} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveFilter('expired')}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            activeFilter === 'expired' ? "bg-red-50 border-red-300" : "bg-white border-slate-100 hover:border-red-200"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Expired</p>
              <p className="text-2xl font-black text-red-700">{alertCounts.expired}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="text-red-600" size={20} />
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Alert</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Product</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Barcode</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Stock / Threshold</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    <p className="text-sm font-bold">No alerts found!</p>
                    <p className="text-xs mt-1">Great job managing your inventory.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const alert = getAlertType(product);
                  const Icon = alert.icon;
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit", alert.bg)}>
                          <Icon className={alert.color} size={14} />
                          <span className={cn("text-[10px] font-black uppercase tracking-wider", alert.color)}>
                            {alert.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-none">
                          {product.name}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                          {product.category_name || 'No Category'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-[10px] font-bold text-slate-600">{product.barcode || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "text-[10px] font-black",
                            alert.type === 'low_stock' ? "text-orange-600" : "text-green-600"
                          )}>
                            Stock: {product.stock || 0}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">
                            Threshold: {product.low_stock_threshold || product.min_qty || 10}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.expiry_date ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn(
                              "text-[10px] font-black",
                              alert.type === 'expired' ? "text-red-600" : 
                              alert.type === 'expiring' ? "text-amber-600" : "text-slate-700"
                            )}>
                              {new Date(product.expiry_date).toLocaleDateString('en-IN')}
                            </span>
                            {product.batch_no && (
                              <span className="text-[8px] font-bold text-slate-400 uppercase">
                                Batch: {product.batch_no}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">-</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
