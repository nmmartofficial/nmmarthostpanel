import React from 'react';
import { useCustomer } from '../customer/hooks/useCustomer';

export const CustomerSummary = () => {
  const { selectedCustomer, clearSelectedCustomer } = useCustomer();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Summary</h3>

        {selectedCustomer ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-500 font-medium text-sm">Name:</span>
                <span className="ml-2 text-xs font-mono text-gray-700">{selectedCustomer.name}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium text-sm">Code:</span>
                <span className="ml-2 text-xs font-mono text-gray-700">{selectedCustomer.customerCode}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium text-sm">Mobile:</span>
                <span className="ml-2 text-xs font-mono text-gray-700">{selectedCustomer.mobile || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium text-sm">Status:</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  selectedCustomer.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>{selectedCustomer.status}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium text-sm">Wallet Balance:</span>
                <span className="ml-2 text-xs font-mono text-green-600">₹{selectedCustomer.walletBalance.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium text-sm">Credit Balance:</span>
                <span className="ml-2 text-xs font-mono text-indigo-600">₹{selectedCustomer.creditBalance.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium text-sm">Loyalty Points:</span>
                <span className="ml-2 text-xs font-mono text-yellow-600">{selectedCustomer.loyaltyPoints} Points</span>
              </div>
            </div>

            <button
              onClick={clearSelectedCustomer}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              Clear Selection
            </button>
          </>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No customer selected
          </div>
        )}
      </div>
    </div>
  );
};
