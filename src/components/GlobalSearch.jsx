import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, ShoppingCart, User, X, Command, ArrowRight } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import { cn } from '../utils/helpers';

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setPrompt] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { products, orders, users, setActiveTab } = useGlobalContext();
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setPrompt('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter Results
  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const searchStr = query.toLowerCase();

    const filteredProducts = products
      .filter(p => (p.name || p.itname || '').toLowerCase().includes(searchStr) || (p.barcode || '').includes(searchStr))
      .slice(0, 5)
      .map(p => ({ id: p.id, type: 'Product', label: p.name || p.itname, sublabel: `₹${p.sale_rate} • Stock: ${p.stock}`, icon: <Package size={14} />, tab: 'Products' }));

    const filteredOrders = orders
      .filter(o => (o.order_number || '').toLowerCase().includes(searchStr) || (o.customer_name || '').toLowerCase().includes(searchStr))
      .slice(0, 5)
      .map(o => ({ id: o.id, type: 'Order', label: `#${o.order_number}`, sublabel: `${o.customer_name} • ₹${o.total_amount}`, icon: <ShoppingCart size={14} />, tab: 'Orders' }));

    const filteredUsers = users
      .filter(u => (u.name || '').toLowerCase().includes(searchStr) || (u.mobile || '').includes(searchStr))
      .slice(0, 5)
      .map(u => ({ id: u.id, type: 'Customer', label: u.name || 'Unknown', sublabel: u.mobile, icon: <User size={14} />, tab: 'UserMaster' }));

    return [...filteredProducts, ...filteredOrders, ...filteredUsers];
  }, [query, products, orders, users]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (item) => {
    setActiveTab(item.tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
              <Search className="text-slate-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products, orders, customers... (Esc to close)"
                value={query}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-transparent border-none text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300"
              />
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-400">
                <Command size={10} /> <span>K</span>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, idx) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left",
                        selectedIndex === idx ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          selectedIndex === idx ? "bg-white/20" : "bg-slate-100 text-slate-500"
                        )}>
                          {item.icon}
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-black uppercase tracking-tight",
                            selectedIndex === idx ? "text-white" : "text-slate-800"
                          )}>
                            {item.label}
                          </p>
                          <p className={cn(
                            "text-[10px] font-bold",
                            selectedIndex === idx ? "text-blue-100" : "text-slate-400"
                          )}>
                            {item.type} • {item.sublabel}
                          </p>
                        </div>
                      </div>
                      {selectedIndex === idx && (
                        <ArrowRight size={16} className="text-white animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="py-8 px-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Quick Navigation</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-600 border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> SEARCH ORDER BY NUMBER
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-600 border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SEARCH PRODUCT BY BARCODE
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-600 border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> FIND CUSTOMER BY MOBILE
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-600 border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> RECENT INVOICES
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-600">Enter</kbd> to select</span>
                <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-600">↑↓</kbd> to navigate</span>
              </div>
              <span className="flex items-center gap-1"><kbd className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-600">Esc</kbd> to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
