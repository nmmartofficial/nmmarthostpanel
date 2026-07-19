import React, { useState } from 'react';
import { X, Check, IndianRupee, CreditCard, Smartphone, Wallet, Building, ChevronRight } from 'lucide-react';
import paymentMethods from '../data/paymentMethods';

const PaymentDialog = ({ isOpen, onClose, totalAmount, onPaymentComplete }) => {
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({});

  if (!isOpen) return null;

  const handlePayment = () => {
    if (splitPayment) {
      const totalSplit = Object.values(splitAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      if (totalSplit < totalAmount) return;
    } else {
      if (parseFloat(receivedAmount) < totalAmount) return;
    }
    onPaymentComplete({
      method: selectedMethod,
      split: splitPayment ? splitAmounts : null,
      received: parseFloat(receivedAmount) || 0,
      change: parseFloat(receivedAmount) - totalAmount
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Payment</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Amount Display */}
          <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-6 mb-6 text-center">
            <p className="text-sm text-gray-600 font-medium mb-1">Total Amount</p>
            <p className="text-4xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</p>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Payment Method</h3>
            <div className="grid grid-cols-5 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method.id);
                    setSplitPayment(false);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === method.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {method.icon === 'indian-rupee' && <IndianRupee className="w-6 h-6 mx-auto mb-2 text-gray-700" />}
                  {method.icon === 'credit-card' && <CreditCard className="w-6 h-6 mx-auto mb-2 text-gray-700" />}
                  {method.icon === 'smartphone' && <Smartphone className="w-6 h-6 mx-auto mb-2 text-gray-700" />}
                  {method.icon === 'wallet' && <Wallet className="w-6 h-6 mx-auto mb-2 text-gray-700" />}
                  {method.icon === 'building' && <Building className="w-6 h-6 mx-auto mb-2 text-gray-700" />}
                  <p className="text-sm font-medium text-gray-700">{method.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Split Payment Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={splitPayment}
                onChange={(e) => setSplitPayment(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-gray-700 font-medium">Split Payment</span>
            </label>
          </div>

          {splitPayment ? (
            <div className="space-y-4 mb-6">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center gap-3">
                  <span className="w-24 font-medium text-gray-700">{method.name}</span>
                  <input
                    type="number"
                    value={splitAmounts[method.id] || ''}
                    onChange={(e) => setSplitAmounts(prev => ({
                      ...prev,
                      [method.id]: e.target.value
                    }))}
                    placeholder="0.00"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Received Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-12 pr-4 py-3 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              {receivedAmount && parseFloat(receivedAmount) > totalAmount && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-emerald-800 font-medium">
                    Change: ₹{(parseFloat(receivedAmount) - totalAmount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={
                (!splitPayment && (!receivedAmount || parseFloat(receivedAmount) < totalAmount))
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Complete Payment
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDialog;
