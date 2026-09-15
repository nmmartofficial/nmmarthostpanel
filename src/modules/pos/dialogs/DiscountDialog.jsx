import React, { useState } from 'react';
import { X, Percent, IndianRupee, Tag } from 'lucide-react';

const DiscountDialog = ({ isOpen, onClose, currentDiscount, subtotal, onApplyDiscount }) => {
  const [type, setType] = useState(currentDiscount?.type || 'percentage');
  const [value, setValue] = useState(currentDiscount?.value.toString() || '');
  const [couponCode, setCouponCode] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyDiscount({ type, value: parseFloat(value) || 0 });
    onClose();
  };

  const maxDiscountValue = type === 'percentage' ? 100 : subtotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="w-7 h-7" />
            Apply Discount
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Discount Type */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setType('percentage')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                type === 'percentage'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'border-2 border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <Percent className="w-5 h-5" />
              Percentage
            </button>
            <button
              onClick={() => setType('fixed')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                type === 'fixed'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'border-2 border-gray-200 text-gray-700 hover:border-purple-300'
              }`}
            >
              <IndianRupee className="w-5 h-5" />
              Fixed
            </button>
          </div>

          {/* Discount Value */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
            <div className="relative">
              {type === 'fixed' && (
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              )}
              <input
                type="number"
                value={value}
                onChange={(e) => {
                  const val = Math.min(parseFloat(e.target.value) || 0, maxDiscountValue);
                  setValue(val.toString());
                }}
                placeholder={type === 'percentage' ? '0 - 100' : '0.00'}
                step={type === 'percentage' ? 1 : 0.01}
                min={0}
                max={maxDiscountValue}
                className={`w-full px-4 py-3 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  type === 'fixed' ? 'pl-12' : ''
                } ${type === 'percentage' ? 'pr-12' : ''}`}
                autoFocus
              />
              {type === 'percentage' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-xl">
                  %
                </span>
              )}
            </div>
          </div>

          {/* Coupon Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code (Optional)</label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          {value > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600 font-medium">Discount</span>
                <span className="text-red-600 font-semibold">
                  -₹{type === 'percentage' 
                    ? ((subtotal * parseFloat(value)) / 100).toFixed(2) 
                    : parseFloat(value).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-200">
                <span className="text-gray-800 font-bold">After Discount</span>
                <span className="text-2xl font-bold text-purple-600">
                  ₹{type === 'percentage' 
                    ? (subtotal - (subtotal * parseFloat(value)) / 100).toFixed(2) 
                    : (subtotal - parseFloat(value)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                onApplyDiscount({ type: 'none', value: 0 });
                onClose();
              }}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Remove Discount
            </button>
            <button
              onClick={handleApply}
              disabled={!value || parseFloat(value) <= 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountDialog;
