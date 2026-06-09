import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../utils/helpers';

const CartItem = memo(({ item, removeFromCart, updateQty }) => (
  <div className="px-4 py-3 flex justify-between border-b border-slate-50 text-sm font-semibold hover:bg-blue-50/30 group items-center transition-colors">
    <div className="w-1/2 flex items-center gap-3">
      <button 
        onClick={() => removeFromCart(item.id)}
        className="text-slate-300 hover:text-red-500 transition-colors"
      >
        <Trash2 size={16} />
      </button>
      <div className="flex flex-col">
        <span className="text-slate-800 uppercase leading-tight truncate w-32" title={item.name}>{item.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">₹{item.sale_rate} / unit</span>
          {item.stock <= 5 && (
            <span className={cn(
              "text-[7px] font-black px-1 rounded uppercase tracking-tighter",
              item.stock <= 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
            )}>
              {item.stock <= 0 ? 'Out of Stock' : `Stock: ${item.stock}`}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="w-1/4 flex items-center justify-center">
      <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
        <button 
          onClick={() => updateQty(item.id, item.quantity - 1)}
          className="px-2 py-1 hover:bg-slate-200 text-slate-600"
        >-</button>
        <input 
          type="number" 
          value={item.quantity} 
          onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
          className="w-10 text-center bg-transparent border-none p-1 text-xs font-bold text-slate-800 focus:ring-0" 
        />
        <button 
          onClick={() => updateQty(item.id, item.quantity + 1)}
          className="px-2 py-1 hover:bg-slate-200 text-slate-600"
        >+</button>
      </div>
    </div>
    <span className="w-1/4 text-right text-slate-900 font-bold">₹{(item.sale_rate * item.quantity).toLocaleString()}</span>
  </div>
));

export default CartItem;
