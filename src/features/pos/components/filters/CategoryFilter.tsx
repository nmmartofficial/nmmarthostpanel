import React from 'react';
import FilterChip from './FilterChip';
import { cn } from '../../../../utils/helpers';
import { usePOS } from '../../../../context';

interface CategoryFilterProps {
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ className }) => {
  const { categories = [], activeCategory = 'All', setActiveCategory } = usePOS();

  const allLabel = "All Products";
  const chips = [
    { id: 'All', label: allLabel },
    ...categories.map(c => ({ id: c.id, label: c.name || c.catname }))
  ];

  return (
    <div className={cn("mb-6", className)}>
      <h4 className="text-sm font-black text-slate-600 mb-3 uppercase">Categories ({categories.length})</h4>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            type="button"
            key={String(chip.id)}
            onClick={() => setActiveCategory?.(chip.id)}
            className="cursor-pointer select-none"
          >
            <FilterChip
              label={chip.label}
              isActive={String(activeCategory) === String(chip.id)}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;