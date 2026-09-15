
import React from 'react';
import { formatCurrency } from '../utils/currency';

export default function ProductPrice({ price, mrp }) {
  const isOnSale = mrp && mrp > price;
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-emerald-700">{formatCurrency(price)}</span>
      {isOnSale && (
        <span className="text-sm text-gray-400 line-through">{formatCurrency(mrp)}</span>
      )}
    </div>
  );
}
