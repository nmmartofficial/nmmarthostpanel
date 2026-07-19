import React from 'react';
import FilterHeader from './FilterHeader';
import FilterSearch from './FilterSearch';
import CategoryFilter from './CategoryFilter';
import BrandFilter from './BrandFilter';
import { cn } from '../../../../utils/helpers';

interface FilterPanelProps {
  className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ className }) => {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 shadow-sm p-4",
      className
    )}>
      <FilterHeader />
      <FilterSearch className="mb-6" />
      <CategoryFilter />
      <BrandFilter />
    </div>
  );
};

export default FilterPanel;