import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../utils/helpers';

const CartItem = memo(({ item, removeFromCart, updateQty }) => (
  <div className="px-4 py-3.5 flex justify-between border-b border-neutral-100 text-sm font-semibold hover:bg-primary-50 group items-center transition-all duration-200">
    <div className="w-1/2 flex items-center gap-3">
      <button 
        onClick={() => removeFromCart(item.id)}
        className="text-neutral-300 hover:text-error-600 transition-colors p-1 hover:bg-error-50 rounded-md"
      >
        <Trash2 size={16} />
      </button>
      <div className="flex flex-col min-w-0">
        <span className="text-neutral-900 font-black uppercase leading-tight truncate w-40 text-[11px]" title={item.name}>{item.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 font-bold">₹{item.sale_rate} / unit</span>
          {item.stock <= 10 && (
            <span className={cn(
              "text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter",
              item.stock <= 0 ? "bg-error-100 text-error-700" : "bg-warning-100 text-warning-700"
            )}>
              {item.stock <= 0 ? 'Out of Stock' : `${item.stock} left`}
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="w-1/4 flex items-center justify-center">
      <div className="flex items-center bg-neutral-50 rounded-lg overflow-hidden border border-neutral-200 shadow-inner">
        <button 
          onClick={() => updateQty(item.id, item.quantity - 1)}
          className="px-2.5 py-1 hover:bg-neutral-200 text-neutral-600 transition-colors font-black"
        >-</button>
        <input 
          type="number" 
          value={item.quantity} 
          onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
          className="w-12 text-center bg-transparent border-none p-1 text-[11px] font-black text-neutral-900 focus:ring-0"
        />
        <button 
          onClick={() => updateQty(item.id, item.quantity + 1)}
          className="px-2.5 py-1 hover:bg-neutral-200 text-neutral-600 transition-colors font-black"
        >+</button>
      </div>
    </div>
    <span className="w-1/4 text-right text-neutral-900 font-black text-[12px] tracking-tight">₹{(item.sale_rate * item.quantity).toLocaleString()}</span>
  </div>
));

export default CartItem;
