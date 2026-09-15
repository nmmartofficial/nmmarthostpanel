import React from 'react';
import { cn } from '../../../../utils/helpers';

interface SearchFiltersProps {
  className?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ className }) => {
  const filters = [
    'All Products',
    'Category',
    'Brand',
    'Stock',
    'Offer'
  ];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {filters.map((filter, index) => (
        <button
          key={index}
          disabled
          className="px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 font-medium text-sm cursor-not-allowed opacity-60"
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

export default SearchFilters;
