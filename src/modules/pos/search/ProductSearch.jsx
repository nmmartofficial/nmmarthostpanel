
import React from 'react';
import { Search, X, Barcode2 } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export default function ProductSearch() {
  const { searchQuery, setSearchQuery, openBarcodeDialog } = usePOS();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm p-4">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-10 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, barcode, or SKU..."
            className="w-full h-14 pl-12 pr-10 text-lg bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <button
          onClick={openBarcodeDialog}
          className="col-span-2 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold"
        >
          <Barcode2 size={20} />
          <span>Barcode</span>
        </button>
      </div>
    </div>
  );
}
