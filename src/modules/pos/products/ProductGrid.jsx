
import React from 'react';
import ProductCard from './ProductCard';
import { usePOS } from '../context/POSContext';

export default function ProductGrid() {
  const { filteredProducts } = usePOS();

  if (filteredProducts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
