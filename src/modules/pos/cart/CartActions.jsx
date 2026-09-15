
import React from 'react';
import { Tag } from 'lucide-react';

export default function CartActions({
  onOpenDiscount,
  onOpenPayment,
  onClearCart,
  cartEmpty,
}) {
  return (
    <div className="p-4 bg-white border-t border-gray-200 space-y-3">
      <button
        onClick={onOpenDiscount}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
        disabled={cartEmpty}
      >
        <Tag size={18} />
        Apply Discount
      </button>
      <button
        onClick={onOpenPayment}
        className="w-full px-4 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg hover:from-emerald-700 hover:to-emerald-600 transition-all active:scale-[0.99]"
        disabled={cartEmpty}
      >
        Complete Bill
      </button>
      <button
        onClick={onClearCart}
        className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
        disabled={cartEmpty}
      >
        Clear Cart
      </button>
    </div>
  );
}
