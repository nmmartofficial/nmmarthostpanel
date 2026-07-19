
import React from 'react';
import { formatCurrency } from '../utils/currency';

export default function CartTotals({
  subtotal,
  totalGST,
  discountAmount,
  grandTotal,
  gstBreakdown = {},
}) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Subtotal</span>
        <span className="font-semibold">{formatCurrency(subtotal)}</span>
      </div>
      {Object.entries(gstBreakdown).map(([rate, amount]) => (
        <div key={rate} className="flex justify-between text-xs text-gray-500">
          <span>GST {rate}%</span>
          <span>{formatCurrency(amount)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm text-gray-600">
        <span>Total GST</span>
        <span className="font-semibold">{formatCurrency(totalGST)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Discount</span>
          <span className="font-bold">-{formatCurrency(discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-300">
        <span className="text-sm font-bold text-gray-700">Grand Total</span>
        <span className="text-2xl font-extrabold text-emerald-700">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}
