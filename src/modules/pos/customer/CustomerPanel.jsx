
import React from 'react';
import { Search } from 'lucide-react';
import CustomerInfo from './CustomerInfo';
import CustomerWallet from './CustomerWallet';
import CustomerLoyalty from './CustomerLoyalty';
import { usePOS } from '../context/POSContext';

export default function CustomerPanel() {
  const { customer, openCustomerDialog } = usePOS();
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">Customer</h3>
        <button
          onClick={openCustomerDialog}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          <Search size={16} />
          Select
        </button>
      </div>
      <div className="p-4">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-blue-100">
          <CustomerInfo customer={customer} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <CustomerWallet balance={customer?.walletBalance || 0} />
            <CustomerLoyalty points={customer?.loyaltyPoints || 0} />
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <div className="w-6 h-6 mx-auto mb-1 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <span className="text-xs font-bold">₹</span>
              </div>
              <p className="text-xs text-gray-500">Credit</p>
              <h5 className="font-bold text-gray-800">₹0.00</h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
