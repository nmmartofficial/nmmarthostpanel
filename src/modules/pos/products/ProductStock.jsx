
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ProductStock({ stock }) {
  if (stock > 10) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
        <CheckCircle2 size={14} />
        In Stock
      </span>
    );
  }
  if (stock > 0) {
    return (
      <span className="flex items-center gap-1 text-orange-600 text-xs font-semibold">
        <AlertTriangle size={14} />
        {stock} left
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
      <AlertTriangle size={14} />
      Out of Stock
    </span>
  );
}
