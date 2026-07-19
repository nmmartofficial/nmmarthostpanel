import React from 'react';
import FilterChip from './FilterChip';
import { cn } from '../../../../utils/helpers';

// Mock Categories Only
const MOCK_CATEGORIES = [
  "All Products",
  "Grocery",
  "Snacks",
  "Beverages",
  "Personal Care",
  "Home Care",
  "Frozen Food"
];

// Mock Active Index
const MOCK_ACTIVE_CATEGORY_INDEX = 0;

interface CategoryFilterProps {
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ className }) => {
  return (
    <div className={cn("mb-6", className)}>
      <h4 className="text-sm font-black text-slate-600 mb-3 uppercase">Categories</h4>
      <div className="flex flex-wrap gap-2">
        {MOCK_CATEGORIES.map((category, idx) => (
          <FilterChip
            key={category}
            label={category}
            isActive={idx === MOCK_ACTIVE_CATEGORY_INDEX}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;