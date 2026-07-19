
import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function CartSummary() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
      <ShoppingCart size={64} className="mb-4 opacity-50" />
      <h3 className="text-lg font-semibold text-gray-600">Cart is Empty</h3>
      <p className="text-sm text-gray-500 mt-1">Add products to start billing</p>
    </div>
  );
}
