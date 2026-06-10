import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/helpers';

export default function NavDropdown({ label, icon, items, activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = items.some(item => item.id === activeTab);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-tighter shadow-sm",
          isActive ? "text-white bg-blue-600 shadow-blue-200" : "text-slate-900 bg-white border border-slate-200 hover:bg-slate-50"
        )}
      >
        <span className={cn(isActive ? "text-white" : "text-slate-800")}>{icon}</span>
        <span>{label}</span>
        <ChevronDown size={12} className={cn("transition-transform opacity-70", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute left-0 mt-2 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 py-2 z-[200] overflow-hidden w-64"
            )}
          >
            <div className={cn(
              "grid divide-slate-100 max-h-[85vh] overflow-y-auto grid-cols-1 divide-y"
            )}>
              {items.map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`} 
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors group",
                    activeTab === item.id ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("transition-transform group-hover:scale-110", activeTab === item.id ? "text-blue-700" : "text-slate-900")}>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                  {item.shortcut && <span className="text-[8px] text-slate-400 font-bold">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
