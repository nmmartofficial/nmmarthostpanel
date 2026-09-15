import React from 'react';
import FilterChip from './FilterChip';
import { cn } from '../../../../utils/helpers';

// Mock Brands Only
const MOCK_BRANDS = [
  "All Brands",
  "Amul",
  "Nestle",
  "Parle",
  "Britannia",
  "Fortune"
];

// Mock Active Index
const MOCK_ACTIVE_BRAND_INDEX = 0;

interface BrandFilterProps {
  className?: string;
}

const BrandFilter: React.FC<BrandFilterProps> = ({ className }) => {
  return (
    <div className={cn("mb-6", className)}>
      <h4 className="text-sm font-black text-slate-600 mb-3 uppercase">Brands</h4>
      <div className="flex flex-wrap gap-2">
        {MOCK_BRANDS.map((brand, idx) => (
          <FilterChip
            key={brand}
            label={brand}
            isActive={idx === MOCK_ACTIVE_BRAND_INDEX}
          />
        ))}
      </div>
    </div>
  );
};

export default BrandFilter;