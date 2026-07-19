
import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function CartHeader({ itemCount }) {
  return (
    <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-gray-800">Shopping Cart</h3>
      </div>
      <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold">
        {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
      </span>
    </div>
  );
}
