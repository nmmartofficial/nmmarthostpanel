import React from 'react';
import { cn } from '../../../../utils/helpers';
import ProductGrid from './ProductGrid';
import LoadingGrid from './LoadingGrid';
import EmptyState from './EmptyState';
import { useSearch } from '../../hooks/search';
import { SearchResult } from '../../services/search/search.types';
import type { Product } from '../../types';

interface ProductGridContainerProps {
  className?: string;
}

const ProductGridContainer: React.FC<ProductGridContainerProps> = ({ className }) => {
  const { results, loading, products } = useSearch();
  const isEmpty = results.length === 0;

  const displayProducts: Product[] = results
    .map(result => products.find(p => Number(p.id) === Number(result.id)))
    .filter((p): p is Product => p !== undefined);

  return (
    <div className={cn("flex-1 overflow-hidden", className)}>
      {loading ? (
        <LoadingGrid />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <ProductGrid products={displayProducts} />
      )}
    </div>
  );
};

export default ProductGridContainer;
