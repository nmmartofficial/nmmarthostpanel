import React, { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import {
  buildTopSellingProducts,
  filterRowsToCurrentStore
} from '../../../utils/analyticsHelpers';
import BarcodeInput from '../../../components/BarcodeInput';
import ProductGrid from '../../../components/ProductGrid';
import ProductSearch from '../../../components/ProductSearch';
import { usePOS } from '../../../context';

interface RightSidebarProps {
  className?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ className }) => {
  const {
    categories = [],
    activeCategory = 'All',
    setActiveCategory,
    filteredProducts = [],
    products = [],
    orders = [],
    orderItems = [],
    currentUser
  } = usePOS();
  const [showTrending, setShowTrending] = useState(false);
  const categoryOptions = useMemo(() => (
    (Array.isArray(categories) ? categories : [])
      .map((category: any) => ({
        id: category?.id,
        label: category?.name || category?.category_name || category?.catname || ''
      }))
      .filter((category) => category.id != null && category.label)
  ), [categories]);
  const trendingProducts = useMemo(() => {
    const scopedOrders = filterRowsToCurrentStore(orders, currentUser);
    const scopedOrderItems = filterRowsToCurrentStore(orderItems, currentUser);
    const ranked = buildTopSellingProducts(scopedOrderItems, products, scopedOrders);
    const visibleProducts = new Map(
      filteredProducts.map((product: any) => [String(product.id), product])
    );
    return ranked
      .map((product) => visibleProducts.get(String(product.id)))
      .filter(Boolean);
  }, [currentUser, filteredProducts, orderItems, orders, products]);
  const shownProducts = showTrending ? trendingProducts : filteredProducts;

  return (
    <aside className={cn(
      'flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-sm',
      className
    )}>
      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-slate-50 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarcodeInput placeholder="Scan barcode and press Enter" />
          <ProductSearch />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={showTrending}
            onClick={() => setShowTrending((visible) => !visible)}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              showTrending
                ? 'border-orange-600 bg-orange-500 text-white'
                : 'border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
            )}
          >
            <Flame size={15} /> Trending Items
          </button>
          <button
            type="button"
            aria-pressed={activeCategory === 'All'}
            onClick={() => { setActiveCategory('All'); setShowTrending(false); }}
            className={cn(
              'min-h-10 shrink-0 rounded-lg border px-3 text-xs font-bold',
              activeCategory === 'All' && !showTrending
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            )}
          >
            All Items
          </button>
          {categoryOptions.map((category) => (
            <button
              type="button"
              key={String(category.id)}
              aria-pressed={String(activeCategory) === String(category.id)}
              onClick={() => { setActiveCategory(category.id); setShowTrending(false); }}
              className={cn(
                'min-h-10 shrink-0 rounded-lg border px-3 text-xs font-bold',
                String(activeCategory) === String(category.id) && !showTrending
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
            {showTrending ? 'Trending Items' : 'Products'}
          </h2>
          <span className="text-[10px] font-medium text-slate-500">
            {showTrending ? 'Ranked by loaded paid sales' : `${shownProducts.length} available`}
          </span>
        </div>
        {showTrending && orderItems.length === 0 && (
          <p role="status" className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            Recent item sales are not available; no trend ranking can be shown.
          </p>
        )}
        <ProductGrid productsOverride={shownProducts} />
      </div>
    </aside>
  );
};

export default RightSidebar;
