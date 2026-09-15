import React from 'react';
import { useCart } from '../cart/hooks/useCart';

export const CartSummary = () => {
  const { cart, items, clearCart } = useCart();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cart Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-gray-500 font-medium text-sm">Total Items:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">{cart.totalItems}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium text-sm">Total Quantity:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">{cart.totalQty}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium text-sm">Subtotal:</span>
            <span className="ml-2 text-xs font-mono text-gray-700">₹{cart.subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium text-sm">Discount:</span>
            <span className="ml-2 text-xs font-mono text-green-600">-₹{cart.discount.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium text-sm">Tax:</span>
            <span className="ml-2 text-xs font-mono text-blue-600">₹{cart.tax.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium text-sm">Grand Total:</span>
            <span className="ml-2 text-xs font-mono text-gray-800 font-bold">₹{cart.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Items:</h4>
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                <span className="text-gray-700">{item.product.productName}</span>
                <span className="text-gray-600 font-medium">Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">
            Cart is empty
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-4">
            <button
              onClick={clearCart}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
