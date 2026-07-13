import React, { memo } from 'react';
import { Box, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import ProductCard from './ProductCard';
import { usePOS } from '../context';

const ProductGrid = memo(() => {
  const {
    filteredProducts: products = [],
    selectedProduct = null,
    addToCart: onProductClick,
    isTouchMode = false,
    isProcessing: loading = false
  } = usePOS();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Grid Container */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin opacity-20" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Loading Inventory...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
          <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
            <Box size={48} className="text-slate-200" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">
            No Products Found
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[200px]">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "flex-1 overflow-y-auto p-4 grid gap-4 content-start custom-scrollbar bg-slate-50/50",
            isTouchMode ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          )}
        >
          {products.map((product, idx) => (
            <ProductCard
              key={`prod-${product.id}-${idx}`}
              product={product}
              addToCart={onProductClick}
              isSelected={selectedProduct?.id === product.id}
              isTouchMode={isTouchMode}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ProductGrid.displayName = 'ProductGrid';

export default ProductGrid;
