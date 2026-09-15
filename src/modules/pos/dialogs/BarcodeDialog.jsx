import React, { useState, useEffect } from 'react';
import { X, Search, Scan, Barcode2, ArrowRight } from 'lucide-react';

const BarcodeDialog = ({ isOpen, onClose, onScan }) => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBarcode('');
      setIsScanning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (barcode) {
      onScan(barcode);
      setBarcode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Barcode2 className="w-7 h-7" />
            Scan Barcode
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Scanner Area */}
          <div
            onClick={() => setIsScanning(!isScanning)}
            className={`border-2 rounded-xl p-12 text-center mb-6 transition-all cursor-pointer ${
              isScanning
                ? 'border-blue-500 bg-blue-50 animate-pulse'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            {isScanning ? (
              <div>
                <Scan className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                <p className="text-blue-600 font-semibold">Scanning... Please scan barcode</p>
                <p className="text-sm text-gray-500 mt-2">Or enter manually below</p>
              </div>
            ) : (
              <div>
                <Scan className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 font-medium">Click to start scanning</p>
                <p className="text-sm text-gray-400 mt-2">Or use barcode scanner device</p>
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Enter Barcode Manually</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Enter barcode number"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!barcode}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Recent Barcodes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {['890100000001', '890100000002', '890100000003'].map((code, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setBarcode(code);
                    onScan(code);
                  }}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-3"
                >
                  <Barcode2 className="w-5 h-5 text-gray-500" />
                  <span className="font-mono text-gray-700">{code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeDialog;
