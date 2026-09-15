import React, { useState } from 'react';
import { X, FileText, Calendar, User, Clock, Save } from 'lucide-react';

const HoldBillDialog = ({ isOpen, onClose, onHold, heldBills = [], onRecall }) => {
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleHold = () => {
    onHold({ customerName, notes, timestamp: new Date() });
    setCustomerName('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-7 h-7" />
            Hold / Recall Bill
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Hold New Bill */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Hold Current Bill</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleHold}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Hold Bill
              </button>
            </div>
          </div>

          {/* Recall Held Bills */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Held Bills ({heldBills.length})</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No held bills</p>
                </div>
              ) : (
                heldBills.map((bill, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-xl p-4 hover:border-amber-400 transition-colors cursor-pointer"
                    onClick={() => onRecall(bill)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-amber-600">#{index + 1}</span>
                        {bill.customerName && (
                          <span className="font-medium text-gray-800">{bill.customerName}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₹{bill.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(bill.timestamp).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(bill.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {bill.notes && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">{bill.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldBillDialog;
