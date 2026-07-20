
import React from 'react';
import { useCustomer } from '../hooks/useCustomer';
import { CustomerSearch } from './CustomerSearch';
import { CustomerList } from './CustomerList';

export const CustomerPanel = () => {
  const { selectedCustomer, clearSelectedCustomer } = useCustomer();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Customers</h3>
        {selectedCustomer && (
          <button
            onClick={clearSelectedCustomer}
            className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
          >
            Clear Selection
          </button>
        )}
      </div>
      <CustomerSearch className="mb-4" />
      <CustomerList />
      
      {selectedCustomer ? (
        <div className="mt-6 p-5 border-t border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4 text-lg">Customer Profile</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 font-medium">Name:</span> {selectedCustomer.name}
            </div>
            <div>
              <span className="text-gray-500 font-medium">Code:</span> {selectedCustomer.customerCode}
            </div>
            <div>
              <span className="text-gray-500 font-medium">Mobile:</span> {selectedCustomer.mobile || 'N/A'}
            </div>
            <div>
              <span className="text-gray-500 font-medium">Email:</span> {selectedCustomer.email || 'N/A'}
            </div>
            <div>
              <span className="text-gray-500 font-medium">Status:</span> 
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                selectedCustomer.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {selectedCustomer.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Type:</span> {selectedCustomer.type}
            </div>
            <div>
              <span className="text-gray-500 font-medium">Wallet:</span> 
              <span className="text-emerald-600 font-semibold ml-2">₹{selectedCustomer.walletBalance.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Credit:</span> 
              <span className="text-indigo-600 font-semibold ml-2">₹{selectedCustomer.creditBalance.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Loyalty:</span> 
              <span className="text-yellow-600 font-semibold ml-2">{selectedCustomer.loyaltyPoints} Points</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 p-5 border-t border-gray-200 text-center text-gray-400">
          <p>Select a customer to view profile</p>
        </div>
      )}
    </div>
  );
};
