import React, { useState } from 'react';
import { X, RotateCcw, FileText, Calendar, Search, Minus, Plus } from 'lucide-react';

const ReturnDialog = ({ isOpen, onClose, onProcessReturn }) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceFound, setInvoiceFound] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');

  const mockInvoice = {
    id: 'INV00123',
    date: '2024-03-15',
    items: [
      { id: 1, name: 'Aashirvaad Atta 5Kg', price: 299, quantity: 2, returnQty: 0 },
      { id: 2, name: 'India Gate Basmati Rice 5Kg', price: 599, quantity: 1, returnQty: 0 },
    ]
  };

  if (!isOpen) return null;

  const handleSearchInvoice = () => {
    if (invoiceNumber) {
      setInvoiceFound(true);
      setReturnItems(mockInvoice.items);
    }
  };

  const handleProcessReturn = () => {
    const itemsToReturn = returnItems.filter(item => item.returnQty > 0);
    if (itemsToReturn.length > 0) {
      onProcessReturn({
        invoiceNumber,
        items: itemsToReturn,
        reason: returnReason,
        notes
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-7 h-7" />
            Return / Refund
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!invoiceFound ? (
            <div className="text-center py-12">
              <FileText className="w-20 h-20 mx-auto mb-6 text-gray-300" />
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Invoice Number</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter invoice number"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleSearchInvoice}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Invoice Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice #</p>
                    <p className="text-xl font-bold text-gray-900">{mockInvoice.id}</p>
                  </div>
                  <div className="h-10 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Date
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{mockInvoice.date}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setInvoiceFound(false);
                    setInvoiceNumber('');
                    setReturnItems([]);
                  }}
                  className="text-blue-600 font-medium hover:text-blue-700"
                >
                  Search Another
                </button>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Items to Return</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Price</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty Purchased</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qty to Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {returnItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-right text-gray-700">₹{item.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setReturnItems(prev => 
                                    prev.map((it, i) => 
                                      i === index ? { ...it, returnQty: Math.max(0, it.returnQty - 1) } : it
                                    )
                                  );
                                }}
                                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                value={item.returnQty}
                                onChange={(e) => {
                                  const val = Math.min(
                                    Math.max(0, parseInt(e.target.value) || 0),
                                    item.quantity
                                  );
                                  setReturnItems(prev =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, returnQty: val } : it
                                    )
                                  );
                                }}
                                className="w-16 text-center border border-gray-300 rounded-lg"
                              />
                              <button
                                onClick={() => {
                                  setReturnItems(prev =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, returnQty: Math.min(item.quantity, it.returnQty + 1) } : it
                                    )
                                  );
                                }}
                                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Return Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select reason</option>
                  <option value="defective">Defective Product</option>
                  <option value="wrong_item">Wrong Item Delivered</option>
                  <option value="expired">Expired Product</option>
                  <option value="not_as_described">Not As Described</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Total Refund */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 font-semibold text-lg">Total Refund Amount</span>
                  <span className="text-2xl font-bold text-red-600">
                    ₹{returnItems.reduce((sum, item) => sum + (item.price * item.returnQty), 0).toFixed(2)}
                  </span>
                </div>
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
                  onClick={handleProcessReturn}
                  disabled={
                    returnItems.filter(item => item.returnQty > 0).length === 0 || !returnReason
                  }
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Return
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnDialog;
