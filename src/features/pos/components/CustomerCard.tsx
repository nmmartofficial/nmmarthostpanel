
import React from 'react';
import type { Customer } from '../customer/types/customer.types';
import { useCustomer } from '../hooks/useCustomer';

interface CustomerCardProps {
  customer: Customer;
}

export const CustomerCard = ({ customer }: CustomerCardProps) => {
  const { selectedCustomer, selectCustomer } = useCustomer();
  const isSelected = selectedCustomer?.id === customer.id;

  return (
    <div
      onClick={() => selectCustomer(customer)}
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold text-gray-800">{customer.name}</div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          customer.status === 'ACTIVE' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {customer.status}
        </span>
      </div>
      <div className="text-sm text-gray-500">{customer.customerCode}</div>
      {customer.mobile && <div className="text-sm text-gray-500">{customer.mobile}</div>}
      {customer.email && <div className="text-sm text-gray-400">{customer.email}</div>}
      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        <span className="text-emerald-600 font-medium">Wallet: ₹{customer.walletBalance.toFixed(2)}</span>
        <span className="text-indigo-600 font-medium">Credit: ₹{customer.creditBalance.toFixed(2)}</span>
        <span className="text-yellow-600 font-medium">Loyalty: {customer.loyaltyPoints} Points</span>
      </div>
    </div>
  );
};
