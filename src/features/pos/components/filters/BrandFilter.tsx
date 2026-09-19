import React from 'react';
import FilterChip from './FilterChip';
import { cn } from '../../../../utils/helpers';
import { usePOS } from '../../../../context';

interface BrandFilterProps {
  className?: string;
  onBrandSelect?: (brand: string | null) => void;
}

const BrandFilter: React.FC<BrandFilterProps> = ({ className, onBrandSelect }) => {
  const { brands = [], posFilter: activeBrand, setPosFilter: onBrandSelectCtx } = usePOS();

  // Build normalized chip list: ["All Brands", ...realNames]
  const hasCustomBrands = Array.isArray(brands) && brands.length > 0;
  const allLabel = "All Brands";
  const chips: Array<{ key: string; label: string; value: string | null }> = [];
  chips.push({ key: '__all__', label: allLabel, value: 'All' });

  if (hasCustomBrands) {
    brands.forEach(b => {
      const name = typeof b === 'string' ? b : b?.name;
      if (!name) return;
      if (!chips.find(c => c.value === name)) {
        chips.push({ key: `b-${name}`, label: name, value: name });
      }
    });
  }

  const isActive = (chip: { value: string | null }) => {
    return String(activeBrand) === String(chip.value);
  };

  const handleSelect = (val: string | null) => {
    if (onBrandSelect) onBrandSelect(val);
    if (onBrandSelectCtx) onBrandSelectCtx(val || 'All');
  };

  return (
    <div className={cn("mb-6", className)}>
      <h4 className="text-sm font-black text-slate-600 mb-3 uppercase">Brands ({brands.length})</h4>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            type="button"
            key={chip.key}
            onClick={() => handleSelect(chip.value)}
            className="cursor-pointer select-none"
          >
            <FilterChip
              label={chip.label}
              isActive={isActive(chip)}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BrandFilter;