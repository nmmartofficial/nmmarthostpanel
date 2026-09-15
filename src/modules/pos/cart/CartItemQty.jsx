
import React from 'react';
import { Plus, Minus } from 'lucide-react';

export default function CartItemQty({ quantity, onIncrease, onDecrease }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDecrease}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-semibold text-gray-800">{quantity}</span>
      <button
        onClick={onIncrease}
        className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
