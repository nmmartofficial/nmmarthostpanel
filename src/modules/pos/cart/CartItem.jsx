
import React from 'react';
import { Trash2 } from 'lucide-react';
import CartItemQty from './CartItemQty';
import { formatCurrency } from '../utils/currency';

export default function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
        ) : (
          <div className="text-gray-300 text-xs font-bold">IMG</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-800 truncate">{item.name}</h4>
        <p className="text-xs text-gray-500 font-mono">{item.sku || 'N/A'}</p>
        <p className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <CartItemQty
          quantity={item.quantity}
          onIncrease={() => onIncrease(item.id)}
          onDecrease={() => onDecrease(item.id)}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">
            {formatCurrency(item.price * item.quantity)}
          </span>
          <button
            onClick={() => onRemove(item.id)}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
