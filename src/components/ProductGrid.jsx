import React, { memo } from 'react';
import { Box, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import ProductCard from './ProductCard';
import { usePOS } from '../context';

const ProductGrid = memo(({ productsOverride }) => {
  const {
    filteredProducts: products = [],
    products: inventory = [],
    selectedProduct = null,
    addToCart: onProductClick,
    isTouchMode = false,
    inventoryLoading: loading = false,
    inventoryError = ''
  } = usePOS();
  const initialInventoryLoading = loading && inventory.length === 0;
  const visibleProducts = Array.isArray(productsOverride) ? productsOverride : products;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {loading && inventory.length > 0 && (
        <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800">
          Refreshing inventory. Previously loaded items remain available.
        </div>
      )}
      {inventoryError && inventory.length > 0 && (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          Latest inventory refresh failed. Cached stock is still available: {inventoryError}
        </div>
      )}
      {/* Grid Container */}
      {initialInventoryLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin opacity-20" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Loading Inventory...
          </p>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
          <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
            <Box size={48} className="text-slate-200" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">
            {inventoryError && inventory.length === 0 ? 'Inventory unavailable' : 'No matching products'}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[200px]">
            {inventoryError && inventory.length === 0
              ? `Could not load item master: ${inventoryError}`
              : 'Try adjusting your search or selecting another category.'}
          </p>
        </div>
      ) : (
        <div
          className="grid flex-1 content-start gap-[var(--pos-grid-gap,8px)] overflow-y-auto bg-slate-50/50 p-3 custom-scrollbar"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(var(--pos-product-min-width, 124px), 100%), 1fr))' }}
        >
          {visibleProducts.map((product) => (
            <ProductCard
              key={`prod-${product.id}`}
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
