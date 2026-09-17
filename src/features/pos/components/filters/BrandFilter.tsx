import React from 'react';
import FilterChip from './FilterChip';
import { cn } from '../../../../utils/helpers';

// Mock Brands Only (used as fallback when no real `brands` prop supplied)
const MOCK_BRANDS = [
  "All Brands",
  "Amul",
  "Nestle",
  "Parle",
  "Britannia",
  "Fortune"
];

interface BrandFilterProps {
  className?: string;
  brands?: Array<string | { id: number | string; name?: string }>;
  activeBrand?: string | number | null;
  onBrandSelect?: (brand: string | null) => void;
}

const BrandFilter: React.FC<BrandFilterProps> = ({ className, brands, activeBrand, onBrandSelect }) => {
  // Build normalized chip list: ["All Brands", ...realNames] or fallback to mock
  const hasCustomBrands = Array.isArray(brands) && brands.length > 0;
  const allLabel = "All Brands";
  const chips: Array<{ key: string; label: string; value: string | null }> = [];
  chips.push({ key: '__all__', label: allLabel, value: null });

  if (hasCustomBrands) {
    brands.forEach(b => {
      const name = typeof b === 'string' ? b : b?.name;
      if (!name) return;
      if (!chips.find(c => c.value === name)) {
        chips.push({ key: `b-${name}`, label: name, value: name });
      }
    });
  } else {
    MOCK_BRANDS.slice(1).forEach(name => chips.push({ key: `m-${name}`, label: name, value: name }));
  }

  const isActive = (chip: { value: string | null }) => {
    if (activeBrand === undefined || activeBrand === null) return chip.value === null;
    return String(activeBrand) === String(chip.value);
  };

  return (
    <div className={cn("mb-6", className)}>
      <h4 className="text-sm font-black text-slate-600 mb-3 uppercase">Brands</h4>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            type="button"
            key={chip.key}
            onClick={() => onBrandSelect && onBrandSelect(chip.value)}
            className={cn(
              "cursor-pointer select-none",
              onBrandSelect ? "" : "pointer-events-none"
            )}
          >
            <FilterChip
              key={chip.key}
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