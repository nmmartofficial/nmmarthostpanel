import React from 'react';
import { cn } from '../../../../utils/helpers';
import ProductCard from './ProductCard';
import type { Product } from '../../types';

interface ProductGridProps {
  className?: string;
  products?: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ className, products = [] }) => {
  const displayProducts = products.length > 0 
    ? products 
    : Array.from({ length: 10 });

  return (
    <div className={cn(
      "grid gap-3 overflow-y-auto p-3",
      "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      className
    )}>
      {displayProducts.map((item, idx) => (
        <ProductCard 
          key={(item as Product)?.id || idx}
          product={item as Product}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
