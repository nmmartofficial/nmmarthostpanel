import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

const QuantityDialog = ({ isOpen, onClose, currentQuantity, productName, onUpdateQuantity }) => {
  const [quantity, setQuantity] = useState(currentQuantity || 1);

  if (!isOpen) return null;

  const handleUpdate = () => {
    onUpdateQuantity(quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Set Quantity</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Product Name */}
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm mb-1">Product</p>
            <p className="text-xl font-semibold text-gray-900">{productName}</p>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-16 h-16 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-colors"
            >
              <Minus className="w-8 h-8 text-gray-700" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32 text-5xl font-bold text-center border-0 focus:ring-0"
              autoFocus
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-16 h-16 bg-blue-100 hover:bg-blue-200 rounded-2xl flex items-center justify-center transition-colors"
            >
              <Plus className="w-8 h-8 text-blue-700" />
            </button>
          </div>

          {/* Quick Quantity Buttons */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {[1, 2, 3, 5, 10].map((qty) => (
              <button
                key={qty}
                onClick={() => setQuantity(qty)}
                className={`py-3 rounded-xl font-semibold transition-colors ${
                  quantity === qty
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {qty}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantityDialog;
