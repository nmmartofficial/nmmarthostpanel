import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';

const NumericKeypad = () => {
  const { showKeypad, keypadContext, setShowKeypad } = usePOS();
  const [current, setCurrent] = useState(String(keypadContext?.value || ''));

  const handleKey = (key) => {
    if (key === 'C') setCurrent('');
    else if (key === 'DEL') setCurrent(prev => prev.slice(0, -1));
    else if (key === '.' && current.includes('.')) return;
    else if (current.length < 10) setCurrent(prev => prev + key);
  };

  useEffect(() => {
    if (showKeypad) setCurrent(String(keypadContext?.value || ''));
  }, [showKeypad, keypadContext]);

  if (!showKeypad) return null;

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-white/20">
        <div className="text-center space-y-2 mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{keypadContext.title}</p>
          <div className="bg-slate-50 rounded-2xl py-6 px-4 border-2 border-slate-100 shadow-inner">
            <span className="text-4xl font-black text-slate-800 tracking-tight">{current || '0'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map((k) => (
            <button
              key={k}
              onClick={() => k === 'DEL' ? handleKey('DEL') : handleKey(String(k))}
              className={cn(
                "h-16 rounded-2xl font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-sm",
                k === 'DEL' ? "bg-red-50 text-red-600 border border-red-100" : "bg-white border border-slate-100 text-slate-700 hover:bg-slate-50"
              )}
            >
              {k}
            </button>
          ))}
          <button onClick={() => handleKey('C')} className="col-span-1 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 font-black text-xl active:scale-95">CLR</button>
          <button onClick={() => { keypadContext.onConfirm(current); setShowKeypad(false); }} className="col-span-2 h-16 rounded-2xl bg-primary-600 text-white font-black text-xl shadow-xl shadow-primary-200 active:scale-95 uppercase tracking-widest">Done</button>
        </div>
        <button onClick={() => setShowKeypad(false)} className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
      </motion.div>
    </div>
  );
};

export default NumericKeypad;
