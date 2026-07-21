import React, { useState } from 'react';
import { useCheckout } from '../checkout/hooks/useCheckout';
import type { OrderSnapshot, CheckoutProcessResult } from '../checkout/types/checkout.types';

export const CheckoutSummary = () => {
  const { 
    checkoutState, 
    createSnapshot, 
    validateCheckout, 
    processCheckout, 
    createOrderSnapshot: createOrderSnapshotFromHook, 
    resetCheckout 
  } = useCheckout();
  
  const [lastProcessResult, setLastProcessResult] = useState<CheckoutProcessResult | null>(null);
  const [lastOrderSnapshot, setLastOrderSnapshot] = useState<OrderSnapshot | null>(null);

  const handleProcessCheckout = () => {
    const result = processCheckout();
    setLastProcessResult(result);
  };

  const handleCreateOrderSnapshot = () => {
    const orderSnapshot = createOrderSnapshotFromHook();
    if (orderSnapshot) {
      setLastOrderSnapshot(orderSnapshot);
    }
  };

  const handleResetCheckout = () => {
    resetCheckout();
    setLastProcessResult(null);
    setLastOrderSnapshot(null);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Checkout Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-gray-500 font-medium text-sm">Checkout Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              checkoutState.status === 'IDLE' ? 'bg-gray-100 text-gray-700' :
              checkoutState.status === 'STARTED' ? 'bg-blue-100 text-blue-700' :
              checkoutState.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {checkoutState.status}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 font-medium text-sm">Snapshot Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              checkoutState.currentSnapshot ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {checkoutState.currentSnapshot ? 'Available' : 'Not Available'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 font-medium text-sm">Validation Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              !checkoutState.lastValidationResult ? 'bg-gray-100 text-gray-700' :
              checkoutState.lastValidationResult.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {!checkoutState.lastValidationResult ? 'Not Validated' :
               checkoutState.lastValidationResult.isValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-500 font-medium text-sm">Current Snapshot ID:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {checkoutState.currentSnapshot?.snapshotId || 'N/A'}
            </span>
          </div>
          
          <div className="md:col-span-2">
            <span className="text-gray-500 font-medium text-sm">Current Order Snapshot ID:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {lastOrderSnapshot?.orderSnapshotId || 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <button
            onClick={createSnapshot}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Create Snapshot
          </button>
          
          <button
            onClick={validateCheckout}
            className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
          >
            Validate Checkout
          </button>
          
          <button
            onClick={handleProcessCheckout}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
          >
            Process Checkout
          </button>
          
          <button
            onClick={handleCreateOrderSnapshot}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
          >
            Create Order Snapshot
          </button>
          
          <button
            onClick={handleResetCheckout}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Reset Checkout
          </button>
        </div>

        {checkoutState.lastValidationResult && !checkoutState.lastValidationResult.isValid && (
          <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
            <h4 className="font-semibold text-red-700 mb-2 text-sm">Validation Errors:</h4>
            <ul className="list-disc list-inside text-xs text-red-600">
              {checkoutState.lastValidationResult.errors.map((err, idx) => (
                <li key={idx}>{err.field}: {err.message}</li>
              ))}
            </ul>
          </div>
        )}

        {lastProcessResult && (
          <div className={`mt-4 p-4 rounded border ${
            lastProcessResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 text-sm ${
              lastProcessResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              Process Checkout Result:
            </h4>
            <p className="text-xs text-gray-700">
              Success: {lastProcessResult.success ? 'Yes' : 'No'}
              {lastProcessResult.error && (
                <span className="block text-red-600 mt-1">Error: {lastProcessResult.error}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
