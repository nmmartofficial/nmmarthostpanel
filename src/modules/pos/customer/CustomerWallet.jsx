
import React from 'react';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export default function CustomerWallet({ balance = 0 }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
      <Wallet className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
      <p className="text-xs text-gray-500">Wallet</p>
      <h5 className="font-bold text-gray-800">{formatCurrency(balance)}</h5>
    </div>
  );
}
