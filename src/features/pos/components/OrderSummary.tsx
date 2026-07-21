import React, { useState } from 'react';
import { useOrder } from '../order/hooks/useOrder';
import type { Order, OrderNumberResult, OrderCreationResult, OrderStatusResult, OrderRepositoryResult } from '../order/types/order.types';

export const OrderSummary = () => {
  const {
    orderState,
    generateOrderNumber,
    createOrder,
    markPending,
    markCompleted,
    markCancelled,
    addOrder,
    removeOrder,
    clearOrders,
    setSelectedOrder,
  } = useOrder();

  const [lastOrderNumberResult, setLastOrderNumberResult] = useState<OrderNumberResult | null>(null);
  const [lastOrderCreationResult, setLastOrderCreationResult] = useState<OrderCreationResult | null>(null);
  const [lastOrderStatusResult, setLastOrderStatusResult] = useState<OrderStatusResult | null>(null);
  const [lastRepoResult, setLastRepoResult] = useState<OrderRepositoryResult | null>(null);

  const handleGenerateOrderNumber = () => {
    const result = generateOrderNumber();
    setLastOrderNumberResult(result);
  };

  const handleCreateOrder = () => {
    const result = createOrder({
      cartId: null,
      customerId: null,
      paymentId: null,
      checkoutSnapshotId: null,
      status: orderState.orderStatus,
    });
    setLastOrderCreationResult(result);
    if (result.success && result.order) {
      const addResult = addOrder(result.order);
      setLastRepoResult(addResult);
    }
  };

  const handleMarkPending = () => {
    if (orderState.selectedOrder) {
      const result = markPending(orderState.selectedOrder);
      setLastOrderStatusResult(result);
      if (result.success && result.order) {
        const updateResult = addOrder(result.order);
        setLastRepoResult(updateResult);
      }
    }
  };

  const handleMarkCompleted = () => {
    if (orderState.selectedOrder) {
      const result = markCompleted(orderState.selectedOrder);
      setLastOrderStatusResult(result);
      if (result.success && result.order) {
        const updateResult = addOrder(result.order);
        setLastRepoResult(updateResult);
      }
    }
  };

  const handleMarkCancelled = () => {
    if (orderState.selectedOrder) {
      const result = markCancelled(orderState.selectedOrder);
      setLastOrderStatusResult(result);
      if (result.success && result.order) {
        const updateResult = addOrder(result.order);
        setLastRepoResult(updateResult);
      }
    }
  };

  const handleRemoveSelectedOrder = () => {
    if (orderState.selectedOrder) {
      const result = removeOrder(orderState.selectedOrder.orderId);
      setLastRepoResult(result);
    }
  };

  const handleClearRepository = () => {
    const result = clearOrders();
    setLastRepoResult(result);
  };

  const currentOrder = orderState.selectedOrder;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-gray-500 font-medium text-sm">Current Order Number:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {lastOrderNumberResult?.orderNumber || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-gray-500 font-medium text-sm">Current Order Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              currentOrder?.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              currentOrder?.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
              currentOrder?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {currentOrder?.status || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-gray-500 font-medium text-sm">Current Customer ID:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {currentOrder?.customerId || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-gray-500 font-medium text-sm">Current Payment ID:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {currentOrder?.paymentId || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-gray-500 font-medium text-sm">Current Cart ID:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {currentOrder?.cartId || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-gray-500 font-medium text-sm">Repository Order Count:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">
              {orderState.orders.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={handleGenerateOrderNumber}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Generate Order Number
          </button>

          <button
            onClick={handleCreateOrder}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
          >
            Create Order
          </button>

          <button
            onClick={handleMarkPending}
            disabled={!currentOrder}
            className="px-4 py-2 bg-yellow-600 text-white text-sm rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-700"
          >
            Mark Pending
          </button>

          <button
            onClick={handleMarkCompleted}
            disabled={!currentOrder}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
          >
            Mark Completed
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <button
            onClick={handleMarkCancelled}
            disabled={!currentOrder}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
          >
            Mark Cancelled
          </button>

          <button
            onClick={handleRemoveSelectedOrder}
            disabled={!currentOrder}
            className="px-4 py-2 bg-orange-600 text-white text-sm rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-700"
          >
            Remove Order
          </button>

          <button
            onClick={handleClearRepository}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded text-xs hover:bg-gray-700 transition-colors"
          >
            Clear Repository
          </button>
        </div>

        {orderState.orders.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Orders in Repository:</h4>
            <div className="space-y-2">
              {orderState.orders.map((order) => (
                <div
                  key={order.orderId}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    orderState.selectedOrder?.orderId === order.orderId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-gray-700">{order.orderNumber}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastOrderCreationResult && (
          <div className={`mt-4 p-4 rounded border ${
            lastOrderCreationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 text-sm ${
              lastOrderCreationResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              Order Creation Result:
            </h4>
            <p className="text-xs text-gray-700">
              Success: {lastOrderCreationResult.success ? 'Yes' : 'No'}
              {lastOrderCreationResult.error && (
                <span className="block text-red-600 mt-1">Error: {lastOrderCreationResult.error}</span>
              )}
            </p>
          </div>
        )}

        {lastOrderStatusResult && (
          <div className={`mt-4 p-4 rounded border ${
            lastOrderStatusResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 text-sm ${
              lastOrderStatusResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              Status Update Result:
            </h4>
            <p className="text-xs text-gray-700">
              Success: {lastOrderStatusResult.success ? 'Yes' : 'No'}
              {lastOrderStatusResult.error && (
                <span className="block text-red-600 mt-1">Error: {lastOrderStatusResult.error}</span>
              )}
            </p>
          </div>
        )}

        {lastRepoResult && (
          <div className={`mt-4 p-4 rounded border ${
            lastRepoResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 text-sm ${
              lastRepoResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              Repository Operation Result:
            </h4>
            <p className="text-xs text-gray-700">
              Success: {lastRepoResult.success ? 'Yes' : 'No'}
              {lastRepoResult.error && (
                <span className="block text-red-600 mt-1">Error: {lastRepoResult.error}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
